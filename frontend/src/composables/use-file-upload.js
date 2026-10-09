import { computed, ref } from 'vue'

export function useFileUpload({ currentUser, targetUser, rawMessages, saveMessage, emitMessage, scrollToBottom, t, notify }) {
  const uploadFiles = ref([])
  const chatContainerRef = ref(null)
  const lastUploadTime = ref(0)
  const uploadFileKeys = new Set()
  const isUploadingCount = ref(0)
  const isUploading = computed(() => isUploadingCount.value > 0)

  const getDragTarget = () => {
    return chatContainerRef.value ? chatContainerRef.value : document.body
  }

  const beforeUpload = (file) => {
    console.log('before upload:', file)
  }

  const removeUploadCard = (item) => {
    uploadFiles.value = uploadFiles.value.filter((file) => file.id !== item.id)
  }

  const uploadFile = async (file) => {
    isUploadingCount.value += 1

    const tempMsgId = Date.now().toString() + Math.random().toString(36).substring(2, 9)
    const tempMessage = {
      msgId: tempMsgId,
      sender: currentUser.value,
      receiver: targetUser.value,
      msgType: 'FILE',
      fileName: file.name,
      fileSize: file.size,
      time: new Date().toLocaleString(),
      status: 'uploading',
      uploadProgress: 0,
      rawFile: file
    }

    rawMessages.value.push(tempMessage)
    scrollToBottom()

    try {
      const result = await uploadToServer(file, (percent) => {
        const index = rawMessages.value.findIndex((message) => message.msgId === tempMsgId)
        if (index !== -1) rawMessages.value[index].uploadProgress = percent
      })

      if (result.code !== 0) {
        notify?.error(t('chat.uploadRequestFailed'))
        markFailed(tempMsgId)
        return
      }

      const { mimetype, fileUrl, size } = result.data
      const messageData = {
        sender: currentUser.value,
        receiver: targetUser.value,
        msgType: mimetype.includes('image') ? 'IMAGE' : 'FILE',
        fileUrl,
        fileType: mimetype,
        fileName: file.name,
        fileSize: size,
        visitorId: window.chat_visitor_id
      }

      emitMessage(messageData)

      const index = rawMessages.value.findIndex((message) => message.msgId === tempMsgId)
      if (index !== -1) {
        const savedMessage = {
          ...rawMessages.value[index],
          ...messageData,
          status: 'success'
        }
        rawMessages.value[index] = savedMessage
        saveMessage(savedMessage)
      }
    } catch {
      notify?.error(t('chat.uploadRequestError'))
      markFailed(tempMsgId)
    } finally {
      isUploadingCount.value -= 1
    }
  }

  function uploadToServer(file, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      const xhr = new XMLHttpRequest()

      formData.append('fileObj', file)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100))
        }
      }
      xhr.onload = () => {
        if (xhr.status !== 200) {
          reject(new Error('Upload failed'))
          return
        }
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch (error) {
          reject(error)
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.open('POST', '/uploadFile')
      xhr.send(formData)
    })
  }

  function markFailed(tempMsgId) {
    const index = rawMessages.value.findIndex((message) => message.msgId === tempMsgId)
    if (index !== -1) rawMessages.value[index].status = 'failed'
  }

  const handleUploadDrop = async (files) => {
    const now = Date.now()
    if (now - lastUploadTime.value < 500) {
      console.log('Ignoring duplicate upload-drop event')
      return
    }
    lastUploadTime.value = now

    if (!files || files.length === 0) return

    if (files[0].type === '') {
      notify?.error(t('chat.folderUploadNotAllowed'))
      return
    }

    for (const file of files) {
      const fileKey = `${file.name}-${file.size}`
      if (uploadFileKeys.has(fileKey)) {
        console.log('Skipping duplicate file:', file.name)
        continue
      }
      uploadFileKeys.add(fileKey)
      await uploadFile(file)
    }
    uploadFileKeys.clear()
  }

  const handleFileSelect = (event) => {
    const files = event.target.files
    if (files) {
      for (const file of files) uploadFile(file)
    }
    event.target.value = ''
  }

  const handlePasteFile = (file) => {
    uploadFile(file)
  }

  return {
    uploadFiles,
    chatContainerRef,
    isUploading,
    getDragTarget,
    beforeUpload,
    removeUploadCard,
    uploadFile,
    handleUploadDrop,
    handleFileSelect,
    handlePasteFile
  }
}
