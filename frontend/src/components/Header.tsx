import { useAuth } from '../lib/auth-context'
import { useLang } from '../lib/lang-context'
import type { Lang } from '../lib/types'
import Logo from './Logo'

export type View = 'check' | 'login' | 'register' | 'profile'

interface Props {
  dark: boolean
  onToggleTheme: () => void
  onNavigate: (view: View) => void
}

const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'tl', label: 'TL' },
]

export default function Header({ dark, onToggleTheme, onNavigate }: Props) {
  const { lang, setLang, t } = useLang()
  const { status, user } = useAuth()

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 py-3 sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={() => onNavigate('check')} aria-label={t.back} className="flex-none cursor-pointer">
          <Logo />
        </button>
        <div className="min-w-0">
          <div className="text-xl leading-tight font-bold tracking-tight">TrabahoCheck</div>
          <div className="hidden text-sm text-muted sm:block">{t.tagline}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {status === 'in' && user && (
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="h-11 max-w-40 cursor-pointer truncate rounded-[10px] border border-line-strong bg-card px-4 text-sm font-semibold text-ink hover:bg-page"
          >
            {user.name.split(' ')[0] || t.profile}
          </button>
        )}
        {status === 'out' && (
          <>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-4 text-sm font-semibold text-ink hover:bg-page"
            >
              {t.login}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="h-11 cursor-pointer rounded-[10px] bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              {t.register}
            </button>
          </>
        )}
        <div role="group" aria-label={t.langLabel} className="flex overflow-hidden rounded-[10px] border border-line-strong">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              aria-pressed={lang === l.code}
              onClick={() => setLang(l.code)}
              className={`h-11 min-w-11 cursor-pointer px-3 text-sm font-semibold ${
                lang === l.code ? 'bg-brand text-white' : 'bg-card text-ink hover:bg-page'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={dark ? t.toLight : t.toDark}
          title={dark ? t.toLight : t.toDark}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px] border border-line-strong bg-card text-ink hover:bg-page"
        >
          {dark ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}
