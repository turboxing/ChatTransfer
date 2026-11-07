<template>
  <div class="chat-container" ref="chatContainerRef">
    <ChatHeader
      :group-name="displayGroupName"
      :online-count="onlineCount"
      :is-connected="isConnected"
      :show-online-count="!!targetUser"
      :edit-group-name-title="t('chat.editGroupName')"
      :online-text="t('chat.online')"
      :offline-text="t('chat.offline')"
      :online-count-text="t('chat.onlineCount', { count: onlineCount })"
      :can-edit-group-name="canEditGroupName"
      :is-public-room="isPublicTransitStation"
      :public-badge-text="t('rooms.publicBadge')"
      @edit-group-name="handleEditGroupName"
      @open-pin-drawer="openPinDrawer"
      @show-qr="showRoomInvite"
      @show-tools="showTools"
      @open-online-users="onlineUsersDrawerVisible = true"
      @open-conversations="openConversationsDrawer"
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
        :selection-mode="selectionMode"
        :selected-message-ids="selectedIds"
        :is-selectable-message="isSelectableMessage"
        @pin="toggleMessagePin"
        @top="handleTopMessage"
        @copy="copyItem"
        @qr="showItemQrCode"
        @open="handleOpen"
        @download="handleDownload"
        @retry="handleRetry"
        @start-select="enterSelection"
        @toggle-select="toggleSelection"
      />
      <PresenceNoticeList :events="presenceNotices" />
    </div>

    <BatchSelectionBar
      v-if="selectionMode"
      :selected-count="selectedCount"
      :selectable-count="selectableCount"
      :total-size="selectedTotalSize"
      :all-selected="allSelected"
      :some-selected="someSelected"
      :downloading="batchDownloadLoading || batchSelectionResolving"
      @toggle-all="toggleSelectAll"
      @cancel="exitSelection"
      @download="handleSelectedBatchDownload"
    />

    <ChatFooter
      v-else
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
      :show-group-name="!!targetUser"
      :can-edit-group-name="canEditGroupName"
      :can-clear-server-history="canClearServerHistory"
      :is-public-transit-station="isPublicTransitStation"
      :cache-path="cachePath"
      :cache-path-customized="cachePathCustomized"
      :copyright="copyright"
      :version="version"
      @update:language-setting="handleLanguageChange"
      @edit-nickname="openNicknameEditor"
      @edit-group-name="handleEditGroupName"
      @show-qr="showRoomInvite"
      @copy-cache-path="copyCachePath(cachePath)"
      @open-cache-path="handleOpenCachePath"
      @open-cache-path-dialog="openCachePathDialog"
      @open-batch-download="openBatchDownloadDialog"
      @show-changelog="showChangelog"
      @open-repository="openRepository"
      @open-feedback="openFeedback"
      @clear-local-history="handleClearLocalHistory"
      @clear-server-history="handleClearServerHistory"
    />

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

    <BatchDownloadDialog
      v-model="batchDownloadDialogVisible"
      :attachments="batchAttachments"
      :loading="batchAttachmentsLoading"
      :downloading="batchDownloadLoading"
      :title="t('tools.batchDownloadTitle')"
      :empty-text="t('batchDownload.empty')"
      :cancel-text="t('chat.cancel')"
      :download-text="t('batchDownload.download')"
      @download="handleBatchDownload"
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

    <OnlineUsersDrawer
      v-model="onlineUsersDrawerVisible"
      :users="onlineUsers"
      :current-user="currentUser"
    />

    <ConversationDrawer
      v-model="conversationsDrawerVisible"
      :rooms="rooms"
      :active-room-id="targetUser"
      :current-user="currentUser"
      :loading="roomsLoading"
      @select="switchRoom"
      @create="createRoomDialogVisible = true"
      @join="joinRoomDialogVisible = true"
      @rename="handleRoomRename"
      @leave="handleLeaveRoom"
      @dissolve="handleDissolveRoom"
    />

    <CreateRoomDialog
      v-model="createRoomDialogVisible"
      :loading="roomActionLoading"
      @create="handleCreateRoom"
    />

    <JoinRoomDialog
      v-model="joinRoomDialogVisible"
      :loading="roomActionLoading"
      @join="handleJoinRoomByCode"
    />

    <RoomInviteDialog
      v-model="roomInviteDialogVisible"
      :room="inviteRoom"
      :qr-url="qrCodeUrl"
      :invite-url="inviteUrl"
      :regenerating="roomActionLoading"
      @regenerate="handleRegenerateRoomCode"
      @copied="handleRoomInviteCopied"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Attachments } from 'vue-element-plus-x'
