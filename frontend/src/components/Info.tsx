import { useAuth } from '../lib/auth-context'
import { useLang } from '../lib/lang-context'
import type { View } from './Header'

export default function Info({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { t } = useLang()
  const { status } = useAuth()

  return (
    <div className="mt-12 flex flex-col gap-12">
      <section aria-labelledby="features">
        <h2 id="features" className="text-xl font-bold tracking-tight">
          {t.featuresTitle}
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.map((f) => (
            <li key={f.title} className="rounded-2xl border border-line bg-card p-4">
              <div className="text-base font-semibold">{f.title}</div>
              <p className="mt-1 text-sm leading-normal text-soft">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="text-xl font-bold tracking-tight">
          {t.howTitle}
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {t.how.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                {i + 1}
              </div>
              <div className="mt-3 text-base font-semibold">{s.title}</div>
              <p className="mt-1 text-sm leading-normal text-soft">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="scams">
        <h2 id="scams" className="text-xl font-bold tracking-tight">
          {t.scamsTitle}
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {t.scams.map((s) => (
            <li key={s.title} className="rounded-2xl border border-line bg-card p-4">
              <div className="text-base font-semibold">{s.title}</div>
              <p className="mt-1 text-sm leading-normal text-soft">{s.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {status === 'out' && (
        <section
          aria-labelledby="cta"
          className="flex flex-col items-start gap-4 rounded-2xl bg-brand p-6 text-white sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex max-w-md flex-col gap-1">
            <h2 id="cta" className="text-xl font-bold tracking-tight">
              {t.ctaTitle}
            </h2>
            <p className="text-sm leading-normal">{t.ctaText}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="h-12 flex-none cursor-pointer rounded-[10px] bg-white px-6 text-base font-semibold text-brand hover:bg-page"
          >
            {t.ctaButton}
          </button>
        </section>
      )}
    </div>
  )
}
