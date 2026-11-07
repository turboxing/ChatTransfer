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
      <div
        v-for="room in rooms"
        :key="room.id"
        class="room-item"
        :class="{ active: room.id === activeRoomId, public: room.id === 'group_chat' }"
      >
        <button type="button" class="room-select" @click="emit('select', room)">
          <div class="room-main">
            <div class="room-name">
              <span v-if="room.id === 'group_chat'" class="public-badge">
                <el-icon><OfficeBuilding /></el-icon>
                {{ t('rooms.publicBadge') }}
              </span>
              <span class="room-name-text">
                {{ room.id === 'group_chat' ? t('rooms.default') : room.name }}
              </span>
            </div>
            <div class="room-preview">
              {{ getRoomPreview(room) }}
            </div>
            <div v-if="getExpiryText(room)" class="room-expiry">
              {{ getExpiryText(room) }}
            </div>
          </div>
          <div class="room-meta">
            <span class="online-count">{{ t('chat.onlineCount', { count: room.onlineCount || 0 }) }}</span>
            <span v-if="isOwner(room)" class="owner-tag">{{ t('rooms.owner') }}</span>
            <span v-if="room.id === activeRoomId" class="current-tag">{{ t('rooms.current') }}</span>
          </div>
        </button>
        <el-dropdown
          v-if="hasRoomActions(room)"
          trigger="click"
          placement="bottom-end"
          @command="handleCommand($event, room)"
        >
          <el-button class="room-more" text circle size="small" @click.stop>
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-if="isOwner(room)" command="rename" :icon="EditPen">
                {{ t('rooms.rename') }}
              </el-dropdown-item>
              <el-dropdown-item command="leave" :icon="SwitchButton">
                {{ t('rooms.leave') }}
              </el-dropdown-item>
              <el-dropdown-item
                v-if="isOwner(room)"
                command="dissolve"
                :icon="Delete"
                divided
                class="danger-item"
              >
                {{ t('rooms.dissolve') }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import {
  Delete,
  EditPen,
  Key,
  MoreFilled,
  OfficeBuilding,
  Plus,
  SwitchButton
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  rooms: { type: Array, default: () => [] },
  activeRoomId: { type: String, required: true },
  currentUser: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:modelValue',
  'select',
  'create',
  'join',
  'rename',
  'leave',
  'dissolve'
])
const { t } = useI18n()

const isOwner = (room) => (
  room?.id !== 'group_chat' &&
  (room?.role === 'owner' || (!!props.currentUser && room?.ownerId === props.currentUser))
)

const hasRoomActions = (room) => room?.id !== 'group_chat'

const handleCommand = (command, room) => {
  if (command === 'rename') emit('rename', room)
  if (command === 'leave') emit('leave', room)
  if (command === 'dissolve') emit('dissolve', room)
}

const getRoomPreview = (room) => {
  const message = room.lastMessage
  if (!message) return t('rooms.noMessages')
  if (message.msgType === 'IMAGE') return t('chat.imageTag')
  if (message.msgType === 'FILE') return t('chat.fileTag')
  return message.content || t('rooms.noMessages')
}

const getExpiryText = (room) => {
  if (!room?.expiresAt || room.id === 'group_chat') return ''

  const remainingMs = Number(room.expiresAt) - Date.now()
  const days = Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)))
  return t('rooms.autoDeleteIn', { days })
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
  gap: 4px;
  padding: 4px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #ffffff;
  color: #303133;
  text-align: left;
  transition: background-color 0.2s, border-color 0.2s;
}

.room-item.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.room-item.public {
  border-color: #d9ecff;
  background: #f5faff;
}

.room-item.public.active {
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

.room-select {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.room-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.room-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex: none;
  padding: 1px 6px;
  border: 1px solid #b3d8ff;
  border-radius: 999px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 10px;
  font-weight: 500;
}

.public-badge .el-icon {
  font-size: 11px;
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

.room-expiry {
  margin-top: 2px;
  color: #b88230;
  font-size: 11px;
}

.room-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex: none;
}

.room-more {
  flex: none;
  color: #909399;
}

.online-count {
  color: #909399;
  font-size: 12px;
}

.owner-tag {
  color: #e6a23c;
  font-size: 11px;
}

.current-tag {
  color: var(--el-color-primary);
  font-size: 11px;
}

:global(.danger-item) {
  color: #f56c6c;
}
</style>
