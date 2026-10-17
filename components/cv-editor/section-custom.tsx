'use client'
import { CustomSection } from '@/lib/types/cv'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function SectionCustom({ data, onChange }: { data: CustomSection[]; onChange: (data: CustomSection[]) => void }) {
  const update = (id: string, changes: Partial<CustomSection>) => onChange(data.map(item => item.id === id ? { ...item, ...changes } : item))
  return <Card><CardHeader><CardTitle>Custom Sections</CardTitle></CardHeader><CardContent className="space-y-4">
    {data.map(item => <fieldset key={item.id} className="space-y-3 rounded border p-3"><legend className="px-1 text-sm">{item.title || 'New section'}</legend>
      <Label htmlFor={`custom-${item.id}-title`}>Section title</Label><Input id={`custom-${item.id}-title`} maxLength={500} value={item.title} onChange={e => update(item.id, { title: e.target.value })} />
      <Label htmlFor={`custom-${item.id}-type`}>Format</Label><select id={`custom-${item.id}-type`} className="w-full rounded border bg-background p-2" value={item.type} onChange={e => update(item.id, { type: e.target.value as CustomSection['type'] })}><option value="bullets">Bullet list</option><option value="markdown">Paragraphs (plain text)</option></select>
      <Label htmlFor={`custom-${item.id}-content`}>Content (one item or paragraph per line)</Label><Textarea id={`custom-${item.id}-content`} maxLength={50000} value={item.content.join('\n')} onChange={e => update(item.id, { content: e.target.value.split('\n') })} />
      <Button variant="outline" onClick={() => onChange(data.filter(section => section.id !== item.id))}>Remove section</Button>
    </fieldset>)}
    <Button variant="outline" disabled={data.length >= 50} onClick={() => onChange([...data, { id: crypto.randomUUID(), title: '', type: 'bullets', content: [] }])}>Add custom section</Button>
  </CardContent></Card>
}
