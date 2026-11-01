<template>
  <div class="batch-selection-bar">
    <div class="selection-summary">
      <el-icon><Select /></el-icon>
      <span>{{ t('batchDownload.selectedSummary', { count: selectedCount, size: formatFileSize(totalSize) }) }}</span>
    </div>

    <div class="selection-actions">
      <el-checkbox
        :model-value="allSelected"
        :indeterminate="someSelected"
        :disabled="selectableCount === 0"
        @change="emit('toggle-all', $event)"
      >
        {{ t('batchDownload.selectAll') }}
      </el-checkbox>
      <el-button @click="emit('cancel')">{{ t('chat.cancel') }}</el-button>
      <el-button
        type="primary"
        :icon="Download"
        :loading="downloading"
        :disabled="selectedCount === 0"
        @click="emit('download')"
      >
        {{ t('chat.downloadSelected') }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { Download, Select } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatFileSize } from '../../composables/use-message-utils'

defineProps({
  selectedCount: { type: Number, required: true },
  selectableCount: { type: Number, required: true },
  totalSize: { type: Number, default: 0 },
  allSelected: { type: Boolean, default: false },
  someSelected: { type: Boolean, default: false },
  downloading: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-all', 'cancel', 'download'])
const { t } = useI18n()
</script>

<style scoped>
.batch-selection-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
  background: #ffffff;
  border-top: 1px solid #dcdfe6;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

.selection-summary,
.selection-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.selection-summary {
  color: #606266;
  font-size: 14px;
}

@media (max-width: 640px) {
  .batch-selection-bar {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  }

  .selection-actions {
    justify-content: space-between;
  }
}
</style>
