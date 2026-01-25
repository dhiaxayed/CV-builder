'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { CV, getCV, generateShareToken, revokeShareToken } from '@/lib/storage'
import { generateLatex } from '@/lib/latex/generator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Download, FileText, Share2, Copy, ExternalLink, Code, FileDown } from 'lucide-react'

export default function ExportPage() {
  const params = useParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = params; // Declare resolvedParams
  
  const [cv, setCv] = useState<CV | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin')
      return
    }
    
    if (user && params.id) {
      const loadedCV = getCV(params.id)
      if (!loadedCV || loadedCV.userId !== user.id) {
        router.push('/dashboard')
        return
      }
      setCv(loadedCV)
      if (loadedCV.shareToken && loadedCV.isPublic) {
        setShareUrl(`${window.location.origin}/share/${loadedCV.shareToken}`)
      }
      setIsLoading(false)
    }
  }, [authLoading, user, params.id, router])
  
  const handleDownloadLatex = () => {
    if (!cv) return
    
    const currentVersion = cv.versions.find(v => v.id === cv.currentVersionId)
    if (!currentVersion) return
    
    const latex = generateLatex(currentVersion.data, cv.templateId)
    const blob = new Blob([latex], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const fileName = `${currentVersion.data.basics.name.replace(/\s+/g, '_') || 'cv'}_${cv.title.replace(/\s+/g, '_')}.tex`
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: 'LaTeX file downloaded' })
  }
  
  const handleDownloadJSON = () => {
    if (!cv) return
    
    const currentVersion = cv.versions.find(v => v.id === cv.currentVersionId)
    if (!currentVersion) return
    
    const blob = new Blob([JSON.stringify(currentVersion.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentVersion.data.basics.name.replace(/\s+/g, '_') || 'cv'}_data.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: 'JSON data downloaded' })
  }
  
  const toggleSharing = (enabled: boolean) => {
    if (!cv) return
    
    if (enabled) {
      const token = generateShareToken(cv.id)
      if (token) {
        const url = `${window.location.origin}/share/${token}`
        setShareUrl(url)
        setCv({ ...cv, shareToken: token, isPublic: true })
        toast({ title: 'Share link created' })
      }
    } else {
      revokeShareToken(cv.id)
      setShareUrl('')
      setCv({ ...cv, shareToken: undefined, isPublic: false })
      toast({ title: 'Share link disabled' })
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
  
  const currentVersion = cv.versions.find(v => v.id === cv.currentVersionId)
  const suggestedFileName = currentVersion 
    ? `resume_${currentVersion.data.basics.name.replace(/\s+/g, '_') || 'unnamed'}_${cv.title.replace(/\s+/g, '_')}`
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
                      <Code className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">LaTeX Source (.tex)</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Download the LaTeX source file. Compile with XeLaTeX or LuaLaTeX to generate a PDF.
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleDownloadLatex}>
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
                  <Button variant="outline" onClick={handleDownloadJSON}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-medium">PDF Generation</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      To generate a PDF, download the LaTeX file and compile it using a LaTeX editor like 
                      <a href="https://www.overleaf.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1">Overleaf</a>
                      or a local TeX installation.
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <strong>Tip:</strong> Use XeLaTeX or LuaLaTeX for best font rendering.
                    </div>
                  </div>
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
                  checked={cv.isPublic}
                  onCheckedChange={toggleSharing}
                />
              </div>
              
              {cv.isPublic && shareUrl && (
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
