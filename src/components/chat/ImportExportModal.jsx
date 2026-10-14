import { useState, useRef } from 'react';
import { X, Download, Upload, FileJson, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { exportChatToMarkdown, exportChatToJson } from './ExportButton';
import { supabase } from '../../lib/supabase';

export default function ImportExportModal({ chat, messages, session, onCreateRestored, onClose }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null); // { type: 'error'|'success', msg }
  const [busy, setBusy] = useState(false);

  const hasContent = chat && messages?.length > 0;

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!session) {
      setStatus({ type: 'error', msg: 'You must be signed in to import chats.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || data.app !== 'ai-chat' || !Array.isArray(data.messages)) {
        throw new Error('Not a valid ai-chat export file.');
      }
      const c = data.chat || {};
      const { data: newChat, error: chatErr } = await supabase
        .from('chats')
        .insert({
          user_id: session.user.id,
          title: (c.title || 'Imported chat') + ' (imported)',
          model: c.model ?? null,
          system_prompt: c.system_prompt ?? null,
          temperature: c.temperature ?? null,
          top_p: c.top_p ?? null,
        })
        .select()
        .single();
      if (chatErr) throw chatErr;

      const rows = data.messages.map((m) => ({
        chat_id: newChat.id,
        role: m.role,
        content: m.content,
        attachments: m.attachments ?? null,
        model: m.model ?? null,
        usage: m.usage ?? null,
      }));
      if (rows.length > 0) {
        const { error: msgErr } = await supabase.from('messages').insert(rows);
        if (msgErr) throw msgErr;
      }

      setStatus({
        type: 'success',
        msg: `Imported "${newChat.title}" with ${rows.length} message${rows.length === 1 ? '' : 's'}.`,
      });
      onCreateRestored?.(newChat.id);
      setTimeout(() => onClose(), 700);
    } catch (err) {
      setStatus({ type: 'error', msg: err.message || 'Failed to import file.' });
    } finally {
      setBusy(false);
    }
  }

  const box = 'w-full max-w-md rounded-2xl p-6 space-y-5';
  const btn =
    'flex items-center justify-center gap-2 w-full rounded-xl py-2.5 text-sm font-medium transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className={box}
        style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Import / Export Chat</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-faint)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Export */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>Export current chat</h3>
          <div className="flex gap-2">
            <button
              disabled={!hasContent}
              onClick={() => exportChatToJson(chat, messages)}
              className={btn}
              style={{ background: 'var(--color-accent)', color: 'white', opacity: hasContent ? 1 : 0.4 }}
            >
              <FileJson size={16} /> JSON
            </button>
            <button
              disabled={!hasContent}
              onClick={() => exportChatToMarkdown(chat, messages)}
              className={btn}
              style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)' }}
            >
              <FileText size={16} /> Markdown
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>
            JSON preserves full fidelity (model, settings, tokens) so a chat can be restored later.
          </p>
        </div>

        <div className="h-px" style={{ background: 'var(--color-border)' }} />

        {/* Import */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-faint)' }}>Restore from JSON</h3>
          <button
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className={btn}
            style={{ background: 'var(--color-surface-hover)', color: 'var(--color-text)' }}
          >
            <Upload size={16} /> {busy ? 'Importing…' : 'Choose JSON file'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
          {status && (
            <p
              className="text-xs flex items-center gap-1.5"
              style={{ color: status.type === 'error' ? 'var(--color-danger-text)' : 'var(--color-success)' }}
            >
              {status.type === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
              {status.msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
