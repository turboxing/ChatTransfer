<template>
  <div class="chat-header">
    <div class="header-content">
      <div class="header-left-slot" aria-hidden="true"></div>
      <div class="header-center">
        <div class="header-title-info">
          <h3 class="group-name-text" :title="editGroupNameTitle" @click="$emit('edit-group-name')">
            {{ groupName }}
            <el-icon class="edit-icon"><EditPen /></el-icon>
          </h3>
          <div class="header-meta">
            <span class="connection-status" :class="{ online: isConnected }">
              {{ isConnected ? onlineText : offlineText }}
            </span>
            <button
              v-if="showOnlineCount"
              type="button"
              class="online-count"
              @click="$emit('open-online-users')"
            >
              {{ onlineCountText }}
            </button>
          </div>
        </div>
      </div>
      <div class="header-right">
        <el-button class="header-action" circle size="small" @click="$emit('open-pin-drawer')">
          <img class="pin-icon-small" src="/pin.svg" alt="pin" />
        </el-button>
        <el-button class="header-action" circle size="small" @click="$emit('show-qr')">
          <el-icon><FullScreen /></el-icon>
        </el-button>
        <el-button circle size="small" @click="$emit('show-tools')">
          <el-icon><Tools /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { EditPen, FullScreen, Tools } from '@element-plus/icons-vue'

defineProps({
  groupName: { type: String, required: true },
  onlineCount: { type: Number, required: true },
  onlineCountText: { type: String, required: true },
  isConnected: { type: Boolean, required: true },
  showOnlineCount: { type: Boolean, default: false },
  editGroupNameTitle: { type: String, required: true },
  onlineText: { type: String, required: true },
  offlineText: { type: String, required: true }
})

defineEmits(['edit-group-name', 'open-pin-drawer', 'show-qr', 'show-tools', 'open-online-users'])
</script>

<style scoped>
.chat-header {
  height: 60px;
  background-color: #ffffff;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.header-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  width: 100%;
}

.header-left-slot {
  min-width: 0;
}

.header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.header-title-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.group-name-text {
  margin: 0;
  font-size: 18px;
  color: #303133;
  cursor: pointer;
  display: flex;
  align-items: center;
  max-width: min(52vw, 480px);
  gap: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.edit-icon {
  font-size: 14px;
  color: #c0c4cc;
  opacity: 0;
  transition: opacity 0.2s;
}

.group-name-text:hover .edit-icon {
  opacity: 1;
}

.online-count {
  width: fit-content;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 12px;
  color: #909399;
  cursor: pointer;
}

.online-count:hover {
  color: var(--el-color-primary);
}

.connection-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: #f56c6c;
  color: white;
  white-space: nowrap;
}

.connection-status.online {
  background-color: #67c23a;
}

.header-right {
  display: flex;
  align-items: center;
  justify-self: end;
  gap: 8px;
}

.header-right :deep(.el-button + .el-button) {
  margin-left: 0;
}

@media (max-width: 640px) {
  .chat-header {
    padding: 0 12px;
  }

  .group-name-text {
    max-width: 42vw;
    font-size: 16px;
  }

  .header-meta {
    gap: 6px;
  }

  .connection-status,
  .online-count {
    font-size: 11px;
  }

  .header-right {
    gap: 4px;
  }
}
</style>
