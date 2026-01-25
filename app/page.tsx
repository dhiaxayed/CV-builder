'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Shield, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  ArrowRight,
  Star,
  Users,
  TrendingUp,
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
  Play,
} from 'lucide-react'

// Animated counter component
function AnimatedCounter({ end, duration = 2000, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  
  useEffect(() => {
    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }, [end, duration])
  
  return <span>{count.toLocaleString()}{suffix}</span>
}

// Feature card with hover effect
function FeatureCard({ icon: Icon, title, description, badge }: { 
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  badge?: string
}) {
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/20">
      <CardContent className="pt-6">
        <div className="relative">
          {badge && (
            <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-pink-500">
              {badge}
            </Badge>
          )}
          <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 w-14 h-14 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Icon className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// Testimonial card
function TestimonialCard({ quote, author, role, company, avatar }: {
  quote: string
  author: string
  role: string
  company: string
  avatar: string
}) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardContent className="pt-6">
        <div className="flex gap-1 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
        <p className="text-lg mb-4 italic">&ldquo;{quote}&rdquo;</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold">
            {avatar}
          </div>
          <div>
            <p className="font-semibold">{author}</p>
            <p className="text-sm text-muted-foreground">{role} at {company}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Template preview card
function TemplatePreview({ name, style, popular }: { name: string; style: string; popular?: boolean }) {
  return (
    <div className="group relative">
      <div className="aspect-[3/4] rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 overflow-hidden border-2 border-transparent hover:border-primary transition-all shadow-lg hover:shadow-xl">
        <div className="absolute inset-0 p-4">
          <div className="h-4 w-20 bg-slate-300 dark:bg-slate-700 rounded mb-2" />
          <div className="h-2 w-32 bg-slate-200 dark:bg-slate-600 rounded mb-4" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-2 bg-slate-200 dark:bg-slate-600 rounded" style={{ width: `${90 - i * 10}%` }} />
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
          <Button className="opacity-0 group-hover:opacity-100 transition-opacity" size="sm">
            Use Template
          </Button>
        </div>
      </div>
      {popular && (
        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-pink-500">
          Popular
        </Badge>
      )}
      <p className="mt-3 font-medium text-center">{name}</p>
      <p className="text-sm text-muted-foreground text-center">{style}</p>
    </div>
  )
}

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [isLoading, user, router])
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <div className="animate-pulse flex items-center gap-3">
          <div className="p-3 bg-primary rounded-xl">
            <FileText className="h-8 w-8 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            CV Builder
          </span>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Announcement Banner */}
      <div className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white py-2 px-4 text-center text-sm">
        <span className="inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          <strong>NEW:</strong> AI-powered ATS scoring now available! Get instant feedback on your CV.
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
      
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CV Builder</span>
            <Badge variant="secondary" className="ml-2">Beta</Badge>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</a>
            <a href="#templates" className="text-sm font-medium hover:text-primary transition-colors">Templates</a>
            <a href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">Reviews</a>
            <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => router.push('/auth/signin')}>
              Sign In
            </Button>
            <Button onClick={() => router.push('/auth/signin')} className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90">
              Get Started Free
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />
        </div>
        
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4 px-4 py-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              #1 CV Builder for Job Seekers
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
              Create ATS-Friendly CVs
              <br />
              <span className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                That Get You Hired
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Build professional, ATS-optimized resumes with real-time scoring, 
              job description matching, and beautiful PDF exports. Join 50,000+ job seekers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" onClick={() => router.push('/auth/signin')} className="bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 text-lg h-14 px-8">
                Start Building for Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg h-14 px-8">
                <Play className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              ✓ No credit card required · ✓ Free forever plan · ✓ Export to PDF
            </p>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 p-8 rounded-2xl bg-card border shadow-lg">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">
                <AnimatedCounter end={50000} suffix="+" />
              </div>
              <p className="text-muted-foreground">CVs Created</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">
                <AnimatedCounter end={94} suffix="%" />
              </div>
              <p className="text-muted-foreground">ATS Pass Rate</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">
                <AnimatedCounter end={12000} suffix="+" />
              </div>
              <p className="text-muted-foreground">Interviews Landed</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">4.9</div>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Trusted By Section */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground mb-8">
            TRUSTED BY PROFESSIONALS FROM
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            {['Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix'].map((company) => (
              <span key={company} className="text-xl font-bold text-muted-foreground">{company}</span>
            ))}
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need to Land Your Dream Job
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful tools designed by recruiters and hiring managers to help you stand out.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Shield}
              title="ATS-Optimized Templates"
              description="Every template is tested against 50+ ATS systems to ensure your CV gets through."
              badge="Core"
            />
            <FeatureCard 
              icon={BarChart3}
              title="Real-Time ATS Scoring"
              description="Get instant feedback on action verbs, metrics, keywords, and formatting."
              badge="Popular"
            />
            <FeatureCard 
              icon={Target}
              title="Job Description Matching"
              description="Paste any job posting and see exactly which keywords you're missing."
            />
            <FeatureCard 
              icon={Layers}
              title="Version Control"
              description="Track every change, compare versions, and restore any previous draft."
            />
            <FeatureCard 
              icon={Download}
              title="PDF Export"
              description="Download professional PDFs with perfect formatting and ATS compatibility."
            />
            <FeatureCard 
              icon={Share2}
              title="Shareable Links"
              description="Get a unique URL to share your CV with recruiters and track views."
              badge="New"
            />
            <FeatureCard 
              icon={RefreshCw}
              title="Auto-Save"
              description="Never lose your work with automatic saving and draft recovery."
            />
            <FeatureCard 
              icon={Palette}
              title="Multiple Templates"
              description="Choose from 8+ professional templates for any industry."
            />
            <FeatureCard 
              icon={FileSearch}
              title="Smart Suggestions"
              description="AI-powered tips to improve each section of your CV."
            />
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-4xl font-bold mb-4">
              Build Your CV in 3 Simple Steps
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Choose a Template', desc: 'Pick from our ATS-tested professional templates', icon: Palette },
              { step: '2', title: 'Fill Your Details', desc: 'Add your experience, skills, and education with guided prompts', icon: FileText },
              { step: '3', title: 'Download & Apply', desc: 'Export to PDF and start applying with confidence', icon: Download },
            ].map(({ step, title, desc, icon: Icon }) => (
              <div key={step} className="relative">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground text-2xl font-bold mb-4">
                    {step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{title}</h3>
                  <p className="text-muted-foreground">{desc}</p>
                </div>
                {step !== '3' && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-4 h-8 w-8 text-muted-foreground/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Templates Section */}
      <section id="templates" className="py-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">16 Professional Templates</Badge>
            <h2 className="text-4xl font-bold mb-4">
              Professional Templates for Every Career
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose from our collection of 16 ATS-friendly templates designed for different industries and career levels.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
            {/* ATS-Friendly Row */}
            <TemplatePreview name="Modern" style="ATS-Friendly" popular />
            <TemplatePreview name="Classic" style="Professional" />
            <TemplatePreview name="Minimal" style="Clean & Simple" />
            <TemplatePreview name="Compact" style="Space-Efficient" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
            {/* Professional Row */}
            <TemplatePreview name="Professional" style="Executive Business" popular />
            <TemplatePreview name="Executive" style="C-Level & VP" />
            <TemplatePreview name="Banking" style="Corporate Finance" />
            <TemplatePreview name="Elegant" style="Premium Sidebar" popular />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-8">
            {/* Creative Row */}
            <TemplatePreview name="Creative" style="Visual Design" />
            <TemplatePreview name="Fancy" style="Decorative Style" />
            <TemplatePreview name="Bold" style="High Contrast" />
            <TemplatePreview name="Infographic" style="Visual Data" popular />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {/* Specialized Row */}
            <TemplatePreview name="Tech" style="Developer Focused" popular />
            <TemplatePreview name="Academic" style="Research & PhD" />
            <TemplatePreview name="Casual" style="Startup Friendly" />
            <TemplatePreview name="Vintage" style="Classic Elegance" />
          </div>
          
          <div className="text-center mt-12">
            <Button size="lg" onClick={() => router.push('/auth/signin')}>
              Browse All 16 Templates
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Testimonials</Badge>
            <h2 className="text-4xl font-bold mb-4">
              Loved by Job Seekers Worldwide
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <TestimonialCard
              quote="I was struggling to get interviews until I used CV Builder. The ATS scoring feature helped me optimize my resume and I landed 5 interviews in the first week!"
              author="Sarah Chen"
              role="Software Engineer"
              company="Google"
              avatar="SC"
            />
            <TestimonialCard
              quote="The job description matching feature is a game-changer. I can now tailor my CV for each application in minutes instead of hours."
              author="Michael Rodriguez"
              role="Product Manager"
              company="Stripe"
              avatar="MR"
            />
            <TestimonialCard
              quote="As a career coach, I recommend CV Builder to all my clients. The templates are professional and the ATS optimization is spot-on."
              author="Jennifer Williams"
              role="Career Coach"
              company="CareerPro"
              avatar="JW"
            />
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-4xl font-bold mb-4">
              Start Free, Upgrade When Ready
            </h2>
            <p className="text-xl text-muted-foreground">
              No hidden fees. No credit card required.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="border-2">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <p className="text-muted-foreground mb-4">Perfect for getting started</p>
                <div className="text-4xl font-bold mb-6">$0<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                <ul className="space-y-3 mb-6">
                  {['1 CV', 'All templates', 'PDF export', 'ATS scoring', 'Version history'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant="outline" onClick={() => router.push('/auth/signin')}>
                  Get Started Free
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg">
                Popular
              </div>
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-2">Pro</h3>
                <p className="text-muted-foreground mb-4">For serious job seekers</p>
                <div className="text-4xl font-bold mb-6">$9<span className="text-lg font-normal text-muted-foreground">/month</span></div>
                <ul className="space-y-3 mb-6">
                  {['Unlimited CVs', 'All templates', 'PDF export', 'ATS scoring', 'Job description matching', 'Priority support', 'Remove branding'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full bg-gradient-to-r from-primary to-purple-600" onClick={() => router.push('/auth/signin')}>
                  Start 7-Day Free Trial
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-primary via-purple-600 to-pink-600 text-white">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Ready to Land Your Dream Job?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join 50,000+ job seekers who have transformed their job search with CV Builder.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg h-14 px-8"
              onClick={() => router.push('/auth/signin')}
            >
              Create Your CV Now
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
          <p className="text-sm text-white/60 mt-4">
            Free forever plan available · No credit card required
          </p>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary rounded-lg">
                  <FileText className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold">CV Builder</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Build professional, ATS-friendly CVs that get you hired.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary">Features</a></li>
                <li><a href="#templates" className="hover:text-primary">Templates</a></li>
                <li><a href="#pricing" className="hover:text-primary">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Blog</a></li>
                <li><a href="#" className="hover:text-primary">CV Tips</a></li>
                <li><a href="#" className="hover:text-primary">Career Advice</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} CV Builder. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <Users className="h-5 w-5 text-muted-foreground" />
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
