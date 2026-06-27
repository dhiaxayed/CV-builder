import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSessionUser, updateUser } from '@/lib/db/users'
import { updateCVPhoto, getCV, getCVWithCurrentVersion, updateCVData } from '@/lib/db/cvs'
import { supabase } from '@/lib/db'
import { CVData } from '@/lib/types/cv'
import { nanoid } from 'nanoid'
import sharp from 'sharp'

// Configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_DIMENSION = 1024 // Max width/height for resizing

async function processImage(file: File): Promise<{
  dataUrl: string
  width?: number
  height?: number
  mimeType: string
  size: number
}> {
  const buffer = await file.arrayBuffer()
  const optimized = await sharp(Buffer.from(buffer), { animated: false })
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer()

  const metadata = await sharp(optimized).metadata()
  const dataUrl = `data:image/webp;base64,${optimized.toString('base64')}`

  return {
    dataUrl,
    width: metadata.width,
    height: metadata.height,
    mimeType: 'image/webp',
    size: optimized.length,
  }
}

async function storeFileRecord(
  userId: string,
  fileName: string,
  originalFile: File,
  processed: Awaited<ReturnType<typeof processImage>>
): Promise<{ id: string }> {
  if (!supabase) {
    throw new Error('Database not configured')
  }

  const id = nanoid()
  const { error } = await supabase.from('uploaded_files').insert({
    id,
    user_id: userId,
    file_type: 'photo',
    file_name: fileName,
    file_size: processed.size,
    mime_type: processed.mimeType,
    storage_url: processed.dataUrl,
    storage_provider: 'base64',
    metadata: {
      originalName: originalFile.name,
      originalType: originalFile.type,
      originalSize: originalFile.size,
      width: processed.width,
      height: processed.height,
      optimized: true,
    },
  })

  if (error) {
    throw new Error(`Failed to store uploaded file metadata: ${error.message}`)
  }

  return { id }
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
        message: 'Please upload a JPEG, PNG, or WebP image.',
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
    const processed = await processImage(file)
    const { dataUrl } = processed
    
    // Store file record
    const fileRecord = await storeFileRecord(user.id, sanitizedName, file, processed)
    
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
      fileSize: processed.size,
      mimeType: processed.mimeType,
      width: processed.width,
      height: processed.height,
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

      const cvWithVersion = await getCVWithCurrentVersion(cvId)
      if (cvWithVersion?.current_version?.data) {
        const currentData = cvWithVersion.current_version.data
        const updatedData: CVData = {
          ...currentData,
          basics: {
            ...currentData.basics,
            photoUrl: undefined,
          },
        }
        await updateCVData(cvId, updatedData)
      }
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
