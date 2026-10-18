'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TEMPLATES } from '@/lib/templates'

const featured = ['modern', 'creative', 'executive', 'architect', 'timeline', 'editorial'].map(id => TEMPLATES.find(template => template.id === id)!)

export function LandingShowcase() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (paused || interacting || preference.matches) return
    const interval = window.setInterval(() => {
      if (!preference.matches) setIndex(value => (value + 1) % featured.length)
    }, 5500)
    return () => window.clearInterval(interval)
  }, [paused, interacting])
  const active = featured[index]
  return (
    <div className="showcase mx-auto max-w-4xl" data-paused={paused || interacting}
      onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false) }}>
      <div className="showcase-stage relative mx-auto h-80 sm:h-[420px]" aria-label="Featured CV designs">
        <div className="showcase-orbit" aria-hidden="true" />
        {[-1, 0, 1].map(offset => {
          const template = featured[(index + offset + featured.length) % featured.length]
          return <div key={`${offset}-${template.id}`} className={`showcase-sheet showcase-sheet-${offset === 0 ? 'center' : offset < 0 ? 'left' : 'right'}`} aria-hidden={offset !== 0}>
            <Image src={template.preview} alt={`${template.name} CV layout`} width={650} height={920} loading="eager" fetchPriority={offset === 0 ? 'high' : 'auto'} className="h-auto w-full rounded-sm" />
          </div>
        })}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div className="relative z-30 flex items-center justify-center gap-4 py-4">
        <Button variant="outline" size="icon" aria-label="Previous featured template" onClick={() => setIndex(value => (value - 1 + featured.length) % featured.length)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-32 text-center"><p className="text-sm font-semibold">{active.name}</p><p className="text-xs text-muted-foreground">{active.category}</p></div>
        <Button variant="outline" size="icon" aria-label="Next featured template" onClick={() => setIndex(value => (value + 1) % featured.length)}><ArrowRight className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" aria-label={paused ? 'Play template animation' : 'Pause template animation'} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</Button>
      </div>
    </div>
  )
}
