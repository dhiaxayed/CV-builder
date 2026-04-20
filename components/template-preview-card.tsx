'use client'

import { ReactNode } from 'react'
import { CVPreview } from '@/components/cv-editor/cv-preview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createSampleCVData } from '@/lib/types/cv'
import { cn } from '@/lib/utils'

const PREVIEW_DATA = createSampleCVData()
const PREVIEW_SCALE = 0.33

interface TemplatePreviewCardProps {
  templateId: string
  name: string
  subtitle: string
  popular?: boolean
  selected?: boolean
  onClick?: () => void
  ctaLabel?: string
  footer?: ReactNode
  className?: string
}

export function TemplatePreviewCard({
  templateId,
  name,
  subtitle,
  popular = false,
  selected = false,
  onClick,
  ctaLabel,
  footer,
  className,
}: TemplatePreviewCardProps) {
  return (
    <div className={cn('group relative', className)}>
      <div
        className={cn(
          'relative flex h-full flex-col overflow-hidden rounded-xl border bg-white shadow-lg transition-all',
          'hover:-translate-y-1 hover:border-primary hover:shadow-xl',
          selected && 'border-primary ring-2 ring-primary/20'
        )}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="pointer-events-none origin-top-left"
              style={{
                transform: `scale(${PREVIEW_SCALE})`,
                width: `${100 / PREVIEW_SCALE}%`,
                height: `${100 / PREVIEW_SCALE}%`,
              }}
            >
              <CVPreview
                data={PREVIEW_DATA}
                templateId={templateId}
                className="h-full rounded-none border-0 shadow-none"
              />
            </div>
          </div>

          {selected && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground">
              Selected
            </Badge>
          )}

          {ctaLabel && onClick && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/0 transition-colors group-hover:bg-primary/10">
              <Button className="opacity-0 transition-opacity group-hover:opacity-100" size="sm" onClick={onClick}>
                {ctaLabel}
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 p-4">
          <div>
            <p className="text-xl font-semibold">{name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {footer}
        </div>
      </div>

      {popular && (
        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-pink-500">
          Popular
        </Badge>
      )}
    </div>
  )
}
