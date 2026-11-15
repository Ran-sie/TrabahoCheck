import type { Strings } from './strings'
import type { ProfileFields, User } from './types'

const TOKEN_KEY = 'token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be blocked; the user will simply have to log in again next visit.
  }
}

/** Which kind of problem it was, so the page can word it in the chosen language. */
export type AuthProblem =
  | 'login'
  | 'fileType'
  | 'fileSize'
  | 'unreadable'
  | 'emailTaken'
  | 'weak'
  | 'email'
  | 'expired'
  | 'network'
  | 'generic'

export class AuthError extends Error {
  problem: AuthProblem

  constructor(problem: AuthProblem) {
    super(problem)
    this.problem = problem
  }
}

/** The sentence shown for a problem, in the chosen language. */
export function authMessage(problem: string, t: Strings): string {
  switch (problem) {
    case 'login':
      return t.errAuthLogin
    case 'emailTaken':
      return t.errAuthEmailTaken
    case 'weak':
      return t.errAuthWeak
    case 'email':
      return t.errAuthEmail
    case 'fileType':
      return t.resumeErrType
    case 'fileSize':
      return t.resumeErrSize
    case 'unreadable':
      return t.resumeErrUnreadable
    case 'network':
      return t.errNetwork
    default:
      return t.errAuthGeneric
  }
}

async function call<T>(method: string, path: string, body?: unknown, token = getToken()): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new AuthError('network')
  }

  const data = await res.json().catch(() => null)
  if (res.ok) return data as T

  if (res.status === 401) throw new AuthError('expired')
  if (res.status === 422) {
    if (data?.message === 'unreadable') throw new AuthError('unreadable')
    if (data?.errors?.resume) {
      throw new AuthError(/greater|large|kilobytes/i.test(String(data.errors.resume[0])) ? 'fileSize' : 'fileType')
    }
    if (data?.errors?.password) throw new AuthError('weak')
    const emailError: unknown = data?.errors?.email?.[0]
    if (typeof emailError === 'string') {
      throw new AuthError(/taken|already/i.test(emailError) ? 'emailTaken' : 'email')
    }
    throw new AuthError('login')
  }
  throw new AuthError('generic')
}

/** Details found in the resume. Nothing is saved until the user presses Save. */
export interface AutofillResult {
  /** Text fields are null and lists are empty when the resume did not have them. */
  fields: Omit<ProfileFields, 'email' | 'name' | 'phone' | 'location' | 'headline' | 'summary' | 'website'> & {
    name: string | null
    phone: string | null
    location: string | null
    headline: string | null
    summary: string | null
    website: string | null
  }
  by: 'ai' | 'rules'
}

interface Session {
  token: string
  user: User
}

/** Sends the resume as a file (not JSON) and returns the updated profile. */
async function uploadResume(file: File): Promise<{ user: User }> {
  const form = new FormData()
  form.append('resume', file)
  let res: Response
  try {
    res = await fetch('/api/me/resume', {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${getToken() ?? ''}` },
      body: form,
    })
  } catch {
    throw new AuthError('network')
  }
  const data = await res.json().catch(() => null)
  if (res.ok) return data as { user: User }
  if (res.status === 401) throw new AuthError('expired')
  if (res.status === 422 || res.status === 413) {
    const message = String(data?.errors?.resume?.[0] ?? '')
    throw new AuthError(res.status === 413 || /greater|large|kilobytes|failed to upload/i.test(message) ? 'fileSize' : 'fileType')
  }
  throw new AuthError('generic')
}

/** Fetches the resume with the login and hands it to the browser as a download. */
async function downloadResume(name: string): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/me/resume', { headers: { Authorization: `Bearer ${getToken() ?? ''}` } })
  } catch {
    throw new AuthError('network')
  }
  if (res.status === 401) throw new AuthError('expired')
  if (!res.ok) throw new AuthError('generic')
  const url = URL.createObjectURL(await res.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export const authApi = {
  uploadResume,
  downloadResume,
  autofill: () => call<AutofillResult>('POST', '/me/resume/autofill'),
  removeResume: () => call<{ user: User }>('DELETE', '/me/resume'),
  register: (input: { name: string; email: string; password: string }) => call<Session>('POST', '/register', input),
  login: (input: { email: string; password: string }) => call<Session>('POST', '/login', input),
  logout: () => call<{ ok: boolean }>('POST', '/logout'),
  me: (token: string) => call<{ user: User }>('GET', '/me', undefined, token),
  update: (input: ProfileFields) => call<{ user: User }>('PUT', '/me', input),
}
