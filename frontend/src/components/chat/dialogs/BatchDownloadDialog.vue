<template>
  <el-dialog :model-value="modelValue" :title="title" align-center width="min(560px, 92vw)"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="batch-download-toolbar">
      <el-radio-group v-model="filter" size="small">
        <el-radio-button value="all">{{ t('batchDownload.filterAll') }}</el-radio-button>
        <el-radio-button value="image">{{ t('batchDownload.filterImage') }}</el-radio-button>
        <el-radio-button value="file">{{ t('batchDownload.filterFile') }}</el-radio-button>
      </el-radio-group>
      <el-checkbox
        :model-value="allFilteredAvailableSelected"
        :indeterminate="someFilteredAvailableSelected"
        :disabled="filteredAvailableAttachments.length === 0"
        @update:model-value="toggleFilteredAvailable"
      >
        {{ t('batchDownload.selectAll') }}
      </el-checkbox>
    </div>

    <div v-loading="loading" class="attachment-list">
      <el-empty v-if="!loading && filteredAttachments.length === 0" :description="emptyText" />
      <el-checkbox
        v-for="attachment in filteredAttachments"
        :key="attachment.msgId"
        :model-value="selectedIds.has(attachment.msgId)"
        :disabled="!attachment.available"
        class="attachment-item"
        @update:model-value="toggleAttachment(attachment, $event)"
      >
        <div class="attachment-row">
          <div class="attachment-preview" @click.stop>
            <el-image
              v-if="attachment.msgType === 'IMAGE' && attachment.available"
              :src="attachment.fileUrl"
              :preview-src-list="[attachment.fileUrl]"
              preview-teleported
              fit="cover"
              class="image-preview"
            />
            <button
              v-else
              type="button"
              class="file-preview"
              :disabled="!attachment.available"
              :aria-label="t('batchDownload.preview')"
              @click.stop="previewAttachment(attachment)"
            >
              <el-icon><component :is="getFileIcon(attachment)" /></el-icon>
            </button>
          </div>
          <div class="attachment-info" @click.stop.prevent="previewAttachment(attachment)">
            <span class="attachment-name" :title="attachment.fileName">{{ attachment.fileName }}</span>
            <span class="attachment-meta">
              {{ getFileExtension(attachment.fileName, t('batchDownload.unknown')) }} ·
              {{ formatFileSize(attachment.fileSize, t('preview.unknownSize')) }} · {{ attachment.createTime }}
              <template v-if="!attachment.available"> · {{ t('batchDownload.missing') }}</template>
            </span>
          </div>
          <el-button
            v-if="attachment.msgType !== 'IMAGE'"
            link
            size="small"
            class="preview-button"
            :disabled="!attachment.available"
            @click.stop="previewAttachment(attachment)"
          >
            {{ t('batchDownload.preview') }}
          </el-button>
        </div>
      </el-checkbox>
    </div>

    <div class="attachment-summary">
      {{ t('batchDownload.selectedSummary', {
        count: selectedIds.size,
        size: formatFileSize(selectedTotalSize)
      }) }}
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ cancelText }}</el-button>
      <el-button
        type="primary"
        :loading="downloading"
        :disabled="selectedIds.size === 0"
        @click="emit('download', [...selectedIds])"
      >
        {{ downloadText }}
      </el-button>
    </template>
  </el-dialog>

</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Document, Headset, Picture, VideoPlay } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatFileSize, getFileExtension } from '../../../composables/use-message-utils'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  attachments: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  downloading: { type: Boolean, default: false },
  title: { type: String, required: true },
  emptyText: { type: String, required: true },
  cancelText: { type: String, required: true },
  downloadText: { type: String, required: true }
})

const emit = defineEmits(['update:modelValue', 'download', 'preview'])
const { t } = useI18n()
const filter = ref('all')
const selectedIds = ref(new Set())
const filteredAttachments = computed(() => props.attachments.filter((attachment) => {
  if (filter.value === 'all') return true
  return attachment.msgType === (filter.value === 'image' ? 'IMAGE' : 'FILE')
}))

const filteredAvailableAttachments = computed(() => (
  filteredAttachments.value.filter((attachment) => attachment.available)
))

const allFilteredAvailableSelected = computed(() => (
  filteredAvailableAttachments.value.length > 0 &&
  filteredAvailableAttachments.value.every((attachment) => selectedIds.value.has(attachment.msgId))
))

const someFilteredAvailableSelected = computed(() => (
  !allFilteredAvailableSelected.value &&
  filteredAvailableAttachments.value.some((attachment) => selectedIds.value.has(attachment.msgId))
))

const selectedTotalSize = computed(() => props.attachments.reduce((total, attachment) => (
  selectedIds.value.has(attachment.msgId)
    ? total + (Number(attachment.fileSize) || 0)
    : total
), 0))

const toggleAttachment = (attachment, selected) => {
  const nextSelectedIds = new Set(selectedIds.value)
  if (selected) {
    nextSelectedIds.add(attachment.msgId)
  } else {
    nextSelectedIds.delete(attachment.msgId)
  }
  selectedIds.value = nextSelectedIds
}

const toggleFilteredAvailable = (selected) => {
  const nextSelectedIds = new Set(selectedIds.value)
  filteredAvailableAttachments.value.forEach((attachment) => {
    if (selected) {
      nextSelectedIds.add(attachment.msgId)
    } else {
      nextSelectedIds.delete(attachment.msgId)
    }
  })
  selectedIds.value = nextSelectedIds
}

const getFileIcon = (attachment) => {
  if (attachment.msgType === 'IMAGE') return Picture
  if (String(attachment.fileType).startsWith('video/')) return VideoPlay
  if (String(attachment.fileType).startsWith('audio/')) return Headset
  return Document
}

const previewAttachment = (attachment) => {
  if (attachment.available) emit('preview', attachment)
}

watch(() => props.attachments, () => {
  selectedIds.value = new Set(props.attachments
    .filter((attachment) => attachment.available)
    .map((attachment) => attachment.msgId))
}, { immediate: true })

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  filter.value = 'all'
  selectedIds.value = new Set(props.attachments
    .filter((attachment) => attachment.available)
    .map((attachment) => attachment.msgId))
})
</script>

<style scoped>
.batch-download-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.attachment-list {
  min-height: 180px;
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px 12px;
}

.attachment-item {
  height: auto;
  margin-right: 0;
  margin-bottom: 4px;
  align-items: flex-start;
}

.attachment-item :deep(.el-checkbox__label) {
  width: 100%;
}

.attachment-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.attachment-preview {
  flex: none;
}

.image-preview {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  cursor: zoom-in;
}

.file-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #f5f7fa;
  color: #409eff;
  cursor: pointer;
}

.file-preview:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.attachment-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}

.attachment-meta {
  margin-top: 2px;
  font-size: 12px;
  color: #909399;
}

.preview-button {
  flex: none;
  margin-left: auto;
}

.attachment-summary {
  margin-top: 10px;
  font-size: 13px;
  color: #606266;
}
</style>
