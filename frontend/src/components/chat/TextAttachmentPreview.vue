<template>
  <div class="text-controls">
    <el-select v-model="encoding" :aria-label="t('preview.encoding')" class="encoding-select">
      <el-option :label="t('preview.autoEncoding')" value="auto" />
      <el-option v-for="option in ['utf-8', 'gb18030', 'utf-16le', 'utf-16be']" :key="option" :label="option.toUpperCase()" :value="option" />
    </el-select>
    <el-checkbox v-model="wrap">{{ t('preview.wrap') }}</el-checkbox>
    <el-checkbox v-if="isJson && !truncated" v-model="formatted">{{ t('preview.formatJson') }}</el-checkbox>
    <el-button :disabled="!!decodeError" @click="copy">{{ t('preview.copy') }}</el-button>
  </div>
  <el-alert v-if="truncated" :title="t('preview.truncated')" type="warning" :closable="false" />
  <el-alert v-if="decodeError" :title="t('preview.binary')" type="warning" :closable="false" />
  <template v-else>
    <div class="text-search">
      <el-input v-model="query" :placeholder="t('preview.search')" clearable @keyup.enter="navigate(1)" />
      <span role="status">{{ activeIndex < 0 ? 0 : activeIndex + 1 }}/{{ matches.length }}{{ matches.length === 500 ? '+' : '' }}</span>
      <el-button :disabled="!matches.length" :aria-label="t('preview.previous')" @click="navigate(-1)">↑</el-button>
      <el-button :disabled="!matches.length" :aria-label="t('preview.next')" @click="navigate(1)">↓</el-button>
    </div>
    <p v-if="invalidJson" class="json-warning">{{ t('preview.invalidJson') }}</p>
    <pre ref="contentRef" class="text-content" :class="{ wrap }" tabindex="0"><template v-for="(part, index) in parts" :key="index"><mark v-if="part.match" :class="{ active: part.index === activeIndex }">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></pre>
  </template>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { useClipboard } from '../../composables/use-message-utils'
import { decodePreview, searchPreview } from '../../composables/attachment-preview-utils'

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
const matches = computed(() => searchPreview(content.value, query.value))
const parts = computed(() => {
  const result = []
  let offset = 0
  matches.value.forEach((position, index) => {
    result.push({ text: content.value.slice(offset, position) })
    result.push({ text: content.value.slice(position, position + query.value.length), match: true, index })
    offset = position + query.value.length
  })
  result.push({ text: content.value.slice(offset) })
  return result
})
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
</style>
