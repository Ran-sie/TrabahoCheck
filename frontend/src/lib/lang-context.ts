import { createContext, useContext } from 'react'
import type { Strings } from './strings'
import type { Lang } from './types'

export interface LangValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Strings
}

export const LangContext = createContext<LangValue | null>(null)

export function useLang(): LangValue {
  const value = useContext(LangContext)
  if (!value) throw new Error('useLang must be used inside <LangProvider>')
  return value
}
