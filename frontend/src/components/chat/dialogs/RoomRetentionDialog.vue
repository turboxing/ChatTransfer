<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('rooms.retentionTitle')"
    align-center
    width="460px"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="retention-dialog">
      <p class="retention-description">{{ t('rooms.retentionDescription') }}</p>

      <el-radio-group v-model="selected" class="retention-options">
        <el-radio value="7" border>
          <span class="option-title">{{ t('rooms.retention7') }}</span>
          <span class="option-note">{{ t('rooms.retention7Note') }}</span>
        </el-radio>
        <el-radio value="30" border>
          <span class="option-title">{{ t('rooms.retention30') }}</span>
          <span class="option-note">{{ t('rooms.retention30Note') }}</span>
        </el-radio>
        <el-radio value="0" border>
          <span class="option-title">{{ t('rooms.retentionPermanent') }}</span>
          <span class="option-note">{{ t('rooms.retentionPermanentNote') }}</span>
        </el-radio>
      </el-radio-group>

      <div class="retention-status">
        <el-icon><Timer /></el-icon>
        <span>{{ statusText }}</span>
      </div>

      <el-alert
        v-if="willExpireSoon"
        :title="t('rooms.retentionExpiredWarning')"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-alert
        v-else-if="selected === '0'"
        :title="t('rooms.retentionPermanentHint')"
        type="info"
        :closable="false"
        show-icon
      />
    </div>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">{{ t('chat.cancel') }}</el-button>
      <el-button type="primary" :loading="loading" @click="submit">
        {{ t('chat.save') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Timer } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  room: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'save'])
const { t } = useI18n()
const selected = ref('7')

const normalizeRetention = (room) => {
  const value = Number(room?.idleRetentionDays)
  if (value === 0 || value === 30) return String(value)
  if (Number(room?.effectiveRetentionDays) === 0) return '0'
  return '7'
}

watch(() => [props.modelValue, props.room?.id, props.room?.idleRetentionDays], ([visible]) => {
  if (!visible) return
  selected.value = normalizeRetention(props.room)
}, { immediate: true })

const selectedDays = computed(() => Number(selected.value))

const statusText = computed(() => {
  if (selectedDays.value === 0) return t('rooms.retentionPermanentShort')
  return t('rooms.autoDeleteIn', { days: selectedDays.value })
})

const willExpireSoon = computed(() => {
  if (!props.room || selectedDays.value <= 0) return false
  const lastActiveAt = Number(props.room.lastActiveAt) || Date.now()
  return lastActiveAt + (selectedDays.value * 24 * 60 * 60 * 1000) <= Date.now()
})

const submit = () => emit('save', selectedDays.value)
</script>

<style scoped>
.retention-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.retention-description {
  margin: 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.7;
}

.retention-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.retention-options :deep(.el-radio) {
  width: 100%;
  height: auto;
  margin-right: 0;
  padding: 12px 14px;
  align-items: flex-start;
}

.retention-options :deep(.el-radio__label) {
  display: flex;
  flex-direction: column;
  gap: 3px;
  white-space: normal;
}

.option-title {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.option-note {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

.retention-status {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f5f7fa;
  color: #606266;
  font-size: 13px;
}
</style>
