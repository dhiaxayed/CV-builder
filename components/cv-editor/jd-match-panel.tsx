'use client'

import { useState, useMemo } from 'react'
import { CVData } from '@/lib/types/cv'
import { matchJobDescription } from '@/lib/ats/checker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileSearch, CheckCircle2, XCircle, Sparkles, Copy, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JDMatchPanelProps {
  data: CVData
  onCreateTailoredVersion?: (suggestions: string[]) => void
}

export function JDMatchPanel({ data, onCreateTailoredVersion }: JDMatchPanelProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  
  const matchResult = useMemo(() => {
    if (!jobDescription.trim()) return null
    return matchJobDescription(data, jobDescription)
  }, [data, jobDescription])
  
  const handleAnalyze = () => {
    if (jobDescription.trim()) {
      setHasAnalyzed(true)
    }
  }
  
  const handleClear = () => {
    setJobDescription('')
    setHasAnalyzed(false)
  }
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileSearch className="h-5 w-5" />
          Job Description Match
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnalyzed ? (
          <>
            <p className="text-sm text-muted-foreground">
              Paste a job description to analyze keyword matches and get suggestions for tailoring your CV.
            </p>
            <Textarea
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[200px] text-sm"
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={!jobDescription.trim()}
              className="w-full"
            >
              <FileSearch className="h-4 w-4 mr-2" />
              Analyze Match
            </Button>
          </>
        ) : matchResult ? (
          <ScrollArea className="h-[450px] pr-4">
            <div className="space-y-4">
              {/* Score */}
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className={cn(
                  "text-4xl font-bold mb-1",
                  matchResult.score >= 70 ? 'text-green-600' : 
                  matchResult.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {matchResult.score}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Keyword Match Score
                </div>
                <Progress value={matchResult.score} className="mt-3 h-2" />
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 bg-green-50 rounded">
                  <div className="font-bold text-green-700">
                    {matchResult.matchedKeywords.length}
                  </div>
                  <div className="text-green-600">Matched</div>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <div className="font-bold text-red-700">
                    {matchResult.missingKeywords.length}
                  </div>
                  <div className="text-red-600">Missing</div>
                </div>
              </div>
              
              {/* Suggestions */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Suggestions</span>
                </div>
                <ul className="space-y-1">
                  {matchResult.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Matched Keywords */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Matched Keywords</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {matchResult.matchedKeywords.length > 0 ? (
                    matchResult.matchedKeywords.map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No keywords matched</p>
                  )}
                </div>
              </div>
              
              {/* Missing Keywords */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Missing Keywords</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {matchResult.missingKeywords.length > 0 ? (
                    matchResult.missingKeywords.slice(0, 20).map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="bg-red-100 text-red-700 text-xs">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Great! All keywords covered</p>
                  )}
                </div>
                {matchResult.missingKeywords.length > 20 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +{matchResult.missingKeywords.length - 20} more
                  </p>
                )}
              </div>
              
              {/* Actions */}
              <div className="space-y-2 pt-2">
                {onCreateTailoredVersion && matchResult.missingKeywords.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full bg-transparent"
                    onClick={() => onCreateTailoredVersion(matchResult.suggestions)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Tailored Version
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={handleClear}
                >
                  Analyze Different Job
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </CardContent>
    </Card>
  )
}
