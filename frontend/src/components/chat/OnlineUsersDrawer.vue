<template>
  <el-drawer
    :model-value="modelValue"
    :modal="modal"
    :z-index="3000"
    append-to-body
    direction="rtl"
    size="min(380px, 92vw)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="device-drawer-header">
        <strong>{{ t('chat.deviceListTitle') }}</strong>
        <span>{{ summaryText }}</span>
      </div>
    </template>

    <div v-if="sortedUsers.length === 0" class="device-empty">
      {{ t('chat.noDevices') }}
    </div>
    <div v-else class="device-list">
      <div
        v-for="user in sortedUsers"
        :key="user.sender"
        class="device-item"
        :class="{ 'is-offline': user.status !== 'ONLINE' }"
      >
        <div class="device-main">
          <span class="status-dot" :class="{ online: user.status === 'ONLINE' }"></span>
          <div class="device-info">
            <div class="device-name">
              {{ getDisplayName(user) }}
              <el-tag v-if="user.sender === currentUser" size="small" effect="plain">
                {{ t('chat.localDevice') }}
              </el-tag>
            </div>
            <div class="device-meta">
              <span class="device-type">{{ getDeviceLabel(user) }}</span>
              <span v-if="user.ip" :title="user.ip" class="device-ip">{{ user.ip }}</span>
              <span :title="user.sender">#{{ user.sender.slice(-8) }}</span>
            </div>
            <div v-if="user.status !== 'ONLINE' && user.lastSeenAt" class="last-seen">
              {{ t('chat.lastSeen', { time: formatTime(user.lastSeenAt) }) }}
            </div>
          </div>
        </div>
        <span class="status-text" :class="{ online: user.status === 'ONLINE' }">
          {{ user.status === 'ONLINE' ? t('chat.online') : t('chat.offline') }}
        </span>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getDeviceLabel as resolveDeviceLabel } from '../../utils/device-label'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  users: { type: Array, default: () => [] },
  currentUser: { type: String, required: true },
  modal: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()

const getDisplayName = (user) => user.nickname || user.sender.slice(-5)

const formatTime = (value) => new Date(value).toLocaleString()

const getDeviceLabel = (user) => resolveDeviceLabel(user.userAgent, t('chat.unknownDevice'))

const summaryText = computed(() => {
  const total = props.users.filter((user) => user.status === 'ONLINE').length
  const others = props.users.filter((user) => (
    user.status === 'ONLINE' && user.sender !== props.currentUser
  )).length
  return t('chat.deviceTotal', { total, others })
})

const sortedUsers = computed(() => (
  [...props.users].sort((left, right) => {
    const leftOnline = left.status === 'ONLINE' ? 0 : 1
    const rightOnline = right.status === 'ONLINE' ? 0 : 1
    if (leftOnline !== rightOnline) return leftOnline - rightOnline
    return getDisplayName(left).localeCompare(getDisplayName(right))
  })
))
</script>

<style scoped>
.device-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-drawer-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-drawer-header strong {
  color: #303133;
  font-size: 17px;
}

.device-drawer-header span {
  color: #909399;
  font-size: 12px;
  font-weight: 400;
}

.device-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #ffffff;
}

.device-item.is-offline {
  background: #fafafa;
}

.device-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: #c0c4cc;
  flex: none;
}

.status-dot.online {
  background: #67c23a;
}

.device-info {
  min-width: 0;
}

.device-name {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.device-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.device-type {
  color: #606266;
}

.device-ip {
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.last-seen {
  margin-top: 3px;
  color: #b1b3b8;
  font-size: 12px;
}

.status-text {
  flex: none;
  color: #909399;
  font-size: 12px;
}

.status-text.online {
  color: #67c23a;
}

.device-empty {
  padding: 40px 20px;
  color: #909399;
  text-align: center;
  font-size: 14px;
}
</style>