import MessageList from './chat/MessageList.vue'
import PinDrawer from './chat/PinDrawer.vue'
import ChatHeader from './chat/ChatHeader.vue'
import OnlineUsersDrawer from './chat/OnlineUsersDrawer.vue'
import ConversationDrawer from './chat/ConversationDrawer.vue'
import PresenceNoticeList from './chat/PresenceNoticeList.vue'
import CreateRoomDialog from './chat/dialogs/CreateRoomDialog.vue'
import JoinRoomDialog from './chat/dialogs/JoinRoomDialog.vue'
import RoomInviteDialog from './chat/dialogs/RoomInviteDialog.vue'
import TopBar from './chat/TopBar.vue'
import ChatFooter from './chat/ChatFooter.vue'
import BatchSelectionBar from './chat/BatchSelectionBar.vue'
import ToolsDrawer from './chat/ToolsDrawer.vue'
import QrCodeDialog from './chat/dialogs/QrCodeDialog.vue'
import InputDialog from './chat/dialogs/InputDialog.vue'
import CachePathDialog from './chat/dialogs/CachePathDialog.vue'
import BatchDownloadDialog from './chat/dialogs/BatchDownloadDialog.vue'
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
import { useIdentityEditor } from '../composables/use-identity-editor'
import { useChatSession } from '../composables/use-chat-session'
import { useVersionInfo } from '../composables/use-version-info'
import { useMessageDisplay } from '../composables/use-message-display'
import { useMessageLocation } from '../composables/use-message-location'
import { useChatTools } from '../composables/use-chat-tools'
import { useChatKeyboard } from '../composables/use-chat-keyboard'
import {
  resolveSelectedAttachmentIds,
  useBatchSelection
} from '../composables/use-batch-selection'

const route = useRoute()
const { t, locale } = useI18n()

const footerRef = ref(null)
const inputValue = ref('')
const currentUser = ref('')
const targetUser = ref('')
const pendingRoomCode = ref(null)
const scrollContainer = ref(null)
const messageListRef = ref(null)

const myNickname = ref('')
const groupName = ref('')
const onlineUsers = ref([])
const onlineUsersDrawerVisible = ref(false)
const rooms = ref([])
const roomsLoading = ref(false)
const isLocalAdmin = ref(false)
const conversationsDrawerVisible = ref(false)
const createRoomDialogVisible = ref(false)
const joinRoomDialogVisible = ref(false)
const roomInviteDialogVisible = ref(false)
const inviteRoom = ref(null)
const roomActionLoading = ref(false)
const roomDrafts = new Map()
const activeRoom = computed(() => (
  rooms.value.find((room) => room.id === targetUser.value) || {
    id: targetUser.value,
    name: groupName.value
  }
))
const isPublicTransitStation = computed(() => targetUser.value === 'group_chat')
const isCurrentRoomOwner = computed(() => (
  !isPublicTransitStation.value &&
  (
    activeRoom.value?.role === 'owner' ||
    (!!currentUser.value && activeRoom.value?.ownerId === currentUser.value)
  )
))
const canEditGroupName = computed(() => isCurrentRoomOwner.value)
const canClearServerHistory = computed(() => (
  isPublicTransitStation.value ? isLocalAdmin.value : isCurrentRoomOwner.value
))
const presenceNotices = ref([])
const presenceNoticeTimers = new Map()
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
  historyCursor,
  loadHistory,
  saveMessage: saveMessageToLocal,
  clearHistory: clearLocalHistory,
  removeRoomHistory,
  applyServerHistory,
  resetHistoryCursor,
} = useMessages({ currentUser, targetUser })

