<template>
  <div class="text-controls">
    <el-radio-group v-model="mode" size="small" :aria-label="t('preview.displayMode')">
      <el-radio-button value="plain">{{ t('preview.rawMode') }}</el-radio-button>
      <el-radio-button v-if="language" value="highlight" :disabled="!canRenderRich(content, 'highlight')">{{ t('preview.highlightMode') }}</el-radio-button>
      <el-radio-button v-if="isMarkdown" value="reading" :disabled="!canRenderRich(content, 'reading')">{{ t('preview.readingMode') }}</el-radio-button>
    </el-radio-group>
    <el-select v-model="encoding" :aria-label="t('preview.encoding')" class="encoding-select">
      <el-option :label="t('preview.autoEncoding')" value="auto" />
      <el-option v-for="option in ['utf-8', 'gb18030', 'utf-16le', 'utf-16be']" :key="option" :label="option.toUpperCase()" :value="option" />
    </el-select>
    <el-checkbox v-if="!reading" v-model="wrap">{{ t('preview.wrap') }}</el-checkbox>
    <el-checkbox v-if="isJson && !truncated" v-model="formatted">{{ t('preview.formatJson') }}</el-checkbox>
    <el-button :disabled="!!decodeError" @click="copy">{{ t('preview.copy') }}</el-button>
    <el-checkbox v-if="mode === 'reading'" v-model="loadImages">{{ t('preview.loadImages') }}</el-checkbox>
  </div>
  <el-alert v-if="truncated" :title="t('preview.truncated')" type="warning" :closable="false" />
  <el-alert v-if="decodeError" :title="t('preview.binary')" type="warning" :closable="false" />
  <template v-else>
    <p v-if="richLoading" role="status">{{ t('preview.renderLoading') }}</p>
    <p v-if="largeContent" role="status">{{ t('preview.richTooLarge') }}</p>
    <p v-if="richFailed" role="status">{{ t('preview.richFailed') }}</p>
    <div v-if="!reading" class="text-search">
      <el-input v-model="query" :placeholder="t('preview.search')" clearable @keyup.enter="navigate(1)" />
      <span role="status">{{ activeIndex < 0 ? 0 : activeIndex + 1 }}/{{ matches.length }}{{ matches.length === 500 ? '+' : '' }}</span>
      <el-button :disabled="!matches.length" :aria-label="t('preview.previous')" @click="navigate(-1)">↑</el-button>
      <el-button :disabled="!matches.length" :aria-label="t('preview.next')" @click="navigate(1)">↓</el-button>
    </div>
    <p v-if="invalidJson" class="json-warning">{{ t('preview.invalidJson') }}</p>
    <div v-if="reading" class="reading-actions">
      <span>{{ t('preview.copyMarkdownHint') }}</span>
      <el-button link type="primary" @click="searchOriginal">{{ t('preview.searchOriginal') }}</el-button>
    </div>
    <div v-if="reading" ref="contentRef" class="markdown-content" tabindex="0" v-html="html"></div>
    <pre v-else ref="contentRef" class="text-content" :class="{ wrap }" tabindex="0"><span v-for="(part, index) in parts" :key="index" :style="{ color: part.color }"><mark v-if="part.match >= 0" :class="{ active: part.match === activeIndex }">{{ part.text }}</mark><template v-else>{{ part.text }}</template></span></pre>
  </template>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useClipboard } from '../../composables/use-message-utils'
import { decodePreview, searchPreview } from '../../composables/attachment-preview-utils'
import { canRenderRich, decorateCode, previewLanguage } from '../../composables/preview-render-utils'
import { usePreviewRenderer } from '../../composables/use-preview-renderer'

