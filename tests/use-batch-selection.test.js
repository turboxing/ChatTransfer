import { computed, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  isSelectableAttachment,
  resolveSelectedAttachmentIds,
  useBatchSelection
} from '../frontend/src/composables/use-batch-selection'

const createItems = () => [
  { key: 'file-a', rawType: 'FILE', status: 'success', fileUrl: '/files/a.txt', fileSize: 10 },
  { key: 'image-b', rawType: 'IMAGE', status: 'success', fileUrl: '/files/b.png', fileSize: 20 },
  { key: 'file-c', rawType: 'FILE', status: 'uploading', fileUrl: '/files/c.txt', fileSize: 30 },
  { key: 'text-d', rawType: 'TEXT', status: 'success', fileSize: 40 }
]

describe('useBatchSelection', () => {
  it('resolves local temporary message IDs to server attachment IDs', () => {
    const selectedItems = [
      { key: 'server-id', fileUrl: '/files/a.txt', fileName: 'a.txt', fileSize: 10 },
      { key: 'temporary-id', fileUrl: 'http://localhost:55556/files/b.txt', fileName: 'b.txt', fileSize: 20 },
      { key: 'unknown-id', fileUrl: '/files/missing.txt', fileName: 'missing.txt', fileSize: 30 }
    ]
    const attachments = [
      { msgId: 'server-id', fileUrl: '/files/a.txt', fileName: 'a.txt', fileSize: 10 },
      { msgId: 'server-b-id', fileUrl: '/files/b.txt', fileName: 'b.txt', fileSize: 20 }
    ]

    const result = resolveSelectedAttachmentIds(selectedItems, attachments)

    expect(result.messageIds).toEqual(['server-id', 'server-b-id'])
    expect(result.unresolvedItems.map((item) => item.key)).toEqual(['unknown-id'])
  })

  it('only treats successful file and image messages as selectable', () => {
    const [file, image, uploading, text] = createItems()

    expect(isSelectableAttachment(file)).toBe(true)
    expect(isSelectableAttachment(image)).toBe(true)
    expect(isSelectableAttachment(uploading)).toBe(false)
    expect(isSelectableAttachment(text)).toBe(false)
  })

  it('enters selection mode with the current attachment and toggles selections', () => {
    const items = ref(createItems())
    const selection = useBatchSelection(computed(() => items.value))

    expect(selection.isSelectableMessage(items.value[0])).toBe(true)
    expect(selection.isSelectableMessage(items.value[2])).toBe(false)

    selection.enterSelection(items.value[0])

    expect(selection.selectionMode.value).toBe(true)
    expect([...selection.selectedIds.value]).toEqual(['file-a'])

    selection.toggleSelection(items.value[1])
    expect(selection.selectedCount.value).toBe(2)
    expect(selection.selectedTotalSize.value).toBe(30)

    selection.toggleSelection(items.value[0])
    expect([...selection.selectedIds.value]).toEqual(['image-b'])

    selection.toggleSelection(items.value[2])
    expect([...selection.selectedIds.value]).toEqual(['image-b'])
  })

  it('selects all available attachments and exposes partial selection state', () => {
    const items = ref(createItems())
    const selection = useBatchSelection(computed(() => items.value))

    selection.enterSelection(items.value[0])
    expect(selection.someSelected.value).toBe(true)

    selection.toggleSelectAll(true)
    expect(selection.allSelected.value).toBe(true)
    expect(selection.selectedCount.value).toBe(2)
    expect(selection.selectedTotalSize.value).toBe(30)

    selection.toggleSelection(items.value[1])
    expect(selection.someSelected.value).toBe(true)
    expect(selection.allSelected.value).toBe(false)
  })

  it('drops selections that are no longer available and exits on chat change', async () => {
    const items = ref(createItems())
    const targetUser = ref('group_chat')
    const selection = useBatchSelection(computed(() => items.value), { targetUser })

    selection.enterSelection(items.value[0])
    selection.toggleSelection(items.value[1])

    items.value = [items.value[1]]
    await nextTick()
    expect([...selection.selectedIds.value]).toEqual(['image-b'])

    targetUser.value = 'user-b'
    await nextTick()
    expect(selection.selectionMode.value).toBe(false)
    expect(selection.selectedCount.value).toBe(0)
  })
})
