import { Download } from 'lucide-react';

export function exportChatToJson(chat, messages) {
  if (!chat || messages.length === 0) return;
  const payload = {
    app: 'ai-chat',
    version: 1,
    exportedAt: new Date().toISOString(),
    chat: {
      id: chat.id,
      title: chat.title || '',
      model: chat.model ?? null,
      system_prompt: chat.system_prompt ?? null,
      temperature: chat.temperature ?? null,
      top_p: chat.top_p ?? null,
    },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      attachments: m.attachments ?? null,
      model: m.model ?? null,
      usage: m.usage ?? null,
      created_at: m.created_at ?? null,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(chat.title || 'chat').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase() || 'chat'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportChatToMarkdown(chat, messages) {
  if (!chat || messages.length === 0) return;

  let md = `# ${chat.title || 'Chat'}\n\n`;
  md += `*Exported: ${new Date().toLocaleString()}*\n\n`;

  if (chat.system_prompt) {
    md += `> **System Prompt:** ${chat.system_prompt}\n\n`;
  }

  md += `---\n\n`;

  messages.forEach((m) => {
    const label = m.role === 'user' ? '**You**' : '**Assistant**';
    md += `### ${label}\n\n`;
    md += `${m.content}\n\n`;

    if (m.attachments && m.attachments.length > 0) {
      md += `*[${m.attachments.length} image(s) attached]*\n\n`;
    }

    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(chat.title || 'chat').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportButton({ chat, messages }) {
  return (
    <button
      onClick={() => exportChatToMarkdown(chat, messages)}
      className="p-2 rounded-xl transition-colors poe-control"
      style={{ color: 'var(--color-text-muted)' }}
      title="Export as Markdown"
    >
      <Download size={16} />
    </button>
  );
}
