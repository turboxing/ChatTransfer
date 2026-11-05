<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('rooms.createTitle')"
    align-center
    width="420px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <el-input
      ref="inputRef"
      v-model="name"
      :placeholder="t('rooms.namePlaceholder')"
      maxlength="60"
      show-word-limit
      @keyup.enter="submit"
    />
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('chat.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="submit">
        {{ t('rooms.create') }}
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

const emit = defineEmits(['update:modelValue', 'create'])
const { t } = useI18n()
const inputRef = ref(null)
const name = ref('')

watch(() => props.modelValue, (visible) => {
  if (!visible) return
  name.value = ''
  nextTick(() => inputRef.value?.focus())
})

const submit = () => {
  if (name.value.trim()) emit('create', name.value.trim())
}
</script>
