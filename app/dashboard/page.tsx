'use client'

import React from "react"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  LogOut,
  Clock,
  FileDown,
  Loader2,
  Sparkles,
  Shield,
  FileSearch,
} from 'lucide-react'
import type { CVData } from '@/lib/db'

type CVWithVersion = {
  id: string
  user_id: string
  title: string
  template_id: string
  current_version_id: string | null
  is_public: boolean
  share_token: string | null
  created_at: string
  updated_at: string
  current_version?: {
    id: string
    cv_id: string
    version: number
    data: CVData
    note: string | null
    created_at: string
  }
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [cvs, setCvs] = useState<CVWithVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [selectedCV, setSelectedCV] = useState<CVWithVersion | null>(null)
  const [duplicateTitle, setDuplicateTitle] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  
  const fetchCVs = useCallback(async () => {
    try {
      const response = await fetch('/api/cvs')
      if (response.ok) {
        const data = await response.json()
        setCvs(data.cvs || [])
      }
    } catch (error) {
      console.error('Error fetching CVs:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin')
    }
  }, [authLoading, user, router])
  
  useEffect(() => {
    if (user) {
      fetchCVs()
    }
  }, [user, fetchCVs])
  
  const handleDelete = async () => {
    if (!selectedCV) return
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/cvs/${selectedCV.id}`, { method: 'DELETE' })
      if (response.ok) {
        setCvs(cvs.filter(cv => cv.id !== selectedCV.id))
        toast({ title: 'CV deleted successfully' })
      } else {
        throw new Error('Failed to delete')
      }
    } catch {
      toast({ title: 'Failed to delete CV', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setSelectedCV(null)
    }
  }
  
  const handleDuplicate = async () => {
    if (!selectedCV || !duplicateTitle) return
    setIsDuplicating(true)
    
    try {
      const response = await fetch(`/api/cvs/${selectedCV.id}/duplicate`, { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        // Refresh the list
        fetchCVs()
        toast({ title: 'CV duplicated successfully' })
      } else {
        throw new Error('Failed to duplicate')
      }
    } catch {
      toast({ title: 'Failed to duplicate CV', variant: 'destructive' })
    } finally {
      setIsDuplicating(false)
      setDuplicateDialogOpen(false)
      setSelectedCV(null)
      setDuplicateTitle('')
    }
  }
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }
  
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    )
  }
  
  if (!user) return null
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CV Builder</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome{user.name ? `, ${user.name}` : ''}!</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your professional CVs
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => router.push('/cv/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create New CV
            </Button>
          </div>
        </div>

        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <p className="text-lg font-semibold">AI Job Search Toolkit</p>
                </div>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Create a CV with the main button above, then open it to run an AI ATS review, tailor it to a job description,
                  generate a sharper summary, surface missing keywords, and apply suggested bullet rewrites directly inside the editor.
                </p>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="rounded-md bg-background px-3 py-2">
                    <span className="font-medium text-foreground">1. Create or open a CV</span>
                    <p className="mt-1">Start with sample data if you want to explore the full workflow quickly.</p>
                  </div>
                  <div className="rounded-md bg-background px-3 py-2">
                    <span className="font-medium text-foreground">2. Run review and tailoring</span>
                    <p className="mt-1">Use AI Assist for strict ATS checks, then paste a target job description.</p>
                  </div>
                  <div className="rounded-md bg-background px-3 py-2">
                    <span className="font-medium text-foreground">3. Save targeted versions</span>
                    <p className="mt-1">Apply only truthful suggestions, save a version, then export the final CV.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3 text-primary" />
                    AI ATS Review
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                    <FileSearch className="h-3 w-3 text-primary" />
                    Job Description Tailoring
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Apply Suggested Rewrites
                  </span>
                </div>
              </div>
              <div className="max-w-2xl rounded-md border bg-background px-4 py-3 text-sm text-muted-foreground">
                Use <span className="font-medium text-foreground">Create New CV</span>, then open the CV and go to
                <span className="font-medium text-foreground"> AI Assist</span>.
              </div>
            </div>
          </CardContent>
        </Card>
        
        {cvs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No CVs yet</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-sm">
                Create your first CV to get started. You can begin with sample data, test the AI workflow, then replace it with your own experience.
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={() => router.push('/cv/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First CV
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cvs.map(cv => {
              const currentVersion = cv.current_version
              
              return (
                <Card key={cv.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{cv.title}</CardTitle>
                        <CardDescription className="mt-1 capitalize">
                          {cv.template_id} Template
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/cv/${cv.id}/edit`)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedCV(cv)
                              setDuplicateTitle(`${cv.title} (Copy)`)
                              setDuplicateDialogOpen(true)
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/cv/${cv.id}/versions`)}>
                            <Clock className="h-4 w-4 mr-2" />
                            Version History
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/cv/${cv.id}/export`)}>
                            <FileDown className="h-4 w-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedCV(cv)
                              setDeleteDialogOpen(true)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                </div>
                </CardHeader>
                <CardContent>
                  <div className="aspect-3/4 bg-muted rounded-md overflow-hidden mb-3">
                    <img
                      src={`/templates/${cv.template_id}.svg`}
                      alt={`${cv.title} template preview`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/templates/modern.svg'
                      }}
                    />
                  </div>
                  <div className="space-y-3">
                      {currentVersion && (
                        <div className="text-sm text-muted-foreground">
                          <p className="font-medium text-foreground">
                            {currentVersion.data.basics?.name || 'Untitled'}
                          </p>
                          {currentVersion.data.basics?.contact?.email && (
                            <p>{currentVersion.data.basics.contact.email}</p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(cv.updated_at)}
                        </span>
                        {cv.is_public && (
                          <span className="text-green-600">Shared</span>
                        )}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        className="w-full bg-transparent"
                        onClick={() => router.push(`/cv/${cv.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Continue Editing
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete CV</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedCV?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Duplicate Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate CV</DialogTitle>
            <DialogDescription>
              Create a copy of &quot;{selectedCV?.title}&quot; with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="duplicate-title">New CV Title</Label>
            <Input
              id="duplicate-title"
              value={duplicateTitle}
              onChange={(e) => setDuplicateTitle(e.target.value)}
              placeholder="Enter title for the duplicate"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)} disabled={isDuplicating}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={!duplicateTitle || isDuplicating}>
              {isDuplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Duplicate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
