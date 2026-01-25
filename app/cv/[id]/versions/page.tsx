'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { CV, CVVersion, getCV, restoreVersion } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, History, FileText, Clock, RotateCcw, CheckCircle2 } from 'lucide-react'

export default function VersionsPage() {
  const params = useParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [cv, setCv] = useState<CV | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<CVVersion | null>(null)
  
  const resolvedParams = params; // Declare resolvedParams variable
  
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
      setIsLoading(false)
    }
  }, [authLoading, user, params.id, router])
  
  const handleRestore = () => {
    if (!cv || !selectedVersion) return
    
    const updatedCV = restoreVersion(cv.id, selectedVersion.id)
    if (updatedCV) {
      setCv(updatedCV)
      toast({ title: `Restored to version ${selectedVersion.version}` })
    }
    setRestoreDialogOpen(false)
    setSelectedVersion(null)
  }
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
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
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </main>
      </div>
    )
  }
  
  if (!cv) return null
  
  // Sort versions by version number (newest first)
  const sortedVersions = [...cv.versions].sort((a, b) => b.version - a.version)
  
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
              <History className="h-5 w-5 text-primary" />
              <span className="font-semibold">Version History</span>
              <span className="text-muted-foreground">- {cv.title}</span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Version History</h1>
          <p className="text-muted-foreground">
            View and restore previous versions of your CV. Each version is a snapshot of your CV at a point in time.
          </p>
        </div>
        
        <div className="space-y-4">
          {sortedVersions.map((version) => {
            const isActive = version.id === cv.currentVersionId
            
            return (
              <Card key={version.id} className={isActive ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">Version {version.version}</CardTitle>
                      {isActive && (
                        <Badge className="bg-primary">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Current
                        </Badge>
                      )}
                    </div>
                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedVersion(version)
                          setRestoreDialogOpen(true)
                        }}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {formatDate(version.createdAt)}
                    {version.updatedAt !== version.createdAt && (
                      <span className="text-xs">(edited {formatDate(version.updatedAt)})</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{version.data.basics.name || 'Unnamed'}</span>
                    <span>•</span>
                    <span>{version.data.experience.length} experiences</span>
                    <span>•</span>
                    <span>{version.data.education.length} education entries</span>
                    <span>•</span>
                    <span>{version.data.skills.reduce((acc, g) => acc + g.skills.length, 0)} skills</span>
                  </div>
                  {version.note && (
                    <p className="mt-2 text-sm border-l-2 border-primary/50 pl-3 italic">
                      {version.note}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
      
      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version {selectedVersion?.version}?</DialogTitle>
            <DialogDescription>
              This will set version {selectedVersion?.version} as your current working version. 
              Your current changes will still be saved as the latest version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRestore}>
              Restore Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
