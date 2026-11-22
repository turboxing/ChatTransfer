<template>
  <el-dialog :model-value="!!attachment" :title="metadata?.fileName || attachment?.fileName || t('preview.title')"
    append-to-body align-center width="min(1000px, 96vw)" class="attachment-preview-dialog"
    :close-on-click-modal="false" @update:model-value="!$event && emit('close')">
    <div v-loading="loading" class="preview-body">
      <p class="file-details">{{ fileType }} · {{ formatFileSize(metadata?.fileSize ?? attachment?.fileSize, t('preview.unknownSize')) }}</p>
      <el-alert v-if="error" :title="error" type="warning" :closable="false" />
      <template v-if="metadata && !error">
        <TextAttachmentPreview v-if="metadata.kind === 'text' && buffer" :key="metadata.url" :buffer="buffer" :truncated="truncated" :file-name="metadata.fileName" />
        <iframe v-else-if="metadata.kind === 'pdf'" ref="frameRef" :src="metadata.url" :title="metadata.fileName" class="pdf-view" />
        <video v-else-if="metadata.kind === 'video'" ref="mediaRef" :src="metadata.url" :autoplay="!!attachment?.playOnOpen" controls playsinline preload="metadata" class="media-view" @play="onMediaPlay" @error="mediaError = true" />
        <audio v-else-if="metadata.kind === 'audio'" ref="mediaRef" :src="metadata.url" controls preload="metadata" class="audio-view" @play="onMediaPlay" @error="mediaError = true" />
        <img v-else-if="metadata.kind === 'image'" :src="metadata.url" :alt="metadata.fileName" class="media-view" @error="mediaError = true" />
        <p v-else-if="metadata.kind === 'metadata'">{{ t('preview.unsupported') }}</p>
        <p v-if="metadata.kind === 'pdf'">{{ t('preview.pdfHint') }}</p>
        <el-alert v-if="mediaError" :title="t('preview.mediaError')" type="warning" :closable="false" />
      </template>
    </div>
    <template #footer>
      <a v-if="metadata" :href="metadata.url + '?download=1'" :download="metadata.fileName" class="el-button el-button--primary">{{ t('chat.download') }}</a>
      <a v-if="metadata?.kind === 'pdf'" :href="metadata.url" target="_blank" rel="noopener noreferrer" class="el-button">{{ t('preview.openWindow') }}</a>
      <el-button @click="emit('close')">{{ t('batchDownload.close') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, inject, ref, watch, onBeforeUnmount } from 'vue'
import { attachmentMediaKey } from '../../../composables/use-attachment-media'
import { useI18n } from 'vue-i18n'
import TextAttachmentPreview from '../TextAttachmentPreview.vue'
import { formatFileSize, getFileExtension } from '../../../composables/use-message-utils'

const props = defineProps({ attachment: Object, requestPreview: { type: Function, required: true }, roomId: String })
const emit = defineEmits(['close'])
const mediaContext = inject(attachmentMediaKey, null)
const owner = Symbol('preview-media')
const onMediaPlay = () => mediaContext?.playback.activate(owner, () => mediaRef.value?.pause())
const { t } = useI18n()
const metadata = ref(null)
const loading = ref(false)
const error = ref('')
const mediaError = ref(false)
const buffer = ref(null)
const truncated = ref(false)
const mediaRef = ref(null)
const frameRef = ref(null)
const fileType = computed(() => {
  const name = metadata.value?.fileName || props.attachment?.fileName || ''
  return getFileExtension(name, t('batchDownload.unknown'))
})
let sequence = 0
let controller
const reset = () => {
  sequence += 1
  controller?.abort()
  if (mediaRef.value) {
    mediaRef.value.pause()
    mediaRef.value.removeAttribute('src')
    mediaRef.value.load()
  }
  if (frameRef.value) frameRef.value.src = 'about:blank'
  metadata.value = null
  buffer.value = null
  error.value = ''
  mediaError.value = false
  loading.value = false
  truncated.value = false
  mediaContext?.playback.release(owner)
}
watch([() => props.attachment, () => props.roomId], async ([attachment]) => {
  reset()
  if (!attachment) return
  const current = sequence
  controller = new AbortController()
  const signal = controller.signal
  loading.value = true
  try {
    const result = await props.requestPreview({ roomId: props.roomId, messageId: attachment.msgId || attachment.key })
    if (current !== sequence) return
    if (result?.code !== 0 || !result.data?.url) throw new Error('unavailable')
    metadata.value = result.data
    if (result.data.kind === 'text') {
      const response = await fetch(result.data.url + '?text=1', { signal, cache: 'no-store' })
      if (!response.ok) throw new Error('unavailable')
      const data = await response.arrayBuffer()
      if (current !== sequence) return
      buffer.value = data
      truncated.value = response.headers.get('X-Preview-Truncated') === 'true'
    }
  } catch (failure) {
    if (current === sequence && failure.name !== 'AbortError') error.value = t('preview.unavailable')
  } finally {
    if (current === sequence) loading.value = false
  }
}, { immediate: true })
onBeforeUnmount(reset)
</script>

<style scoped>
.preview-body { min-height: 170px; }
.file-details { color: #606266; margin: 0 0 10px; }
.media-view { display: block; max-width: 100%; max-height: 62vh; margin: auto; }
.audio-view { width: 100%; margin-top: 30px; }
.pdf-view { width: 100%; height: 58vh; border: 1px solid #ddd; }
:global(.attachment-preview-dialog .el-dialog__title) { display: block; padding-right: 25px; overflow-wrap: anywhere; }
@media (max-width: 600px) { :global(.attachment-preview-dialog) { margin: 2vh auto; } .media-view { max-height: 55vh; } }
</style>
