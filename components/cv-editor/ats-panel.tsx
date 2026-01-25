'use client'

import { CVData, ATSReport } from '@/lib/types/cv'
import { runATSChecks } from '@/lib/ats/checker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Shield, CheckCircle2, AlertTriangle, XCircle, ChevronDown, Lightbulb } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

interface ATSPanelProps {
  data: CVData
}

export function ATSPanel({ data }: ATSPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sections', 'bullets']))
  
  const report = useMemo(() => runATSChecks(data), [data])
  
  const scoreColor = report.overallScore >= 70 ? 'text-green-600' : 
                     report.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600'
  
  const scoreLabel = report.overallScore >= 70 ? 'Good' : 
                     report.overallScore >= 50 ? 'Needs Work' : 'Poor'
  
  // Group checks by category
  const groupedChecks = useMemo(() => {
    const groups: Record<string, typeof report.checks> = {}
    report.checks.forEach(check => {
      if (!groups[check.category]) {
        groups[check.category] = []
      }
      groups[check.category].push(check)
    })
    return groups
  }, [report.checks])
  
  const categoryLabels: Record<string, string> = {
    sections: 'Section Completeness',
    length: 'Content Length',
    bullets: 'Bullet Points',
    verbs: 'Action Verbs',
    dates: 'Date Consistency',
    keywords: 'Keywords & Skills',
    format: 'Formatting',
  }
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }
  
  const getStatusIcon = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }
  
  const getCategoryStatus = (checks: typeof report.checks) => {
    const hasFail = checks.some(c => c.status === 'fail')
    const hasWarning = checks.some(c => c.status === 'warning')
    if (hasFail) return 'fail'
    if (hasWarning) return 'warning'
    return 'pass'
  }
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5" />
          ATS Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Overview */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className={cn("text-4xl font-bold mb-1", scoreColor)}>
            {report.overallScore}%
          </div>
          <div className="text-sm text-muted-foreground">
            ATS Compatibility: <span className={scoreColor}>{scoreLabel}</span>
          </div>
          <Progress value={report.overallScore} className="mt-3 h-2" />
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-green-50 rounded">
            <div className="font-bold text-green-700">
              {report.checks.filter(c => c.status === 'pass').length}
            </div>
            <div className="text-green-600">Passed</div>
          </div>
          <div className="p-2 bg-yellow-50 rounded">
            <div className="font-bold text-yellow-700">
              {report.checks.filter(c => c.status === 'warning').length}
            </div>
            <div className="text-yellow-600">Warnings</div>
          </div>
          <div className="p-2 bg-red-50 rounded">
            <div className="font-bold text-red-700">
              {report.checks.filter(c => c.status === 'fail').length}
            </div>
            <div className="text-red-600">Failed</div>
          </div>
        </div>
        
        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Top Recommendations</span>
            </div>
            <ul className="space-y-1">
              {report.recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Detailed Checks */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {Object.entries(groupedChecks).map(([category, checks]) => (
              <Collapsible
                key={category}
                open={expandedCategories.has(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full p-2 rounded hover:bg-muted/50">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(getCategoryStatus(checks))}
                      <span className="text-sm font-medium">
                        {categoryLabels[category] || category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {checks.filter(c => c.status === 'pass').length}/{checks.length}
                      </Badge>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-6 space-y-1 pb-2">
                    {checks.map(check => (
                      <div key={check.id} className="flex items-start gap-2 p-2 rounded bg-muted/30">
                        {getStatusIcon(check.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{check.name}</p>
                          {check.details && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {check.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
