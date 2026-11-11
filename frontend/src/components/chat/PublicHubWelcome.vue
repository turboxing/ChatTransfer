<template>
  <el-dialog
    :model-value="modelValue"
    :title="t('rooms.inviteTitle')"
    class="public-hub-dialog"
    align-center
    width="min(560px, 94vw)"
    append-to-body
    :close-on-click-modal="false"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="previewVisible = false"
  >
    <template #header>
      <div class="hub-dialog-header">
        <span class="hub-dialog-title">{{ t('rooms.inviteTitle') }}</span>
      </div>
    </template>

    <div
      class="hub-dialog-content"
      :class="{ 'show-inline-devices': inlineDeviceList && devicesOpen }"
    >
      <div class="hub-room-identity">
        <span class="public-badge">
          <el-icon><OfficeBuilding /></el-icon>
          {{ t('rooms.publicBadge') }}
        </span>
        <span class="hub-room-name">{{ t('rooms.default') }}</span>
      </div>

      <div class="hub-qr-panel">
        <button
          v-if="loading || qrUrl"
          type="button"
          class="hub-qr-button"
          :disabled="!qrUrl"
          :aria-label="t('publicHub.previewQr')"
          :title="qrUrl ? t('publicHub.previewQr') : ''"
          @click="openPreview"
        >
          <span v-if="loading" v-loading="true" class="hub-qr-placeholder"></span>
          <img v-else-if="qrUrl" :src="qrUrl" class="hub-qr" :alt="t('publicHub.qrAlt')" />
        </button>

        <div v-else class="hub-qr-error">
          <p>{{ t('publicHub.qrLoadFailed') }}</p>
          <el-button type="primary" plain @click="emit('retry')">
            {{ t('publicHub.retry') }}
          </el-button>
        </div>
      </div>

      <div class="hub-copy">
        <InviteDevicesStatus
          :other-count="otherCount"
          :devices="devices"
          :devices-open="devicesOpen"
          :inline-device-list="inlineDeviceList"
          @toggle-devices="emit('toggle-devices')"
        />

        <div class="hub-actions">
          <el-button :icon="Link" :disabled="!inviteUrl" @click="emit('copy-link')">
            {{ t('publicHub.copyInviteLink') }}
          </el-button>
        </div>

        <ol class="hub-steps">
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
    </div>

    <template #footer>
      <div class="hub-dialog-footer">
        <span>{{ t('publicHub.collapseHint') }}</span>
        <el-button type="primary" :icon="Fold" @click="close">
          {{ t('publicHub.collapse') }}
        </el-button>
      </div>
    </template>

    <el-image-viewer
      v-if="previewVisible && qrUrl"
      :url-list="[qrUrl]"
      teleported
      hide-on-click-modal
      @close="previewVisible = false"
    />
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { Fold, Link, OfficeBuilding } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import InviteDevicesStatus from './InviteDevicesStatus.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  qrUrl: { type: String, default: '' },
  inviteUrl: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  otherCount: { type: Number, default: 0 },
  devices: { type: Array, default: () => [] },
  devicesOpen: { type: Boolean, default: false },
  inlineDeviceList: { type: Boolean, default: false }
})

const emit = defineEmits([
  'update:modelValue',
  'copy-link',
  'retry',
  'toggle-devices'
])
const { t } = useI18n()
const previewVisible = ref(false)

const close = () => emit('update:modelValue', false)

const openPreview = () => {
  if (!props.qrUrl) return
  previewVisible.value = true
}
</script>

<style scoped>
:global(.public-hub-dialog .el-dialog__body) {
  padding-top: 8px;
}

.hub-dialog-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
  padding-right: 28px;
}

.public-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
  padding: 2px 9px;
  border: 1px solid #b3d8ff;
  border-radius: 999px;
  background: #ecf5ff;
  color: #409eff;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
}

.public-badge .el-icon {
  font-size: 12px;
}

.hub-dialog-title {
  color: #303133;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
}

.hub-dialog-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 6px 6px 4px;
}

.hub-room-identity {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
  padding: 8px 18px;
  border-radius: 8px;
  background: #f5f7fa;
}

.hub-room-name {
  min-width: 0;
  overflow: hidden;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hub-copy {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.hub-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.hub-steps {
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

.hub-steps li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.hub-steps span {
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

.hub-qr-panel {
  display: flex;
  width: min(100%, 420px);
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  border-radius: 16px;
  background: #f7fbff;
  border: 1px solid #e4f0ff;
}

.hub-qr-button {
  display: grid;
  place-items: center;
  width: min(320px, 72vw);
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: #f5f7fa;
  cursor: zoom-in;
}

.hub-qr-button:disabled {
  cursor: default;
}

.hub-qr,
.hub-qr-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: #f5f7fa;
}

.hub-qr {
  display: block;
}

.hub-qr-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: min(320px, 72vw);
  min-height: 180px;
  gap: 10px;
  color: #909399;
  font-size: 13px;
  text-align: center;
}

.hub-qr-error p {
  margin: 0;
}

.hub-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.hub-dialog-footer span {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
  text-align: left;
}

@media (max-width: 820px) {
  .hub-dialog-content {
    gap: 16px;
    padding: 4px 0 0;
  }

  .hub-dialog-content.show-inline-devices .hub-qr-panel {
    display: none;
  }

  .hub-qr-button,
  .hub-qr-placeholder,
  .hub-qr-error {
    width: min(300px, 78vw);
  }

}

@media (max-width: 560px) {
  .hub-dialog-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .hub-dialog-footer span {
    text-align: center;
  }
}
</style>
