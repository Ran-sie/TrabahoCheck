import type { ProfileFields } from './types'

export type Template = 'classic' | 'modern' | 'compact'

/** Whether there is enough in the profile to draw a resume. */
export function hasResumeContent(d: ProfileFields): boolean {
  const filled = (v: string | null) => (v ?? '').trim() !== ''
  return filled(d.name) && (d.skills.length > 0 || d.experience.length > 0 || filled(d.summary) || filled(d.headline))
}
