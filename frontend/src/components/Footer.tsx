import { useAuth } from '../lib/auth-context'
import { useLang } from '../lib/lang-context'
import Logo from './Logo'
import type { View } from './Header'

const YEAR = new Date().getFullYear()
const LINK = 'min-h-11 cursor-pointer text-left text-sm text-soft hover:text-ink hover:underline'

export default function Footer({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { t } = useLang()
  const { status } = useAuth()

  function go(view: View) {
    onNavigate(view)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="border-t border-line bg-card px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-190 flex-col gap-8">
        <div className="grid gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Logo size={28} />
              <span className="text-lg font-bold tracking-tight">TrabahoCheck</span>
            </div>
            <p className="max-w-xs text-sm leading-normal text-soft">{t.footerAbout}</p>
          </div>

          <nav aria-label={t.footerProduct} className="flex flex-col items-start">
            <div className="mb-1 text-sm font-semibold">{t.footerProduct}</div>
            <button type="button" onClick={() => go('check')} className={LINK}>
              {t.footerCheck}
            </button>
            {status === 'in' ? (
              <button type="button" onClick={() => go('profile')} className={LINK}>
                {t.profile}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => go('login')} className={LINK}>
                  {t.login}
                </button>
                <button type="button" onClick={() => go('register')} className={LINK}>
                  {t.register}
                </button>
              </>
            )}
          </nav>

          <div className="flex flex-col gap-1">
            <div className="mb-1 text-sm font-semibold">{t.footerSafe}</div>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-normal text-soft">
              {t.footerTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-line pt-6 text-sm text-muted">
          <p>{t.footer}</p>
          <p>© {YEAR} TrabahoCheck</p>
        </div>
      </div>
    </footer>
  )
}
