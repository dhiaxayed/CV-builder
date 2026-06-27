import { z } from 'zod'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string
    }
    finish_reason?: string
  }>
  error?: {
    message?: string
    type?: string
    code?: string
  }
}

class GroqJsonParseError extends Error {
  readonly content: string

  constructor(content: string) {
    super('Groq returned invalid JSON.')
    this.name = 'GroqJsonParseError'
    this.content = content
  }
}

function getGroqModel() {
  return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
}

function getGroqTimeoutMs() {
  const configuredTimeout = Number(process.env.GROQ_TIMEOUT_MS)
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 45000
}

function getGroqHeaders() {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing. Add it to Vercel Environment Variables or .env.local, then redeploy to enable AI features.')
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

async function postCompletion(body: Record<string, unknown>) {
  const controller = new AbortController()
  const timeoutMs = getGroqTimeoutMs()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response

  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: getGroqHeaders(),
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Groq request timed out after ${timeoutMs}ms.`)
    }

    throw error instanceof Error ? error : new Error('Groq request failed before receiving a response.')
  } finally {
    clearTimeout(timeout)
  }

  const responseText = await response.text()
  const payload = parseGroqResponse(responseText)

  if (!response.ok) {
    const providerMessage = payload?.error?.message || responseText
    const providerCode = payload?.error?.code || payload?.error?.type
    throw new Error(
      [
        `Groq request failed with status ${response.status}`,
        providerCode ? `(${providerCode})` : '',
        providerMessage ? `- ${providerMessage}` : '',
      ]
        .filter(Boolean)
        .join(' ')
    )
  }

  const content = payload?.choices?.[0]?.message?.content?.trim()

  if (!content) {
    const finishReason = payload?.choices?.[0]?.finish_reason
    throw new Error(`Groq returned an empty response${finishReason ? ` (finish_reason: ${finishReason})` : ''}.`)
  }

  return content
}

function parseGroqResponse(responseText: string): ChatCompletionResponse {
  try {
    return JSON.parse(responseText) as ChatCompletionResponse
  } catch {
    return {}
  }
}

function formatZodIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
}

function parseJsonObject(content: string) {
  const normalized = extractJsonObject(content)

  try {
    return JSON.parse(normalized)
  } catch {
    throw new GroqJsonParseError(content)
  }
}

function extractJsonObject(content: string) {
  const fencedJson = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]?.trim()
  if (fencedJson) return fencedJson

  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')

  if (start !== -1 && end > start) {
    return content.slice(start, end + 1)
  }

  return content.trim()
}

function describeStructureError(error: unknown) {
  if (error instanceof z.ZodError) {
    return formatZodIssues(error)
  }

  if (error instanceof GroqJsonParseError) {
    return error.message
  }

  return error instanceof Error ? error.message : 'Unknown JSON validation error.'
}

function truncateForRepair(content: string, maxLength = 6000) {
  return content.length > maxLength ? `${content.slice(0, maxLength)}\n...[truncated]` : content
}

export async function generateStructuredObject<T extends z.ZodTypeAny>({
  schema,
  messages,
  shapeInstructions,
  temperature = 0.2,
  maxCompletionTokens = 2200,
  user,
}: {
  schema: T
  messages: ChatMessage[]
  shapeInstructions: string
  temperature?: number
  maxCompletionTokens?: number
  user?: string
}): Promise<z.infer<T>> {
  const model = getGroqModel()
  const requestMessages: ChatMessage[] = [
    ...messages,
    {
      role: 'user',
      content: [
        'Return only one valid JSON object. Do not include markdown, commentary, or surrounding text.',
        'Follow this exact response shape and field intent:',
        shapeInstructions,
      ].join('\n'),
    },
  ]

  const completionBody = {
    model,
    messages: requestMessages,
    temperature,
    max_completion_tokens: maxCompletionTokens,
    response_format: {
      type: 'json_object',
    },
  }

  const content = await postCompletion(completionBody)

  try {
    return schema.parse(parseJsonObject(content))
  } catch (structureError) {
    const repairContent = await postCompletion({
      ...completionBody,
      temperature: 0.1,
      messages: [
        ...requestMessages,
        {
          role: 'assistant',
          content: truncateForRepair(content),
        },
        {
          role: 'user',
          content: [
            'The previous response did not satisfy the required JSON contract.',
            'Repair it into exactly one valid JSON object matching the requested shape.',
            'Return only corrected JSON without markdown.',
            `Validation issues: ${describeStructureError(structureError)}`,
          ].join('\n'),
        },
      ],
    })

    return schema.parse(parseJsonObject(repairContent))
  }
}

const groqProbeSchema = z.object({
  ok: z.boolean(),
  provider: z.literal('groq'),
})

export async function probeGroq(): Promise<z.infer<typeof groqProbeSchema>> {
  return generateStructuredObject({
    schema: groqProbeSchema,
    temperature: 0,
    maxCompletionTokens: 50,
    shapeInstructions: JSON.stringify({ ok: true, provider: 'groq' }),
    messages: [
      {
        role: 'system',
        content: 'You are a production health probe. Return the requested JSON exactly.',
      },
      {
        role: 'user',
        content: 'Confirm Groq chat completion availability.',
      },
    ],
  })
}
