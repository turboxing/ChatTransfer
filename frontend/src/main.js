import { createApp } from 'vue'
import App from './App.vue'
import './styles/chat.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import '@/styles/vue-element-plus-x.css'
import VConsole from 'vconsole'
import i18n from './i18n'

// 生成并存储网页访客唯一 ID (visitor_id)
const getVisitorId = () => {
  let vid = localStorage.getItem('chat_web_uid')
  if (!vid) {
    vid = 'web_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
    localStorage.setItem('chat_web_uid', vid)
  }
  return vid
}
window.chat_visitor_id = getVisitorId()

// 根据 URL 参数 debug=1 判断是否显示 vConsole
const urlParams = new URLSearchParams(window.location.search)
if (urlParams.get('debug') === '1') {
  new VConsole()
}

const app = createApp(App)
app.use(ElementPlus)
app.use(i18n)
app.use(router)
app.mount('#app')
