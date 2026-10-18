'use client'

import { useEffect, useRef, useState } from 'react'
import { LatestTask } from '@/lib/latest-task'
import type { CVData } from '@/lib/types/cv'
import type { RenderDensity } from '@/lib/latex/generator'

type Input = { data:CVData; template:string; pageMode:'one-page'|'multi-page' }
type Compiled = Input & { density:RenderDensity; pages:number; url:string }
type Result = { blob:Blob; pages:number; density:RenderDensity }

export function usePDFPreview(data:CVData|null, template:string|undefined, pageMode:Input['pageMode'], enabled:boolean, attempt:number) {
  const [compiled,setCompiled]=useState<Compiled|null>(null)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState<{ message:string; code:string|null }|null>(null)
  const queue=useRef<LatestTask<Input,Result>|null>(null)
  const current=useRef<Compiled|null>(null)

  useEffect(() => {
    const task=new LatestTask<Input,Result>(async (input,isCurrent) => {
      // Other editors may occupy the two renderer slots. Retry briefly without
      // overlapping this editor's own work or retrying superseded drafts.
      for (let retry=0; ; retry++) {
        const response=await fetch('/api/pdf',{
          method:'POST',headers:{ 'Content-Type':'application/json' },cache:'no-store',signal:AbortSignal.timeout(180000),
          body:JSON.stringify({ cvData:input.data,templateId:input.template,pageMode:input.pageMode,format:'pdf',intent:'preview' }),
        })
        if (!response.ok) {
          const problem=await response.json().catch(() => ({}))
          if (problem.code==='RENDER_BUSY' && retry<2 && isCurrent()) {
            await new Promise(resolve => setTimeout(resolve,1500*(retry+1)))
            if (!isCurrent()) throw new Error('Superseded preview')
            continue
          }
          throw Object.assign(new Error(problem.message || problem.error || 'Unable to compile the PDF. Please retry.'),{ code:problem.code || null })
        }
        const blob=await response.blob()
        const density=response.headers.get('X-CV-PDF-Density')
        // Blob URLs are created only for results the queue will display.
        return { blob,pages:Number(response.headers.get('X-CV-PDF-Pages')) || 1,density:density==='compact'||density==='dense' ? density : 'normal' }
      }
    },(result,input) => {
      const next={ ...input,pages:result.pages,density:result.density,url:URL.createObjectURL(result.blob) }
      const previous=current.current
      current.current=next
      setCompiled(next); setError(null); setLoading(false)
      if (previous) URL.revokeObjectURL(previous.url)
    },error => {
      setError({ message:error instanceof Error ? error.message : 'PDF preview failed',code:error instanceof Error && 'code' in error ? String(error.code || '') : null })
      setLoading(false)
    })
    queue.current=task
    return () => { task.dispose(); queue.current=null; if (current.current) URL.revokeObjectURL(current.current.url); current.current=null }
  },[])

  useEffect(() => {
    if (!enabled || !data || !template) { queue.current?.pause(); setLoading(false); return }
    setError(null); setLoading(true)
    queue.current?.schedule({ data,template,pageMode })
  },[data,template,pageMode,enabled,attempt])

  const stale=Boolean(compiled && (compiled.data!==data || compiled.template!==template || compiled.pageMode!==pageMode))
  return { compiled,loading,error,stale }
}
