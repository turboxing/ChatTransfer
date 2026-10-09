<template>
  <el-drawer :model-value="modelValue" :title="t('chat.pinDrawerTitle')" direction="rtl" size="90%"
    @update:model-value="emit('update:modelValue', $event)">
    <div class="pin-filter-btns">
      <el-button v-for="option in filters" :key="option.value" size="small"
        :type="filter === option.value ? 'primary' : ''" @click="emit('update:filter', option.value)">
        {{ option.label }}
      </el-button>
    </div>
    <div class="pin-list">
      <div v-if="isEmpty" class="pin-list-empty">{{ t('chat.noPinned') }}</div>
      <MessageList :items="items" :get-display-name="getDisplayName" :get-display-ip="getDisplayIp"
        :is-message-pinned="isMessagePinned" :is-message-topped="isMessageTopped"
        @pin="emit('locate', $event.key)" @top="emit('top', $event)" @copy="emit('copy', $event)"
        @qr="emit('qr', $event)" @open="emit('open', $event)" @download="emit('download', $event)" />
    </div>
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import MessageList from './MessageList.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  filter: { type: String, required: true },
  items: { type: Array, required: true },
  isEmpty: { type: Boolean, required: true },
  getDisplayName: { type: Function, required: true },
  getDisplayIp: { type: Function, required: true },
  isMessagePinned: { type: Function, required: true },
  isMessageTopped: { type: Function, required: true }
})

const emit = defineEmits(['update:modelValue', 'update:filter', 'top', 'copy', 'qr', 'open', 'download', 'locate'])

const { t } = useI18n()

const filters = computed(() => [
  { value: 'all', label: t('chat.filterAll') },
  { value: 'text', label: t('chat.filterText') },
  { value: 'file', label: t('chat.filterFile') },
  { value: 'image', label: t('chat.filterImage') },
  { value: 'link', label: t('chat.filterLink') }
])
</script>

<style scoped>
.pin-filter-btns {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.pin-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pin-list-empty {
  text-align: center;
  color: #909399;
  padding: 40px 20px;
  font-size: 14px;
}
</style>