const cachePathController = {
  openCachePathEditor,
  useDefaultCachePath,
  confirmChangeCachePath,
}

const handleIncomingMessage = (data) => {
  console.log('收到消息:', data)
  const isRoomMessage = data.receiver === targetUser.value
  const isPrivateMessage = (
    (data.sender === targetUser.value && data.receiver === currentUser.value) ||
    (data.sender === currentUser.value && data.receiver === targetUser.value)
  )

  if (isRoomMessage || isPrivateMessage) {
    const message = { ...data, status: 'success' }
    const index = rawMessages.value.findIndex((item) => item.msgId === message.msgId)

    if (index === -1) {
      rawMessages.value.push(message)
    } else {
      rawMessages.value[index] = message
    }

    if (message.seq) {
      historyCursor.value = message.seq
    }

    saveMessageToLocal(message)
  }
}

const handleHistoryCleared = (data) => {
  const isCurrentRoom = data.roomId === targetUser.value
  const isCurrentPrivate = data.chatType === 'private' && data.targetUser === targetUser.value

  if (!isCurrentRoom && !isCurrentPrivate) return

  clearLocalHistory()
  resetHistoryCursor()
}

const removePresenceNotice = (noticeId) => {
  presenceNotices.value = presenceNotices.value.filter((notice) => notice.id !== noticeId)
  const timer = presenceNoticeTimers.get(noticeId)
  if (timer) clearTimeout(timer)
  presenceNoticeTimers.delete(noticeId)
}

const clearPresenceNotices = () => {
  for (const timer of presenceNoticeTimers.values()) clearTimeout(timer)
  presenceNoticeTimers.clear()
  presenceNotices.value = []
}

const handlePresenceChanged = (data) => {
  if (data.roomId && data.roomId !== targetUser.value) return
  if (!data?.user?.sender || !['online', 'offline'].includes(data.type)) return

  const id = `${data.type}-${data.user.sender}-${data.at || Date.now()}`
  const notice = {
    id,
    type: data.type,
    name: data.user.nickname || data.user.sender.slice(-5)
  }
  presenceNotices.value = [...presenceNotices.value, notice].slice(-20)
  const timer = setTimeout(() => removePresenceNotice(id), 30000)
  presenceNoticeTimers.set(id, timer)

  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  })
}

const {
  socket,
  isConnected,
  connect: connectSocket,
  createRoom,
  joinRoom,
  joinRoomByCode,
  listRooms,
  updateRoomName,
  regenerateRoomCode,
  leaveRoom,
  dissolveRoom,
  requestHistory,
  queryAttachments,
  requestBatchDownload,
  clearServerHistory,
  clearPublicRoomHistory,
} = useSocket({
  currentUser,
  targetUser,
  myNickname,
  activeRoomId: targetUser,
  pendingRoomCode,
  onConnect: (room) => {
    if (room) {
      handleRoomUpdated(room)
      if (room.id === targetUser.value) {
        groupName.value = room.id === 'group_chat' ? '' : room.name
      }
    }
    fetchCachePath()
    loadServerHistory()
    refreshRooms()
  },
  onUserList: (users, roomId) => {
    onlineUsers.value = users
    const activeRoom = rooms.value.find((room) => room.id === (roomId || targetUser.value))
    if (activeRoom) {
      activeRoom.onlineCount = users.filter((user) => user.status === 'ONLINE').length
      rooms.value = [...rooms.value]
    }
  },
  onGroupName: (name) => {
    if (!name) return
    groupName.value = targetUser.value === 'group_chat' ? '' : name
  },
  onMessage: handleIncomingMessage,
  onHistoryCleared: handleHistoryCleared,
  onPresenceChanged: handlePresenceChanged,
  onRoomUpdated: handleRoomUpdated,
  onRoomDeleted: handleRoomDeleted,
  onRoomOwnerChanged: handleRoomOwnerChanged,
  onRoomError: handleRoomError,
})

