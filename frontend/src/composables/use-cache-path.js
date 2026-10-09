import { ref } from 'vue'

export function useCachePath() {
  const cachePath = ref('')
  const cachePathCustomized = ref(false)
  const cachePathDialogVisible = ref(false)
  const cachePathInput = ref('')
  const cachePathSaving = ref(false)
  const migrateFiles = ref(true)
  let defaultCachePath = ''

  const fetchCachePath = async () => {
    try {
      const response = await fetch('/getHomeDir')
      const result = await response.json()
      if (result.code === 0) {
        cachePath.value = result.data.uploadsDir
        cachePathCustomized.value = !!result.data.isCustomized
        defaultCachePath = result.data.defaultDir || ''
      }
    } catch (error) {
      console.error(error)
    }
  }

  const openCachePathEditor = () => {
    cachePathInput.value = cachePath.value || ''
    migrateFiles.value = true
    cachePathDialogVisible.value = true
  }

  const useDefaultCachePath = () => {
    cachePathInput.value = defaultCachePath || ''
  }

  const confirmChangeCachePath = async ({ onUpdated }) => {
    const input = (cachePathInput.value || '').trim()
    if (!input) {
      return { ok: false, message: 'tools.cachePathInputPlaceholder' }
    }

    cachePathSaving.value = true
    try {
      const response = await fetch('/setCachePath', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: input, migrate: migrateFiles.value })
      })
      const result = await response.json()
      if (result.code === 0) {
        cachePathDialogVisible.value = false
        await fetchCachePath()
        onUpdated?.(result)
      }
      return { ok: result.code === 0, message: result.message || 'tools.cachePathInvalid' }
    } catch (error) {
      return { ok: false, message: 'chat.operationFailed' }
    } finally {
      cachePathSaving.value = false
    }
  }

  return {
    cachePath,
    cachePathCustomized,
    cachePathDialogVisible,
    cachePathInput,
    cachePathSaving,
    migrateFiles,
    fetchCachePath,
    openCachePathEditor,
    useDefaultCachePath,
    confirmChangeCachePath
  }
}
