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

class AIJsonParseError extends Error {
  readonly content: string

  constructor(content: string) {
    super('AI provider returned invalid JSON.')
    this.name = 'AIJsonParseError'
    this.content = content
  }
}

export type AIProvider = 'groq' | 'openrouter'

export class AIProviderError extends Error {}
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'

export function aiFailureReason(error: unknown): string {
  return error instanceof AIProviderError ? error.message : 'The AI response could not be validated. Local checks are available; retry later.'
}

export function configuredAIProvider(): AIProvider | null {
  return process.env.GROQ_API_KEY ? 'groq' : process.env.OPENROUTER_API_KEY ? 'openrouter' : null
}

// Both providers implement the same chat contract. Keep validation, repair,
// deadlines and retries in one adapter; never silently switch providers.
function providerConfiguration() {
  const provider = configuredAIProvider()
  if (!provider) throw new AIProviderError('No AI provider is configured. Local analysis is available.')
  const groq = provider === 'groq'
  const configuredTimeout = Number(groq ? process.env.GROQ_TIMEOUT_MS : process.env.OPENROUTER_TIMEOUT_MS)
  return {
    provider,
    endpoint: groq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: groq ? process.env.GROQ_API_KEY! : process.env.OPENROUTER_API_KEY!,
    model: groq ? process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL : process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free',
    timeout: Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? Math.min(30000, Math.max(1000, configuredTimeout)) : groq ? 10000 : 25000,
  }
}

async function postCompletion(body: Record<string, unknown>, deadline: number, config: ReturnType<typeof providerConfiguration>): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw new AIProviderError('The AI request exceeded its time budget. Please retry later.')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.min(config.timeout, remaining))
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body,model:config.model,
          ...(config.provider === 'groq' && config.model.startsWith('openai/gpt-oss-') ? { reasoning_effort:'low',include_reasoning:false } : {}),
        }),
        cache: 'no-store', signal: controller.signal,
      })
      // The timeout covers reading the response body as well as receiving headers.
      const responseText = await response.text()
      if (!response.ok) {
        const modelRetired = response.status === 400 && parseCompletionResponse(responseText).error?.code === 'model_decommissioned'
        if (attempt === 0 && config.provider === 'groq' && config.model !== DEFAULT_GROQ_MODEL && (response.status === 404 || modelRetired)) {
          // Groq retired several previously configured models in 2026. Preserve
          // working overrides, and recover from an unavailable model once using
          // Groq's documented production replacement, on the same credentials.
          config.model = DEFAULT_GROQ_MODEL
          console.warn('[AI] Configured Groq model unavailable; retrying its supported production replacement.')
          continue
        }
        if (attempt === 0 && (response.status === 429 || response.status >= 500)) {
          const retryAfter=Number(response.headers.get('retry-after'))
          const delay=retryAfter > 0 ? Math.min(2000,retryAfter*1000) : 350
          await new Promise(resolve => setTimeout(resolve,Math.min(delay,Math.max(0,deadline-Date.now()))))
          continue
        }
        throw new AIProviderError(`AI provider unavailable (HTTP ${response.status}). Please retry later.`)
      }
      const payload = parseCompletionResponse(responseText)
      if (payload.choices?.[0]?.finish_reason === 'length') throw new AIProviderError('The AI response was incomplete. Try a shorter CV or retry.')
      const content = payload.choices?.[0]?.message?.content?.trim()
      if (!content) throw new AIProviderError('The AI provider returned an empty response. Please retry later.')
      return content
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error instanceof TypeError)) {
        // Free-provider queues and transient connections can stall one attempt.
        // Retry once only if the shared deadline still leaves useful time.
        if (attempt === 0 && deadline-Date.now() > 1000) continue
        throw new AIProviderError(error.name === 'AbortError' ? 'The AI request timed out. Please retry later.' : 'The AI provider could not be reached. Please retry later.')
      }
      throw error
    } finally { clearTimeout(timer) }
  }
  throw new AIProviderError('The AI provider is unavailable. Please retry later.')
}

function parseCompletionResponse(responseText: string): ChatCompletionResponse {
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
    throw new AIJsonParseError(content)
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

  if (error instanceof AIJsonParseError) {
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
}: {
  schema: T
  messages: ChatMessage[]
  shapeInstructions: string
  temperature?: number
  maxCompletionTokens?: number
}): Promise<z.infer<T>> {
  const deadline = Date.now() + 40000
  const config = providerConfiguration()
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
    model: config.model,
    messages: requestMessages,
    temperature,
    [config.provider === 'groq' ? 'max_completion_tokens' : 'max_tokens']: Math.min(6000, Math.max(50, maxCompletionTokens)),
    // These bounded editing tasks need factual JSON, not a lengthy reasoning
    // trace. On Nemotron, merely requesting low effort still exceeded 25s.
    ...(config.provider === 'openrouter' ? { reasoning:{ enabled:false,exclude:true } } : {}),
    response_format: {
      type: 'json_object',
    },
  }

  const content = await postCompletion(completionBody, deadline, config)

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
    }, deadline, config)

    return schema.parse(parseJsonObject(repairContent))
  }
}

export async function probeAI() {
  const result = await generateStructuredObject({
    schema: z.object({ ok:z.literal(true) }),
    temperature: 0,
    maxCompletionTokens: 256,
    shapeInstructions: '{"ok":true}',
    messages: [{ role:'system',content:'Return the requested JSON exactly.' }, { role:'user',content:'Confirm chat completion availability.' }],
  })
  return { ...result,provider:configuredAIProvider() }
}
