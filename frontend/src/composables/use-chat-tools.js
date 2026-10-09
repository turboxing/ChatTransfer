import { ref } from 'vue'
import { getLocaleSetting, setLocaleSetting } from '../i18n'

export function useChatTools({
  route,
  rawMessages,
  cachePathController,
  t,
  notify,
  alert,
  confirm
}) {
  const toolsDrawerVisible = ref(false)
  const changelogDialogVisible = ref(false)
  const languageSetting = ref(getLocaleSetting())

  const showTools = () => {
    toolsDrawerVisible.value = true
  }

  const showChangelog = () => {
    changelogDialogVisible.value = true
  }

  const handleLanguageChange = (value) => {
    setLocaleSetting(value)
    languageSetting.value = value
    const titleKey = route.meta?.titleKey
    document.title = titleKey ? t(titleKey) : t('app.title')
  }

  const handleOpenCachePath = async () => {
    try {
      const response = await fetch('/openCachePath', { method: 'POST' })
      const result = await response.json()
      if (result.code === 0) {
        notify?.success(result.message)
      } else {
        notify?.error(result.message)
      }
    } catch {
      notify?.error(t('chat.operationFailed'))
    }
  }

  const openCachePathDialog = () => {
    cachePathController.openCachePathEditor()
  }

  const applyDefaultCachePath = () => {
    cachePathController.useDefaultCachePath()
  }

  const confirmCachePathChange = async () => {
    const result = await cachePathController.confirmChangeCachePath({
      onUpdated: () => {
        alert(t('tools.cachePathUpdated'), t('messages.confirmClearHistoryTitle'), {
          confirmButtonText: t('messages.confirmOk')
        })
      }
    })
    if (!result.ok) notify?.warning(t(result.message))
  }

  const handleClearHistory = () => {
    confirm(
      t('messages.confirmClearHistoryText'),
      t('messages.confirmClearHistoryTitle'),
      {
        confirmButtonText: t('messages.confirmOk'),
        cancelButtonText: t('messages.confirmCancel'),
        type: 'warning'
      }
    ).then(() => {
      localStorage.removeItem('im_chat_record')
      rawMessages.value = []
      notify?.success(t('chat.clearHistoryDone'))
    }).catch(() => {})
  }

  const openFeedback = () => {
    window.open('https://github.com/turboxing/ChatTransfer/issues/new', '_blank')
  }

  return {
    toolsDrawerVisible,
    changelogDialogVisible,
    languageSetting,
    showTools,
    showChangelog,
    handleLanguageChange,
    handleOpenCachePath,
    openCachePathDialog,
    applyDefaultCachePath,
    confirmCachePathChange,
    handleClearHistory,
    openFeedback
  }
}
