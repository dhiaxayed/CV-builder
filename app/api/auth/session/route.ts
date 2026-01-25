import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser, deleteSession } from '@/lib/db/users'
import { isDatabaseConfigured } from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    // Check if database is configured
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ user: null, dbConfigured: false })
    }
    
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value
    
    if (!sessionToken) {
      return NextResponse.json({ user: null })
    }
    
    const user = await getSessionUser(sessionToken)
    
    if (!user) {
      return NextResponse.json({ user: null })
    }
    
    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        photoUrl: user.photo_url,
      }
    })
  } catch (error) {
    console.error('[Auth] Error getting session:', error)
    return NextResponse.json({ user: null })
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value
    
    if (sessionToken && isDatabaseConfigured()) {
      await deleteSession(sessionToken)
    }
    
    cookieStore.delete('session')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Auth] Error deleting session:', error)
    return NextResponse.json({ error: 'Failed to sign out' }, { status: 500 })
  }
}