async function refreshRooms() {
  if (!socket.value?.connected) return

  roomsLoading.value = true
  const result = await listRooms()
  roomsLoading.value = false

  if (result.code !== 0) {
    ElMessage.error(result.message || t('rooms.loadFailed'))
    return
  }

  const nextRooms = result.data.map(normalizeRoom)
  const nextRoomIds = new Set(nextRooms.map((room) => room.id))
  for (const room of rooms.value) {
    if (room.id !== 'group_chat' && !nextRoomIds.has(room.id)) {
      clearRoomLocalState(room.id)
    }
  }

  rooms.value = nextRooms
}

function handleRoomUpdated(room) {
  if (!room?.id) return
  const normalizedRoom = normalizeRoom(room)
  const index = rooms.value.findIndex((item) => item.id === room.id)
  if (index === -1) {
    rooms.value = [...rooms.value, { ...normalizedRoom, onlineCount: 0 }]
  } else {
    rooms.value[index] = { ...rooms.value[index], ...normalizedRoom }
  }

  if (room.id === targetUser.value) {
    groupName.value = room.id === 'group_chat' ? '' : normalizedRoom.name
  }
}

function normalizeRoom(room) {
  if (!room?.id) return room
  const role = room.id === 'group_chat'
    ? 'member'
    : (
      room.role === 'owner' || (!!currentUser.value && room.ownerId === currentUser.value)
        ? 'owner'
        : 'member'
    )

  return { ...room, role }
}

function clearRoomLocalState(roomId) {
  removeRoomHistory(roomId)
  clearRoomState(roomId)
  roomDrafts.delete(roomId)
}

async function handleRoomDeleted(data = {}) {
  const roomId = data.roomId
  if (!roomId) return

  const deletedRoom = rooms.value.find((room) => room.id === roomId)
  const wasCurrentRoom = targetUser.value === roomId

  clearRoomLocalState(roomId)
  rooms.value = rooms.value.filter((room) => room.id !== roomId)
  if (inviteRoom.value?.id === roomId) {
    roomInviteDialogVisible.value = false
    inviteRoom.value = null
  }
  batchDownloadDialogVisible.value = false
  batchAttachments.value = []

  if (wasCurrentRoom) {
    await switchRoom('group_chat')
    roomDrafts.delete(roomId)
    ElMessage.warning(t('rooms.deletedNotice', {
      name: deletedRoom?.name || t('rooms.title')
    }))
  }
}

function handleRoomOwnerChanged(data = {}) {
  const room = rooms.value.find((item) => item.id === data.roomId)
  if (!room || !data.ownerId) return

  room.ownerId = data.ownerId
  room.role = data.ownerId === currentUser.value ? 'owner' : 'member'
  rooms.value = [...rooms.value]

  if (data.ownerId === currentUser.value) {
    ElMessage.info(t('rooms.youAreOwner'))
  }
}

function handleRoomError(result) {
  const message = result?.message || ''
  if (targetUser.value !== 'group_chat' && /room not found/i.test(message)) {
    ElMessage.warning(t('rooms.roomUnavailable'))
    void switchRoom('group_chat')
    return
  }

  ElMessage.error(result?.message || t('rooms.joinFailed'))
}

const openConversationsDrawer = () => {
  conversationsDrawerVisible.value = true
  refreshRooms()
}

