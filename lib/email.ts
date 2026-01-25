// Email service for sending magic links
// Supports multiple providers: Resend, Nodemailer (SMTP/Gmail), Console (dev)

import nodemailer from 'nodemailer'

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

// Email templates
export function getMagicLinkEmail(verifyUrl: string, email: string): { html: string; text: string } {
  const currentYear = new Date().getFullYear()
  
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
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #fafafa; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    Your secure sign-in link for CV Builder is ready. Click to access your account.
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #fafafa;">
    <tr>
      <td align="center" style="padding: 60px 20px;">
        
        <!-- Main container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e5e5e5;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 48px 48px 40px 48px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 300; color: #1a1a1a; letter-spacing: 2px; text-transform: uppercase;">
                CV Builder
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 48px;">
              
              <!-- Welcome text -->
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 400; color: #1a1a1a; text-align: center;">
                Sign in to your account
              </h2>
              
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #666666; line-height: 1.6; text-align: center;">
                Click the button below to securely access your account. No password required.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${verifyUrl}" 
                       target="_blank"
                       style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 16px 48px; text-decoration: none; font-weight: 500; font-size: 14px; letter-spacing: 1px; text-transform: uppercase;">
                      Sign In
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Expiry notice -->
              <p style="margin: 0; font-size: 13px; color: #999999; text-align: center;">
                This link expires in 15 minutes
              </p>
              
            </td>
          </tr>
          
          <!-- Security notice -->
          <tr>
            <td style="padding: 32px 48px; background-color: #fafafa; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0; font-size: 13px; color: #888888; line-height: 1.6; text-align: center;">
                This sign-in request was made for <strong style="color: #666666;">${email}</strong>.<br>
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
        </table>
        
        <!-- Footer -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 480px;">
          <tr>
            <td style="padding: 32px 48px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #b0b0b0;">
                © ${currentYear} CV Builder
              </p>
              <p style="margin: 0;">
                <a href="#" style="color: #999999; text-decoration: none; font-size: 11px; margin: 0 12px;">Privacy</a>
                <a href="#" style="color: #999999; text-decoration: none; font-size: 11px; margin: 0 12px;">Terms</a>
                <a href="#" style="color: #999999; text-decoration: none; font-size: 11px; margin: 0 12px;">Help</a>
              </p>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim()

  const text = `
CV BUILDER
──────────────────────────────────────

Sign in to your account

Click the link below to securely access your account:
${verifyUrl}

This link expires in 15 minutes.

──────────────────────────────────────

This sign-in request was made for: ${email}
If you didn't request this, you can safely ignore this email.

──────────────────────────────────────

© ${currentYear} CV Builder
Privacy | Terms | Help
  `.trim()

  return { html, text }
}

export function getWelcomeEmail(name: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">🎉 Welcome to CV Builder!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Hi ${name || 'there'}! 👋</h2>
    
    <p style="color: #666;">
      Welcome to CV Builder! You're now ready to create professional, ATS-optimized resumes that will help you land your dream job.
    </p>
    
    <h3 style="color: #333;">Here's what you can do:</h3>
    <ul style="color: #666;">
      <li>📝 Create multiple CVs for different job applications</li>
      <li>🎯 Get real-time ATS compatibility scoring</li>
      <li>🔍 Match your CV against job descriptions</li>
      <li>📊 Track different versions of your resume</li>
      <li>🔗 Share your CV with a unique link</li>
      <li>📄 Export to professional PDF format</li>
    </ul>
    
    <p style="color: #666;">
      Ready to get started? Head to your dashboard and create your first CV!
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Go to Dashboard
      </a>
    </div>
  </div>
</body>
</html>
  `.trim()

  const text = `
Welcome to CV Builder! 🎉

Hi ${name || 'there'}!

You're now ready to create professional, ATS-optimized resumes.

Here's what you can do:
- Create multiple CVs for different job applications
- Get real-time ATS compatibility scoring
- Match your CV against job descriptions
- Track different versions of your resume
- Share your CV with a unique link
- Export to professional PDF format

Get started: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard
  `.trim()

  return { html, text }
}

// Send email using configured provider
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = process.env.EMAIL_PROVIDER || 'console'
  
  switch (provider) {
    case 'resend':
      return sendWithResend(options)
    case 'smtp':
      return sendWithSMTP(options)
    case 'console':
    default:
      return sendToConsole(options)
  }
}

// Resend provider (recommended for production)
async function sendWithResend(options: EmailOptions): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  
  if (!apiKey) {
    console.warn('[Email] RESEND_API_KEY not configured, falling back to console')
    return sendToConsole(options)
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
      const error = await response.json()
      throw new Error(error.message || 'Failed to send email')
    }
    
    const data = await response.json()
    console.log('[Email] Sent via Resend:', data.id)
    
    return { success: true, messageId: data.id }
  } catch (error) {
    console.error('[Email] Resend error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// SMTP/Gmail provider using Nodemailer
async function sendWithSMTP(options: EmailOptions): Promise<EmailResult> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user
  
  if (!user || !pass) {
    console.warn('[Email] SMTP credentials not configured, falling back to console')
    return sendToConsole(options)
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    })
    
    const info = await transporter.sendMail({
      from: from,
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

// Console provider for development
async function sendToConsole(options: EmailOptions): Promise<EmailResult> {
  console.log('\n' + '='.repeat(60))
  console.log('📧 EMAIL (Console Mode)')
  console.log('='.repeat(60))
  console.log(`To: ${options.to}`)
  console.log(`Subject: ${options.subject}`)
  console.log('-'.repeat(60))
  console.log('Text Content:')
  console.log(options.text || '(no text content)')
  console.log('='.repeat(60) + '\n')
  
  return { success: true, messageId: `console-${Date.now()}` }
}

// Send magic link email
export async function sendMagicLinkEmail(email: string, verifyUrl: string): Promise<EmailResult> {
  const { html, text } = getMagicLinkEmail(verifyUrl, email)
  
  return sendEmail({
    to: email,
    subject: '🔐 Sign in to CV Builder',
    html,
    text,
  })
}

// Send welcome email
export async function sendWelcomeEmail(email: string, name: string): Promise<EmailResult> {
  const { html, text } = getWelcomeEmail(name)
  
  return sendEmail({
    to: email,
    subject: '🎉 Welcome to CV Builder!',
    html,
    text,
  })
}
