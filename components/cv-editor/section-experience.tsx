'use client'

import { ExperienceItem } from '@/lib/types/cv'
import { generateId } from '@/lib/storage'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Briefcase, Plus, Trash2, ChevronDown, GripVertical } from 'lucide-react'
import { useState } from 'react'

interface SectionExperienceProps {
  data: ExperienceItem[]
  onChange: (data: ExperienceItem[]) => void
}

export function SectionExperience({ data = [], onChange }: SectionExperienceProps) {
  const safeData = data || []
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(safeData.map(d => d.id)))
  
  const addItem = () => {
    const newItem: ExperienceItem = {
      id: generateId(),
      company: '',
      role: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: [''],
      technologies: [],
    }
    onChange([...safeData, newItem])
    setOpenItems(prev => new Set([...prev, newItem.id]))
  }
  
  const removeItem = (id: string) => {
    onChange(safeData.filter(item => item.id !== id))
  }
  
  const updateItem = (id: string, updates: Partial<ExperienceItem>) => {
    onChange(safeData.map(item => item.id === id ? { ...item, ...updates } : item))
  }
  
  const updateBullet = (itemId: string, index: number, value: string) => {
    const item = safeData.find(d => d.id === itemId)
    if (!item) return
    
    const bullets = [...(item.bullets || [''])]
    bullets[index] = value
    updateItem(itemId, { bullets })
  }
  
  const addBullet = (itemId: string) => {
    const item = safeData.find(d => d.id === itemId)
    if (!item) return
    updateItem(itemId, { bullets: [...(item.bullets || []), ''] })
  }
  
  const removeBullet = (itemId: string, index: number) => {
    const item = safeData.find(d => d.id === itemId)
    if (!item || (item.bullets || []).length <= 1) return
    updateItem(itemId, { bullets: (item.bullets || []).filter((_, i) => i !== index) })
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
            <Briefcase className="h-5 w-5" />
            Work Experience
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
            <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No work experience added yet</p>
            <Button variant="link" onClick={addItem}>Add your first experience</Button>
          </div>
        ) : (
          safeData.map((item, index) => (
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
                        {item.role || 'Untitled Position'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.company || 'Company'} {item.startDate && `• ${item.startDate}`}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-4 border-t">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Job Title</Label>
                        <Input
                          placeholder="Senior Software Engineer"
                          value={item.role}
                          onChange={(e) => updateItem(item.id, { role: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Company</Label>
                        <Input
                          placeholder="TechCorp Inc."
                          value={item.company}
                          onChange={(e) => updateItem(item.id, { company: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input
                          placeholder="San Francisco, CA"
                          value={item.location}
                          onChange={(e) => updateItem(item.id, { location: e.target.value })}
                        />
                      </div>
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
                          disabled={item.current}
                        />
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`current-${item.id}`}
                            checked={item.current}
                            onCheckedChange={(checked) => 
                              updateItem(item.id, { current: !!checked, endDate: checked ? '' : item.endDate })
                            }
                          />
                          <Label htmlFor={`current-${item.id}`} className="text-sm font-normal">
                            Current position
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Technologies (comma-separated)</Label>
                      <Input
                        placeholder="React, Node.js, PostgreSQL"
                        value={item.technologies?.join(', ') || ''}
                        onChange={(e) => updateItem(item.id, { 
                          technologies: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Achievements & Responsibilities</Label>
                        <Button variant="ghost" size="sm" onClick={() => addBullet(item.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Bullet
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(item.bullets || ['']).map((bullet, bulletIndex) => (
                          <div key={bulletIndex} className="flex gap-2">
                            <Textarea
                              placeholder="Led development of... resulting in 40% improvement"
                              value={bullet}
                              onChange={(e) => updateBullet(item.id, bulletIndex, e.target.value)}
                              className="min-h-[60px]"
                            />
                            {(item.bullets || []).length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeBullet(item.id, bulletIndex)}
                                className="shrink-0"
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tip: Start with action verbs and include measurable results
                      </p>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Experience
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
