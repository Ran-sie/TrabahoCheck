import { useState, type FormEvent } from 'react'
import { authApi, authMessage, AuthError, type AutofillResult } from '../lib/auth-api'
import { useAuth } from '../lib/auth-context'
import { useLang } from '../lib/lang-context'
import type { ProfileFields, User } from '../lib/types'
import ChipInput from './ChipInput'
import { EducationList, ExperienceList } from './ProfileLists'
import ResumeCard from './ResumeCard'
import ResumeReviewCard from './ResumeReviewCard'
import ResumeTemplates from './ResumeTemplates'

const FOCUS = 'focus:outline-2 focus:outline-offset-2 focus:outline-brand'
const INPUT = `h-12 w-full rounded-[10px] border border-line-strong bg-card px-4 text-base text-ink placeholder:text-muted ${FOCUS}`
const SECTION = 'flex flex-col gap-4 border-t border-line pt-6'

type FieldName = keyof AutofillResult['fields']

function fromUser(user: User | null): ProfileFields {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    location: user?.location ?? '',
    headline: user?.headline ?? '',
    summary: user?.summary ?? '',
    website: user?.website ?? '',
    skills: user?.skills ?? [],
    experience: user?.experience ?? [],
    education: user?.education ?? [],
    certifications: user?.certifications ?? [],
    languages: user?.languages ?? [],
  }
}

const blank = (v: string | null | undefined) => (v ?? '').trim() === ''

