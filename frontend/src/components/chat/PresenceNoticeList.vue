<template>
  <TransitionGroup name="presence" tag="div" class="presence-notice-list" aria-live="polite">
    <div
      v-for="notice in events"
      :key="notice.id"
      class="presence-notice"
      :class="notice.type"
    >
      <span class="notice-dot"></span>
      <span>
        {{ t(notice.type === 'online' ? 'chat.presenceOnline' : 'chat.presenceOffline', { name: notice.name }) }}
      </span>
    </div>
  </TransitionGroup>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  events: { type: Array, default: () => [] }
})

const { t } = useI18n()
</script>

<style scoped>
.presence-notice-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
}

.presence-notice {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.notice-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #909399;
}

.presence-notice.online .notice-dot {
  background: #67c23a;
}

.presence-enter-active,
.presence-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.presence-enter-from,
.presence-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
