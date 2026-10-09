<template>
  <div class="top-bar" @click="$emit('locate')">
    <div class="top-bar-content">
      <el-icon class="top-icon"><Top /></el-icon>
      <span class="top-text">{{ content }}</span>
    </div>
    <el-button class="top-close" link size="small" type="primary" @click.stop="$emit('unpin')">
      <el-icon><Close /></el-icon>
    </el-button>
  </div>
</template>

<script setup>
import { Close, Top } from '@element-plus/icons-vue'

defineProps({
  content: { type: String, required: true }
})

defineEmits(['locate', 'unpin'])
</script>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background-color: #ffffff;
  color: #303133;
  cursor: pointer;
  border-bottom: 1px solid #dcdfe6;
  transition: all 0.3s ease;
}

.top-bar:hover {
  background-color: #f5f7fa;
}

.top-bar-content {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
  margin-right: 16px;
}

.top-icon {
  font-size: 16px;
  color: #409eff;
}

.top-text {
  margin-left: 8px;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
