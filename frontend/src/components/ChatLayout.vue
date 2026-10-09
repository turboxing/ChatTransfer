<template>
  <div class="chat-container" ref="chatContainerRef">
    <ChatHeader
      :group-name="displayGroupName"
      :online-count="onlineCount"
      :is-connected="isConnected"
      :show-online-count="targetUser === 'group_chat'"
      :edit-group-name-title="t('chat.editGroupName')"
      :online-text="t('chat.online')"
      :offline-text="t('chat.offline')"
      :online-count-text="t('chat.onlineCount', { count: onlineCount })"
      @edit-group-name="openGroupNameEditor"
      @open-pin-drawer="openPinDrawer"
      @show-qr="showQrCode"
      @show-tools="showTools"
    />

    <TopBar
      v-if="topMessage"
      :content="getTopMessageContent()"
      @locate="scrollToMessage(topMessage.msgId)"
      @unpin="unTopMessage"
    />

    <Attachments :items="uploadFiles" drag :drag-target="getDragTarget()" :before-upload="beforeUpload"
      :hide-upload="true" @upload-drop="handleUploadDrop" @delete-card="removeUploadCard" />

    <div class="chat-content" ref="scrollContainer">
      <MessageList
        ref="messageListRef"
        :items="bubbleItems"
        :get-display-name="getDisplayName"
        :get-display-ip="getDisplayIp"
        :is-message-pinned="isMessagePinned"
        :is-message-topped="isMessageTopped"
        @pin="toggleMessagePin"
        @top="handleTopMessage"
        @copy="copyItem"
        @qr="showItemQrCode"
        @open="handleOpen"
        @download="handleDownload"
        @retry="handleRetry"
      />
    </div>

    <ChatFooter
      :loading="isUploading"
      :placeholder="t('chat.inputPlaceholder')"
      v-model="inputValue"
      @submit="handleSend"
      @paste-file="handlePasteFile"
      @trigger-file-upload="footerRef?.triggerInput"
      @file-selected="handleFileSelect"
      ref="footerRef"
    />

    <ToolsDrawer
      v-model="toolsDrawerVisible"
      :language-setting="languageSetting"
      :my-nickname="myNickname"
      :group-name="groupName"
      :show-group-name="targetUser === 'group_chat'"
      :cache-path="cachePath"
      :cache-path-customized="cachePathCustomized"
      :copyright="copyright"
      :version="version"
      @update:language-setting="handleLanguageChange"
      @edit-nickname="openNicknameEditor"
      @edit-group-name="openGroupNameEditor"
      @show-qr="showQrCode"
      @copy-cache-path="copyCachePath(cachePath)"
      @open-cache-path="handleOpenCachePath"
      @open-cache-path-dialog="openCachePathDialog"
      @show-changelog="showChangelog"
      @open-feedback="openFeedback"
      @clear-history="handleClearHistory"
    />

    <QrCodeDialog v-model="qrDialogVisible" :loading="qrLoading" :url="qrCodeUrl"
      :title="t('tools.joinGroupQrTitle')" :placeholder="t('chat.cannotGetQr')" />

    <QrCodeDialog v-model="msgQrDialogVisible" :url="msgQrCodeUrl" :content="msgQrContent"
      :title="t('chat.messageQrTitle')" />

    <InputDialog v-model="editDialogVisible" ref="editInputRef" :title="editDialogTitle"
      :placeholder="editDialogPlaceholder" @confirm="confirmEditDialog" />

    <CachePathDialog
      v-model="cachePathDialogVisible"
      v-model:input="cachePathInput"
      v-model:migrate-files="migrateFiles"
      :title="t('tools.changeCachePathTitle')"
      :placeholder="t('tools.cachePathInputPlaceholder')"
      :use-default-text="t('tools.useDefaultCachePath')"
      :cancel-text="t('chat.cancel')"
      :save-text="t('chat.save')"
      :saving="cachePathSaving"
      @use-default="applyDefaultCachePath"
      @confirm="confirmCachePathChange"
    />

    <PinDrawer
      v-model="pinDrawerVisible"
      :filter="pinFilter"
      :items="pinnedBubbleItems"
      :is-empty="filteredPinnedMessages.length === 0"
      :get-display-name="getDisplayName"
      :get-display-ip="getDisplayIp"
      :is-message-pinned="isMessagePinned"
      :is-message-topped="isMessageTopped"
      @update:filter="pinFilter = $event"
      @top="handleTopMessage"
      @copy="copyItem"
      @qr="showItemQrCode"
      @open="handleOpen"
      @download="handleDownload"
      @locate="scrollToMessage($event)"
    />

    <ChangelogDialog v-model="changelogDialogVisible" :releases="changelog" :locale="locale"
      :title="t('common.versionHistory')" :latest-text="t('common.latest')" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Attachments } from 'vue-element-plus-x'
