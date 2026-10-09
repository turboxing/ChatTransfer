<template>
  <div class="chat-footer">
    <input ref="fileInputRef" class="hidden-file-input" type="file" multiple @change="handleFileSelect" />
    <div class="chat-tools">
      <el-button circle size="small" @click="$emit('trigger-file-upload')">
        <el-icon><Plus /></el-icon>
      </el-button>
    </div>
    <Sender ref="senderRef" :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)"
      :loading="loading" :placeholder="placeholder"
      class="chat-sender" clearable @paste-file="$emit('paste-file')" @submit="$emit('submit', $event)" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { Sender } from 'vue-element-plus-x'

const props = defineProps({
  modelValue: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  placeholder: { type: String, required: true }
})

const emit = defineEmits(['update:modelValue', 'submit', 'paste-file', 'trigger-file-upload'])

const fileInputRef = ref(null)
const senderRef = ref(null)

const handleFileSelect = (event) => emit('file-selected', event)

const triggerInput = () => fileInputRef.value?.click()

const focusInput = () => {
  const root = senderRef.value?.$el
  const input = root?.querySelector('input') || root?.querySelector('textarea')
  input?.focus()
  return input
}

const registerHistoryNavigation = (handler) => {
  const textarea = senderRef.value?.$el?.querySelector('.el-textarea__inner')
  textarea?.addEventListener('keydown', handler)
}

const unregisterHistoryNavigation = (handler) => {
  const textarea = senderRef.value?.$el?.querySelector('.el-textarea__inner')
  textarea?.removeEventListener('keydown', handler)
}

defineExpose({
  triggerInput,
  focusInput,
  registerHistoryNavigation,
  unregisterHistoryNavigation,
})
</script>

<style scoped>
.chat-footer {
  background-color: #ffffff;
  border-top: 1px solid #dcdfe6;
  padding: 15px 20px;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding-bottom: calc(15px + env(safe-area-inset-bottom));
}

.chat-sender {
  flex: 1;
}

.chat-tools {
  padding-bottom: 8px;
}

.hidden-file-input {
  display: none;
}
</style>
