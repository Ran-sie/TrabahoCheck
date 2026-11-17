import { useState } from 'react'
import { downloadResumePdf } from '../lib/resume-pdf'
import { useLang } from '../lib/lang-context'
import type { ProfileFields } from '../lib/types'
import { hasResumeContent, type Template } from '../lib/resume'
import ResumeSheet from './ResumeSheet'

const TEMPLATES: Template[] = ['classic', 'modern', 'compact']

const BUTTON =
  'h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-page disabled:cursor-not-allowed disabled:opacity-50'

/** Pick a resume design, preview it, and download it as a PDF. */
export default function ResumeTemplates({ data }: { data: ProfileFields }) {
  const { t } = useLang()
  const [template, setTemplate] = useState<Template>('classic')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const ready = hasResumeContent(data)

  async function download() {
    setBusy(true)
    setFailed(false)
    try {
      await downloadResumePdf(data, template, t)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="templates" className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="templates" className="text-lg font-bold tracking-tight">
          {t.tplTitle}
        </h2>
        <p className="text-sm text-soft">{t.tplText}</p>
      </div>

      {ready ? (
        <>
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t.tplTitle}>
            {TEMPLATES.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={template === name}
                onClick={() => setTemplate(name)}
                className={`h-10 cursor-pointer rounded-full border px-4 text-sm font-semibold ${
                  template === name ? 'border-brand bg-brand text-white' : 'border-line-strong bg-card hover:bg-page'
                }`}
              >
                {t.tplNames[name]}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-[10px] border border-line bg-page p-3">
            <div className="min-w-140">
              <ResumeSheet data={data} template={template} t={t} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={download} disabled={busy} className={BUTTON}>
              {busy ? t.tplDownloading : t.tplDownload}
            </button>
            <p className="text-sm text-muted">{t.tplHint}</p>
          </div>
          {failed && (
            <p role="alert" className="rounded-[10px] bg-danger-tint px-4 py-3 text-sm text-danger">
              {t.tplError}
            </p>
          )}
        </>
      ) : (
        <p className="rounded-[10px] bg-warn-tint px-4 py-3 text-sm text-warn">{t.tplEmpty}</p>
      )}
    </section>
  )
}
