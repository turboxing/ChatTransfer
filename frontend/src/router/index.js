import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Chat from '../views/Chat.vue'
import Login from '../views/Login.vue'
import i18n from '../i18n'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
      meta: { titleKey: 'routes.home' }
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: { titleKey: 'routes.login' }
    },
    {
      path: '/chat',
      name: 'chat',
      component: Chat,  
      meta: { titleKey: 'routes.chat' }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const titleKey = to.meta.titleKey
  document.title = titleKey ? i18n.global.t(titleKey) : i18n.global.t('app.title')
  
  // 统计页面访问 (PV)
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'page_view',
      eventProperties: {
        path: to.path,
        name: to.name,
        title: titleKey ? i18n.global.t(titleKey) : i18n.global.t('app.title'),
        visitor_id: window.chat_visitor_id
      }
    })
  }).catch(err => console.error(i18n.global.t('messages.pvTrackFailed'), err));

  next()
})

export default router
