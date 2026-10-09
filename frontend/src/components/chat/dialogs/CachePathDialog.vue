<template>
  <el-dialog :model-value="modelValue" :title="title" align-center width="420px"
    @update:model-value="emit('update:modelValue', $event)">
    <el-input :model-value="input" :placeholder="placeholder" clearable
      @update:model-value="emit('update:input', $event)" />
    <div class="cache-path-actions">
      <el-button link size="small" @click="emit('use-default')">{{ useDefaultText }}</el-button>
    </div>
    <div class="cache-path-migrate">
      <el-checkbox :model-value="migrateFiles" @update:model-value="emit('update:migrateFiles', $event)">
        {{ t('tools.migrateFiles') }}
      </el-checkbox>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ cancelText }}</el-button>
      <el-button :loading="saving" type="primary" @click="emit('confirm')">{{ saveText }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  modelValue: { type: Boolean, default: false },
  input: { type: String, default: '' },
  migrateFiles: { type: Boolean, default: false },
  title: { type: String, required: true },
  placeholder: { type: String, required: true },
  useDefaultText: { type: String, required: true },
  cancelText: { type: String, required: true },
  saveText: { type: String, required: true },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'update:input', 'update:migrateFiles', 'use-default', 'confirm'])
const { t } = useI18n()
</script>

<style scoped>
.cache-path-actions {
  margin-top: 8px;
  text-align: right;
}

.cache-path-migrate {
  margin-top: 12px;
}
</style>
