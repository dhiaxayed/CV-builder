'use client'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText } from 'lucide-react'

interface SectionSummaryProps {
  data: string
  onChange: (data: string) => void
}

export function SectionSummary({ data, onChange }: SectionSummaryProps) {
  const charCount = data.length
  const isOptimal = charCount >= 50 && charCount <= 300
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5" />
          Professional Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          placeholder="Experienced professional with expertise in... Proven track record of..."
          value={data}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[120px]"
        />
        <div className="flex items-center justify-between text-xs">
          <span className={`${isOptimal ? 'text-green-600' : charCount > 300 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
            {charCount} characters {isOptimal ? '(optimal)' : charCount > 300 ? '(consider shortening)' : '(50-300 recommended)'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: Write a compelling summary highlighting your key achievements and what you bring to the role
        </p>
      </CardContent>
    </Card>
  )
}
