'use client'

import { ProjectItem } from '@/lib/types/cv'
import { generateId } from '@/lib/storage'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { FolderOpen, Plus, Trash2, ChevronDown, GripVertical } from 'lucide-react'
import { useState } from 'react'

interface SectionProjectsProps {
  data: ProjectItem[]
  onChange: (data: ProjectItem[]) => void
}

export function SectionProjects({ data = [], onChange }: SectionProjectsProps) {
  const safeData = data || []
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(safeData.map(d => d.id)))
  
  const addItem = () => {
    const newItem: ProjectItem = {
      id: generateId(),
      name: '',
      description: '',
      url: '',
      technologies: [],
      bullets: [''],
    }
    onChange([...safeData, newItem])
    setOpenItems(prev => new Set([...prev, newItem.id]))
  }
  
  const removeItem = (id: string) => {
    onChange(safeData.filter(item => item.id !== id))
  }
  
  const updateItem = (id: string, updates: Partial<ProjectItem>) => {
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
            <FolderOpen className="h-5 w-5" />
            Projects
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
            <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No projects added yet</p>
            <Button variant="link" onClick={addItem}>Add a project</Button>
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
                        {item.name || 'Untitled Project'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {(item.technologies || []).slice(0, 3).join(', ') || 'No technologies listed'}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="p-4 pt-0 space-y-4 border-t">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Project Name</Label>
                        <Input
                          placeholder="My Awesome Project"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL (optional)</Label>
                        <Input
                          placeholder="github.com/user/project"
                          value={item.url || ''}
                          onChange={(e) => updateItem(item.id, { url: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="A brief description of what the project does"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        className="min-h-[60px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Technologies (comma-separated)</Label>
                      <Input
                        placeholder="React, Node.js, PostgreSQL"
                        value={item.technologies.join(', ')}
                        onChange={(e) => updateItem(item.id, { 
                          technologies: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                        })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Key Achievements</Label>
                        <Button variant="ghost" size="sm" onClick={() => addBullet(item.id)}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Bullet
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(item.bullets || ['']).map((bullet, bulletIndex) => (
                          <div key={bulletIndex} className="flex gap-2">
                            <Textarea
                              placeholder="Built feature that... resulting in..."
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
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove Project
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
