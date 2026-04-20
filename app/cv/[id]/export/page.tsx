'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { CVData } from '@/lib/types/cv'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Download, FileText, Share2, Copy, ExternalLink, Code, FileDown } from 'lucide-react'

type DbCV = {
  id: string
  title: string
  template_id: string
  is_public: boolean
  share_token: string | null
  data: CVData
}

export default function ExportPage() {
  const params = useParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [cv, setCv] = useState<DbCV | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin')
      return
    }
    
    const loadCV = async () => {
      if (!user || !params.id) return
      
      try {
        setIsLoading(true)
        const response = await fetch(`/api/cvs/${params.id}`)
        if (!response.ok) {
          if (response.status === 404 || response.status === 403) {
            router.push('/dashboard')
            return
          }
          throw new Error('Failed to load CV')
        }
        
        const { cv: loadedCV } = await response.json()
        setCv(loadedCV)
        if (loadedCV.share_token && loadedCV.is_public) {
          setShareUrl(`${window.location.origin}/share/${loadedCV.share_token}`)
        }
      } catch (error) {
        console.error('Error loading CV:', error)
        toast({ title: 'Failed to load CV', variant: 'destructive' })
        router.push('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user && params.id) {
      loadCV()
    }
  }, [authLoading, user, params.id, router])
  
  const downloadFile = async (format: 'pdf' | 'latex' | 'json') => {
    if (!cv?.data) return
    
    try {
      const response = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData: cv.data,
          templateId: cv.template_id,
          title: cv.title,
          format,
        }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to generate file')
      }
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const baseName = `resume_${cv.data.basics.name.replace(/\s+/g, '_') || 'cv'}_${cv.title.replace(/\s+/g, '_')}`
      const extension = format === 'latex' ? 'tex' : format
      a.download = `${baseName}.${extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      const label = format === 'pdf' ? 'PDF' : format === 'latex' ? 'LaTeX' : 'JSON'
      toast({ title: `${label} file downloaded` })
    } catch (error) {
      toast({ 
        title: error instanceof Error ? error.message : 'Failed to download file', 
        variant: 'destructive' 
      })
    }
  }
  
  const toggleSharing = async (enabled: boolean) => {
    if (!cv) return
    
    try {
      const response = await fetch(`/api/cvs/${cv.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: enabled }),
      })
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to update sharing')
      }
      
      const { shareToken } = await response.json()
      if (enabled && shareToken) {
        const url = `${window.location.origin}/share/${shareToken}`
        setShareUrl(url)
        setCv({ ...cv, share_token: shareToken, is_public: true })
        toast({ title: 'Share link created' })
      } else {
        setShareUrl('')
        setCv({ ...cv, share_token: null, is_public: false })
        toast({ title: 'Share link disabled' })
      }
    } catch (error) {
      toast({ 
        title: error instanceof Error ? error.message : 'Failed to update sharing', 
        variant: 'destructive' 
      })
    }
  }
  
  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    toast({ title: 'Link copied to clipboard' })
  }
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card h-14">
          <div className="container mx-auto px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </main>
      </div>
    )
  }
  
  if (!cv) return null
  
  const suggestedFileName = cv.data
    ? `resume_${cv.data.basics.name.replace(/\s+/g, '_') || 'unnamed'}_${cv.title.replace(/\s+/g, '_')}`
    : 'resume'
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/cv/${cv.id}/edit`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <span className="font-semibold">Export & Share</span>
              <span className="text-muted-foreground">- {cv.title}</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Export & Share</h1>
          <p className="text-muted-foreground">
            Download your CV in various formats or share it with others.
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Download Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                Download Files
              </CardTitle>
              <CardDescription>
                Export your CV in different formats for different use cases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileDown className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">PDF Export (.pdf)</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Download a template-accurate PDF generated directly from your selected LaTeX template.
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => downloadFile('pdf')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Code className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">LaTeX Source (.tex)</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Download the LaTeX source to customize the layout or keep a version-controlled backup.
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => downloadFile('latex')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">JSON Data (.json)</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Export your CV data as JSON for backup or importing into other tools.
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => downloadFile('json')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <Label className="text-sm font-medium">Suggested File Name</Label>
                <Input value={`${suggestedFileName}.pdf`} readOnly className="mt-2 bg-background" />
                <p className="text-xs text-muted-foreground mt-1">
                  Use a professional filename that includes your name and the target role.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Share Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share Link
              </CardTitle>
              <CardDescription>
                Create a public link to share a read-only view of your CV
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Enable Public Sharing</h4>
                  <p className="text-sm text-muted-foreground">
                    Anyone with the link can view your CV
                  </p>
                </div>
                <Switch
                  checked={cv.is_public}
                  onCheckedChange={toggleSharing}
                />
              </div>
              
              {cv.is_public && shareUrl && (
                <div className="space-y-2">
                  <Label>Share URL</Label>
                  <div className="flex gap-2">
                    <Input value={shareUrl} readOnly className="bg-muted" />
                    <Button variant="outline" onClick={copyShareUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
