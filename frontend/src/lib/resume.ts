import type { Education, Experience, ProfileFields } from './types'

export type Template = 'ats' | 'minimal' | 'sidebar'

export const TEMPLATES: Template[] = ['ats', 'minimal', 'sidebar']

export const filled = (v: string | null | undefined): v is string => (v ?? '').trim() !== ''

/** Whether there is enough in the profile to draw a resume. */
export function hasResumeContent(d: ProfileFields): boolean {
  return filled(d.name) && (d.skills.length > 0 || d.experience.length > 0 || filled(d.summary) || filled(d.headline))
}

/** "Jan 2022 – Present", "2018 – 2022", or just one date. */
export function range(start: string | null, end: string | null, present: string): string {
  if (filled(start) && filled(end)) return `${start} – ${end}`
  if (filled(start)) return `${start} – ${present}`
  return end ?? ''
}

/** Email, phone, place and website, with "https://" dropped from the website. */
export function contact(d: ProfileFields): string[] {
  const site = filled(d.website) ? d.website.replace(/^https?:\/\//i, '').replace(/\/$/, '') : null
  return [d.email, d.phone, d.location, site].filter(filled)
}

/** A job description split into bullet points, one per line, without typed bullet marks. */
export function bullets(text: string | null): string[] {
  return (text ?? '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*·]\s*/, '').trim())
    .filter((line) => line !== '')
}

export function jobs(d: ProfileFields): Experience[] {
  return d.experience.filter((j) => filled(j.title))
}

export function schools(d: ProfileFields): Education[] {
  return d.education.filter((e) => filled(e.school))
}

/** A safe file name such as "Ransie-F-Arboleda-Resume.pdf". */
export function resumeFileName(name: string): string {
  const base = name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
  return `${base || 'My'}-Resume.pdf`
}
