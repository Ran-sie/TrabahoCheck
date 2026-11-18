import { useEffect, useRef, useState, type FormEvent } from 'react'
import { sendChat, type ChatMessage } from '../lib/auth-api'
import { useAuth } from '../lib/auth-context'
import { useLang } from '../lib/lang-context'
import type { View } from './Header'

const MAX_CHARS = 1000

interface Props {
  /** The id of the job the user just checked, so the assistant knows which job it is. */
  reviewId: string | null
  onNavigate: (view: View) => void
}

/** A round button in the corner that opens a chat with the AI job assistant. */
export default function ChatWidget({ reviewId, onNavigate }: Props) {
  const { lang, t } = useLang()
  const { status } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, error])

  useEffect(() => {
    // When the chat closes, put the keyboard back on the round button.
    if (!open) {
      if (wasOpen.current) buttonRef.current?.focus({ preventScroll: true })
      return
    }
    wasOpen.current = true
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function ask(text: string) {
    const question = text.trim().slice(0, MAX_CHARS)
    if (question === '' || sending) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: question }]
    setMessages(next)
    setDraft('')
    setError(null)
    setSending(true)

    const result = await sendChat(next, reviewId, lang)
    setSending(false)
    if (result.ok) {
      setMessages([...next, { role: 'assistant', content: result.reply }])
      return
    }
    // Put the question back so the user can send it again.
    setMessages(messages)
    setDraft(question)
    if (result.code === 'login') setError(t.chatLoginHint)
    else if (result.code === 'limit') setError(t.chatErrLimit)
    else if (result.code === 'network') setError(t.errNetwork)
    else setError(t.chatErr)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    void ask(draft)
  }

  const suggestions = reviewId ? t.chatSuggestJob : t.chatSuggest

  return (
    <>
      {!open && (
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.chatOpen}
          title={t.chatOpen}
          className="fixed right-4 bottom-4 z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand text-white shadow-lg hover:bg-brand-hover sm:right-6 sm:bottom-6"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
            <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
          </svg>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label={t.chatTitle}
          className="fixed inset-0 z-40 flex flex-col bg-card sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(600px,calc(100vh-6rem))] sm:w-[380px] sm:rounded-2xl sm:border sm:border-line sm:shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="text-base font-bold tracking-tight">{t.chatTitle}</h2>
              {reviewId && status === 'in' && <p className="truncate text-xs text-ok">✓ {t.chatJobNote}</p>}
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([])
                  setError(null)
                }}
                className="h-9 cursor-pointer rounded-[10px] px-3 text-sm font-semibold text-soft hover:bg-page"
              >
                {t.chatClear}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.chatClose}
              className="flex size-9 cursor-pointer items-center justify-center rounded-[10px] text-soft hover:bg-page"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          {status !== 'in' ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-3 p-6">
              <p className="text-sm leading-normal text-soft">{t.chatLoginHint}</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onNavigate('login')
                }}
                className="h-11 cursor-pointer rounded-[10px] bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover"
              >
                {t.login}
              </button>
            </div>
          ) : (
            <>
              <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
                {messages.length === 0 && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm leading-normal text-soft">{t.chatIntro}</p>
                    <div className="flex flex-col items-start gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void ask(s)}
                          className="cursor-pointer rounded-full border border-line-strong px-3 py-1.5 text-left text-sm hover:bg-page"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-normal whitespace-pre-wrap ${
                      m.role === 'user' ? 'self-end rounded-br-sm bg-brand text-white' : 'self-start rounded-bl-sm bg-page text-ink'
                    }`}
                  >
                    {m.content}
                  </div>
                ))}

                {sending && (
                  <p role="status" className="animate-pulse self-start text-sm text-muted">
                    {t.chatThinking}
                  </p>
                )}
                {error && (
                  <p role="alert" className="rounded-[10px] bg-warn-tint px-3 py-2 text-sm text-warn">
                    {error}
                  </p>
                )}
              </div>

              <form onSubmit={submit} className="flex flex-col gap-2 border-t border-line p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void ask(draft)
                      }
                    }}
                    rows={1}
                    maxLength={MAX_CHARS}
                    placeholder={t.chatPlaceholder}
                    aria-label={t.chatPlaceholder}
                    className="max-h-32 min-h-11 flex-1 resize-none rounded-[10px] border border-line-strong bg-card px-3 py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sending || draft.trim() === ''}
                    className="h-11 cursor-pointer rounded-[10px] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.chatSend}
                  </button>
                </div>
                <p className="text-xs text-muted">{t.chatNote}</p>
              </form>
            </>
          )}
        </section>
      )}
    </>
  )
}
