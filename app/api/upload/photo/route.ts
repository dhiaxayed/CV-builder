import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser, updateUser } from '@/lib/db/users'
import { updateCVPhoto, getCV, getCVWithCurrentVersion, updateCVData } from '@/lib/db/cvs'
import { CVData } from '@/lib/types/cv'
import { nanoid } from 'nanoid'

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_DIMENSION = 1024 // Max width/height for resizing

// Simple image processing (resizing via canvas would require a library in production)
// For now, we'll just validate and store
async function processImage(file: File): Promise<{ dataUrl: string; width?: number; height?: number }> {
  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const dataUrl = `data:${file.type};base64,${base64}`
  
  // In production, you'd use sharp or similar for:
  // - Resizing to max dimensions
  // - Optimizing quality
  // - Converting to webp
  // - Stripping EXIF data for privacy
  
  return { dataUrl }
}

// Store file metadata in database
async function storeFileRecord(
  userId: string,
  file: File,
  storageUrl: string
): Promise<{ id: string }> {
  // This would insert into uploaded_files table
  // For now, we return a generated ID
  return { id: nanoid() }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await getSessionUser(sessionToken)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse form data
    const formData = await request.formData()
    const file = formData.get('photo') as File | null
    const target = formData.get('target') as string // 'profile' or 'cv'
    const cvId = formData.get('cvId') as string | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Validate file type
    if (!VALID_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type',
        message: 'Please upload a JPEG, PNG, WebP, or GIF image.',
        allowedTypes: VALID_TYPES
      }, { status: 400 })
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large',
        message: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        maxSize: MAX_FILE_SIZE
      }, { status: 400 })
    }
    
    // Validate file name (basic sanitization)
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    
    // Process the image
    const { dataUrl } = await processImage(file)
    
    // Store file record
    const fileRecord = await storeFileRecord(user.id, file, dataUrl)
    
    // Update the appropriate record
    if (target === 'profile') {
      await updateUser(user.id, { photo_url: dataUrl })
    } else if (target === 'cv' && cvId) {
      const cv = await getCV(cvId)
      if (!cv || cv.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Update photo_url column for backward compatibility
      await updateCVPhoto(cvId, dataUrl)
      
      // ALSO update the CV data to include photoUrl in basics
      // This ensures the photo persists when loading CV data
      try {
        const cv = await getCVWithCurrentVersion(cvId)
        if (cv && cv.current_version?.data) {
          const updatedData: CVData = {
            ...cv.current_version.data,
            basics: {
              ...cv.current_version.data.basics,
              photoUrl: dataUrl,
            },
          }
          await updateCVData(cvId, updatedData)
        }
      } catch (dbError) {
        console.error('[Upload] Error updating CV data with photo:', dbError)
        // Photo is still saved in photo_url column, so continue
      }
    }
    
    return NextResponse.json({ 
      success: true,
      fileId: fileRecord.id,
      url: dataUrl,
      fileName: sanitizedName,
      fileSize: file.size,
      mimeType: file.type,
      message: 'Photo uploaded successfully'
    })
  } catch (error) {
    console.error('[Upload] Error uploading photo:', error)
    return NextResponse.json({ 
      error: 'Failed to upload photo',
      message: 'An unexpected error occurred. Please try again.'
    }, { status: 500 })
  }
}

// DELETE endpoint to remove photos
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await getSessionUser(sessionToken)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { target, cvId } = await request.json()
    
    if (target === 'profile') {
      await updateUser(user.id, { photo_url: null })
    } else if (target === 'cv' && cvId) {
      const cv = await getCV(cvId)
      if (!cv || cv.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      await updateCVPhoto(cvId, null)
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Photo removed successfully'
    })
  } catch (error) {
    console.error('[Upload] Error removing photo:', error)
    return NextResponse.json({ error: 'Failed to remove photo' }, { status: 500 })
  }
}
