import { getFileExtension } from './use-message-utils'

export const attachmentMediaKey = Symbol('attachment-media')

export function getAttachmentMediaKind(fileName) {
  const extension = getFileExtension(fileName, '').toLowerCase()
  if (['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'opus'].includes(extension)) return 'audio'
  if (['mp4', 'webm', 'mov', 'm4v', 'ogv'].includes(extension)) return 'video'
  return 'file'
}

export function createMediaPlayback() {
  let active = null
  return {
    activate(owner, stop) {
      if (active?.owner !== owner) {
        const previous = active
        active = null
        previous?.stop()
      }
      active = { owner, stop }
    },
    release(owner) {
      if (active?.owner === owner) active = null
    },
    stop() {
      const previous = active
      active = null
      previous?.stop()
    }
  }
}
