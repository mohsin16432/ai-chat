import { Download } from 'lucide-react';

export default function ExportButton({ chat, messages }) {
  function exportChat() {
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

  return (
    <button
      onClick={exportChat}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: 'var(--color-text-faint)' }}
      title="Export as Markdown"
    >
      <Download size={16} />
    </button>
  );
}