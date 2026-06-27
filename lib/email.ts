// Email service for magic links and onboarding messages.
// In production, email delivery must use a real provider; console mode is dev-only.

import nodemailer from 'nodemailer'
import { resolveAppBaseUrl } from '@/lib/app-url'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function getMagicLinkEmail(verifyUrl: string, email: string): { html: string; text: string } {
  const currentYear = new Date().getFullYear()
  const safeVerifyUrl = escapeHtml(verifyUrl)
  const safeEmail = escapeHtml(email)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Sign in to CV Builder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: Helvetica, Arial, sans-serif;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Your secure sign-in link for CV Builder is ready.
  </div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fafafa;">
    <tr>
      <td align="center" style="padding: 60px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e5e5e5;">
          <tr>
            <td style="padding: 48px 48px 40px 48px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 300; color: #1a1a1a; letter-spacing: 2px; text-transform: uppercase;">
                CV Builder
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 48px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 400; color: #1a1a1a; text-align: center;">
                Sign in to your account
              </h2>
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #666666; line-height: 1.6; text-align: center;">
                Click the button below to securely access your account. No password required.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${safeVerifyUrl}" target="_blank" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 16px 48px; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">
                      Sign In
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; font-size: 13px; color: #999999; text-align: center;">
                This link expires in 15 minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 48px; background-color: #fafafa; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0; font-size: 13px; color: #888888; line-height: 1.6; text-align: center;">
                This sign-in request was made for <strong style="color: #666666;">${safeEmail}</strong>.<br>
                If you did not request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0 0; font-size: 12px; color: #b0b0b0;">
          &copy; ${currentYear} CV Builder
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `
CV BUILDER
----------------------------------------

Sign in to your account

Click the link below to securely access your account:
${verifyUrl}

This link expires in 15 minutes.

This sign-in request was made for: ${email}
If you did not request this, you can safely ignore this email.

(c) ${currentYear} CV Builder
  `.trim()

  return { html, text }
}

export function getWelcomeEmail(name: string): { html: string; text: string } {
  const appUrl = resolveAppBaseUrl()
  const safeName = escapeHtml(name || 'there')
  const safeAppUrl = escapeHtml(appUrl)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1f2937; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">Welcome to CV Builder</h1>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333333; margin-top: 0;">Hi ${safeName}!</h2>
    <p style="color: #666666;">
      You can now create ATS-friendly CVs, review them, save versions, share public links, and export files.
    </p>
    <h3 style="color: #333333;">Available workflows</h3>
    <ul style="color: #666666;">
      <li>Create CVs according to your plan limits</li>
      <li>Run ATS compatibility scoring</li>
      <li>Match your CV against job descriptions</li>
      <li>Track different versions of your CV</li>
      <li>Share your CV with a unique link</li>
      <li>Export PDF, LaTeX, and JSON files</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${safeAppUrl}/dashboard" style="display: inline-block; background: #1f2937; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Go to Dashboard
      </a>
    </div>
  </div>
</body>
</html>
  `.trim()

  const text = `
Welcome to CV Builder

Hi ${name || 'there'}!

Available workflows:
- Create CVs according to your plan limits
- Run ATS compatibility scoring
- Match your CV against job descriptions
- Track different versions of your CV
- Share your CV with a unique link
- Export PDF, LaTeX, and JSON files

Get started: ${appUrl}/dashboard
  `.trim()

  return { html, text }
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER || 'console'

  switch (provider) {
    case 'resend':
      return sendWithResend(options)
    case 'smtp':
      return sendWithSMTP(options)
    case 'console':
    default:
      if (process.env.NODE_ENV === 'production') {
        return { success: false, error: 'Email provider is not configured for production' }
      }
      return sendToConsole(options)
  }
}

async function sendWithResend(options: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'RESEND_API_KEY is not configured' }
    }
    console.warn('[Email] RESEND_API_KEY not configured, falling back to console')
    return sendToConsole(options)
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'CV Builder <noreply@cvbuilder.app>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || 'Failed to send email')
    }

    const data = (await response.json()) as { id?: string }
    console.log('[Email] Sent via Resend:', data.id)
    return { success: true, messageId: data.id }
  } catch (error) {
    console.error('[Email] Resend error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function sendWithSMTP(options: EmailOptions): Promise<EmailResult> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number.parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user

  if (!user || !pass || !from) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, error: 'SMTP credentials are not configured' }
    }
    console.warn('[Email] SMTP credentials not configured, falling back to console')
    return sendToConsole(options)
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    })

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    console.log('[Email] Sent via SMTP:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[Email] SMTP error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function sendToConsole(options: EmailOptions): Promise<EmailResult> {
  console.log('\n' + '='.repeat(60))
  console.log('EMAIL (Console Mode)')
  console.log('='.repeat(60))
  console.log(`To: ${options.to}`)
  console.log(`Subject: ${options.subject}`)
  console.log('-'.repeat(60))
  console.log('Text Content:')
  console.log(options.text || '(no text content)')
  console.log('='.repeat(60) + '\n')

  return { success: true, messageId: `console-${Date.now()}` }
}

export async function sendMagicLinkEmail(email: string, verifyUrl: string): Promise<EmailResult> {
  const { html, text } = getMagicLinkEmail(verifyUrl, email)

  return sendEmail({
    to: email,
    subject: 'Sign in to CV Builder',
    html,
    text,
  })
}

export async function sendWelcomeEmail(email: string, name: string): Promise<EmailResult> {
  const { html, text } = getWelcomeEmail(name)

  return sendEmail({
    to: email,
    subject: 'Welcome to CV Builder',
    html,
    text,
  })
}
