import type { AiReview, CheckResult, Lang } from './types'

export interface CheckInput {
  url?: string
  text?: string
}

/** `code` is set for errors the page words itself; otherwise `message` comes from the server. */
export class CheckError extends Error {
  needsText: boolean
  code: 'network' | 'generic' | null

  constructor(message: string, needsText = false, code: 'network' | 'generic' | null = null) {
    super(message)
    this.needsText = needsText
    this.code = code
  }
}

export async function checkJob(input: CheckInput, lang: Lang): Promise<CheckResult> {
  let res: Response
  try {
    res = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...input, lang }),
    })
  } catch {
    throw new CheckError('network', false, 'network')
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (typeof data?.message === 'string' && data.needs_text === true) {
      throw new CheckError(data.message, true)
    }
    throw new CheckError('generic', false, 'generic')
  }

  return data as CheckResult
}

/** Asks for the optional AI opinion. Returns null if it is off, expired, or failed. */
export async function fetchAiReview(id: string): Promise<AiReview | null> {
  try {
    const res = await fetch('/api/ai-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id }),
    })
    return res.ok ? ((await res.json()) as AiReview) : null
  } catch {
    return null
  }
}
