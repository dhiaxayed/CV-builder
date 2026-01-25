'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createEmptyCVData, createSampleCVData } from '@/lib/types/cv'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { FileText, ArrowLeft, ArrowRight, Sparkles, PenLine, CheckCircle2, Loader2 } from 'lucide-react'

type Step = 'start' | 'template' | 'title'
type StartOption = 'scratch' | 'sample'

// Template definitions - 16 Professional Templates
const TEMPLATES = [
  // ATS-Friendly
  { id: 'modern', name: 'Modern', description: 'Clean ATS-friendly design with great readability', category: 'ats', popular: true },
  { id: 'classic', name: 'Classic', description: 'Traditional professional layout trusted by recruiters', category: 'ats' },
  { id: 'minimal', name: 'Minimal', description: 'Simple and elegant design that lets your content shine', category: 'ats' },
  { id: 'compact', name: 'Compact', description: 'Ultra space-efficient for experienced professionals', category: 'ats' },
  // Professional
  { id: 'professional', name: 'Professional', description: 'Executive business design with subtle elegance', category: 'business', popular: true },
  { id: 'executive', name: 'Executive', description: 'Premium design for C-level and senior management', category: 'business' },
  { id: 'banking', name: 'Banking', description: 'Corporate minimalist for finance professionals', category: 'business' },
  { id: 'elegant', name: 'Elegant', description: 'Premium sidebar design with visual hierarchy', category: 'business', popular: true },
  // Creative
  { id: 'creative', name: 'Creative', description: 'Modern design with visual appeal for creative roles', category: 'creative' },
  { id: 'fancy', name: 'Fancy', description: 'Decorative design with stylish colorful accents', category: 'creative' },
  { id: 'bold', name: 'Bold', description: 'High contrast statement design that stands out', category: 'creative' },
  { id: 'infographic', name: 'Infographic', description: 'Visual data-driven design with skill bars', category: 'creative', popular: true },
  // Specialized
  { id: 'tech', name: 'Tech', description: 'Developer-focused design optimized for technical roles', category: 'tech', popular: true },
  { id: 'academic', name: 'Academic', description: 'Perfect for researchers, professors, and scientists', category: 'academic' },
  { id: 'casual', name: 'Casual', description: 'Friendly approachable design for modern companies', category: 'tech' },
  { id: 'vintage', name: 'Vintage', description: 'Traditional elegant design with classic typography', category: 'classic' },
]

