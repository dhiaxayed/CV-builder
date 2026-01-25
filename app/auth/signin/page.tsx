'use client'

import React from "react"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText, Sparkles, Shield, Zap, Mail, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Inbox, RefreshCw } from 'lucide-react'
import { Suspense } from 'react'
import Loading from './loading'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [sentToEmail, setSentToEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const { user } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setDevLink(null)
    
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send magic link')
      }
      
      setSentToEmail(email)
      setEmailSent(true)
      setResendCooldown(60) // 60 second cooldown for resend
      // In development, show the magic link
      if (data.devLink) {
        setDevLink(data.devLink)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sentToEmail }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend magic link')
      }
      
      setResendCooldown(60)
      if (data.devLink) {
        setDevLink(data.devLink)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setEmailSent(false)
    setSentToEmail('')
    setDevLink(null)
    setError(null)
  }
  
  return (
    <Suspense fallback={<Loading />}>
      <div className="min-h-screen bg-background flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground p-12 flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-8 w-8" />
              <span className="text-2xl font-bold">CV Builder</span>
            </div>
            <p className="text-primary-foreground/80">Create ATS-friendly resumes that get you hired</p>
          </div>
          
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary-foreground/10 rounded-lg">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">ATS-Optimized Templates</h3>
                <p className="text-primary-foreground/70 text-sm">
                  Our templates are designed to pass through Applicant Tracking Systems
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary-foreground/10 rounded-lg">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Smart Suggestions</h3>
                <p className="text-primary-foreground/70 text-sm">
                  Get real-time feedback on action verbs, metrics, and keyword optimization
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary-foreground/10 rounded-lg">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Job Description Matching</h3>
                <p className="text-primary-foreground/70 text-sm">
                  Tailor your CV to specific job postings with our keyword analysis
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-primary-foreground/60 text-sm">
            Trusted by thousands of job seekers worldwide
          </p>
        </div>
        
        {/* Right side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-2xl font-bold">CV Builder</span>
              </div>
              
              {emailSent ? (
                <>
                  {/* Success state - Email sent */}
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl text-green-700">Check Your Inbox!</CardTitle>
                  <CardDescription className="text-base mt-2">
                    We've sent a magic link to
                  </CardDescription>
                  <p className="font-semibold text-foreground mt-1">{sentToEmail}</p>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl">Sign in to CV Builder</CardTitle>
                  <CardDescription>
                    Enter your email to receive a magic link
                  </CardDescription>
                </>
              )}
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {emailSent ? (
                /* Email sent success view */
                <div className="space-y-6">
                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                        <Inbox className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 text-sm">What to do next:</h4>
                        <ol className="text-sm text-blue-800 mt-2 space-y-2 list-decimal list-inside">
                          <li>Open your email inbox</li>
                          <li>Look for an email from <strong>CV Builder</strong></li>
                          <li>Click the <strong>"Sign In"</strong> button in the email</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-amber-900 text-sm mb-2">💡 Can't find the email?</h4>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>• Check your <strong>spam</strong> or <strong>junk</strong> folder</li>
                      <li>• Make sure you entered the correct email</li>
                      <li>• The email may take a few minutes to arrive</li>
                    </ul>
                  </div>

                  {/* Link expiry notice */}
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>Link expires in 15 minutes for security</span>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-3 pt-2">
                    <Button 
                      onClick={handleResend}
                      variant="outline" 
                      className="w-full"
                      disabled={isLoading || resendCooldown > 0}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : resendCooldown > 0 ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Resend in {resendCooldown}s
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Resend magic link
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      onClick={handleBackToEmail}
                      variant="ghost" 
                      className="w-full"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Use a different email
                    </Button>
                  </div>
                </div>
              ) : (
                /* Email input form */
                <>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending magic link...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send magic link
                        </>
                      )}
                    </Button>
                  </form>
                  
                  <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No password needed. We will send you a secure link.
                    </p>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t">
                    <p className="text-xs text-center text-muted-foreground">
                      By signing in, you agree to our Terms of Service and Privacy Policy.
                      Your data is securely stored and never shared.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Suspense>
  )
}
