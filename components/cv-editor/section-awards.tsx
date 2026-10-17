'use client'
import { AwardItem } from '@/lib/types/cv'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function SectionAwards({ data, onChange }: { data: AwardItem[]; onChange: (data: AwardItem[]) => void }) {
  const update = (id: string, changes: Partial<AwardItem>) => onChange(data.map(item => item.id === id ? { ...item, ...changes } : item))
  return <Card><CardHeader><CardTitle>Awards &amp; Honors</CardTitle></CardHeader><CardContent className="space-y-4">
    {data.map(item => <fieldset key={item.id} className="space-y-3 rounded border p-3"><legend className="px-1 text-sm">{item.title || 'New award'}</legend>
      {(['title', 'issuer', 'date'] as const).map(field => <div key={field}><Label htmlFor={`award-${item.id}-${field}`}>{field === 'title' ? 'Award title' : field === 'issuer' ? 'Awarding organization' : 'Date'}</Label><Input id={`award-${item.id}-${field}`} maxLength={500} value={item[field]} onChange={e => update(item.id, { [field]: e.target.value })} /></div>)}
      <Label htmlFor={`award-${item.id}-description`}>Description</Label><Textarea id={`award-${item.id}-description`} maxLength={10000} value={item.description || ''} onChange={e => update(item.id, { description: e.target.value })} />
      <Button variant="outline" onClick={() => onChange(data.filter(award => award.id !== item.id))}>Remove award</Button>
    </fieldset>)}
    <Button variant="outline" disabled={data.length >= 50} onClick={() => onChange([...data, { id: crypto.randomUUID(), title: '', issuer: '', date: '' }])}>Add award</Button>
  </CardContent></Card>
}
