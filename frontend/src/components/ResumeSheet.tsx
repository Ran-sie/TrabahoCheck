import type { Template } from '../lib/resume'
import type { Strings } from '../lib/strings'
import type { Education, Experience, ProfileFields } from '../lib/types'

interface Props {
  data: ProfileFields
  template: Template
  t: Strings
}

const filled = (v: string | null | undefined): v is string => (v ?? '').trim() !== ''

function range(start: string | null, end: string | null, present: string): string {
  if (filled(start) && filled(end)) return `${start} – ${end}`
  if (filled(start)) return `${start} – ${present}`
  return end ?? ''
}

function contact(d: ProfileFields): string[] {
  return [d.email, d.phone, d.location, d.website].filter(filled)
}

function jobLine(job: Experience): string {
  return [job.title, job.company].filter(filled).join(' · ')
}

function schoolLine(row: Education): string {
  return [row.degree, row.school].filter(filled).join(' · ')
}

/**
 * The resume drawn from the profile. It always uses a white page and dark text,
 * whatever the site theme is, so the printed PDF looks the same for everyone.
 */
export default function ResumeSheet({ data, template, t }: Props) {
  const s = t.tplSections
  const present = s.present

  const experience = data.experience.filter((j) => filled(j.title))
  const education = data.education.filter((e) => filled(e.school))

  const jobs = experience.map((job) => (
    <div key={`${job.title}-${job.company}-${job.start}`} className="break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <div className="font-semibold">{jobLine(job)}</div>
        <div className="text-[0.85em] text-neutral-500">{range(job.start, job.end, present)}</div>
      </div>
      {filled(job.description) && <p className="mt-1 text-[0.95em] leading-snug whitespace-pre-line text-neutral-700">{job.description}</p>}
    </div>
  ))

  const schools = education.map((row) => (
    <div key={`${row.school}-${row.degree}-${row.start}`} className="break-inside-avoid">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <div className="font-semibold">{schoolLine(row)}</div>
        <div className="text-[0.85em] text-neutral-500">{range(row.start, row.end, present)}</div>
      </div>
    </div>
  ))

  if (template === 'modern') {
    const side = (title: string, items: string[]) =>
      items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[0.8em] font-bold tracking-widest text-white/70 uppercase">{title}</h3>
          <ul className="flex flex-col gap-1 text-[0.95em]">
            {items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )

    return (
      <div className="resume-print grid min-h-[1000px] grid-cols-[34%_1fr] bg-white text-[13px] leading-normal text-neutral-900 shadow-sm">
        <aside className="flex flex-col gap-5 bg-[#1e4fa8] p-6 text-white">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-[0.8em] font-bold tracking-widest text-white/70 uppercase">Contact</h3>
            <ul className="flex flex-col gap-1 text-[0.95em] break-words">
              {contact(data).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
          {side(s.skills, data.skills)}
          {side(s.languages, data.languages)}
          {side(s.certifications, data.certifications)}
        </aside>
        <div className="flex flex-col gap-5 p-6">
          <header>
            <h2 className="text-[2.1em] leading-tight font-bold text-[#1e4fa8]">{data.name}</h2>
            {filled(data.headline) && <p className="text-[1.1em] text-neutral-600">{data.headline}</p>}
          </header>
          {filled(data.summary) && (
            <section className="flex flex-col gap-1.5">
              <h3 className="border-b-2 border-[#1e4fa8] pb-0.5 text-[0.85em] font-bold tracking-widest uppercase">{s.summary}</h3>
              <p className="whitespace-pre-line">{data.summary}</p>
            </section>
          )}
          {jobs.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h3 className="border-b-2 border-[#1e4fa8] pb-0.5 text-[0.85em] font-bold tracking-widest uppercase">{s.experience}</h3>
              {jobs}
            </section>
          )}
          {schools.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h3 className="border-b-2 border-[#1e4fa8] pb-0.5 text-[0.85em] font-bold tracking-widest uppercase">{s.education}</h3>
              {schools}
            </section>
          )}
        </div>
      </div>
    )
  }

  const compact = template === 'compact'
  const heading = compact
    ? 'text-[0.8em] font-bold tracking-widest uppercase text-neutral-800 border-b border-neutral-300 pb-0.5'
    : 'text-[0.95em] font-bold tracking-widest uppercase text-neutral-800 border-b border-neutral-800 pb-1'
  const block = (title: string, body: React.ReactNode) => (
    <section className={`flex flex-col ${compact ? 'gap-1.5' : 'gap-2'}`}>
      <h3 className={heading}>{title}</h3>
      {body}
    </section>
  )
  const inline = (items: string[]) => <p>{items.join(' · ')}</p>

  return (
    <div
      className={`resume-print min-h-[1000px] bg-white text-neutral-900 shadow-sm ${
        compact ? 'flex flex-col gap-3 p-5 text-[11.5px] leading-snug' : 'flex flex-col gap-5 p-8 font-serif text-[13px] leading-normal'
      }`}
    >
      <header className={compact ? 'flex flex-col gap-0.5' : 'flex flex-col items-center gap-1 text-center'}>
        <h2 className={compact ? 'text-[2em] leading-tight font-bold' : 'text-[2.2em] leading-tight font-bold tracking-wide'}>{data.name}</h2>
        {filled(data.headline) && <p className="text-[1.1em] text-neutral-600">{data.headline}</p>}
        <p className="text-[0.9em] text-neutral-600">{contact(data).join('  |  ')}</p>
      </header>
      {filled(data.summary) && block(s.summary, <p className="whitespace-pre-line">{data.summary}</p>)}
      {data.skills.length > 0 && block(s.skills, inline(data.skills))}
      {jobs.length > 0 && block(s.experience, <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-3'}`}>{jobs}</div>)}
      {schools.length > 0 && block(s.education, <div className="flex flex-col gap-2">{schools}</div>)}
      {data.certifications.length > 0 && block(s.certifications, inline(data.certifications))}
      {data.languages.length > 0 && block(s.languages, inline(data.languages))}
    </div>
  )
}
