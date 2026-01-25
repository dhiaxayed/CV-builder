'use client'

import { useState, useRef } from 'react'
import { Basics } from '@/lib/types/cv'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Mail, Phone, MapPin, Linkedin, Github, Globe, Camera, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SectionBasicsProps {
  data: Basics
  onChange: (data: Basics) => void
  cvId?: string
}

export function SectionBasics({ data, onChange, cvId }: SectionBasicsProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  // Ensure contact is always defined with defaults
  const contact = data.contact || {
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: '',
  }
  
  const updateField = (field: keyof Basics, value: string) => {
    onChange({ ...data, [field]: value })
  }
  
  const updateContact = (field: keyof Basics['contact'], value: string) => {
    onChange({
      ...data,
      contact: { ...contact, [field]: value }
    })
  }
  
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' })
      return
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be less than 5MB', variant: 'destructive' })
      return
    }
    
    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('photo', file)
      formData.append('target', 'cv')
      if (cvId) formData.append('cvId', cvId)
      
      const response = await fetch('/api/upload/photo', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const result = await response.json()
        onChange({ ...data, photoUrl: result.url })
        toast({ title: 'Photo uploaded successfully!' })
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Upload failed')
      }
    } catch (error) {
      toast({ 
        title: error instanceof Error ? error.message : 'Failed to upload photo', 
        variant: 'destructive' 
      })
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }
  
  const handleRemovePhoto = () => {
    onChange({ ...data, photoUrl: undefined })
    toast({ title: 'Photo removed' })
  }
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5" />
          Basic Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Photo Upload Section */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <Avatar className="h-20 w-20 border-2 border-primary/20">
            <AvatarImage src={data.photoUrl} alt={data.name} />
            <AvatarFallback className="text-lg bg-primary/10">
              {data.name ? getInitials(data.name) : <User className="h-8 w-8 text-muted-foreground" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Profile Photo</p>
            <p className="text-xs text-muted-foreground mb-3">
              Add a professional photo to make your CV stand out. JPG, PNG up to 5MB.
            </p>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
                disabled={isUploading}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-1" />
                )}
                {data.photoUrl ? 'Change Photo' : 'Upload Photo'}
              </Button>
              {data.photoUrl && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleRemovePhoto}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={data.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Professional Title</Label>
            <Input
              id="title"
              placeholder="Senior Software Engineer"
              value={data.title}
              onChange={(e) => updateField('title', e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Phone
            </Label>
            <Input
              id="phone"
              placeholder="+1 (555) 123-4567"
              value={contact.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="location" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            Location
          </Label>
          <Input
            id="location"
            placeholder="San Francisco, CA"
            value={contact.location}
            onChange={(e) => updateContact('location', e.target.value)}
          />
        </div>
        
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="linkedin" className="flex items-center gap-1">
              <Linkedin className="h-3 w-3" />
              LinkedIn
            </Label>
            <Input
              id="linkedin"
              placeholder="linkedin.com/in/johndoe"
              value={contact.linkedin || ''}
              onChange={(e) => updateContact('linkedin', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github" className="flex items-center gap-1">
              <Github className="h-3 w-3" />
              GitHub
            </Label>
            <Input
              id="github"
              placeholder="github.com/johndoe"
              value={contact.github || ''}
              onChange={(e) => updateContact('github', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website" className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Website
            </Label>
            <Input
              id="website"
              placeholder="johndoe.com"
              value={contact.website || ''}
              onChange={(e) => updateContact('website', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
