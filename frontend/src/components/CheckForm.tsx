import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/lang-context'
import { MAX_IMAGE_BYTES, readImageText } from '../lib/ocr'

type ImageError = 'errImageType' | 'errImageSize' | 'errImageShort' | 'errImageRead'

interface Props {
  loading: boolean
  showPaste: boolean
  initialText?: string
  onTogglePaste: () => void
  onSubmit: (input: { url?: string; text?: string }) => void
}

const FOCUS = 'focus:outline-2 focus:outline-offset-2 focus:outline-brand'

export default function CheckForm({ loading, showPaste, initialText = '', onTogglePaste, onSubmit }: Props) {
  const { t } = useLang()
  const [url, setUrl] = useState('')
  const [text, setText] = useState(initialText)
  const [reading, setReading] = useState<number | null>(null)
  const [imageError, setImageError] = useState<ImageError | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Free the preview image from memory when it is replaced or removed.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const busy = reading !== null
  const canSubmit = showPaste ? text.trim().length > 0 || url.trim().length > 0 : url.trim().length > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || loading || busy) return
    onSubmit({
      url: showPaste && text.trim() ? undefined : url.trim() || undefined,
      text: showPaste ? text.trim() || undefined : undefined,
    })
  }

  /** Screenshot in, result out: read the image, then check it straight away. */
  async function handleImage(file: File | Blob) {
    setImageError(null)

    if (!file.type.startsWith('image/')) {
      setImageError('errImageType')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('errImageSize')
      return
    }

    setPreview(URL.createObjectURL(file))
    setReading(0)
    try {
      const extracted = await readImageText(file, setReading)
      if (extracted.length < 40) {
        setImageError('errImageShort')
      } else {
        onSubmit({ text: extracted })
      }
    } catch {
      setImageError('errImageRead')
    } finally {
      setReading(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    const file = item?.getAsFile()
    if (file) {
      e.preventDefault()
      void handleImage(file)
    }
  }

  const linkButton =
    'min-h-11 cursor-pointer text-left text-sm text-link underline hover:opacity-80 disabled:cursor-wait disabled:opacity-60'

  return (
    <form
      onSubmit={handleSubmit}
      onPaste={handlePaste}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4 sm:p-6"
    >
      <label htmlFor="joblink" className="text-sm font-semibold">
        {t.jobLink}
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          id="joblink"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.linkPlaceholder}
          className={`h-12 min-w-0 flex-[1_1_240px] rounded-[10px] border border-line-strong bg-card px-4 text-base text-ink placeholder:text-muted ${FOCUS}`}
        />
        <button
          type="submit"
          disabled={!canSubmit || loading || busy}
          className="h-12 w-full cursor-pointer rounded-[10px] bg-brand px-7 text-base font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? t.checking : t.checkJob}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <button type="button" disabled={busy || loading} onClick={() => fileRef.current?.click()} className={linkButton}>
          {t.uploadShot}
        </button>
        <button type="button" onClick={onTogglePaste} className={linkButton}>
          {showPaste ? t.hidePaste : t.pasteInstead}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label={t.uploadAria}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleImage(file)
          }}
        />
      </div>

      {preview && (
        <div className="flex items-center gap-4 rounded-[10px] border border-line bg-page p-3">
          <img src={preview} alt={t.shotAlt} className="h-20 w-20 rounded-lg object-cover" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="text-sm font-semibold">
              {busy ? t.shotReading(reading) : loading ? t.shotChecking : t.shotDone}
            </div>
            {busy && (
              <div className="h-2 overflow-hidden rounded-full bg-track">
                <div className="h-full rounded-full bg-brand" style={{ width: `${reading}%` }} />
              </div>
            )}
          </div>
          {!busy && !loading && (
            <button type="button" onClick={() => setPreview(null)} className={`${linkButton} px-2`}>
              {t.remove}
            </button>
          )}
        </div>
      )}

      {imageError && (
        <p role="alert" className="rounded-[10px] bg-danger-tint px-4 py-3 text-sm text-danger">
          {t[imageError]}
        </p>
      )}

      {showPaste && (
        <div className="flex flex-col gap-2">
          <label htmlFor="jobtext" className="text-sm font-semibold">
            {t.jobText}
          </label>
          <textarea
            id="jobtext"
            rows={8}
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
            placeholder={t.pastePlaceholder}
            className={`w-full resize-y rounded-[10px] border border-line-strong bg-card px-4 py-3 text-base text-ink placeholder:text-muted ${FOCUS}`}
          />
        </div>
      )}
    </form>
  )
}
