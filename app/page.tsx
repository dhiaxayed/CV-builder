'use client'

import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TemplatePreviewCard } from '@/components/template-preview-card'
import {
  FileText,
  Shield,
  Sparkles,
  ArrowRight,
  Download,
  Globe,
  Clock,
  Target,
  BarChart3,
  Layers,
  RefreshCw,
  Share2,
  FileSearch,
  Palette,
  ChevronRight,
} from 'lucide-react'

const TEMPLATE_GROUPS = [
  [
    { id: 'modern', name: 'Modern', style: 'ATS-Friendly', popular: true },
    { id: 'classic', name: 'Classic', style: 'Professional' },
    { id: 'minimal', name: 'Minimal', style: 'Clean & Simple' },
    { id: 'compact', name: 'Compact', style: 'Space-Efficient' },
  ],
  [
    { id: 'professional', name: 'Professional', style: 'Executive Business', popular: true },
    { id: 'executive', name: 'Executive', style: 'Leadership Focused' },
    { id: 'banking', name: 'Banking', style: 'Corporate Finance' },
    { id: 'elegant', name: 'Elegant', style: 'Premium Sidebar', popular: true },
  ],
  [
    { id: 'creative', name: 'Creative', style: 'Visual Design' },
    { id: 'fancy', name: 'Fancy', style: 'Decorative Style' },
    { id: 'bold', name: 'Bold', style: 'High Contrast' },
    { id: 'infographic', name: 'Infographic', style: 'Visual Data', popular: true },
  ],
  [
    { id: 'tech', name: 'Tech', style: 'Developer Focused', popular: true },
    { id: 'academic', name: 'Academic', style: 'Research & PhD' },
    { id: 'casual', name: 'Casual', style: 'Startup Friendly' },
    { id: 'vintage', name: 'Vintage', style: 'Classic Elegance' },
  ],
]

const HERO_SIGNALS = [
  {
    label: 'ATS readiness',
    value: '92%',
    detail: 'Checks structure, keywords, readability, and recruiter scan quality.',
  },
  {
    label: 'Template coverage',
    value: '16 templates',
    detail: 'Professional layouts with consistent hierarchy and spacing.',
  },
  {
    label: 'AI workflow',
    value: 'No code',
    detail: 'No LaTeX or coding background needed. Prompt the AI and export.',
  },
]

