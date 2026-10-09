<template>
  <div class="chat-header">
    <div class="header-content">
      <div class="header-left">
        <div class="header-title-info">
          <h3 class="group-name-text" :title="editGroupNameTitle" @click="$emit('edit-group-name')">
            {{ groupName }}
            <el-icon class="edit-icon"><EditPen /></el-icon>
          </h3>
          <span v-if="showOnlineCount" class="online-count">{{ onlineCountText }}</span>
        </div>
        <span class="connection-status" :class="{ online: isConnected }">
          {{ isConnected ? onlineText : offlineText }}
        </span>
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

defineEmits(['edit-group-name', 'open-pin-drawer', 'show-qr', 'show-tools'])
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
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-name-text {
  margin: 0;
  font-size: 18px;
  color: #303133;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
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
  font-size: 12px;
  color: #909399;
}

.connection-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background-color: #f56c6c;
  color: white;
}

.connection-status.online {
  background-color: #67c23a;
}
</style>
