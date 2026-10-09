import { ref } from 'vue'

export function useVersionInfo() {
  const version = ref('1.0.0')
  const copyright = ref('created by suncx')

  const fetchVersionInfo = async () => {
    try {
      const response = await fetch('/getVersionInfo')
      const result = await response.json()
      if (result.code === 0) {
        version.value = result.data.version
        copyright.value = result.data.copyright
      }
    } catch (error) {
      console.error('获取版本信息失败', error)
    }
  }

  return { version, copyright, fetchVersionInfo }
}
