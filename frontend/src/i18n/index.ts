import { createI18n } from 'vue-i18n'
import en from './locales/en'
import fr from './locales/fr'

export const SUPPORTED_LOCALES = ['en', 'fr'] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const LOCALE_STORAGE_KEY = 'ticketing-locale'
const FALLBACK_LOCALE: SupportedLocale = 'en'

function normalizeLocale(value: unknown): SupportedLocale {
  if (typeof value !== 'string') {
    return FALLBACK_LOCALE
  }

  const language = value.trim().toLowerCase().split('-')[0]
  if (language === 'en' || language === 'fr') {
    return language
  }

  return FALLBACK_LOCALE
}

function getInitialLocale(): SupportedLocale {
  if (typeof window !== 'undefined') {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (storedLocale) {
      return normalizeLocale(storedLocale)
    }
  }

  if (typeof navigator !== 'undefined') {
    return normalizeLocale(navigator.language)
  }

  return FALLBACK_LOCALE
}

const initialLocale = getInitialLocale()

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: FALLBACK_LOCALE,
  messages: {
    en,
    fr,
  },
})

function setDocumentLanguage(locale: SupportedLocale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', locale)
  }
}

setDocumentLanguage(initialLocale)

export function setLocale(locale: SupportedLocale): void {
  i18n.global.locale.value = locale
  setDocumentLanguage(locale)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  }
}
