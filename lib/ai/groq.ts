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
  }>
  error?: {
    message?: string
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
    throw new Error('GROQ_API_KEY is missing. Add it to .env.local to enable AI features.')
  }

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

async function postCompletion(body: Record<string, unknown>) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getGroqTimeoutMs())

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: getGroqHeaders(),
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))

  const payload = (await response.json().catch(() => ({}))) as ChatCompletionResponse

  if (!response.ok) {
    throw new Error(payload?.error?.message || `Groq request failed with status ${response.status}`)
  }

  const content = payload?.choices?.[0]?.message?.content?.trim()

  if (!content) {
    throw new Error('Groq returned an empty response.')
  }

  return content
}

function formatZodIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
}

function parseJsonObject(content: string) {
  try {
    return JSON.parse(content)
  } catch {
    throw new Error('Groq returned invalid JSON.')
  }
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

  try {
    const content = await postCompletion({
      model,
      messages: requestMessages,
      temperature,
      max_completion_tokens: maxCompletionTokens,
      user,
      response_format: {
        type: 'json_object',
      },
    })

    return schema.parse(parseJsonObject(content))
  } catch (error) {
    if (error instanceof z.ZodError) {
      const repairContent = await postCompletion({
        model,
        messages: [
          ...requestMessages,
          {
            role: 'assistant',
            content: 'The previous JSON response did not fully satisfy the requested schema.',
          },
          {
            role: 'user',
            content: [
              'Repair the JSON so it satisfies the required structure.',
              'Return only corrected JSON without markdown.',
              `Validation issues: ${formatZodIssues(error)}`,
            ].join('\n'),
          },
        ],
        temperature: 0.1,
        max_completion_tokens: maxCompletionTokens,
        user,
        response_format: {
          type: 'json_object',
        },
      })

      return schema.parse(parseJsonObject(repairContent))
    }

    throw error instanceof Error ? error : new Error('Failed to parse Groq JSON response.')
  }
}
