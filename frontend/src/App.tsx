import { useEffect, useRef, useState } from 'react'
import AuthForm from './components/AuthForm'
import CheckForm from './components/CheckForm'
import Footer from './components/Footer'
import Header, { type View } from './components/Header'
import Info from './components/Info'
import ProfilePage from './components/ProfilePage'
import ResultCard from './components/ResultCard'
import { checkJob, CheckError } from './lib/api'
import { useAuth } from './lib/auth-context'
import { useLang } from './lib/lang-context'
import { useTheme } from './lib/theme'
import type { CheckResult } from './lib/types'

/**
 * The browser extension opens the app as `/#text=<job text>` so the post it
 * read from the page is checked right away. A hash is never sent to a server.
 */
function readTextFromHash(): string {
  const match = window.location.hash.match(/^#text=([\s\S]*)$/)
  if (!match) return ''
  try {
    return decodeURIComponent(match[1]).trim()
  } catch {
    return ''
  }
}

export default function App() {
  const { lang, t } = useLang()
  const { dark, toggle } = useTheme()
  const { status } = useAuth()
  const [view, setView] = useState<View>('check')
  const [sharedText] = useState(readTextFromHash)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPaste, setShowPaste] = useState(sharedText !== '')
  const [formKey, setFormKey] = useState(0)
  const resultRef = useRef<HTMLDivElement>(null)
  const autoChecked = useRef(false)

  async function handleCheck(input: { url?: string; text?: string }) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      setResult(await checkJob(input, lang))
      // Wait for the card to render, then bring it into view (helps on phones).
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (e) {
      if (e instanceof CheckError && e.needsText) setShowPaste(true)
      if (e instanceof CheckError && e.code === 'network') setError(t.errNetwork)
      else if (e instanceof CheckError && e.code !== 'generic') setError(e.message)
      else setError(t.errGeneric)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sharedText === '' || autoChecked.current) return
    autoChecked.current = true
    history.replaceState(null, '', window.location.pathname)
    void handleCheck({ text: sharedText })
    // Runs once on load, using the language chosen at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleReset() {
    setResult(null)
    setError(null)
    setShowPaste(false)
    setFormKey((k) => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // The profile is for logged-in people only; anyone else is sent to log in.
  const shown: View = view === 'profile' && status === 'out' ? 'login' : view

  function navigate(next: View) {
    setView(next)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-20 border-b border-line bg-page/90 px-4 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-190">
          <Header dark={dark} onToggleTheme={toggle} onNavigate={navigate} />
        </div>
      </div>

      <main className="flex-1 px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-190">
          {shown === 'login' || shown === 'register' ? (
            <AuthForm
              key={shown}
              mode={shown}
              onSwitch={() => navigate(shown === 'login' ? 'register' : 'login')}
              onDone={() => navigate('profile')}
            />
          ) : shown === 'profile' && status === 'in' ? (
            <ProfilePage onSessionEnded={() => navigate('login')} />
          ) : shown === 'profile' ? null : (
            <>
              <div className="flex flex-col gap-3 pt-8 pb-8 sm:pt-10">
                <p className="w-fit rounded-full border border-line bg-card px-3 py-1 text-sm font-semibold text-soft">{t.heroBadge}</p>
                <h1 className="text-[32px] leading-[1.15] font-bold tracking-tight sm:text-[40px]">{t.heroTitle}</h1>
                <p className="text-base leading-normal text-soft sm:text-lg">{t.heroText}</p>
                <ul className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm font-medium text-ok">
                  {t.heroPoints.map((p) => (
                    <li key={p}>✓ {p}</li>
                  ))}
                </ul>
              </div>

              <CheckForm
                key={formKey}
                loading={loading}
                showPaste={showPaste}
                initialText={formKey === 0 ? sharedText : ''}
                onTogglePaste={() => setShowPaste((v) => !v)}
                onSubmit={handleCheck}
              />

              {error && (
                <p role="alert" className="mt-4 rounded-[10px] bg-danger-tint px-4 py-3 text-sm text-danger">
                  {error}
                </p>
              )}

              <div ref={resultRef} className="scroll-mt-24">
                {result && <ResultCard result={result} onReset={handleReset} />}
              </div>

              {!result && <Info onNavigate={navigate} />}
            </>
          )}
        </div>
      </main>

      <Footer onNavigate={navigate} />
    </div>
  )
}