export default function ProfilePage({ onSessionEnded }: { onSessionEnded: () => void }) {
  const { t } = useLang()
  const { user, setUser, logOut } = useAuth()
  const [draft, setDraft] = useState<ProfileFields>(() => fromUser(user))
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filled, setFilled] = useState<FieldName[]>([])

  function set<K extends keyof ProfileFields>(key: K, value: ProfileFields[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    setSaved(false)
  }

  /** Puts what the resume held into the boxes. The user still has to review and press Save. */
  function applyAutofill(fields: AutofillResult['fields']): number {
    const next: ProfileFields = { ...draft }
    const found: FieldName[] = []

    for (const key of ['name', 'phone', 'location', 'headline', 'summary', 'website'] as const) {
      const value = fields[key]
      if (value) {
        next[key] = value
        found.push(key)
      }
    }
    // A list is replaced only when the resume had something for it; otherwise the user's own entries stay.
    if (fields.skills.length > 0) {
      next.skills = fields.skills
      found.push('skills')
    }
    if (fields.experience.length > 0) {
      next.experience = fields.experience
      found.push('experience')
    }
    if (fields.education.length > 0) {
      next.education = fields.education
      found.push('education')
    }
    if (fields.certifications.length > 0) {
      next.certifications = fields.certifications
      found.push('certifications')
    }
    if (fields.languages.length > 0) {
      next.languages = fields.languages
      found.push('languages')
    }

    setDraft(next)
    setFilled(found)
    setSaved(false)
    return found.length
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    // Rows left completely empty are dropped; a row with some text but no title is a mistake to fix.
    const experience = draft.experience.filter(
      (r) => !(blank(r.title) && blank(r.company) && blank(r.start) && blank(r.end) && blank(r.description)),
    )
    const education = draft.education.filter((r) => !(blank(r.school) && blank(r.degree) && blank(r.start) && blank(r.end)))
    if (experience.some((r) => blank(r.title)) || education.some((r) => blank(r.school))) {
      setError(t.rowNeedsTitle)
      return
    }

    setBusy(true)
    try {
      const { user: next } = await authApi.update({
        ...draft,
        name: draft.name.trim(),
        email: draft.email.trim(),
        phone: draft.phone?.trim() || null,
        location: draft.location?.trim() || null,
        headline: draft.headline?.trim() || null,
        summary: draft.summary?.trim() || null,
        website: draft.website?.trim() || null,
        experience,
        education,
      })
      setUser(next)
      setDraft(fromUser(next))
      setSaved(true)
      setFilled([])
    } catch (err) {
      const problem = err instanceof AuthError ? err.problem : 'generic'
      if (problem === 'expired') {
        logOut()
        onSessionEnded()
        return
      }
      setError(authMessage(problem, t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <ResumeCard onSessionEnded={onSessionEnded} onAutofill={applyAutofill} />

      <form onSubmit={submit} className="flex flex-col gap-6 rounded-2xl border border-line bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">{t.profileTitle}</h1>
          <p className="text-sm text-soft">{t.profileText}</p>
        </div>

        {filled.length > 0 && (
          <p role="status" className="rounded-[10px] bg-warn-tint px-4 py-3 text-sm font-semibold text-warn">
            {t.filledBanner(filled.map((k) => t.fieldNames[k]).join(', '))}
          </p>
        )}

        <section aria-labelledby="basic" className="flex flex-col gap-4">
          <h2 id="basic" className="text-lg font-bold tracking-tight">
            {t.basicTitle}
          </h2>

          <div className="flex flex-col gap-2">
            <label htmlFor="p-name" className="text-sm font-semibold">
              {t.name}
            </label>
            <input id="p-name" type="text" autoComplete="name" required maxLength={120} value={draft.name} onChange={(e) => set('name', e.target.value)} className={INPUT} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="p-email" className="text-sm font-semibold">
              {t.email}
            </label>
            <input id="p-email" type="email" autoComplete="email" required value={draft.email} onChange={(e) => set('email', e.target.value)} className={INPUT} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="p-phone" className="text-sm font-semibold">
                {t.phone} <span className="font-normal text-muted">{t.optional}</span>
              </label>
              <input id="p-phone" type="tel" autoComplete="tel" maxLength={30} value={draft.phone ?? ''} onChange={(e) => set('phone', e.target.value)} className={INPUT} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="p-location" className="text-sm font-semibold">
                {t.location} <span className="font-normal text-muted">{t.optional}</span>
              </label>
              <input id="p-location" type="text" autoComplete="street-address" maxLength={120} value={draft.location ?? ''} onChange={(e) => set('location', e.target.value)} className={INPUT} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="p-website" className="text-sm font-semibold">
              {t.website} <span className="font-normal text-muted">{t.optional}</span>
            </label>
            <input id="p-website" type="text" inputMode="url" maxLength={200} placeholder={t.websitePlaceholder} value={draft.website ?? ''} onChange={(e) => set('website', e.target.value)} className={INPUT} />
          </div>
        </section>

        <section aria-labelledby="about" className={SECTION}>
          <h2 id="about" className="text-lg font-bold tracking-tight">
            {t.aboutTitle}
          </h2>

          <div className="flex flex-col gap-2">
            <label htmlFor="p-headline" className="text-sm font-semibold">
              {t.headline} <span className="font-normal text-muted">{t.optional}</span>
            </label>
            <input id="p-headline" type="text" maxLength={120} placeholder={t.headlinePlaceholder} value={draft.headline ?? ''} onChange={(e) => set('headline', e.target.value)} className={INPUT} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="p-summary" className="text-sm font-semibold">
              {t.summary} <span className="font-normal text-muted">{t.optional}</span>
            </label>
            <textarea
              id="p-summary"
              rows={4}
              maxLength={1500}
              value={draft.summary ?? ''}
              onChange={(e) => set('summary', e.target.value)}
              aria-describedby="p-summary-hint"
              className={`w-full resize-y rounded-[10px] border border-line-strong bg-card px-4 py-3 text-base text-ink ${FOCUS}`}
            />
            <p id="p-summary-hint" className="text-sm text-muted">
              {t.summaryHint}
            </p>
          </div>
        </section>

        <section aria-labelledby="skills" className={SECTION}>
          <h2 id="skills" className="text-lg font-bold tracking-tight">
            {t.skillsTitle}
          </h2>
          <ChipInput id="p-skills" label={t.skillsTitle} hint={t.skillsHint} placeholder={t.skillPlaceholder} items={draft.skills} onChange={(v) => set('skills', v)} max={30} maxLength={40} />
        </section>

        <section aria-label={t.experienceTitle} className={SECTION}>
          <ExperienceList rows={draft.experience} onChange={(v) => set('experience', v)} />
        </section>

        <section aria-label={t.educationTitle} className={SECTION}>
          <EducationList rows={draft.education} onChange={(v) => set('education', v)} />
        </section>

        <section aria-label={t.certTitle} className={`${SECTION} sm:grid sm:grid-cols-2 sm:gap-6`}>
          <ChipInput id="p-certs" label={t.certTitle} hint={t.certHint} placeholder={t.certPlaceholder} items={draft.certifications} onChange={(v) => set('certifications', v)} max={10} maxLength={100} />
          <ChipInput id="p-langs" label={t.langTitle} hint={t.langHint} placeholder={t.langPlaceholder} items={draft.languages} onChange={(v) => set('languages', v)} max={10} maxLength={40} />
        </section>

        {error && (
          <p role="alert" className="rounded-[10px] bg-danger-tint px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="rounded-[10px] bg-ok-tint px-4 py-3 text-sm font-semibold text-ok">
            ✓ {t.saved}
          </p>
        )}

        <div className="flex flex-wrap gap-3 border-t border-line pt-6">
          <button
            type="submit"
            disabled={busy}
            className="h-12 cursor-pointer rounded-[10px] bg-brand px-7 text-base font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t.saving : t.save}
          </button>
          <button
            type="button"
            onClick={logOut}
            className="h-12 cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-base font-semibold hover:bg-page"
          >
            {t.logout}
          </button>
        </div>
      </form>

      <ResumeReviewCard onUse={(field, text) => set(field, text)} />
      <ResumeTemplates data={draft} />
    </div>
  )
}
