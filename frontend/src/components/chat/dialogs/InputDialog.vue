<template>
  <el-dialog :model-value="modelValue" :title="title" align-center width="360px"
    @update:model-value="emit('update:modelValue', $event)">
    <el-input ref="inputRef" v-model="value" :placeholder="placeholder" maxlength="20" show-word-limit
      @keyup.enter="confirm" />
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('chat.cancel') }}</el-button>
      <el-button type="primary" @click="confirm">{{ t('chat.save') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const inputRef = ref(null)
const value = ref('')
const { t } = useI18n()

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  nextTick(() => inputRef.value?.focus())
})

const confirm = () => emit('confirm', value.value)

defineExpose({ value, setValue: (nextValue) => { value.value = nextValue } })
</script>
