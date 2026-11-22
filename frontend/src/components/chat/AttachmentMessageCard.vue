<template>
  <div class="attachment-message" :class="{ 'video-attachment': kind === 'video' && successful }">
    <div class="attachment-trigger" :role="successful && !disabled ? 'button' : undefined"
      :tabindex="successful && !disabled ? 0 : -1" :title="successful && !disabled ? t(kind === 'file' ? 'preview.clickPreview' : 'preview.clickPlay') : undefined"
      :aria-label="`${t(kind === 'file' ? 'preview.clickPreview' : 'preview.clickPlay')} ${item.fileName}`"
      @click="activate" @keydown.enter.prevent.stop="activate" @keydown.space.prevent.stop="activate">
      <div v-if="kind === 'video' && successful" class="video-cover">
        <el-icon class="video-play"><VideoPlay /></el-icon>
        <span>{{ t('preview.clickPlay') }}</span>
      </div>
      <FilesCard :name="item.fileName" :file-size="item.fileSize" :description="successful ? description : undefined"
        :status="successful ? 'done' : (item.status === 'failed' ? 'error' : 'uploading')"
        :percent="item.originalMsg?.uploadProgress" :error-tip="t('chat.uploadFailed')" max-width="100%">
        <template v-if="kind === 'audio' && successful" #icon>
          <el-icon class="audio-play" :class="{ playing: playing }"><VideoPause v-if="playing" /><VideoPlay v-else /></el-icon>
        </template>
      </FilesCard>
    </div>
    <div v-if="loading" class="audio-state" role="status">{{ t('preview.loadingAudio') }}</div>
    <div v-if="audioUrl && !disabled" class="inline-audio" @click.stop @keydown.stop>
      <audio ref="audioRef" :src="audioUrl" controls preload="none" :aria-label="item.fileName"
        @play="onPlay" @pause="playing = false" @ended="playing = false" @error="onError" />
      <el-button link size="small" @click.stop="stop">{{ t('preview.collapseAudio') }}</el-button>
    </div>
    <div v-if="error" class="audio-state" role="status" @click.stop>
      {{ t('preview.mediaError') }}
      <el-button link type="primary" @click="emit('open', item)">{{ t('preview.title') }}</el-button>
      <el-button link type="primary" @click="emit('download', item)">{{ t('chat.download') }}</el-button>
    </div>
  </div>
</template>

<script setup>
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { FilesCard } from 'vue-element-plus-x'
import { VideoPause, VideoPlay } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { formatFileSize, getFileExtension } from '../../composables/use-message-utils'
import { attachmentMediaKey, getAttachmentMediaKind } from '../../composables/use-attachment-media'

const props = defineProps({ item: { type: Object, required: true }, disabled: Boolean })
const emit = defineEmits(['open', 'download'])
const { t } = useI18n()
const context = inject(attachmentMediaKey, null)
const owner = Symbol('inline-audio')
const kind = computed(() => getAttachmentMediaKind(props.item.fileName))
const successful = computed(() => props.item.status === 'success')
const description = computed(() => `${getFileExtension(props.item.fileName, t('batchDownload.unknown'))} · ${formatFileSize(props.item.fileSize, t('preview.unknownSize'))}`)
const audioUrl = ref('')
const audioRef = ref(null)
const loading = ref(false)
const playing = ref(false)
const error = ref(false)
let generation = 0
const stop = () => {
  generation += 1
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.removeAttribute('src')
    audioRef.value.load()
  }
  audioUrl.value = ''
  loading.value = false
  playing.value = false
  error.value = false
  context?.playback.release(owner)
}
const onPlay = () => {
  context?.playback.activate(owner, stop)
  playing.value = true
}
const onError = () => {
  if (!audioUrl.value) return
  error.value = true
  playing.value = false
}
const play = async () => {
  try { await audioRef.value?.play() }
  catch (failure) { if (failure.name !== 'NotAllowedError' && failure.name !== 'AbortError') onError() }
}
const activate = async (event) => {
  if (props.disabled || !successful.value) return
  event.stopPropagation()
  if (kind.value !== 'audio' || !context) {
    emit('open', kind.value === 'video' ? { ...props.item, playOnOpen: true } : props.item)
    return
  }
  if (loading.value) return
  if (audioUrl.value && !error.value) {
    if (playing.value) audioRef.value?.pause()
    else await play()
    return
  }
  stop()
  const current = generation
  context.playback.activate(owner, stop)
  loading.value = true
  try {
    const result = await context.requestPreview({ messageId: props.item.key })
    if (current !== generation) return
    if (result?.code !== 0 || result.data?.kind !== 'audio') throw new Error('unavailable')
    audioUrl.value = result.data.url
    await nextTick()
    if (current === generation) await play()
  } catch {
    if (current === generation) error.value = true
  } finally {
    if (current === generation) loading.value = false
  }
}
watch(() => props.disabled, stop)
watch(() => props.item.key, stop)
onBeforeUnmount(stop)
</script>

<style scoped>
.attachment-message { width: 300px; max-width: 70vw; min-width: 0; }
.attachment-trigger { border-radius: 9px; outline: none; cursor: pointer; }
.attachment-trigger :deep(.elx-files-card) { width: 100%; box-sizing: border-box; background: #e5e7eb; border: 1px solid #c8cdd5; border-radius: 9px; transition: border-color .15s, box-shadow .15s; }
.attachment-trigger:hover :deep(.elx-files-card), .attachment-trigger:focus-visible :deep(.elx-files-card) { border-color: #409eff; box-shadow: 0 0 0 2px #409eff25; }
.attachment-trigger:active :deep(.elx-files-card) { background: #dce6f4; }
.attachment-trigger :deep(.elx-files-card-description) { white-space: normal; overflow-wrap: anywhere; color: #606266; }
.audio-play { font-size: 42px; color: #ef727d; flex: none; }
.audio-play.playing { color: #409eff; }
.inline-audio { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; padding-top: 8px; }
.inline-audio audio { width: 100%; min-width: 0; }
.audio-state { font-size: 12px; color: #606266; padding: 8px 0; overflow-wrap: anywhere; }
.video-cover { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; aspect-ratio: 16 / 9; background: linear-gradient(135deg, #344b70, #17263e); color: #fff; border-radius: 9px 9px 0 0; }
.video-play { font-size: 55px; }
.video-cover span { font-size: 13px; }
.video-attachment :deep(.elx-files-card) { border-radius: 0 0 9px 9px; }
</style>
