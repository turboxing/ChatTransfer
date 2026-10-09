<template>
  <div class="login-container">
    <div class="login-content">
      <!-- 昵称输入界面 -->
      <div v-if="showNicknameInput" class="nickname-section">
        <div class="logo-icon">
          <svg viewBox="0 0 1024 1024" width="56" height="56">
            <path d="M512 64C264.6 64 64 228.6 64 432c0 152.4 112 282.6 268.8 336L512 960l179.2-192C752 720 960 587.6 960 432 960 228.6 759.4 64 512 64z" fill="#409eff" opacity="0.1"/>
            <path d="M512 192c-141.4 0-256 89.6-256 200 0 68.8 42.4 129.6 106.4 165.2L352 592l12 48 44-20c28-12.8 58-19.2 88-19.2 141.4 0 256-89.6 256-200S653.4 192 512 192z" fill="#409eff" opacity="0.3"/>
            <circle cx="400" cy="384" r="24" fill="#409eff"/>
            <circle cx="512" cy="384" r="24" fill="#409eff"/>
            <circle cx="624" cy="384" r="24" fill="#409eff"/>
          </svg>
        </div>
        <h2>{{ t('login.nicknameLabel') }}</h2>
        <el-input
          ref="nicknameInputRef"
          v-model="nickname"
          :placeholder="t('login.nicknamePlaceholder')"
          size="large"
          class="nickname-input"
          maxlength="20"
          @keyup.enter="handleJoinChat"
        />
        <el-button type="primary" size="large" class="join-btn" @click="handleJoinChat">
          {{ t('login.joinChat') }}
        </el-button>
      </div>

      <!-- 扫码登录中提示 -->
      <h1 v-else id="loginTip">{{ statusText }}</h1>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElInput, ElButton } from 'element-plus'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const statusText = ref(t('login.scanning'))

const NICKNAME_STORAGE_KEY = 'im_chat_nickname'
const showNicknameInput = ref(false)
const nickname = ref('')
const nicknameInputRef = ref(null)

const generateUUID = () => {
  let d = new Date().getTime()
  if (window.performance && typeof window.performance.now === 'function') {
    d += performance.now()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0
    d = Math.floor(d / 16)
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

const generateDefaultNickname = () => {
  const uuid = generateUUID()
  const suffix = uuid.replace(/-/g, '').slice(0, 4).toUpperCase()
  return t('chat.defaultGroupName').startsWith('Group') ? `User_${suffix}` : `用户_${suffix}`
}

const handleLogin = async (sender) => {
  const receiver = route.query.receiver || 'group_chat'
  const userNickname = nickname.value.trim() || generateDefaultNickname()

  // 保存昵称到 localStorage
  localStorage.setItem(NICKNAME_STORAGE_KEY, userNickname)

  try {
    const response = await fetch(`/scanLogin?sender=${sender}&receiver=${receiver}`)
    const res = await response.json()

    if (res.code === 0) {
      statusText.value = t('login.successAndRedirect')
      setTimeout(() => {
        router.push({
          name: 'chat',
          query: {
            sender,
            receiver,
            nickname: userNickname
          }
        })
      }, 500)
    } else {
      console.error(res)
      statusText.value = t('login.failedRetry')
    }
  } catch (e) {
    console.error(e)
    statusText.value = t('login.successAndRedirect')
    setTimeout(() => {
      router.push({
        name: 'chat',
        query: {
          sender,
          receiver,
          nickname: userNickname
        }
      })
    }, 500)
  }
}

const handleJoinChat = () => {
  if (!nickname.value.trim()) {
    nickname.value = generateDefaultNickname()
  }
  const sender = generateUUID()
  showNicknameInput.value = false
  statusText.value = t('login.scanning')
  handleLogin(sender)
}

onMounted(() => {
  const savedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY)
  if (savedNickname) {
    // 有保存的昵称，直接用并登录
    nickname.value = savedNickname
    const sender = generateUUID()
    handleLogin(sender)
  } else {
    // 没有保存昵称，显示输入界面
    nickname.value = generateDefaultNickname()
    showNicknameInput.value = true
    nextTick(() => {
      nicknameInputRef.value?.focus()
    })
  }
})
</script>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #fff;
}

.login-content {
  text-align: center;
}

h1 {
  font-size: 24px;
  color: #303133;
}

.nickname-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 0 30px;
  max-width: 360px;
}

.logo-icon {
  margin-bottom: 8px;
}

.nickname-section h2 {
  font-size: 18px;
  color: #303133;
  margin: 0;
}

.nickname-input {
  width: 100%;
}

.join-btn {
  width: 100%;
}
</style>