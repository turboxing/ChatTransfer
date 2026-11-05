<template>
  <el-drawer
    :model-value="modelValue"
    :title="t('rooms.title')"
    direction="ltr"
    size="min(360px, 92vw)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="room-actions">
      <el-button type="primary" :icon="Plus" @click="emit('create')">
        {{ t('rooms.create') }}
      </el-button>
      <el-button :icon="Key" @click="emit('join')">
        {{ t('rooms.join') }}
      </el-button>
    </div>

    <div v-loading="loading" class="room-list">
      <el-empty v-if="!loading && rooms.length === 0" :description="t('rooms.empty')" />
      <button
        v-for="room in rooms"
        :key="room.id"
        type="button"
        class="room-item"
        :class="{ active: room.id === activeRoomId }"
        @click="emit('select', room)"
      >
        <div class="room-main">
          <div class="room-name">
            {{ room.id === 'group_chat' ? t('rooms.default') : room.name }}
          </div>
          <div class="room-preview">
            {{ getRoomPreview(room) }}
          </div>
        </div>
        <div class="room-meta">
          <span class="online-count">{{ t('chat.onlineCount', { count: room.onlineCount || 0 }) }}</span>
          <span v-if="room.id === activeRoomId" class="current-tag">{{ t('rooms.current') }}</span>
        </div>
      </button>
    </div>
  </el-drawer>
</template>

<script setup>
import { Key, Plus } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

defineProps({
  modelValue: { type: Boolean, default: false },
  rooms: { type: Array, default: () => [] },
  activeRoomId: { type: String, required: true },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'select', 'create', 'join'])
const { t } = useI18n()

const getRoomPreview = (room) => {
  const message = room.lastMessage
  if (!message) return t('rooms.noMessages')
  if (message.msgType === 'IMAGE') return t('chat.imageTag')
  if (message.msgType === 'FILE') return t('chat.fileTag')
  return message.content || t('rooms.noMessages')
}
</script>

<style scoped>
.room-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #ffffff;
  color: #303133;
  text-align: left;
  cursor: pointer;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: background-color 0.2s, border-color 0.2s;
}

.room-item.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

@media (hover: hover) and (pointer: fine) {
  .room-item:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.room-main {
  min-width: 0;
}

.room-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.room-preview {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.room-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex: none;
}

.online-count {
  color: #909399;
  font-size: 12px;
}

.current-tag {
  color: var(--el-color-primary);
  font-size: 11px;
}
</style>
