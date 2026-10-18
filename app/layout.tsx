import React from "react"
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

// Bundle the original typefaces so a font service outage cannot change the UI.
const geist = localFont({ src: './fonts/Geist.woff2', variable: '--font-geist-sans', weight: '100 900', display: 'swap' })
const geistMono = localFont({ src: './fonts/GeistMono.woff2', variable: '--font-geist-mono', weight: '100 900', display: 'swap' })


export const metadata: Metadata = {
  title: 'CV Builder - Create ATS-Friendly Resumes',
  description: 'Build professional, ATS-optimized CVs with real-time feedback, job description matching, and beautiful LaTeX-generated PDFs.',
  generator: 'cv-builder',
  icons: {
    shortcut: '/favicon.ico',
    icon: [
      {
        url: '/favicon.ico',
        sizes: '32x32',
      },
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
