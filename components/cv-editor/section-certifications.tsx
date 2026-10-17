'use client'

import { CertificationItem } from '@/lib/types/cv'
import { nanoid } from 'nanoid'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award, Plus, Trash2 } from 'lucide-react'

interface SectionCertificationsProps {
  data: CertificationItem[]
  onChange: (data: CertificationItem[]) => void
}

export function SectionCertifications({ data = [], onChange }: SectionCertificationsProps) {
  const safeData = data || []
  
  const addItem = () => {
    const newItem: CertificationItem = {
      id: nanoid(),
      name: '',
      issuer: '',
      date: '',
    }
    onChange([...safeData, newItem])
  }
  
  const removeItem = (id: string) => {
    onChange(safeData.filter(item => item.id !== id))
  }
  
  const updateItem = (id: string, updates: Partial<CertificationItem>) => {
    onChange(safeData.map(item => item.id === id ? { ...item, ...updates } : item))
  }
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5" />
            Certifications
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {safeData.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No certifications added</p>
            <Button variant="link" size="sm" onClick={addItem}>Add a certification</Button>
          </div>
        ) : (
          safeData.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`certifications-${item.id}-1`}> Certification Name</Label>
                  <Input id={`certifications-${item.id}-1`}
                    placeholder="AWS Solutions Architect"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`certifications-${item.id}-2`}> Issuing Organization</Label>
                  <Input id={`certifications-${item.id}-2`}
                    placeholder="Amazon Web Services"
                    value={item.issuer}
                    onChange={(e) => updateItem(item.id, { issuer: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`certifications-${item.id}-3`}> Issue Date</Label>
                  <Input id={`certifications-${item.id}-3`}
                    type="month"
                    value={item.date}
                    onChange={(e) => updateItem(item.id, { date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`certifications-${item.id}-4`}> Expiration Date (optional)</Label>
                  <Input id={`certifications-${item.id}-4`}
                    type="month"
                    value={item.expirationDate || ''}
                    onChange={(e) => updateItem(item.id, { expirationDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`cert-${item.id}-url`}>Credential URL</Label>
                <Input id={`cert-${item.id}-url`} value={item.url || ''} maxLength={500} placeholder="https://example.com/credential" onChange={event => updateItem(item.id, { url:event.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeItem(item.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
