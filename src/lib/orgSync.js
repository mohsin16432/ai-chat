import { supabase } from './supabase';
import { loadFolders, saveFolders } from './folders';
import { loadPersonas, savePersonas } from './personas';

// Storage RLS on the `media` bucket only permits object paths prefixed with the
// authenticated user's id (same convention the file-upload feature uses: `${uid}/...`).
// Use the same prefix so the upload does not violate row-level security.
const STORAGE_PATH = (uid) => `${uid}/sync/org-data.json`;

// Local-first: localStorage is the source of truth. Supabase Storage (the
// existing `media` bucket) is used as a cross-device mirror so personas and
// folders can be restored on another device without any DB schema change.
async function uploadBlob(session, blob) {
  const { error } = await supabase.storage
    .from('media')
    .upload(STORAGE_PATH(session.user.id), blob, { upsert: true, contentType: 'application/json' });
  if (error) throw error;
}

async function downloadBlob(session) {
  const { data, error } = await supabase.storage
    .from('media')
    .download(STORAGE_PATH(session.user.id));
  if (error) return null;
  if (!data) return null;
  const text = await data.text();
  return JSON.parse(text);
}

export async function pushOrgData(session) {
  if (!session) return { ok: false, reason: 'no-session' };
  try {
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      folders: loadFolders(),
      personas: loadPersonas(),
    };
    await uploadBlob(session, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    return { ok: true, updatedAt: payload.updatedAt };
  } catch (err) {
    return { ok: false, reason: err.message || 'upload-failed' };
  }
}

// Merge remote data into local: local wins on conflict by created_at recency.
function mergeById(localList, remoteList) {
  const map = new Map();
  localList.forEach((item) => map.set(item.id, item));
  remoteList.forEach((item) => {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const localTs = new Date(existing.created_at || 0).getTime();
      const remoteTs = new Date(item.created_at || 0).getTime();
      if (remoteTs > localTs) map.set(item.id, item);
    }
  });
  return [...map.values()];
}

export async function pullOrgData(session) {
  if (!session) return { ok: false, reason: 'no-session' };
  try {
    const remote = await downloadBlob(session);
    if (!remote) return { ok: true, applied: 0 };

    const mergedFolders = mergeById(loadFolders().folders, remote.folders?.folders || []);
    const mergedAssignments = { ...(remote.folders?.assignments || {}) };
    const mergedPersonas = mergeById(loadPersonas(), remote.personas || []);

    saveFolders({ folders: mergedFolders, assignments: mergedAssignments });
    savePersonas(mergedPersonas);
    return { ok: true, applied: mergedFolders.length + mergedPersonas.length };
  } catch (err) {
    return { ok: false, reason: err.message || 'pull-failed' };
  }
}