const loadServerHistory = async () => {
  if (!socket.value?.connected) return

  const result = await requestHistory({
    requester: currentUser.value,
    roomId: targetUser.value,
    cursor: historyCursor.value,
    limit: 100
  })

  if (result.code !== 0) {
    ElMessage.error(t('chat.historyLoadFailed'))
    return
  }

  applyServerHistory(result.data)
}

const clearServerHistoryForCurrentSession = () => {
  if (isPublicTransitStation.value) {
    return clearPublicRoomHistory()
  }

  return clearServerHistory({
    requester: currentUser.value,
    roomId: targetUser.value
  })
}

const batchDownloadDialogVisible = ref(false)
const batchAttachments = ref([])
const batchAttachmentsLoading = ref(false)
const batchDownloadLoading = ref(false)
const batchSelectionResolving = ref(false)

const openBatchDownloadDialog = async () => {
  batchDownloadDialogVisible.value = true
  batchAttachmentsLoading.value = true

  const result = await queryAttachments({
    requester: currentUser.value,
    roomId: targetUser.value
  })
  batchAttachmentsLoading.value = false

  if (result.code !== 0) {
    ElMessage.error(t('batchDownload.loadFailed'))
    return
  }

  batchAttachments.value = result.data.attachments || []
}

const handleBatchDownload = async (messageIds) => {
  batchDownloadLoading.value = true

  const result = await requestBatchDownload({
    requester: currentUser.value,
    roomId: targetUser.value,
    messageIds
  })
  batchDownloadLoading.value = false

  if (result.code !== 0) {
    ElMessage.error(result.message || t('batchDownload.downloadFailed'))
    return false
  }

  const link = document.createElement('a')
  link.href = result.data.downloadUrl
  link.download = 'ChatTransfer.zip'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  ElMessage.success(t('batchDownload.downloadStarted'))
  batchDownloadDialogVisible.value = false
  return true
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
  handleClearLocalHistory,
  handleClearServerHistory,
  openFeedback,
  openRepository,
} = useChatTools({
  route,
  cachePathController,
  clearLocalHistory,
  clearServerHistory: clearServerHistoryForCurrentSession,
  clearServerHistoryConfirmText: () => (
    isPublicTransitStation.value
      ? t('messages.confirmClearPublicRoomText')
      : t('messages.confirmClearServerHistoryText')
  ),
  t,
  notify: ElMessage,
  alert: ElMessageBox.alert,
  confirm: ElMessageBox.confirm,
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
  clearRoomState,
} = useMessagePin({ targetUser, t, parseFileName })

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
  selectionMode,
  selectedIds,
  selectableItems,
  selectedCount,
  selectableCount,
  selectedTotalSize,
  allSelected,
  someSelected,
  isSelectableMessage,
  enterSelection,
  exitSelection,
  toggleSelection,
  toggleSelectAll,
} = useBatchSelection(bubbleItems, { targetUser })

const {
  qrLoading,
  qrCodeUrl,
  inviteUrl,
  msgQrDialogVisible,
  msgQrCodeUrl,
  msgQrContent,
  showQrCode,
  showItemQrCode,
} = useQrcode({
  targetUser,
  activeRoom,
  t,
  notify: ElMessage
})

