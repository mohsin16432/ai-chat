import { supabase } from './supabase'
import { encryptText, decryptText } from './crypto'
import { loadAttachments } from './media'

export async function fetchUserCrypto(userId) {
  const { data, error } = await supabase
    .from('user_crypto')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveUserCrypto(userId, salt, wrappedKey, kekIv) {
  const { error } = await supabase
    .from('user_crypto')
    .insert({ user_id: userId, salt, wrapped_key: wrappedKey, kek_iv: kekIv })
  if (error) throw error
}

export async function listConversations(key) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title_enc, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return Promise.all(
    data.map(async (c) => ({
      id: c.id,
      updated_at: c.updated_at,
      title: await decryptText(key, c.title_enc).catch(() => '(cannot decrypt)'),
    }))
  )
}

export async function createConversation(key, userId, title) {
  const title_enc = await encryptText(key, title)
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title_enc })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function touchConversation(id) {
  await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteConversation(id) {
  const { data: msgs } = await supabase.from('messages').select('id').eq('conversation_id', id)
  const msgIds = (msgs ?? []).map((m) => m.id)
  if (msgIds.length) {
    const { data: media } = await supabase
      .from('media')
      .select('storage_path')
      .in('message_id', msgIds)
    const paths = (media ?? []).map((m) => m.storage_path)
    if (paths.length) await supabase.storage.from('media').remove(paths)
  }
  const { error } = await supabase.from('conversations').delete().eq('id', id)
  if (error) throw error
}

export async function loadMessages(key, conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content_enc, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  const attachments = await loadAttachments(
    key,
    data.map((m) => m.id)
  )
  return Promise.all(
    data.map(async (m) => ({
      role: m.role,
      content: await decryptText(key, m.content_enc).catch(() => '(cannot decrypt)'),
      attachments: attachments[m.id] ?? [],
    }))
  )
}

export async function saveMessage(key, userId, conversationId, role, content) {
  const content_enc = await encryptText(key, content)
  const { data, error } = await supabase
    .from('messages')
    .insert({ user_id: userId, conversation_id: conversationId, role, content_enc })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}