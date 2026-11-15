import { useState, type ReactNode } from 'react'
import { LangContext } from '../lib/lang-context'
import { STRINGS } from '../lib/strings'
import type { Lang } from '../lib/types'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('lang')
    if (saved === 'en' || saved === 'tl') return saved
  } catch {
    // Storage can be blocked; fall back to English.
  }
  return 'en'
}

export default function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  function setLang(next: Lang) {
    setLangState(next)
    document.documentElement.lang = next === 'tl' ? 'fil' : 'en'
    try {
      localStorage.setItem('lang', next)
    } catch {
      // Not critical.
    }
  }

  return <LangContext.Provider value={{ lang, setLang, t: STRINGS[lang] }}>{children}</LangContext.Provider>
}
