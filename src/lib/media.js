import { supabase } from './supabase'
import { encryptBytes, decryptBytes } from './crypto'

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

export async function uploadAttachment(key, userId, messageId, file) {
  const { ciphertext, iv } = await encryptBytes(key, await file.arrayBuffer())
  const path = `${userId}/${crypto.randomUUID()}`
  const { error: upErr } = await supabase.storage
    .from('media')
    .upload(path, new Blob([ciphertext]), { contentType: 'application/octet-stream' })
  if (upErr) throw upErr
  const { error } = await supabase.from('media').insert({
    message_id: messageId,
    user_id: userId,
    storage_path: path,
    mime_type: file.type,
    iv,
  })
  if (error) throw error
}

// Returns { [messageId]: [dataUrl, ...] }
export async function loadAttachments(key, messageIds) {
  if (!messageIds.length) return {}
  const { data, error } = await supabase
    .from('media')
    .select('message_id, storage_path, mime_type, iv')
    .in('message_id', messageIds)
  if (error) throw error
  const byMessage = {}
  await Promise.all(
    data.map(async (m) => {
      const { data: blob, error: dlErr } = await supabase.storage
        .from('media')
        .download(m.storage_path)
      if (dlErr) return
      try {
        const pt = await decryptBytes(key, await blob.arrayBuffer(), m.iv)
        const url = await blobToDataUrl(new Blob([pt], { type: m.mime_type }))
        ;(byMessage[m.message_id] ??= []).push(url)
      } catch {
        // undecryptable file: skip rather than break the whole conversation
      }
    })
  )
  return byMessage
}