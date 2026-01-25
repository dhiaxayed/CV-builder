'use client'

import { EducationItem } from '@/lib/types/cv'
import { generateId } from '@/lib/storage'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { GraduationCap, Plus, Trash2, ChevronDown, GripVertical } from 'lucide-react'
import { useState } from 'react'

interface SectionEducationProps {
  data: EducationItem[]
  onChange: (data: EducationItem[]) => void
}

export function SectionEducation({ data = [], onChange }: SectionEducationProps) {
  const safeData = data || []
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(safeData.map(d => d.id)))
  
  const addItem = () => {
    const newItem: EducationItem = {
      id: generateId(),
      institution: '',
      degree: '',
      field: '',
      location: '',
      startDate: '',
      endDate: '',
      gpa: '',
      highlights: [],
    }
    onChange([...safeData, newItem])
    setOpenItems(prev => new Set([...prev, newItem.id]))
  }
  
  const removeItem = (id: string) => {
    onChange(safeData.filter(item => item.id !== id))
  }
  
  const updateItem = (id: string, updates: Partial<EducationItem>) => {
    onChange(safeData.map(item => item.id === id ? { ...item, ...updates } : item))
  }
  
  const toggleItem = (id: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5" />
            Education
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {safeData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No education added yet</p>
            <Button variant="link" onClick={addItem}>Add your education</Button>
          </div>
        ) : (
          safeData.map((item) => (
            <Collapsible 
              key={item.id} 
              open={openItems.has(item.id)}
              onOpenChange={() => toggleItem(item.id)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.degree || 'Degree'} {item.field && `in ${item.field}`}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.institution || 'Institution'} {item.endDate && `• ${item.endDate}`}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-4 border-t">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Institution</Label>
                        <Input
                          placeholder="University of California"
                          value={item.institution}
                          onChange={(e) => updateItem(item.id, { institution: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                          placeholder="Berkeley, CA"
                          value={item.location}
                          onChange={(e) => updateItem(item.id, { location: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Degree</Label>
                        <Input
                          placeholder="Bachelor of Science"
                          value={item.degree}
                          onChange={(e) => updateItem(item.id, { degree: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Field of Study</Label>
                        <Input
                          placeholder="Computer Science"
                          value={item.field}
                          onChange={(e) => updateItem(item.id, { field: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input
                          type="month"
                          value={item.startDate}
                          onChange={(e) => updateItem(item.id, { startDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input
                          type="month"
                          value={item.endDate}
                          onChange={(e) => updateItem(item.id, { endDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GPA (optional)</Label>
                        <Input
                          placeholder="3.8"
                          value={item.gpa || ''}
                          onChange={(e) => updateItem(item.id, { gpa: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Highlights (comma-separated)</Label>
                      <Input
                        placeholder="Summa Cum Laude, Dean's List"
                        value={item.highlights?.join(', ') || ''}
                        onChange={(e) => updateItem(item.id, { 
                          highlights: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                        })}
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Education
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  )
}
