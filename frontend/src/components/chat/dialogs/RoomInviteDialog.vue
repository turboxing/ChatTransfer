<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('rooms.inviteTitle')"
    align-center
    width="420px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="invite-content">
      <div class="room-name">{{ room?.name || t('rooms.default') }}</div>
      <img v-if="qrUrl" :src="qrUrl" class="invite-qr" alt="Room QR Code" />
      <div v-else v-loading="loading" class="invite-placeholder"></div>

      <div class="invite-code">
        {{ formattedCode }}
      </div>

      <div class="invite-actions">
        <el-button :icon="CopyDocument" :disabled="!room?.code" @click="copyCode">{{ t('rooms.copyCode') }}</el-button>
        <el-button :icon="Link" :disabled="!inviteUrl" @click="copyLink">{{ t('rooms.copyLink') }}</el-button>
        <el-button :icon="Refresh" :loading="regenerating" @click="emit('regenerate')">
          {{ t('rooms.regenerate') }}
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { CopyDocument, Link, Refresh } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  room: { type: Object, default: null },
  qrUrl: { type: String, default: '' },
  inviteUrl: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  regenerating: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'regenerate', 'copied'])
const { t } = useI18n()

const formattedCode = computed(() => {
  const code = props.room?.code || ''
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
})

const copyCode = () => emit('copied', 'code')
const copyLink = () => emit('copied', 'link')
</script>

<style scoped>
.invite-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.room-name {
  color: #303133;
  font-size: 16px;
  font-weight: 500;
}

.invite-qr {
  width: 220px;
  height: 220px;
}

.invite-placeholder {
  width: 220px;
  height: 220px;
  border-radius: 8px;
  background: #f5f7fa;
}

.invite-code {
  padding: 8px 16px;
  border-radius: 8px;
  background: #f5f7fa;
  color: #303133;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 18px;
  letter-spacing: 2px;
}

.invite-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
</style>
