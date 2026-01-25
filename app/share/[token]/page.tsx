'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CV, getCVByShareToken } from '@/lib/storage'
import { CVPreview } from '@/components/cv-editor/cv-preview'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, AlertCircle, ArrowLeft } from 'lucide-react'

export default function SharedCVPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [cv, setCv] = useState<CV | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  
  useEffect(() => {
    if (params.token) {
      const sharedCV = getCVByShareToken(params.token)
      if (sharedCV) {
        setCv(sharedCV)
      } else {
        setNotFound(true)
      }
      setIsLoading(false)
    }
  }, [params.token])
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card h-14">
          <div className="container mx-auto px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-[800px]" />
        </main>
      </div>
    )
  }
  
  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CV Builder</span>
          </div>
        </header>
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <Card>
            <CardContent className="pt-6">
              <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-2">CV Not Found</h1>
              <p className="text-muted-foreground mb-6">
                This CV link may have expired or been disabled by the owner.
              </p>
              <Button onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }
  
  if (!cv) return null
  
  const currentVersion = cv.versions.find(v => v.id === cv.currentVersionId)
  if (!currentVersion) return null
  
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold">CV Builder</span>
            <span className="text-muted-foreground text-sm">- Shared CV</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/')}>
            Create Your Own CV
          </Button>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-semibold">
            {currentVersion.data.basics.name || 'Unnamed'}'s CV
          </h1>
          {currentVersion.data.basics.title && (
            <p className="text-muted-foreground">{currentVersion.data.basics.title}</p>
          )}
        </div>
        
        <CVPreview 
          data={currentVersion.data} 
          templateId={cv.templateId}
          className="min-h-[800px]"
        />
        
        <p className="text-center text-xs text-muted-foreground mt-4">
          Created with CV Builder
        </p>
      </main>
    </div>
  )
}
