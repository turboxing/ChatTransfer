import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'
import ar from './locales/ar.json'

const LOCALE_STORAGE_KEY = 'chat_locale'

const detectSystemLocale = () => {
  const language = (navigator.language || navigator.userLanguage || '').toLowerCase()
  if (language.startsWith('zh')) return 'zh-CN'
  if (language.startsWith('ar')) return 'ar'
  return 'en'
}

export const getLocaleSetting = () => {
  return localStorage.getItem(LOCALE_STORAGE_KEY) || 'system'
}

export const getEffectiveLocale = (setting) => {
  if (!setting || setting === 'system') return detectSystemLocale()
  return setting
}

const initialSetting = getLocaleSetting()
const initialLocale = getEffectiveLocale(initialSetting)

const applyDocumentLocale = (locale) => {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr'
}

const messages = {
  en,
  'zh-CN': zhCN,
  ar
}

const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages
})

applyDocumentLocale(initialLocale)

export const setLocaleSetting = (setting) => {
  localStorage.setItem(LOCALE_STORAGE_KEY, setting)
  const locale = getEffectiveLocale(setting)
  i18n.global.locale.value = locale
  applyDocumentLocale(locale)
}

export default i18n