export default function NewCVPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<Step>('start')
  const [startOption, setStartOption] = useState<StartOption>('sample')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('modern')
  const [cvTitle, setCvTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin')
    }
  }, [isLoading, user, router])
  
  const handleCreate = async () => {
    if (!user || !cvTitle) return
    
    setIsCreating(true)
    
    try {
      const data = startOption === 'sample' ? createSampleCVData() : createEmptyCVData()
      
      const response = await fetch('/api/cvs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cvTitle,
          templateId: selectedTemplate,
          initialData: data,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to create CV')
      }
      
      const { cv } = await response.json()
      toast({ title: 'CV created successfully!' })
      router.push(`/cv/${cv.id}/edit`)
    } catch (error) {
      console.error('Error creating CV:', error)
      toast({ title: 'Failed to create CV', variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }
  
  if (isLoading || !user) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Create New CV</span>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
              step === 'start' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {step !== 'start' ? <CheckCircle2 className="h-5 w-5" /> : '1'}
            </div>
            <div className="w-16 h-0.5 bg-muted" />
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
              step === 'template' ? "bg-primary text-primary-foreground" : 
              step === 'title' ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
            )}>
              {step === 'title' ? <CheckCircle2 className="h-5 w-5" /> : '2'}
            </div>
            <div className="w-16 h-0.5 bg-muted" />
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
              step === 'title' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              3
            </div>
          </div>
        </div>
        
        {/* Step 1: Choose start option */}
        {step === 'start' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">How would you like to start?</h1>
              <p className="text-muted-foreground">
                Choose an option to begin creating your professional CV
              </p>
            </div>
            
            <RadioGroup 
              value={startOption} 
              onValueChange={(v) => setStartOption(v as StartOption)}
              className="grid gap-4 md:grid-cols-3"
            >
              <Label htmlFor="sample" className="cursor-pointer">
                <Card className={cn(
                  "transition-all hover:shadow-md",
                  startOption === 'sample' && "ring-2 ring-primary"
                )}>
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Use Sample Data</CardTitle>
                    <CardDescription>
                      Start with pre-filled content to see how it works
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <RadioGroupItem value="sample" id="sample" className="sr-only" />
                    <span className="text-xs text-muted-foreground">Recommended for first-time users</span>
                  </CardContent>
                </Card>
              </Label>
              
              <Label htmlFor="scratch" className="cursor-pointer">
                <Card className={cn(
                  "transition-all hover:shadow-md",
                  startOption === 'scratch' && "ring-2 ring-primary"
                )}>
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-2 p-3 rounded-full bg-muted">
                      <PenLine className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg">Start from Scratch</CardTitle>
                    <CardDescription>
                      Begin with a blank CV and add your own content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <RadioGroupItem value="scratch" id="scratch" className="sr-only" />
                    <span className="text-xs text-muted-foreground">Full control over your content</span>
                  </CardContent>
                </Card>
              </Label>
              
            </RadioGroup>
            
            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep('template')}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 2: Choose template */}
        {step === 'template' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Choose a Template</h1>
              <p className="text-muted-foreground">
                All templates are ATS-optimized for maximum compatibility
              </p>
            </div>
            
            <RadioGroup 
              value={selectedTemplate} 
              onValueChange={setSelectedTemplate}
              className="grid gap-6 md:grid-cols-4"
            >
              {TEMPLATES.map(template => (
                <Label key={template.id} htmlFor={template.id} className="cursor-pointer">
                  <Card className={cn(
                    "transition-all hover:shadow-md h-full relative",
                    selectedTemplate === template.id && "ring-2 ring-primary"
                  )}>
                    {'popular' in template && template.popular && (
                      <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <CardHeader className="pb-2">
                      <div className="aspect-3/4 bg-muted rounded-md mb-3 flex items-center justify-center">
                        <FileText className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RadioGroupItem value={template.id} id={template.id} className="sr-only" />
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          template.category === 'ats' && "bg-green-100 text-green-700",
                          template.category === 'classic' && "bg-amber-100 text-amber-700",
                          template.category === 'business' && "bg-blue-100 text-blue-700",
                          template.category === 'creative' && "bg-pink-100 text-pink-700",
                          template.category === 'academic' && "bg-purple-100 text-purple-700",
                          template.category === 'tech' && "bg-cyan-100 text-cyan-700"
                        )}>
                          {template.category}
                        </span>
                        <span className="text-xs text-muted-foreground">ATS-Safe</span>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              ))}
            </RadioGroup>
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('start')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep('title')}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 3: Name your CV */}
        {step === 'title' && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">Name Your CV</h1>
              <p className="text-muted-foreground">
                Give your CV a descriptive name to help you organize multiple versions
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cv-title">CV Title</Label>
                <Input
                  id="cv-title"
                  placeholder="e.g., Software Engineer - Tech Companies"
                  value={cvTitle}
                  onChange={(e) => setCvTitle(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Include the role or industry to easily identify this CV later
                </p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 text-sm">Your selections:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>Starting with: {startOption === 'sample' ? 'Sample data' : 'Blank CV'}</li>
                  <li>Template: {TEMPLATES.find(t => t.id === selectedTemplate)?.name}</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('template')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleCreate} disabled={!cvTitle || isCreating}>
                {isCreating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {isCreating ? 'Creating...' : 'Create CV'}
                {!isCreating && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
