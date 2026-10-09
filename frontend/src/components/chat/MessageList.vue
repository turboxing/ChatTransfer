<template>
  <BubbleList ref="bubbleListRef" :list="items" :auto-scroll="false">
    <template #avatar="{ item }">
      <el-avatar :size="40" :src="item.originalMsg.avatar" class="user-avatar" :style="{
        backgroundColor: item.originalMsg.avatar ? undefined : getColorByName(item.originalMsg.sender),
        color: item.originalMsg.avatar ? undefined : '#fff'
      }">
        {{ getDisplayName(item.originalMsg)?.slice(-2) || item.originalMsg.sender?.slice(-2) || 'User' }}
      </el-avatar>
    </template>

    <template #header="{ item }">
      <div class="header-wrapper" :id="'msg-' + item.key" :class="{ 'is-sender': item.placement === 'end' }">
        <div class="header-name-group">
          <span class="header-name" :style="{ color: getColorByName(item.originalMsg.sender) }">
            {{ getDisplayName(item.originalMsg) }}
          </span>
          <span class="header-ip" v-if="getDisplayIp(item.originalMsg)">
            {{ getDisplayIp(item.originalMsg) }}
          </span>
        </div>
      </div>
    </template>

    <template #content="{ item }">
      <div class="content-wrapper"
        :class="{ 'is-pinned-content': isMessagePinned(item.key), 'is-topped-content': isMessageTopped(item.key) }">
        <div v-if="item.rawType === 'TEXT'" class="content-text" v-html="formatTextContent(item.content)"></div>

        <div v-else-if="item.rawType === 'IMAGE'" class="content-image">
          <el-image :src="item.fileUrl" :preview-src-list="[item.fileUrl]" fit="cover" class="message-image" />
        </div>

        <div v-else-if="item.rawType === 'FILE' || item.status === 'uploading'" class="content-file">
          <FilesCard :name="item.fileName" :file-size="item.fileSize"
            :status="item.status === 'success' ? 'done' : (item.status === 'failed' ? 'error' : 'uploading')"
            :percent="item.originalMsg.uploadProgress" :error-tip="t('chat.uploadFailed')" />
        </div>
      </div>
    </template>

    <template #footer="{ item }">
      <div class="footer-wrapper" :class="{ 'is-sender': item.placement === 'end' }">
        <div class="footer-actions">
          <el-button type="primary" link size="small" class="pin-btn"
            :class="{ 'is-pinned': isMessagePinned(item.key) }" @click="$emit('pin', item)">
            <img src="/pin.svg" alt="pin" class="pin-icon-small" />
            {{ isMessagePinned(item.key) ? t('chat.pinned') : t('chat.pin') }}
          </el-button>

          <el-button type="primary" link :icon="Top" size="small" class="top-btn"
            :class="{ 'is-topped': isMessageTopped(item.key) }" @click="$emit('top', item)">
            {{ isMessageTopped(item.key) ? t('chat.topped') : t('chat.top') }}
          </el-button>

          <el-button type="primary" link :icon="CopyDocument" size="small" @click="$emit('copy', item)">
            {{ t('chat.copy') }}
          </el-button>

          <el-button type="primary" link :icon="Grid" size="small" @click="$emit('qr', item)">
            {{ t('chat.qrcode') }}
          </el-button>

          <el-dropdown v-if="hasMessageMobileActions(item)" trigger="click" placement="top" class="action-more">
            <el-button type="primary" link size="small">
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="isAttachment(item) && item.status === 'success'" :icon="View" @click="$emit('open', item)">
                  {{ t('chat.open') }}
                </el-dropdown-item>
                <el-dropdown-item v-if="isAttachment(item) && item.status === 'success'" :icon="Download" @click="$emit('download', item)">
                  {{ t('chat.download') }}
                </el-dropdown-item>
                <el-dropdown-item v-if="item.role === 'user'" :icon="RefreshRight" @click="$emit('retry', item)">
                  {{ t('chat.resend') }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div class="footer-time">{{ item.time }}</div>
      </div>
    </template>
  </BubbleList>
</template>

<script setup>
import { ref } from 'vue'
import { BubbleList, FilesCard } from 'vue-element-plus-x'
import { Top, CopyDocument, Grid, Download, View, RefreshRight, MoreFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { getColorByName, formatTextContent } from '../../composables/use-message-utils'
import {
  hasMessageMobileActions,
  isAttachmentMessage
} from '../../composables/use-message-actions'

defineProps({
  items: {
    type: Array,
    required: true
  },
  getDisplayName: {
    type: Function,
    required: true
  },
  getDisplayIp: {
    type: Function,
    required: true
  },
  isMessagePinned: {
    type: Function,
    required: true
  },
  isMessageTopped: {
    type: Function,
    required: true
  }
})

defineEmits(['pin', 'top', 'copy', 'qr', 'open', 'download', 'retry'])

const { t } = useI18n()

const isAttachment = isAttachmentMessage

const bubbleListRef = ref(null)

const scrollToBottom = () => {
  if (!bubbleListRef.value?.scrollToBottom) return false
  bubbleListRef.value.scrollToBottom()
  return true
}

defineExpose({ scrollToBottom })
</script>
