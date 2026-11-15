import { useState, type FormEvent } from 'react'
import { authApi, authMessage, AuthError } from '../lib/auth-api'
import { useAuth } from '../lib/auth-context'
import { useLang } from '../lib/lang-context'

const FOCUS = 'focus:outline-2 focus:outline-offset-2 focus:outline-brand'
const INPUT = `h-12 w-full rounded-[10px] border border-line-strong bg-card px-4 text-base text-ink placeholder:text-muted ${FOCUS}`

interface Props {
  mode: 'login' | 'register'
  onSwitch: () => void
  onDone: () => void
}

export default function AuthForm({ mode, onSwitch, onDone }: Props) {
  const { t } = useLang()
  const { logIn } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isRegister = mode === 'register'

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const session = isRegister
        ? await authApi.register({ name: name.trim(), email: email.trim(), password })
        : await authApi.login({ email: email.trim(), password })
      logIn(session.token, session.user)
      onDone()
    } catch (err) {
      setError(authMessage(err instanceof AuthError ? err.problem : 'generic', t))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-4 flex max-w-md flex-col gap-4 rounded-2xl border border-line bg-card p-4 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{isRegister ? t.registerTitle : t.loginTitle}</h1>
        <p className="text-sm text-soft">{isRegister ? t.registerText : t.loginText}</p>
      </div>

      {isRegister && (
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-semibold">
            {t.name}
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
          />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-semibold">
          {t.email}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-semibold">
          {t.password}
        </label>
        <input
          id="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
          minLength={isRegister ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={isRegister ? 'password-hint' : undefined}
          className={INPUT}
        />
        {isRegister && (
          <p id="password-hint" className="text-sm text-muted">
            {t.passwordHint}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-[10px] bg-danger-tint px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="h-12 w-full cursor-pointer rounded-[10px] bg-brand px-7 text-base font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? t.authWorking : isRegister ? t.register : t.login}
      </button>

      <button
        type="button"
        onClick={onSwitch}
        className="min-h-11 cursor-pointer text-sm font-semibold text-link underline underline-offset-2"
      >
        {isRegister ? t.haveAccount : t.noAccount}
      </button>
    </form>
  )
}
