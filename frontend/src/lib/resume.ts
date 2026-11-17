import type { Education, Experience, ProfileFields } from './types'

export type Template = 'classic' | 'modern' | 'compact'

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

export function contact(d: ProfileFields): string[] {
  return [d.email, d.phone, d.location, d.website].filter(filled)
}

export function jobLine(job: Experience): string {
  return [job.title, job.company].filter(filled).join(' · ')
}

export function schoolLine(row: Education): string {
  return [row.degree, row.school].filter(filled).join(' · ')
}

/** A safe file name such as "Ransie-F-Arboleda-Resume.pdf". */
export function resumeFileName(name: string): string {
  const base = name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
  return `${base || 'My'}-Resume.pdf`
}
