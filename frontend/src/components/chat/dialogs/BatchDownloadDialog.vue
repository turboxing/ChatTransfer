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
          <div class="attachment-info">
            <span class="attachment-name" :title="attachment.fileName">{{ attachment.fileName }}</span>
            <span class="attachment-meta">
              {{ formatFileSize(Number(attachment.fileSize) || 0) }} · {{ attachment.createTime }}
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

  <el-dialog
    v-model="previewDialogVisible"
    :title="previewAttachmentValue?.fileName || t('batchDownload.preview')"
    append-to-body
    align-center
    width="min(720px, 94vw)"
  >
    <div v-if="previewAttachmentValue" v-loading="previewLoading" class="preview-content">
      <el-alert v-if="previewError" type="error" :title="previewError" show-icon :closable="false" />

      <img
        v-else-if="previewKind === 'image'"
        :src="previewAttachmentValue.fileUrl"
        :alt="previewAttachmentValue.fileName"
        class="preview-image"
      />
      <video
        v-else-if="previewKind === 'video'"
        :src="previewAttachmentValue.fileUrl"
        controls
        playsinline
        class="preview-media"
      />
      <audio
        v-else-if="previewKind === 'audio'"
        :src="previewAttachmentValue.fileUrl"
        controls
        class="preview-audio"
      />
      <iframe
        v-else-if="previewKind === 'pdf'"
        :src="previewAttachmentValue.fileUrl"
        :title="previewAttachmentValue.fileName"
        class="preview-pdf"
      />
      <pre v-else-if="previewKind === 'text'" class="preview-text">{{ textPreview }}</pre>

      <dl v-else class="preview-metadata">
        <div>
          <dt>{{ t('batchDownload.fileName') }}</dt>
          <dd>{{ previewAttachmentValue.fileName }}</dd>
        </div>
        <div>
          <dt>{{ t('batchDownload.fileType') }}</dt>
          <dd>{{ previewAttachmentValue.fileType || t('batchDownload.unknown') }}</dd>
        </div>
        <div>
          <dt>{{ t('batchDownload.fileSize') }}</dt>
          <dd>{{ formatFileSize(Number(previewAttachmentValue.fileSize) || 0) }}</dd>
        </div>
        <div>
          <dt>{{ t('batchDownload.sender') }}</dt>
          <dd>{{ previewAttachmentValue.senderNickname || previewAttachmentValue.sender }}</dd>
        </div>
        <div>
          <dt>{{ t('batchDownload.sentAt') }}</dt>
          <dd>{{ previewAttachmentValue.createTime }}</dd>
        </div>
      </dl>
    </div>
    <template #footer>
      <el-button @click="previewDialogVisible = false">{{ t('batchDownload.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Document, Headset, Picture, VideoPlay } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatFileSize } from '../../../composables/use-message-utils'

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

const emit = defineEmits(['update:modelValue', 'download'])
const { t } = useI18n()
const filter = ref('all')
const selectedIds = ref(new Set())
const previewDialogVisible = ref(false)
const previewAttachmentValue = ref(null)
const previewLoading = ref(false)
const previewError = ref('')
const textPreview = ref('')

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

const getPreviewKind = (attachment) => {
  const mimeType = String(attachment.fileType || '').toLowerCase();
  const fileName = String(attachment.fileName || '').toLowerCase();

  if (attachment.msgType === 'IMAGE' || mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) return 'pdf';
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    /\.(txt|log|md|csv|xml|yml|yaml|json)$/i.test(fileName)
  ) {
    return 'text';
  }

  return 'metadata';
}

const previewKind = computed(() => (
  previewAttachmentValue.value ? getPreviewKind(previewAttachmentValue.value) : 'metadata'
))

const getFileIcon = (attachment) => {
  const kind = getPreviewKind(attachment);
  if (kind === 'image') return Picture;
  if (kind === 'video') return VideoPlay;
  if (kind === 'audio') return Headset;
  return Document;
}

const previewAttachment = async (attachment) => {
  if (!attachment.available || !attachment.fileUrl) return;

  previewAttachmentValue.value = attachment;
  previewDialogVisible.value = true;
  previewError.value = '';
  textPreview.value = '';

  if (getPreviewKind(attachment) !== 'text') return;

  if ((Number(attachment.fileSize) || 0) > 1024 * 1024) {
    previewError.value = t('batchDownload.previewTooLarge');
    return;
  }

  previewLoading.value = true;
  try {
    const response = await fetch(attachment.fileUrl);
    if (!response.ok) throw new Error(t('batchDownload.previewFailed'));
    const content = await response.text();
    textPreview.value = content.slice(0, 20000);
  } catch (error) {
    previewError.value = t('batchDownload.previewFailed');
  } finally {
    previewLoading.value = false;
  }
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

.preview-content {
  min-height: 160px;
}

.preview-image,
.preview-media,
.preview-pdf {
  display: block;
  width: 100%;
  max-height: 70vh;
  border-radius: 6px;
}

.preview-media,
.preview-pdf {
  border: 1px solid #ebeef5;
}

.preview-audio {
  width: 100%;
  margin-top: 40px;
}

.preview-text {
  max-height: 60vh;
  overflow: auto;
  margin: 0;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #f5f7fa;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-metadata {
  margin: 0;
}

.preview-metadata > div {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;
}

.preview-metadata dt {
  margin: 0;
  color: #909399;
}

.preview-metadata dd {
  margin: 0;
  color: #303133;
  word-break: break-word;
}

.attachment-summary {
  margin-top: 10px;
  font-size: 13px;
  color: #606266;
}
</style>
