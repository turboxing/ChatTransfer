<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('rooms.joinTitle')"
    align-center
    width="420px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-input
      ref="inputRef"
      v-model="code"
      :placeholder="t('rooms.codePlaceholder')"
      maxlength="12"
      @keyup.enter="submit"
    />
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('chat.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="submit">
        {{ t('rooms.join') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'join'])
const { t } = useI18n()
const inputRef = ref(null)
const code = ref('')

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  code.value = ''
  nextTick(() => inputRef.value?.focus())
})

const submit = () => {
  if (code.value.trim()) emit('join', code.value.trim())
}
</script>
