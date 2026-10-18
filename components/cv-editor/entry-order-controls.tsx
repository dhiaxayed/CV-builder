'use client'

import { ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Reordering preserves entry IDs, so AI suggestions and open cards stay linked. */
export function moveEntry<T>(items:T[],index:number,direction:-1|1):T[] {
  const target=index+direction
  if (index<0 || index>=items.length || target<0 || target>=items.length) return items
  const next=[...items]
  ;[next[index],next[target]]=[next[target],next[index]]
  return next
}

export function EntryOrderControls({ index,count,label,onMove }:{
  index:number; count:number; label:string; onMove:(direction:-1|1) => void
}) {
  return <div className="flex shrink-0 flex-col gap-0.5 pl-1" role="group" aria-label={`Order ${label}`}>
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index===0}
      aria-label={`Move ${label} up`} title="Move up" onClick={() => onMove(-1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index===count-1}
      aria-label={`Move ${label} down`} title="Move down" onClick={() => onMove(1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
  </div>
}
