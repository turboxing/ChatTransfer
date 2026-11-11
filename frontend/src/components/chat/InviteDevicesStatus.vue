<template>
  <div class="invite-devices-status">
    <button
      type="button"
      class="device-status-button"
      :aria-label="t('chat.deviceListTitle')"
      :title="t('chat.deviceListTitle')"
      :aria-expanded="devicesOpen"
      @click="emit('toggle-devices')"
    >
      <span class="state-dot"></span>
      <span>{{ statusText }}</span>
      <el-icon class="device-status-icon">
        <Close v-if="devicesOpen" />
        <Monitor v-else />
      </el-icon>
    </button>

    <div
      v-if="inlineDeviceList && devicesOpen"
      class="inline-device-list"
      aria-live="polite"
    >
      <div
        v-for="device in devices"
        :key="device.sender"
        class="inline-device-item"
      >
        <span class="device-dot"></span>
        <span class="inline-device-name" :title="device.name">{{ device.name }}</span>
        <span v-if="device.isLocal" class="local-device-tag">
          {{ t('chat.localDevice') }}
        </span>
        <small class="inline-device-label">{{ device.label }}</small>
      </div>
      <div v-if="devices.length === 0" class="inline-device-empty">
        {{ t('chat.noDevices') }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Close, Monitor } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  otherCount: { type: Number, default: 0 },
  devices: { type: Array, default: () => [] },
  devicesOpen: { type: Boolean, default: false },
  inlineDeviceList: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle-devices'])
const { t } = useI18n()

const statusText = computed(() => (
  props.otherCount > 0
    ? t('publicHub.otherDevicesOnline', { count: props.otherCount })
    : `${t('publicHub.localConnected')} · ${t('publicHub.waitingForDevices')}`
))
</script>

<style scoped>
.invite-devices-status {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.device-status-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  appearance: none;
  background: transparent;
  color: #529b2e;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
}

.device-status-button:hover {
  color: var(--el-color-primary);
}

.device-status-button:focus-visible {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 3px;
  border-radius: 4px;
}

.device-status-icon {
  color: #909399;
  font-size: 14px;
}

.device-status-button:hover .device-status-icon {
  color: var(--el-color-primary);
}

.state-dot,
.device-dot {
  flex: none;
  border-radius: 50%;
  background: #67c23a;
}

.state-dot {
  width: 8px;
  height: 8px;
  box-shadow: 0 0 0 4px rgba(103, 194, 58, 0.12);
}

.device-dot {
  width: 6px;
  height: 6px;
}

.inline-device-list {
  display: flex;
  width: min(100%, 420px);
  max-height: 190px;
  flex-direction: column;
  overflow-y: auto;
  border: 1px solid #e4f0ff;
  border-radius: 10px;
  background: #f7fbff;
}

.inline-device-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 9px 11px;
  border-bottom: 1px solid #eaf3fd;
}

.inline-device-item:last-child {
  border-bottom: 0;
}

.inline-device-name {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #303133;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inline-device-label {
  flex: none;
  color: #909399;
  font-size: 11px;
}

.local-device-tag {
  flex: none;
  padding: 1px 6px;
  border: 1px solid #b3d8ff;
  border-radius: 999px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 10px;
}

.inline-device-empty {
  padding: 12px;
  color: #909399;
  font-size: 12px;
  text-align: center;
}
</style>
