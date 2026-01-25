'use client'

import { SkillGroup } from '@/lib/types/cv'
import { generateId } from '@/lib/storage'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, Plus, Trash2, X } from 'lucide-react'
import { useState, KeyboardEvent } from 'react'

interface SectionSkillsProps {
  data: SkillGroup[]
  onChange: (data: SkillGroup[]) => void
}

export function SectionSkills({ data, onChange }: SectionSkillsProps) {
  const [newSkill, setNewSkill] = useState<Record<string, string>>({})
  
  const addGroup = () => {
    const newGroup: SkillGroup = {
      id: generateId(),
      category: '',
      skills: [],
    }
    onChange([...data, newGroup])
  }
  
  const removeGroup = (id: string) => {
    onChange(data.filter(group => group.id !== id))
  }
  
  const updateGroup = (id: string, updates: Partial<SkillGroup>) => {
    onChange(data.map(group => group.id === id ? { ...group, ...updates } : group))
  }
  
  const addSkill = (groupId: string) => {
    const skill = newSkill[groupId]?.trim()
    if (!skill) return
    
    const group = data.find(g => g.id === groupId)
    if (!group) return
    
    updateGroup(groupId, { skills: [...group.skills, skill] })
    setNewSkill(prev => ({ ...prev, [groupId]: '' }))
  }
  
  const removeSkill = (groupId: string, skillIndex: number) => {
    const group = data.find(g => g.id === groupId)
    if (!group) return
    
    updateGroup(groupId, { skills: group.skills.filter((_, i) => i !== skillIndex) })
  }
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, groupId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill(groupId)
    }
  }
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5" />
            Skills
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addGroup}>
            <Plus className="h-4 w-4 mr-1" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No skills added yet</p>
            <Button variant="link" onClick={addGroup}>Add a skill category</Button>
          </div>
        ) : (
          data.map((group) => (
            <div key={group.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Category (e.g., Programming Languages)"
                  value={group.category}
                  onChange={(e) => updateGroup(group.id, { category: e.target.value })}
                  className="font-medium"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeGroup(group.id)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {(group.skills || []).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                    {skill}
                    <button
                      onClick={() => removeSkill(group.id, index)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add a skill and press Enter"
                  value={newSkill[group.id] || ''}
                  onChange={(e) => setNewSkill(prev => ({ ...prev, [group.id]: e.target.value }))}
                  onKeyDown={(e) => handleKeyDown(e, group.id)}
                  className="text-sm"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => addSkill(group.id)}
                  disabled={!newSkill[group.id]?.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          ))
        )}
        
        <p className="text-xs text-muted-foreground">
          Tip: Include 10-30 relevant skills grouped by category for better ATS compatibility
        </p>
      </CardContent>
    </Card>
  )
}