import MessageList from './chat/MessageList.vue'
import PinDrawer from './chat/PinDrawer.vue'
import ChatHeader from './chat/ChatHeader.vue'
import TopBar from './chat/TopBar.vue'
import ChatFooter from './chat/ChatFooter.vue'
import ToolsDrawer from './chat/ToolsDrawer.vue'
import QrCodeDialog from './chat/dialogs/QrCodeDialog.vue'
import InputDialog from './chat/dialogs/InputDialog.vue'
import CachePathDialog from './chat/dialogs/CachePathDialog.vue'
import ChangelogDialog from './chat/dialogs/ChangelogDialog.vue'
import { changelog } from '../data/changelog.js'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useSocket } from '../composables/use-socket'
import { useMessages } from '../composables/use-messages'
import { useCachePath } from '../composables/use-cache-path'
import { useMessagePin } from '../composables/use-message-pin'
import { useQrcode } from '../composables/use-qrcode'
import { useFileUpload } from '../composables/use-file-upload'
import { useClipboard } from '../composables/use-message-utils'
import { parseFileName } from '../composables/use-message-utils'
import { useSendHistory } from '../composables/use-send-history'
import { useMessageEmitter } from '../composables/use-message-emitter'
import { useMessageActions } from '../composables/use-message-actions'
import {
  GROUPNAME_STORAGE_KEY,
  useIdentityEditor
} from '../composables/use-identity-editor'
import { useChatSession } from '../composables/use-chat-session'
import { useVersionInfo } from '../composables/use-version-info'
import { useMessageDisplay } from '../composables/use-message-display'
import { useMessageLocation } from '../composables/use-message-location'
import { useChatTools } from '../composables/use-chat-tools'
import { useChatKeyboard } from '../composables/use-chat-keyboard'

const route = useRoute()
const { t, locale } = useI18n()

const footerRef = ref(null)
const inputValue = ref('')
const currentUser = ref('')
const targetUser = ref('')
const scrollContainer = ref(null)
const messageListRef = ref(null)

const myNickname = ref('')
const groupName = ref('')
const onlineUsers = ref([])
const {
  cachePath,
  cachePathCustomized,
  cachePathDialogVisible,
  cachePathInput,
  cachePathSaving,
  migrateFiles,
  fetchCachePath,
  openCachePathEditor,
  useDefaultCachePath,
  confirmChangeCachePath,
} = useCachePath()

const {
  rawMessages,
  loadHistory,
  saveMessage: saveMessageToLocal,
} = useMessages({ currentUser, targetUser })

const cachePathController = {
  openCachePathEditor,
  useDefaultCachePath,
  confirmChangeCachePath,
}

const {
  toolsDrawerVisible,
  changelogDialogVisible,
  languageSetting,
  showTools,
  showChangelog,
  handleLanguageChange,
  handleOpenCachePath,
  openCachePathDialog,
  applyDefaultCachePath,
  confirmCachePathChange,
  handleClearHistory,
  openFeedback,
} = useChatTools({
  route,
  rawMessages,
  cachePathController,
  t,
  notify: ElMessage,
  alert: ElMessageBox.alert,
  confirm: ElMessageBox.confirm,
})

const handleIncomingMessage = (data) => {
  console.log('收到消息:', data)
  const isGroupMessage = data.receiver === 'group_chat' && targetUser.value === 'group_chat'
  const isPrivateMessage = (
    (data.sender === targetUser.value && data.receiver === currentUser.value) ||
    (data.sender === currentUser.value && data.receiver === targetUser.value)
  )

  if (isGroupMessage || isPrivateMessage) {
    rawMessages.value.push({ ...data, status: 'success' })
    saveMessageToLocal(data)
  }
}

const {
  socket,
  isConnected,
  connect: connectSocket,
} = useSocket({
  currentUser,
  targetUser,
  myNickname,
  onConnect: () => fetchCachePath(),
  onUserList: (users) => {
    onlineUsers.value = users
  },
  onGroupName: (name) => {
    if (!name) return
    groupName.value = name
    localStorage.setItem(GROUPNAME_STORAGE_KEY, name)
  },
  onMessage: handleIncomingMessage,
})

const {
  editDialogVisible,
  editDialogTitle,
  editDialogPlaceholder,
  editInputRef,
  openNicknameEditor,
  openGroupNameEditor,
  confirmEditDialog,
} = useIdentityEditor({
  currentUser,
  targetUser,
  myNickname,
  groupName,
  socket,
  isConnected,
  t,
  notify: ElMessage
})

