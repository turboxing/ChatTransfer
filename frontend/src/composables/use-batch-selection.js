import { computed, ref, watch } from 'vue'

export const isSelectableAttachment = (item) => (
  (item?.rawType === 'FILE' || item?.rawType === 'IMAGE') &&
  item?.status === 'success' &&
  Boolean(item?.fileUrl) &&
  typeof item?.key === 'string' &&
  item.key.length > 0
)

const normalizeFileUrl = (value) => {
  if (!value) return ''

  try {
    return new URL(String(value), 'http://chattransfer.local').pathname
  } catch (error) {
    return String(value).split('?')[0]
  }
}

export function resolveSelectedAttachmentIds(selectedItems, attachments) {
  const attachmentsById = new Map(
    attachments.map((attachment) => [attachment.msgId, attachment])
  )
  const attachmentsByUrl = new Map(
    attachments
      .filter((attachment) => attachment.fileUrl)
      .map((attachment) => [normalizeFileUrl(attachment.fileUrl), attachment])
  )
  const attachmentsBySignature = new Map()

  attachments.forEach((attachment) => {
    const signature = `${attachment.fileName || ''}|${Number(attachment.fileSize) || 0}`
    const matchingAttachments = attachmentsBySignature.get(signature) || []
    matchingAttachments.push(attachment)
    attachmentsBySignature.set(signature, matchingAttachments)
  })

  const messageIds = []
  const unresolvedItems = []

  selectedItems.forEach((item) => {
    const directMatch = attachmentsById.get(item.key)
    const urlMatch = attachmentsByUrl.get(normalizeFileUrl(item.fileUrl))
    const signature = `${item.fileName || ''}|${Number(item.fileSize) || 0}`
    const signatureMatches = attachmentsBySignature.get(signature) || []
    const resolvedAttachment = directMatch || urlMatch || (
      signatureMatches.length === 1 ? signatureMatches[0] : null
    )

    if (resolvedAttachment) {
      messageIds.push(resolvedAttachment.msgId)
    } else {
      unresolvedItems.push(item)
    }
  })

  return {
    messageIds: [...new Set(messageIds)],
    unresolvedItems
  }
}

export function useBatchSelection(items, { targetUser } = {}) {
  const selectionMode = ref(false)
  const selectedIds = ref(new Set())

  const selectableItems = computed(() => (
    items.value.filter(isSelectableAttachment)
  ))

  const selectableIdSet = computed(() => new Set(
    selectableItems.value.map((item) => item.key)
  ))

  const selectedCount = computed(() => selectedIds.value.size)
  const selectableCount = computed(() => selectableItems.value.length)

  const selectedTotalSize = computed(() => (
    selectableItems.value.reduce((total, item) => (
      selectedIds.value.has(item.key)
        ? total + (Number(item.fileSize) || 0)
        : total
    ), 0)
  ))

  const allSelected = computed(() => (
    selectableCount.value > 0 &&
    selectedCount.value === selectableCount.value
  ))

  const someSelected = computed(() => (
    selectedCount.value > 0 && !allSelected.value
  ))

  const isSelected = (item) => selectedIds.value.has(item?.key)

  const enterSelection = (item) => {
    if (!isSelectableAttachment(item)) return

    selectionMode.value = true
    selectedIds.value = new Set([item.key])
  }

  const exitSelection = () => {
    selectionMode.value = false
    selectedIds.value = new Set()
  }

  const toggleSelection = (item) => {
    if (!isSelectableAttachment(item)) return

    const nextSelectedIds = new Set(selectedIds.value)
    if (nextSelectedIds.has(item.key)) {
      nextSelectedIds.delete(item.key)
    } else {
      nextSelectedIds.add(item.key)
    }
    selectedIds.value = nextSelectedIds
  }

  const toggleSelectAll = (selected) => {
    selectedIds.value = selected
      ? new Set(selectableItems.value.map((item) => item.key))
      : new Set()
  }

  watch(selectableIdSet, (availableIds) => {
    if (!selectionMode.value) return

    const nextSelectedIds = new Set(
      [...selectedIds.value].filter((id) => availableIds.has(id))
    )

    if (nextSelectedIds.size !== selectedIds.value.size) {
      selectedIds.value = nextSelectedIds
    }
  })

  if (targetUser) {
    watch(targetUser, () => {
      if (selectionMode.value) exitSelection()
    })
  }

  return {
    selectionMode,
    selectedIds,
    selectableItems,
    selectedCount,
    selectableCount,
    selectedTotalSize,
    allSelected,
    someSelected,
    isSelectableMessage: isSelectableAttachment,
    isSelected,
    enterSelection,
    exitSelection,
    toggleSelection,
    toggleSelectAll
  }
}
