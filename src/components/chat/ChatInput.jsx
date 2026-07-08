import { useState, useRef } from 'react';
import { SendHorizonal, Paperclip, X, Loader2, ImagePlus, Square } from 'lucide-react';

export default function ChatInput({ onSend, sending, disabled, onCancel }) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  function handleSend() {
    const text = input.trim();
    if ((!text && files.length === 0) || sending) return;
    onSend(text, files);
    setInput('');
    setFiles([]);
  }

  return (
    <div className="pb-safe">
      {/* File previews */}
      {files.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 pb-2">
          <div className="flex gap-2 flex-wrap">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs"
                style={{
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <ImagePlus size={12} style={{ color: 'var(--color-accent)' }} />
                <span className="truncate max-w-[120px]">{f.name}</span>
                <button
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: 'var(--color-text-faint)' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="mx-auto max-w-3xl px-4 pb-4">
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2"
          style={{
            background: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              setFiles([...files, ...Array.from(e.target.files)]);
              e.target.value = '';
            }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-2 rounded-xl transition-colors"
            style={{ color: 'var(--color-text-faint)' }}
            title="Attach image"
          >
            <Paperclip size={18} />
          </button>

          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message…"
            className="flex-1 resize-none bg-transparent py-2 text-sm outline-none"
            style={{
              color: 'var(--color-text)',
              maxHeight: '10rem',
              minHeight: '1.5rem',
            }}
          />

          {sending ? (
            <button
              onClick={onCancel}
              className="shrink-0 p-2 rounded-xl transition-all active:scale-95"
              style={{
                background: 'var(--color-danger)',
                color: 'white',
              }}
              title="Stop generating"
            >
              <Square size={18} fill="white" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled}
              className="shrink-0 p-2 rounded-xl transition-all disabled:opacity-30"
              style={{
                background: input.trim() || files.length > 0 ? 'var(--color-accent)' : 'transparent',
                color: input.trim() || files.length > 0 ? 'white' : 'var(--color-text-faint)',
              }}
              title="Send"
            >
              <SendHorizonal size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}