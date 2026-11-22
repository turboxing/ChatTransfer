<template>
  <el-dialog :model-value="true" :title="t('textReader.title')" fullscreen append-to-body
    class="text-message-reader" :close-on-click-modal="false" :close-on-press-escape="!qrVisible"
    @update:model-value="!$event && close()">
    <TextAttachmentPreview :source-text="message.content" message-mode />
    <template #footer>
      <el-button type="primary" @click="copy">{{ t('chat.copy') }}</el-button>
      <el-button :loading="qrLoading" @click="showQr">{{ t('chat.qrcode') }}</el-button>
    </template>
  </el-dialog>
  <el-dialog v-model="qrVisible" :title="t('chat.messageQrTitle')" append-to-body align-center
    width="min(400px, 94vw)" class="text-reader-qr" :close-on-click-modal="false">
    <img v-if="qrUrl" :src="qrUrl" :alt="t('chat.messageQrTitle')" class="reader-qr-image" />
    <el-alert v-else :title="qrError" type="warning" :closable="false" />
    <template #footer><el-button @click="copy">{{ t('chat.copy') }}</el-button></template>
  </el-dialog>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import TextAttachmentPreview from '../TextAttachmentPreview.vue'
import { useClipboard } from '../../../composables/use-message-utils'
import { textMessageQr } from '../../../composables/text-message-preview'
import { useTextReaderHistory } from '../../../composables/use-text-reader-history'

const props = defineProps({ message: { type: Object, required: true } })
const emit = defineEmits(['close'])
const { t } = useI18n()
const { copyToClipboard } = useClipboard({ t, notify: ElMessage })
const qrVisible = ref(false)
const qrLoading = ref(false)
const qrUrl = ref('')
const qrError = ref('')
let alive = true
const { close } = useTextReaderHistory({ qrVisible, onClose: () => emit('close') })
const copy = async () => {
  try { await copyToClipboard(props.message.content); ElMessage.success(t('messages.copySuccess')) }
  catch { /* The clipboard helper already shows the error. */ }
}
const showQr = async () => {
  qrLoading.value = true
  qrUrl.value = ''
  qrError.value = ''
  try { qrUrl.value = await textMessageQr(props.message.content) }
  catch (error) { qrUrl.value = ''; qrError.value = t(error.message === 'qr-too-long' ? 'textReader.qrTooLong' : 'chat.genQrFailed') }
  finally { if (alive) { qrLoading.value = false; qrVisible.value = true } }
}
onBeforeUnmount(() => { alive = false })
</script>

<style scoped>
.reader-qr-image { display: block; width: 100%; max-width: 320px; margin: auto; }
</style>
<style>
.text-message-reader.el-dialog { display: flex; flex-direction: column; height: 100dvh; margin: 0; }
.text-message-reader .el-dialog__header { flex-shrink: 0; }
.text-message-reader .el-dialog__body { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; }
.text-message-reader .text-content, .text-message-reader .markdown-content { flex: 1; min-height: 160px; max-height: none; }
.text-message-reader .el-dialog__footer { flex-shrink: 0; border-top: 1px solid #ebeef5; padding-bottom: max(12px, env(safe-area-inset-bottom)); }
</style>
