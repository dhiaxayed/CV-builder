'use client'
import { ReactNode } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { resolveTemplateId } from '@/lib/templates'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

interface TemplatePreviewCardProps {
  templateId: string; name: string; subtitle: string; popular?: boolean; selected?: boolean;
  onClick?: () => void; ctaLabel?: string; footer?: ReactNode; className?: string;
}

export function TemplatePreviewCard({ templateId,name,subtitle,popular,selected,onClick,ctaLabel,footer,className }: TemplatePreviewCardProps) {
  return <div className={cn('group relative',className)}>
    <div className={cn('relative flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-lg transition-all focus-within:ring-2 focus-within:ring-primary',selected && 'border-primary ring-2 ring-primary/20')}>
      <div className="relative aspect-[210/297] overflow-hidden bg-slate-100">
        <Image src={`/templates/${resolveTemplateId(templateId)}.webp`} alt={`${name} template: actual first page of the sample PDF`} width={650} height={920} loading="lazy" className="h-full w-full object-contain" />
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="absolute bottom-3 right-3 shadow-sm" aria-label={`Preview template: ${name}`} onClick={event => event.stopPropagation()}>Preview</Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl" onClick={event => event.stopPropagation()}>
            <DialogHeader><DialogTitle>{name}</DialogTitle><DialogDescription>{subtitle}</DialogDescription></DialogHeader>
            <div className="min-h-0 overflow-y-auto rounded-md bg-zinc-100 p-3">
              <Image src={`/templates/${resolveTemplateId(templateId)}.webp`} alt={`${name} full page CV preview`} width={650} height={920} className="mx-auto h-auto w-full max-w-[650px] shadow-md" />
            </div>
          </DialogContent>
        </Dialog>
        {selected && <Badge className="absolute top-3 left-3">Selected</Badge>}
      </div>
      <div className="flex-1 space-y-3 p-4">
        <p className="text-xl font-semibold">{name}</p><p className="text-sm text-muted-foreground">{subtitle}</p>
        {ctaLabel && onClick && <Button className="w-full" size="sm" onClick={onClick} aria-label={`${ctaLabel}: ${name}`}>{ctaLabel}</Button>}
        {footer}
      </div>
    </div>
    {popular && <Badge className="absolute -top-2 -right-2 bg-emerald-100 text-emerald-900">Popular</Badge>}
  </div>
}