function FeatureCard({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  badge?: string
}) {
  const badgeClassName =
    badge === 'Popular'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : badge === 'New'
        ? 'border-sky-200 bg-sky-50 text-sky-700'
        : 'border-zinc-200 bg-zinc-50 text-zinc-700'

  return (
    <Card className="group border border-zinc-200/90 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-zinc-400 hover:shadow-[0_18px_45px_rgba(24,24,27,0.08)]">
      <CardContent className="pt-6">
        <div className="relative">
          {badge && (
            <Badge className={`absolute -top-2 -right-2 gap-1.5 border px-2.5 py-1 text-[11px] font-semibold ${badgeClassName}`}>
              {badge === 'Popular' && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
              )}
              {badge}
            </Badge>
          )}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100 transition-transform group-hover:scale-105">
            <Icon className="h-7 w-7 text-zinc-900" />
          </div>
        </div>
        <h3 className="mb-2 text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function GreenBullet({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
      <span className="leading-6">{children}</span>
    </li>
  )
}

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [ctaPointer, setCtaPointer] = useState({ x: 50, y: 50, active: false })

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [isLoading, user, router])

  const handleCtaPointerMove = (event: MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()

    setCtaPointer({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
      active: true,
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex animate-pulse items-center gap-3">
          <div className="rounded-xl bg-primary p-3">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <span className="bg-linear-to-r from-zinc-950 to-zinc-600 bg-clip-text text-2xl font-bold text-transparent">
            CV Builder
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="executive-strip bg-zinc-950 px-4 py-2 text-center text-sm text-white">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <Badge className="border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.18em] text-white">
            New
          </Badge>
          <span>AI-powered ATS scoring now available. Get instant feedback on your CV.</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>

      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-2">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CV Builder</span>
            <Badge variant="secondary" className="ml-2">
              Beta
            </Badge>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm font-medium transition-colors hover:text-primary">
              Features
            </a>
            <a href="#templates" className="text-sm font-medium transition-colors hover:text-primary">
              Templates
            </a>
            <a href="#pricing" className="text-sm font-medium transition-colors hover:text-primary">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.push('/auth/signin')}>
              Sign In
            </Button>
            <Button
              onClick={() => router.push('/auth/signin')}
              className="bg-slate-950 text-white hover:bg-slate-800"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b bg-white px-4 py-20">
        <div className="landing-grid pointer-events-none absolute inset-0" />

        <div className="container mx-auto max-w-6xl">
          <div className="motion-fade-up relative mb-8 text-center">
            <Badge variant="outline" className="mb-4 border-zinc-300 bg-white/80 px-4 py-1 text-zinc-700">
              <Sparkles className="mr-1 h-3 w-3" />
              No LaTeX. No code. AI-powered.
            </Badge>
            <h1 className="mb-6 bg-linear-to-r from-slate-950 via-slate-800 to-slate-950 bg-clip-text text-5xl font-bold text-transparent dark:from-white dark:via-slate-200 dark:to-white md:text-7xl">
              Create ATS-Friendly CVs
              <br />
              <span className="bg-linear-to-r from-zinc-950 via-zinc-600 to-zinc-950 bg-clip-text text-transparent">
                With Templates You Can Actually Preview
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl text-muted-foreground">
              Tell the AI what role you are targeting. It helps structure, refine, and export a polished
              CV without requiring any LaTeX or coding background.
            </p>
            <div className="mb-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                onClick={() => router.push('/auth/signin')}
                className="h-14 bg-slate-950 px-8 text-lg text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-transform hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Start Building for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required | Free forever plan | Export to PDF
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-5xl">
            <div className="signal-panel rounded-lg border border-zinc-200 bg-white/95 shadow-[0_24px_70px_rgba(24,24,27,0.08)] backdrop-blur">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Product signals
                  </p>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
                    A clear snapshot of the product value: AI guidance, structured templates, and clean export readiness.
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700">
                  AI assisted
                </Badge>
              </div>

              <div className="grid divide-y divide-zinc-200 md:grid-cols-3 md:divide-x md:divide-y-0">
                {HERO_SIGNALS.map((signal) => (
                  <div
                    key={signal.label}
                    className="p-5"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">{signal.label}</p>
                    <p className="mt-3 text-2xl font-semibold text-zinc-950">{signal.value}</p>
                    <p className="text-sm leading-6 text-zinc-600">{signal.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-24">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              Features
            </Badge>
            <h2 className="mb-4 text-4xl font-bold">Everything You Need to Build a Stronger CV</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Focused tools for editing, tailoring, and exporting your CV with fewer distractions.
            </p>
          </div>

          <div className="motion-fade-up-delay grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Shield}
              title="ATS-Optimized Templates"
              description="Use layouts designed to stay readable for both recruiters and applicant tracking systems."
              badge="Core"
            />
            <FeatureCard
              icon={BarChart3}
              title="Real-Time ATS Scoring"
              description="Get direct feedback on keywords, action verbs, formatting, and measurable impact."
              badge="Popular"
            />
            <FeatureCard
              icon={Target}
              title="Job Description Matching"
              description="Compare your CV against a target role and see what is missing before you apply."
            />
            <FeatureCard
              icon={Layers}
              title="Version Control"
              description="Track drafts, compare revisions, and restore an earlier version when needed."
            />
            <FeatureCard
              icon={Download}
              title="PDF Export"
              description="Generate template-accurate PDF exports directly from the template you selected."
            />
            <FeatureCard
              icon={Share2}
              title="Shareable Links"
              description="Publish a clean share link for recruiters without sending editable files around."
              badge="New"
            />
            <FeatureCard
              icon={RefreshCw}
              title="Auto-Save"
              description="Keep your edits safe with automatic saving while you iterate on each section."
            />
            <FeatureCard
              icon={Palette}
              title="Multiple Templates"
              description="Switch between sixteen layouts to match your role, industry, and seniority."
            />
            <FeatureCard
              icon={FileSearch}
              title="Smart Suggestions"
              description="Use built-in guidance to tighten language and improve the quality of each section."
            />
          </div>
        </div>
      </section>

      <section className="bg-zinc-50 px-4 py-24">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              How It Works
            </Badge>
            <h2 className="mb-4 text-4xl font-bold">Build Your CV in 3 Simple Steps</h2>
          </div>

          <div className="step-flow grid gap-8 md:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Choose a Template',
                desc: 'Preview the actual layout before you start editing',
                icon: Palette,
              },
              {
                step: '2',
                title: 'Fill Your Details',
                desc: 'Add your experience, skills, and education with guided editing',
                icon: FileText,
              },
              {
                step: '3',
                title: 'Download & Apply',
                desc: 'Export to PDF and tailor versions for different roles',
                icon: Download,
              },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="step-flow-card relative rounded-lg border border-zinc-200 bg-white p-6 text-center shadow-[0_12px_35px_rgba(24,24,27,0.05)]">
                <div className="relative z-10 flex h-full flex-col items-center">
                  <div className="step-flow-node mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-[0_12px_30px_rgba(24,24,27,0.14)]">
                    <Icon className="h-7 w-7" />
                  </div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                    Step {step}
                  </p>
                  <h3 className="mb-2 text-xl font-semibold">{title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="templates" className="px-4 py-24">
        <div className="container mx-auto max-w-7xl">
          <div className="motion-fade-up mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              16 Professional Templates
            </Badge>
            <h2 className="mb-4 text-4xl font-bold">Preview the Templates Directly on the Landing Page</h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Each card below renders a real sample CV preview so visitors see an actual template, not an
              empty placeholder.
            </p>
          </div>

          <div className="motion-fade-up-delay space-y-8">
            {TEMPLATE_GROUPS.map((group, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-4">
                {group.map((template) => (
                  <TemplatePreviewCard
                    key={template.id}
                    templateId={template.id}
                    name={template.name}
                    subtitle={template.style}
                    popular={template.popular}
                    onClick={() => router.push('/auth/signin')}
                    ctaLabel="Use Template"
                  />
                ))}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button size="lg" onClick={() => router.push('/auth/signin')}>
              Browse All 16 Templates
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section id="pricing" className="px-4 py-24">
        <div className="container mx-auto max-w-4xl">
          <div className="motion-fade-up mb-16 text-center">
            <Badge variant="outline" className="mb-4">
              Pricing
            </Badge>
            <h2 className="mb-4 text-4xl font-bold">Start Free, Upgrade When Ready</h2>
            <p className="text-xl text-muted-foreground">Clear plan limits aligned with the real product behavior.</p>
          </div>

          <div className="motion-fade-up-delay mx-auto grid max-w-3xl gap-8 md:grid-cols-2">
            <Card className="border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
              <CardContent className="pt-6">
                <h3 className="mb-2 text-2xl font-bold">Free</h3>
                <p className="mb-4 text-muted-foreground">Perfect for getting started</p>
                <div className="mb-6 text-4xl font-bold">
                  $0<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <ul className="mb-6 space-y-3">
                  {[
                    '1 CV total (enforced)',
                    'All 16 templates',
                    'AI ATS review',
                    'PDF export',
                    'Version history',
                    'Shareable CV link',
                  ].map((feature) => (
                    <GreenBullet key={feature}>{feature}</GreenBullet>
                  ))}
                </ul>
                <Button className="w-full" variant="outline" onClick={() => router.push('/auth/signin')}>
                  Get Started Free
                </Button>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 border-zinc-950 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(24,24,27,0.12)]">
              <div
                className="absolute top-0 right-0 flex items-center gap-1.5 rounded-bl-lg border border-emerald-200 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700 shadow-[0_10px_30px_rgba(24,24,27,0.06)]"
                style={{
                  backgroundImage: 'linear-gradient(90deg, rgb(236 253 245), rgb(220 252 231), rgb(240 253 244))',
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                Popular
              </div>
              <CardContent className="pt-6">
                <h3 className="mb-2 text-2xl font-bold">Pro</h3>
                <p className="mb-4 text-muted-foreground">For serious job seekers</p>
                <div className="mb-6 text-4xl font-bold">
                  $9<span className="text-lg font-normal text-muted-foreground">/month</span>
                </div>
                <ul className="mb-6 space-y-3">
                  {[
                    'Everything in Free',
                    'Unlimited CVs',
                    'AI job description tailoring',
                    'Keyword gap analysis',
                    'Tailored summary and bullet rewrite package',
                    'Saved job-targeting history',
                  ].map((feature) => (
                    <GreenBullet key={feature}>{feature}</GreenBullet>
                  ))}
                </ul>
                <Button
                  className="w-full bg-slate-950 text-white hover:bg-slate-800"
                  onClick={() => router.push('/auth/signin')}
                >
                  Sign in for Pro access
                </Button>
              </CardContent>
            </Card>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Free includes one polished CV. Pro adds unlimited CVs, advanced AI tailoring, and saved job-targeting history.
          </p>
        </div>
      </section>

      <section
        className={`cta-stage relative overflow-hidden bg-zinc-950 px-4 py-24 text-white ${ctaPointer.active ? 'cta-stage-active' : ''}`}
        style={
          {
            '--cta-x': `${ctaPointer.x}%`,
            '--cta-y': `${ctaPointer.y}%`,
          } as CSSProperties
        }
        onMouseMove={handleCtaPointerMove}
        onMouseLeave={() => setCtaPointer((current) => ({ ...current, active: false }))}
      >
        <div className="cta-interactive-field pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="cta-cursor-mark pointer-events-none absolute hidden h-20 w-20 -translate-x-1/2 -translate-y-1/2 md:block"
          style={{
            left: `${ctaPointer.x}%`,
            top: `${ctaPointer.y}%`,
            opacity: ctaPointer.active ? 1 : 0,
          }}
          aria-hidden="true"
        >
          <span className="cta-cursor-cross cta-cursor-cross-x" />
          <span className="cta-cursor-cross cta-cursor-cross-y" />
        </div>
        <div className="container relative mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge className="mb-5 border border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/10">
              AI-powered CV building
            </Badge>
            <h2 className="mb-5 max-w-2xl text-4xl font-bold md:text-5xl">
              Ready to Build a Stronger CV?
            </h2>
            <p className="mb-8 max-w-xl text-lg leading-8 text-zinc-300">
              No coding, no LaTeX setup, no formatting guesswork. Prompt the AI, refine your content, and export a polished CV from a real template.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                variant="secondary"
                className="h-14 px-8 text-lg transition-transform hover:-translate-y-0.5"
                onClick={() => router.push('/auth/signin')}
              >
                Create Your CV Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <span className="text-sm text-zinc-400">Free plan available. No credit card required.</span>
            </div>
          </div>

          <div
            className="cta-flow rounded-lg border border-white/10 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-md"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
          >
            {[
              { label: 'Template selected', detail: 'Structure and hierarchy locked', icon: Palette },
              { label: 'Content refined', detail: 'ATS review and role targeting applied', icon: Sparkles },
              { label: 'Export ready', detail: 'PDF, LaTeX, and share link prepared', icon: Download },
            ].map(({ label, detail, icon: Icon }) => (
              <div key={label} className="cta-flow-row">
                <div className="cta-flow-icon">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-sm text-zinc-400">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t px-4 py-12">
        <div className="container mx-auto">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-lg bg-primary p-2">
                  <FileText className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">CV Builder</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Build professional, ATS-friendly CVs with editable templates and accurate PDF export.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-primary">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#templates" className="hover:text-primary">
                    Templates
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-primary">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Plans</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Free: 1 CV</li>
                <li>Pro: unlimited CVs and AI tailoring</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Exports</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>PDF</li>
                <li>LaTeX source</li>
                <li>JSON backup</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t pt-8 md:flex-row">
            <p className="text-sm text-muted-foreground">
              (c) {new Date().getFullYear()} CV Builder. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