const props = defineProps({ buffer: { required: true }, truncated: Boolean, fileName: String })
const { t } = useI18n()
const { copyToClipboard } = useClipboard({ t, notify: ElMessage })
const encoding = ref('auto')
const wrap = ref(true)
const formatted = ref(true)
const query = ref('')
const activeIndex = ref(-1)
const contentRef = ref(null)
const decoded = computed(() => {
  try { return { text: decodePreview(props.buffer, encoding.value, props.truncated) } }
  catch { return { text: '', error: true } }
})
const decodeError = computed(() => decoded.value.error)
const isJson = computed(() => /\.json$/i.test(props.fileName || ''))
const json = computed(() => {
  if (!isJson.value || props.truncated) return null
  try { return { text: JSON.stringify(JSON.parse(decoded.value.text), null, 2) } }
  catch { return { error: true } }
})
const invalidJson = computed(() => json.value?.error)
const content = computed(() => formatted.value && json.value?.text ? json.value.text : decoded.value.text)
const language = computed(() => previewLanguage(props.fileName))
const isMarkdown = computed(() => /\.(md|markdown)$/i.test(props.fileName || ''))
const mode = ref(isMarkdown.value && canRenderRich(content.value, 'reading') ? 'reading'
  : language.value && canRenderRich(content.value, 'highlight') ? 'highlight' : 'plain')
const loadImages = ref(false)
const { tokens, html, loading: richLoading, failed: richFailed, reset: resetRender, render } = usePreviewRenderer()
const reading = computed(() => mode.value === 'reading' && !!html.value && !richFailed.value)
const largeContent = computed(() => language.value && !canRenderRich(content.value, isMarkdown.value ? 'reading' : 'highlight'))
watch([mode, content, language, loadImages, () => t('preview.imageBlocked')], () => {
  if (decodeError.value || mode.value === 'plain' || !canRenderRich(content.value, mode.value)) { resetRender(); return }
  render({ mode: mode.value, content: content.value, language: language.value,
    options: { loadImages: loadImages.value, imageLabel: t('preview.imageBlocked') } })
}, { immediate: true })
const matches = computed(() => searchPreview(content.value, query.value))
const parts = computed(() => decorateCode(tokens.value || [{ content: content.value }], matches.value, query.value.length))
watch([query, content], () => { activeIndex.value = matches.value.length ? 0 : -1 })
const navigate = async (direction) => {
  if (!matches.value.length) return
  activeIndex.value = (activeIndex.value + direction + matches.value.length) % matches.value.length
  await nextTick()
  contentRef.value?.querySelector('mark.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}
const copy = async () => {
  try { await copyToClipboard(content.value); ElMessage.success(t('messages.copySuccess')) }
  catch { contentRef.value?.focus() }
}
const searchOriginal = async () => {
  mode.value = 'plain'
  await nextTick()
  contentRef.value?.parentElement?.querySelector('.text-search input')?.focus()
}
</script>

<style scoped>
.text-controls, .text-search { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 0; }
.encoding-select { width: 150px; }
.text-search .el-input { flex: 1; min-width: 140px; }
.text-search span { font-size: 12px; }
.text-content { margin: 0; padding: 12px; overflow: auto; max-height: 52vh; min-height: 180px; background: #f5f7fa; color: #303133; border-radius: 6px; font: 13px/1.6 monospace; white-space: pre; }
.text-content.wrap { white-space: pre-wrap; overflow-wrap: anywhere; }
mark { background: #fff0a3; } mark.active { background: #ffbb53; outline: 1px solid #b66900; }
.json-warning { color: #936000; }
.reading-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 10px 0; font-size: 12px; color: #606266; }
.markdown-content { max-height: 52vh; overflow: auto; padding: 16px; border: 1px solid #dcdfe6; border-radius: 6px; color: #303133; background: white; overflow-wrap: anywhere; line-height: 1.7; }
.markdown-content :deep(pre) { overflow: auto; padding: 12px; background: #f5f7fa; border-radius: 6px; white-space: pre; }
.markdown-content :deep(img) { max-width: 100%; }
.markdown-content :deep(table) { border-collapse: collapse; display: block; max-width: 100%; overflow: auto; }
.markdown-content :deep(th), .markdown-content :deep(td) { border: 1px solid #dcdfe6; padding: 6px 10px; }
.markdown-content :deep(blockquote) { border-inline-start: 3px solid #b3d8ff; margin-inline: 0; padding-inline-start: 12px; color: #606266; }
.markdown-content :deep(a) { color: #337ecc; text-decoration: underline; }
.markdown-content :deep(.blocked-image) { color: #73767a; font-size: 12px; }
</style>
