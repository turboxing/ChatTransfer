<template>
  <el-drawer :model-value="modelValue" :title="t('tools.commonFeatures')" direction="rtl" size="300px"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="language-setting">
      <div class="language-label">{{ t('tools.language') }}</div>
      <el-select :model-value="languageSetting" size="small" style="width: 100%;"
        @update:model-value="emit('update:language-setting', $event)">
        <el-option :label="t('common.system')" value="system" />
        <el-option :label="t('common.chinese')" value="zh-CN" />
        <el-option :label="t('common.english')" value="en" />
      </el-select>
    </div>

    <div class="identity-setting">
      <div class="setting-item">
        <div class="setting-label">{{ t('chat.myNickname') }}</div>
        <div class="setting-value-group">
          <span class="setting-value">{{ myNickname || t('chat.nicknamePlaceholder') }}</span>
          <el-button link size="small" @click="emit('edit-nickname')">
            <el-icon><EditPen /></el-icon>
          </el-button>
        </div>
      </div>
      <div v-if="showGroupName" class="setting-item">
        <div class="setting-label">{{ t('chat.groupName') }}</div>
        <div class="setting-value-group">
          <span class="setting-value">{{ groupName || t('chat.defaultGroupName') }}</span>
          <el-button link size="small" @click="emit('edit-group-name')">
            <el-icon><EditPen /></el-icon>
          </el-button>
        </div>
      </div>
    </div>

    <div class="tools-list">
      <div class="tool-item" @click="emit('show-qr')">
        <el-icon><FullScreen /></el-icon>
        <span>{{ t('tools.showQr') }}</span>
      </div>
      <div class="tool-item" @click="emit('copy-cache-path')">
        <el-icon><CopyDocument /></el-icon>
        <span>{{ t('tools.copyCachePath') }}</span>
      </div>
      <div class="tool-item" @click="emit('open-cache-path')">
        <el-icon><FolderOpened /></el-icon>
        <span>{{ t('tools.openCachePath') }}</span>
      </div>
      <div class="tool-item" @click="emit('open-cache-path-dialog')">
        <el-icon><FolderAdd /></el-icon>
        <span>{{ t('tools.changeCachePath') }}</span>
      </div>
      <div class="tool-item" @click="emit('show-changelog')">
        <el-icon><Document /></el-icon>
        <span>{{ t('tools.changelog') }}</span>
      </div>
      <div class="tool-item" @click="emit('open-feedback')">
        <el-icon><ChatDotRound /></el-icon>
        <span>{{ t('tools.feedback') }}</span>
      </div>
      <div class="danger tool-item" @click="emit('clear-history')">
        <el-icon><Delete /></el-icon>
        <span>{{ t('tools.clearHistory') }}</span>
      </div>
    </div>

    <div
      v-if="cachePath"
      class="cache-info"
      role="button"
      tabindex="0"
      :aria-label="t('tools.copyCachePath')"
      @click="emit('copy-cache-path')"
      @keydown.enter.prevent="emit('copy-cache-path')"
      @keydown.space.prevent="emit('copy-cache-path')"
    >
      <p>
        {{ t('tools.cachePath') }}
        <span v-if="cachePathCustomized" class="cache-tag">{{ t('tools.cachePathCustomized') }}</span>
      </p>
      <p class="path-text">{{ cachePath }}</p>
    </div>

    <div class="drawer-footer">
      <div class="version-info" @click="emit('show-changelog')">
        <div>Copyright: {{ copyright }}</div>
        <div>Software Version: {{ version }}</div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import {
  ChatDotRound,
  CopyDocument,
  Delete,
  Document,
  EditPen,
  FolderAdd,
  FolderOpened,
  FullScreen
} from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

defineProps({
  modelValue: { type: Boolean, default: false },
  languageSetting: { type: String, required: true },
  myNickname: { type: String, default: '' },
  groupName: { type: String, default: '' },
  showGroupName: { type: Boolean, default: false },
  cachePath: { type: String, default: '' },
  cachePathCustomized: { type: Boolean, default: false },
  copyright: { type: String, required: true },
  version: { type: String, required: true }
})

const emit = defineEmits([
  'update:modelValue',
  'update:language-setting',
  'edit-nickname',
  'edit-group-name',
  'show-qr',
  'copy-cache-path',
  'open-cache-path',
  'open-cache-path-dialog',
  'show-changelog',
  'open-feedback',
  'clear-history'
])

const { t } = useI18n()
</script>

<style scoped>
:global(.el-drawer__body) {
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.language-setting {
  margin-bottom: 12px;
}

.language-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}

.identity-setting {
  padding: 10px 0;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 10px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 4px;
}

.setting-item:hover {
  background-color: #f5f7fa;
}

.setting-label {
  font-size: 14px;
  color: #606266;
}

.setting-value-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.setting-value {
  font-size: 14px;
  color: #303133;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tools-list {
  padding: 10px;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: background-color 0.2s;
  color: #606266;
}

.tool-item:hover {
  background-color: #f5f7fa;
}

.tool-item.danger {
  color: #f56c6c;
}

.tool-item.danger:hover {
  background-color: #fef0f0;
}

.cache-info {
  margin-top: 20px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.cache-info:hover,
.cache-info:focus-visible {
  background-color: #f2f6fc;
  outline: none;
}

.cache-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 11px;
  color: #409eff;
  background-color: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
}

.path-text {
  margin: 4px 0 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.drawer-footer {
  margin-top: auto;
  padding: 20px 0;
  text-align: center;
  border-top: 1px solid #ebeef5;
}

.version-info {
  color: #909399;
  font-size: 12px;
}

.version-info:hover {
  color: #409eff;
}
</style>
