import { z } from 'zod'
import { resolveAppBaseUrl } from '@/lib/app-url'

type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
  error?: {
    message?: string
  }
}

type MessageContent = string | Array<{ type?: string; text?: string }> | undefined

function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-super-120b-a12b:free'
}

function getOpenRouterHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is missing. Add it to .env.local to enable AI features.')
  }

  const appUrl = resolveAppBaseUrl()

  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': appUrl,
    'X-Title': 'CV Builder',
  }
}

function getMessageText(content: MessageContent) {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('')
      .trim()
  }

  return ''
}

async function postCompletion(body: Record<string, unknown>) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: getOpenRouterHeaders(),
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const payload = (await response.json().catch(() => ({}))) as ChatCompletionResponse

  if (!response.ok) {
    throw new Error(payload?.error?.message || `OpenRouter request failed with status ${response.status}`)
  }

  const content = getMessageText(payload?.choices?.[0]?.message?.content)

  if (!content) {
    throw new Error('OpenRouter returned an empty response.')
  }

  return content
}

function formatZodIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ')
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
  const model = getOpenRouterModel()
  const requestMessages: ChatMessage[] = [
    ...messages,
    {
      role: 'user',
      content: [
        'Return only a valid JSON object without markdown.',
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
      plugins: [{ id: 'response-healing' }],
      response_format: {
        type: 'json_object',
      },
    })

    const parsed = JSON.parse(content)
    return schema.parse(parsed)
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
        plugins: [{ id: 'response-healing' }],
        response_format: {
          type: 'json_object',
        },
      })

      return schema.parse(JSON.parse(repairContent))
    }

    throw error instanceof Error ? error : new Error('Failed to parse OpenRouter JSON response.')
  }
}
