import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { STRINGS, type StringKey } from './strings'

export type Language = 'ur' | 'en'

export const LANGUAGE_KEY = 'moeez.lang'

/** Read synchronously so the very first render is already in the right language. */
export function storedLanguage(): Language {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'ur'
  } catch {
    return 'ur'
  }
}

export type Translate = (key: StringKey, ...args: (string | number)[]) => string

interface I18nState {
  lang: Language
  dir: 'rtl' | 'ltr'
  isUrdu: boolean
  setLang: (lang: Language) => void
  toggle: () => void
  t: Translate
}

const I18nContext = createContext<I18nState | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(storedLanguage)

  const dir: 'rtl' | 'ltr' = lang === 'ur' ? 'rtl' : 'ltr'

  // Direction, lang attribute and the font class all follow the selected language.
  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = dir
    root.classList.toggle('lang-ur', lang === 'ur')
    root.classList.toggle('lang-en', lang === 'en')
  }, [lang, dir])

  const setLang = useCallback((next: Language) => {
    try {
      localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // A browser with storage disabled still switches for this session.
    }
    setLangState(next)
  }, [])

  const t = useCallback<Translate>(
    (key, ...args) => {
      const pair = STRINGS[key]
      if (!pair) return key
      const text = lang === 'en' ? pair[1] : pair[0]
      return args.length === 0
        ? text
        : text.replace(/\{(\d+)\}/g, (match, index: string) => String(args[Number(index)] ?? match))
    },
    [lang],
  )

  const value = useMemo<I18nState>(
    () => ({ lang, dir, isUrdu: lang === 'ur', setLang, toggle: () => setLang(lang === 'ur' ? 'en' : 'ur'), t }),
    [lang, dir, setLang, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nState {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}

/** Convenience for components that only need the translate function. */
export function useT(): Translate {
  return useI18n().t
}
