import { useEffect, useState } from 'react'
import { useLang } from '../lib/lang-context'
import { hasResumeContent, resumeFileName, TEMPLATES, type Template } from '../lib/resume'
import { buildResumePdf, saveBlob } from '../lib/resume-pdf'
import type { ProfileFields } from '../lib/types'

const BUTTON =
  'h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-page disabled:cursor-not-allowed disabled:opacity-50'

/** Phones often cannot show a PDF inside a page; they get a button that opens it instead. */
const CAN_SHOW_PDF = typeof navigator === 'undefined' || navigator.pdfViewerEnabled !== false

/**
 * Pick a resume design. The preview is the real PDF, made from the profile as
 * it is typed, so what you see is exactly what you download.
 */
export default function ResumeTemplates({ data }: { data: ProfileFields }) {
  const { t } = useLang()
  const [template, setTemplate] = useState<Template>('ats')
  const [file, setFile] = useState<{ blob: Blob; url: string } | null>(null)
  const [building, setBuilding] = useState(false)
  const [failed, setFailed] = useState(false)
  const ready = hasResumeContent(data)
  const key = JSON.stringify(data)

  // Rebuild the PDF a moment after the user stops typing or picks another design.
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const timer = setTimeout(() => {
      setBuilding(true)
      buildResumePdf(JSON.parse(key) as ProfileFields, template, t)
        .then((blob) => {
          if (cancelled) return
          setFailed(false)
          setFile((old) => {
            if (old) URL.revokeObjectURL(old.url)
            return { blob, url: URL.createObjectURL(blob) }
          })
        })
        .catch(() => !cancelled && setFailed(true))
        .finally(() => !cancelled && setBuilding(false))
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [key, template, t, ready])

  return (
    <section aria-labelledby="templates" className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="templates" className="text-lg font-bold tracking-tight">
          {t.tplTitle}
        </h2>
        <p className="text-sm text-soft">{t.tplText}</p>
      </div>

      {!ready ? (
        <p className="rounded-[10px] bg-warn-tint px-4 py-3 text-sm text-warn">{t.tplEmpty}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={t.tplTitle}>
            {TEMPLATES.map((name) => (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={template === name}
                onClick={() => setTemplate(name)}
                className={`flex h-auto cursor-pointer flex-col items-start rounded-[10px] border px-4 py-2 text-left ${
                  template === name ? 'border-brand bg-brand text-white' : 'border-line-strong bg-card hover:bg-page'
                }`}
              >
                <span className="text-sm font-semibold">{t.tplNames[name]}</span>
                <span className={`text-xs ${template === name ? 'text-white/80' : 'text-muted'}`}>{t.tplDescs[name]}</span>
              </button>
            ))}
          </div>

          {CAN_SHOW_PDF ? (
            <div className="relative overflow-hidden rounded-[10px] border border-line bg-page">
              {file ? (
                <iframe title={t.tplTitle} src={`${file.url}#toolbar=0&navpanes=0&view=FitH`} className="aspect-[1/1.414] w-full bg-white" />
              ) : (
                <div className="flex aspect-[1/1.414] w-full items-center justify-center text-sm text-muted">{t.tplUpdating}</div>
              )}
              {building && file && (
                <div role="status" className="absolute top-3 right-3 rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted shadow">
                  {t.tplUpdating}
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-[10px] border border-line px-4 py-3 text-sm text-soft">{t.tplNoInline}</p>
          )}

          {failed && (
            <p role="alert" className="rounded-[10px] bg-danger-tint px-4 py-3 text-sm text-danger">
              {t.tplError}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={!file || building} onClick={() => file && saveBlob(file.blob, resumeFileName(data.name))} className={BUTTON}>
              {t.tplDownload}
            </button>
            {!CAN_SHOW_PDF && file && (
              <a href={file.url} target="_blank" rel="noreferrer" className={`${BUTTON} inline-flex items-center`}>
                {t.tplOpen}
              </a>
            )}
            <p className="text-sm text-muted">{t.tplHint}</p>
          </div>
        </>
      )}
    </section>
  )
}