const {
  pinDrawerVisible,
  pinFilter,
  pinnedMessages,
  topMessage,
  filteredPinnedMessages,
  pinnedBubbleItems,
  isMessagePinned,
  isMessageTopped,
  getLatestPinnedMessage,
  getTopMessageContent,
  toggleMessagePin,
  unpinMessage,
  unpinLatestMessage,
  handleTopMessage,
  unTopMessage,
} = useMessagePin({ t, parseFileName })

const {
  onlineCount,
  displayGroupName,
  getDisplayName,
  getDisplayIp,
  bubbleItems,
} = useMessageDisplay({
  currentUser,
  targetUser,
  myNickname,
  groupName,
  onlineUsers,
  rawMessages,
  isMessagePinned,
  parseFileName,
  t,
})
const {
  qrDialogVisible,
  qrLoading,
  qrCodeUrl,
  msgQrDialogVisible,
  msgQrCodeUrl,
  msgQrContent,
  showQrCode,
  showItemQrCode,
} = useQrcode({
  targetUser,
  t,
  notify: ElMessage
})

const {
  copyItem,
  copyCachePath,
} = useClipboard({ t, notify: ElMessage })

const { emitMessage } = useMessageEmitter({
  socket,
  isConnected,
  targetUser,
  rawMessages,
  saveMessage: saveMessageToLocal
})

const scrollToBottom = async () => {
  await nextTick()
  const scrolledByBubbleList = messageListRef.value?.scrollToBottom?.()
  if (!scrolledByBubbleList && scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

const {
  uploadFiles,
  chatContainerRef,
  isUploading,
  getDragTarget,
  beforeUpload,
  removeUploadCard,
  uploadFile,
  handleUploadDrop,
  handleFileSelect,
  handlePasteFile,
} = useFileUpload({
  currentUser,
  targetUser,
  rawMessages,
  saveMessage: saveMessageToLocal,
  emitMessage,
  scrollToBottom,
  t,
  notify: ElMessage
})

const {
  sendHistory,
  load: loadSendHistory,
  add: addSendHistory,
  navigate: navigateSendHistory,
} = useSendHistory(inputValue)

const {
  handleKeydown,
  handleHistoryKeydown,
} = useChatKeyboard({
  footerRef,
  sendHistory,
  navigateSendHistory,
})

const {
  handleSend,
  handleRetry,
  handleOpen,
  handleDownload,
} = useMessageActions({
  currentUser,
  targetUser,
  inputValue,
  rawMessages,
  emitMessage,
  scrollToBottom,
  addSendHistory,
  uploadFile,
  t,
  notify: ElMessage
})

const { scrollToMessage } = useMessageLocation({ t, notify: ElMessage })

const openPinDrawer = () => {
  pinDrawerVisible.value = true
}

const {
  version,
  copyright,
  fetchVersionInfo,
} = useVersionInfo()

watch(bubbleItems, () => {
  scrollToBottom()
}, { deep: true })

const { initSession } = useChatSession({
  currentUser,
  targetUser,
  myNickname,
  groupName,
  loadHistory,
  connectSocket,
  fetchVersionInfo,
})

onMounted(() => {
  initSession()
  loadSendHistory()
  document.addEventListener('keydown', handleKeydown)
  footerRef.value?.registerHistoryNavigation?.(handleHistoryKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  footerRef.value?.unregisterHistoryNavigation?.(handleHistoryKeydown)
})
</script>

<style scoped>
.chat-container {
  height: 100dvh;
}

@keyframes locateFlash {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }

  30% {
    box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.35);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}

:deep(.el-bubble.locate-highlight .el-bubble-content-wrapper) {
  border-radius: 12px;
  animation: locateFlash 0.5s ease-in-out 0s 2;
}

:deep(.element-plus-x-attachments) {
  pointer-events: none;
}

:deep(.element-plus-x-attachments-drag-area) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 9999 !important;
}

:deep(.element-plus-x-attachments-drag-mask) {
  background-color: rgba(64, 158, 255, 0.1) !important;
}

:deep(.element-plus-x-attachments-drag-content) {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  background-color: rgba(255, 255, 255, 0.95) !important;
  border: 2px dashed #409eff !important;
  border-radius: 12px !important;
  padding: 40px 60px !important;
  box-shadow: 0 4px 20px rgba(64, 158, 255, 0.3) !important;
}

:deep(.element-plus-x-attachments-drag-content h3) {
  color: #409eff !important;
  font-size: 18px !important;
  margin: 0 !important;
}

:deep(.element-plus-x-attachments-drag-content p) {
  color: #909399 !important;
  margin-top: 8px !important;
}
</style>
