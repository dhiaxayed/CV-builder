'use client'

import { Palette } from 'lucide-react'
import type { CVData } from '@/lib/types/cv'
import { COLOR_THEMES } from '@/lib/templates'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Appearance = NonNullable<CVData['appearance']>

export function AppearanceSettings({ value,onChange }: {
  value:CVData['appearance']
  onChange:(value:CVData['appearance']) => void
}) {
  const appearance:Appearance=value || { colorTheme:'template',font:'template' }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Palette className="mr-1 h-4 w-4" />Style</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>CV appearance</DialogTitle>
          <DialogDescription>Personalize any template. Your choices appear in preview, exports and saved versions.</DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Color theme</legend>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_THEMES.map(theme => (
              <Button key={theme.id} variant={appearance.colorTheme===theme.id ? 'secondary' : 'outline'}
                aria-pressed={appearance.colorTheme===theme.id} aria-label={`${theme.name} theme`}
                className="justify-start" onClick={() => onChange({ ...appearance,colorTheme:theme.id })}>
                <span aria-hidden="true" className="mr-2 h-3 w-3 shrink-0 rounded-full border" style={{ backgroundColor:theme.color ? `#${theme.color}` : undefined }} />
                {theme.name}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="cv-typeface">Typography</Label>
          <Select value={appearance.font} onValueChange={font => onChange({ ...appearance,font:font as Appearance['font'] })}>
            <SelectTrigger id="cv-typeface"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="template">Template default</SelectItem>
              <SelectItem value="sans">Modern sans serif</SelectItem>
              <SelectItem value="serif">Classic serif</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => onChange(undefined)}>Reset template style</Button>
      </DialogContent>
    </Dialog>
  )
}
