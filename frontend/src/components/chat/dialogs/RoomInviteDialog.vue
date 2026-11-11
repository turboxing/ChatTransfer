<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('rooms.inviteTitle')"
    align-center
    width="min(560px, 94vw)"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div
      class="invite-content"
      :class="{ 'show-inline-devices': inlineDeviceList && devicesOpen }"
      :data-invite-url="inviteUrl"
    >
      <div class="room-identity">
        <span v-if="isPublicTransitStation" class="public-badge">
          <el-icon><OfficeBuilding /></el-icon>
          {{ t('rooms.publicBadge') }}
        </span>
        <span class="room-name">
          {{ room?.id === 'group_chat' ? t('rooms.default') : (room?.name || t('rooms.default')) }}
        </span>
      </div>

      <div class="invite-qr-panel">
        <img v-if="qrUrl" :src="qrUrl" class="invite-qr" alt="Room QR Code" />
        <div v-else v-loading="loading" class="invite-placeholder"></div>
      </div>

      <div v-if="!isPublicTransitStation" class="invite-code">
        {{ formattedCode }}
      </div>

      <InviteDevicesStatus
        :other-count="otherCount"
        :devices="devices"
        :devices-open="devicesOpen"
        :inline-device-list="inlineDeviceList"
        @toggle-devices="emit('toggle-devices')"
      />

      <div class="invite-actions">
        <el-button
          v-if="!isPublicTransitStation"
          :icon="CopyDocument"
          :disabled="!room?.code"
          @click="copyCode"
        >
          {{ t('rooms.copyCode') }}
        </el-button>
        <el-button :icon="Link" :disabled="!inviteUrl" @click="copyLink">{{ t('rooms.copyLink') }}</el-button>
        <el-button
          v-if="!isPublicTransitStation && canRegenerateRoom"
          :icon="Refresh"
          :loading="regenerating"
          @click="emit('regenerate')"
        >
          {{ t('rooms.regenerate') }}
        </el-button>
      </div>

      <ol class="invite-steps">
        <li>
          <span>1</span>
          {{ t('publicHub.stepScan') }}
        </li>
        <li>
          <span>2</span>
          {{ t('publicHub.stepJoin') }}
        </li>
        <li>
          <span>3</span>
          {{ t('publicHub.stepTransfer') }}
        </li>
      </ol>
    </div>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { CopyDocument, Link, OfficeBuilding, Refresh } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import InviteDevicesStatus from '../InviteDevicesStatus.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  room: { type: Object, default: null },
  qrUrl: { type: String, default: '' },
  inviteUrl: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  regenerating: { type: Boolean, default: false },
  otherCount: { type: Number, default: 0 },
  devices: { type: Array, default: () => [] },
  devicesOpen: { type: Boolean, default: false },
  inlineDeviceList: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'regenerate', 'copied', 'toggle-devices'])
const { t } = useI18n()

const isPublicTransitStation = computed(() => props.room?.id === 'group_chat')
const canRegenerateRoom = computed(() => props.room?.role === 'owner')

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
  gap: 16px;
}

.room-identity {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
  padding: 8px 18px;
  border-radius: 8px;
  background: #f5f7fa;
}

.room-name {
  min-width: 0;
  overflow: hidden;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 7px;
  border: 1px solid #b3d8ff;
  border-radius: 999px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 11px;
  font-weight: 500;
}

.public-badge .el-icon {
  font-size: 12px;
}

.invite-qr-panel {
  display: flex;
  width: min(100%, 420px);
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 1px solid #e4f0ff;
  border-radius: 16px;
  background: #f7fbff;
}

.invite-qr {
  width: min(320px, 72vw);
  height: auto;
  aspect-ratio: 1;
  border-radius: 8px;
}

.invite-placeholder {
  width: min(320px, 72vw);
  aspect-ratio: 1;
  border-radius: 8px;
  background: #f5f7fa;
}

.invite-code {
  padding: 8px 18px;
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

.invite-steps {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 18px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: #909399;
  font-size: 12px;
}

.invite-steps li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.invite-steps span {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #eaf4ff;
  color: #409eff;
  font-size: 10px;
  font-weight: 700;
}

@media (max-width: 820px) {
  .invite-content.show-inline-devices .invite-qr-panel {
    display: none;
  }
}
</style>
