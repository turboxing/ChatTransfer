<template>
  <el-dialog :model-value="modelValue" :title="title" align-center width="400px"
    @update:model-value="emit('update:modelValue', $event)">
    <div v-loading="loading" class="qr-container">
      <img v-if="url" :src="url" class="qr-image" alt="QR Code" />
      <div v-else class="qr-placeholder">{{ placeholder || t('chat.cannotGetQr') }}</div>
      <div v-if="content" class="qr-content-text">{{ content }}</div>
    </div>
  </el-dialog>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  loading: { type: Boolean, default: false },
  url: { type: String, default: '' },
  content: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { t } = useI18n()
</script>

<style scoped>
.qr-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.qr-image {
  width: 100%;
  max-width: 300px;
  height: auto;
}

.qr-placeholder {
  color: #909399;
}

.qr-content-text {
  margin-top: 15px;
  font-size: 14px;
  color: #606266;
  word-break: break-all;
  text-align: center;
  padding: 0 10px;
}
</style>
