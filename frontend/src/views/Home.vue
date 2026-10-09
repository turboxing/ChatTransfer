<template>
  <div class="home-container">
    <Welcome 
      variant="borderless"
      :title="t('home.welcomeTitle')" 
      :description="t('home.welcomeDescription')"
      :style="{ background: 'white'}"
    />
    
    <div class="content">
      <el-card class="qr-card">
        <template #header>
          <div class="card-header">
            <span>{{ t('home.step1') }}</span>
          </div>
        </template>
        <div class="qr-wrapper" v-loading="loading">
          <img v-if="qrUrl" :src="qrUrl" class="qr-image" alt="QR Code" />
          <div v-else class="placeholder">{{ t('home.cannotGetQr') }}</div>
        </div>
        <div class="card-footer">
          <el-button type="primary" @click="startChat" :disabled="!jumpUrl">
            {{ t('home.step2') }}
          </el-button>
        </div>
      </el-card>
    </div>

    <div class="footer">
      <div class="footer-content">
        <div>Copyright: {{ copyright }}</div>
        <div>Software Version: {{ version }}</div>
        <div class="feedback-link" @click="openFeedback">{{ t('tools.feedback') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Welcome } from 'vue-element-plus-x'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
const qrUrl = ref('')
const jumpUrl = ref('')
const loading = ref(false)
const version = ref('1.0.0')
const copyright = ref('created by suncx')

const fetchVersionInfo = async () => {
  try {
    const response = await fetch('/getVersionInfo')
    const res = await response.json()
    if (res.code === 0) {
      version.value = res.data.version
      copyright.value = res.data.copyright
    }
  } catch (e) {
    console.error('获取版本信息失败', e)
  }
}

const fetchIndexInfo = async () => {
  loading.value = true
  try {
    const response = await fetch('/getIndexInfo2?receiver=group_chat')
    const res = await response.json()
    if (res.code === 0 && res.data.lists && res.data.lists.length > 0) {
      const userInfo = res.data.lists[0]
      qrUrl.value = userInfo.qrurl
      jumpUrl.value = userInfo.jupmUrl
    } else {
      ElMessage.error(t('messages.getInfoFailed'))
    }
  } catch (e) {
    console.error(e)
    ElMessage.error(t('messages.networkError'))
  } finally {
    loading.value = false
  }
}

const startChat = () => {
  if (jumpUrl.value) {
    try {
      const url = new URL(jumpUrl.value)
      const receiver = url.searchParams.get('receiver') || 'group_chat'
      
      router.push({
        name: 'login',
        query: { receiver }
      })
    } catch (e) {
      console.error('Invalid URL', e)
      // Fallback
      router.push({
        name: 'login',
        query: { receiver: 'group_chat' }
      })
    }
  }
}

const openFeedback = () => {
  window.open('https://github.com/turboxing/ChatTransfer/issues/new', '_blank')
}

onMounted(() => {
  fetchVersionInfo()
  fetchIndexInfo()
})
</script>

<style scoped>
.home-container {
  height: 100vh;
  background-color: #f2f3f5;
  display: flex;
  flex-direction: column;
}

.footer {
  padding: 20px;
  text-align: center;
  color: #909399;
  font-size: 14px;
}

.footer-content {
  margin-top: auto;
}

.navbar {
  background-color: #fff;
  padding: 15px 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  font-weight: 500;
  color: #303133;
}

.content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.qr-card {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.qr-wrapper {
  min-height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.qr-image {
  width: 100%;
  max-width: 250px;
  height: auto;
}

.placeholder {
  color: #909399;
}

.card-footer {
  margin-top: 20px;
}

.feedback-link {
  color: #409eff;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 8px;
}

.feedback-link:hover {
  color: #66b1ff;
}
</style>