const {
  copyItem,
  copyCachePath,
  copyToClipboard,
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

const copyRoomText = async (value, type) => {
  try {
    await copyToClipboard(value)
    ElMessage.success(type === 'code' ? t('rooms.codeCopied') : t('rooms.linkCopied'))
  } catch (error) {
    console.error(error)
    ElMessage.error(t('messages.copyFailed'))
  }
}

const handleRoomInviteCopied = (type) => {
  if (type === 'code') copyRoomText(inviteRoom.value?.code || '', 'code')
  else copyRoomText(inviteUrl.value, 'link')
}

const showRoomInvite = async () => {
  if (
    targetUser.value !== 'group_chat' &&
    (!activeRoom.value?.code || !rooms.value.some((room) => room.id === targetUser.value))
  ) {
    await refreshRooms()
  }
  inviteRoom.value = activeRoom.value
  roomInviteDialogVisible.value = true
  await showQrCode(inviteRoom.value)
}

const handleEditGroupName = () => {
  if (!canEditGroupName.value) return
  openGroupNameEditor()
}

const ensureRoomIsActive = async (room) => {
  if (!room?.id) return false
  if (room.id === targetUser.value) return true
  return switchRoom(room.id)
}

const syncRoomUrl = (room, code = null) => {
  try {
    const url = new URL(window.location.href)
    url.searchParams.delete('receiver')
    url.searchParams.delete('roomId')
    url.searchParams.delete('code')
    url.searchParams.delete('roomName')

    if (!room || room.id === 'group_chat') {
      url.searchParams.set('receiver', 'group_chat')
    } else {
      url.searchParams.set('roomId', room.id)
      const roomCode = code || room.code
      if (roomCode) url.searchParams.set('code', roomCode)
    }

    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  } catch (error) {
    console.error(error)
  }
}

const handleRoomRename = async (room) => {
  if (normalizeRoom(room).role !== 'owner') return
  const activated = await ensureRoomIsActive(room)
  if (activated) handleEditGroupName()
}

const handleLeaveRoom = async (room) => {
  if (!room?.id || room.id === 'group_chat') return

  try {
    await ElMessageBox.confirm(
      t('rooms.leaveConfirm'),
      t('rooms.leaveTitle'),
      {
        confirmButtonText: t('rooms.leave'),
        cancelButtonText: t('messages.confirmCancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  const activated = await ensureRoomIsActive(room)
  if (!activated) return

  const result = await leaveRoom({
    roomId: room.id,
    username: currentUser.value
  })
  if (result.code !== 0) {
    ElMessage.error(result.message || t('rooms.leaveFailed'))
    return
  }

  if (result.data?.dissolved) {
    await handleRoomDeleted({ roomId: room.id })
    return
  }

  const wasCurrentRoom = targetUser.value === room.id
  clearRoomLocalState(room.id)
  rooms.value = rooms.value.filter((item) => item.id !== room.id)
  if (wasCurrentRoom) {
    await switchRoom('group_chat')
    roomDrafts.delete(room.id)
  }
  ElMessage.success(t('rooms.left'))
}

const handleDissolveRoom = async (room) => {
  if (!room?.id || room.id === 'group_chat') return

  try {
    await ElMessageBox.confirm(
      t('rooms.dissolveConfirm'),
      t('rooms.dissolveTitle'),
      {
        confirmButtonText: t('rooms.dissolve'),
        cancelButtonText: t('messages.confirmCancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  const activated = await ensureRoomIsActive(room)
  if (!activated) return

  const result = await dissolveRoom({
    roomId: room.id,
    username: currentUser.value
  })
  if (result.code !== 0) {
    ElMessage.error(result.message || t('rooms.dissolveFailed'))
    return
  }

  await handleRoomDeleted({ roomId: room.id })
}

const switchRoom = async (room, options = {}) => {
  const roomId = typeof room === 'string' ? room : room?.id
  if (!roomId || roomId === targetUser.value) return true

  const previousRoomId = targetUser.value
  roomDrafts.set(previousRoomId, inputValue.value)
  exitSelection()
  targetUser.value = roomId
  inputValue.value = roomDrafts.get(roomId) || ''
  uploadFiles.value = []
  batchDownloadDialogVisible.value = false
  batchAttachments.value = []
  loadHistory()

  const result = await joinRoom({
    roomId,
    code: options.code || null,
    nickname: myNickname.value,
    username: currentUser.value
  })

  if (result.code !== 0) {
    targetUser.value = previousRoomId
    inputValue.value = roomDrafts.get(previousRoomId) || ''
    loadHistory()
    ElMessage.error(result.message || t('rooms.joinFailed'))
    return false
  }

  const joinedRoom = result.data?.room
  if (joinedRoom) handleRoomUpdated(joinedRoom)
  const activeRoomForUrl = joinedRoom || (
    typeof room === 'object' ? room : { id: roomId }
  )
  syncRoomUrl(activeRoomForUrl, options.code || joinedRoom?.code)

  await loadServerHistory()
  await refreshRooms()
  await scrollToBottom()
  return true
}

const handleCreateRoom = async (name) => {
  roomActionLoading.value = true
  const result = await createRoom({ name })
  roomActionLoading.value = false

  if (result.code !== 0) {
    ElMessage.error(result.message || t('rooms.createFailed'))
    return
  }

  const room = normalizeRoom(result.data.room)
  rooms.value = [...rooms.value, { ...room, onlineCount: 0 }]
  createRoomDialogVisible.value = false
  inviteRoom.value = room
  roomInviteDialogVisible.value = true
  await showQrCode(room)
  await switchRoom(room.id)
}

const handleJoinRoomByCode = async (code) => {
  roomActionLoading.value = true
  const result = await joinRoomByCode({ code })
  roomActionLoading.value = false

  if (result.code !== 0) {
    ElMessage.error(result.message || t('rooms.joinFailed'))
    return
  }

  const room = normalizeRoom(result.data.room)
  if (!rooms.value.some((item) => item.id === room.id)) {
    rooms.value = [...rooms.value, { ...room, onlineCount: 0 }]
  }

  joinRoomDialogVisible.value = false
  await switchRoom(room.id)
}

const handleRegenerateRoomCode = async () => {
  if (!inviteRoom.value?.id) return

  roomActionLoading.value = true
  const result = await regenerateRoomCode({ roomId: inviteRoom.value.id })
  roomActionLoading.value = false

  if (result.code !== 0) {
    ElMessage.error(result.message || t('rooms.regenerateFailed'))
    return
  }

  inviteRoom.value = result.data.room
  handleRoomUpdated(result.data.room)
  await showQrCode(inviteRoom.value)
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

const handleSelectedBatchDownload = async () => {
  const selectedItems = selectableItems.value.filter((item) => selectedIds.value.has(item.key))
  if (selectedItems.length === 0) return

  batchSelectionResolving.value = true
  const result = await queryAttachments({
    requester: currentUser.value,
    roomId: targetUser.value
  })
  batchSelectionResolving.value = false

  if (result.code !== 0) {
    ElMessage.error(t('batchDownload.loadFailed'))
    return
  }

  const { messageIds, unresolvedItems } = resolveSelectedAttachmentIds(
    selectedItems,
    result.data.attachments || []
  )

  if (unresolvedItems.length > 0 || messageIds.length === 0) {
    ElMessage.error(t('batchDownload.selectionUnavailable'))
    return
  }

  const downloaded = await handleBatchDownload(messageIds)
  if (downloaded) exitSelection()
}

const handleChatKeydown = (event) => {
  if (selectionMode.value) return
  handleKeydown(event)
}

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

watch(selectionMode, async (active) => {
  if (active) return

  await nextTick()
  footerRef.value?.registerHistoryNavigation?.(handleHistoryKeydown)
})

watch(targetUser, () => clearPresenceNotices())

const { initSession } = useChatSession({
  currentUser,
  targetUser,
  myNickname,
  groupName,
  pendingRoomCode,
  loadHistory,
  connectSocket,
  fetchVersionInfo,
})

onMounted(() => {
  isLocalAdmin.value = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname)
  initSession()
  loadSendHistory()
  document.addEventListener('keydown', handleChatKeydown)
  footerRef.value?.registerHistoryNavigation?.(handleHistoryKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleChatKeydown)
  footerRef.value?.unregisterHistoryNavigation?.(handleHistoryKeydown)
  clearPresenceNotices()
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
