import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import zhCN from './locales/zh-CN.json'

const LOCALE_STORAGE_KEY = 'chat_locale'

const detectSystemLocale = () => {
  const language = (navigator.language || navigator.userLanguage || '').toLowerCase()
  if (language.startsWith('zh')) return 'zh-CN'
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

const messages = {
  en,
  'zh-CN': zhCN
}

const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'en',
  messages
})

export const setLocaleSetting = (setting) => {
  localStorage.setItem(LOCALE_STORAGE_KEY, setting)
  i18n.global.locale.value = getEffectiveLocale(setting)
}

export default i18n
