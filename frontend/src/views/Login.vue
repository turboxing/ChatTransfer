<template>
  <div class="login-container">
    <div class="login-content">
      <h1 id="loginTip">{{ statusText }}</h1>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDefaultNickname } from '../composables/use-default-nickname'
import { useUserId } from '../composables/use-user-identity'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const statusText = ref(t('login.scanning'))
const { resolveNickname } = useDefaultNickname(locale)

const NICKNAME_STORAGE_KEY = 'im_chat_nickname'
const nickname = ref('')
const { getUserId } = useUserId()

const handleLogin = async (sender) => {
  const receiver = route.query.receiver || 'group_chat'
  const userNickname = nickname.value.trim() || resolveNickname()

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

onMounted(() => {
  nickname.value = resolveNickname(localStorage.getItem(NICKNAME_STORAGE_KEY))
  handleLogin(getUserId())
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

</style>
