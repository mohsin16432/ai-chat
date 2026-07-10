// Default pre-installed system skills
export const DEFAULT_SKILLS = [
  {
    id: 'security-review',
    name: 'Security Analyst',
    command: 'security-review',
    description: 'Analyze code implementations for potential vulnerabilities and exploits.',
    systemPrompt: 'You are an elite cybersecurity engineer and penetration tester. Review the provided code blocks or text carefully. Identify security issues, memory leaks, OWASP vulnerabilities, and architectural risks, then provide clear, actionable remediation blocks.'
  },
  {
    id: 'code-refactor',
    name: 'Refactoring Wizard',
    command: 'refactor',
    description: 'Refactor complex code configurations for optimal performance and readability.',
    systemPrompt: 'You are a staff software engineer specialized in code optimization. Analyze the provided code. Provide an optimized, clean, idiomatic version with structural improvements, explaining precisely why your changes improve performance, maintainability, or design patterns.'
  }
];

const SKILLS_STORAGE_KEY = 'ai-chat-skills';

/**
 * Load all custom & system preinstalled skills.
 */
export function loadSkills() {
  const stored = localStorage.getItem(SKILLS_STORAGE_KEY);
  if (!stored) {
    return DEFAULT_SKILLS;
  }
  try {
    const parsed = JSON.parse(stored);
    const merged = [...DEFAULT_SKILLS];
    parsed.forEach(custom => {
      // Prevent custom uploaded skills from being overwritten by preinstalled keys
      if (!merged.some(m => m.id === custom.id || m.command === custom.command)) {
        merged.push(custom);
      }
    });
    return merged;
  } catch (e) {
    console.warn('Error loading custom skills, falling back to defaults:', e);
    return DEFAULT_SKILLS;
  }
}

/**
 * Robust Client-Side frontmatter parser.
 * Safely handles single-line key-values, multiline descriptions, and fallback generations.
 */
export function parseMarkdownSkill(text, filename = '') {
  const trimmed = text.trim();
  const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid format. Metadata should be wrapped in '---' frontmatter at the top of your Markdown file.");
  }

  const yamlSection = match[1];
  const systemPrompt = match[2].trim();
  
  const metadata = {};
  const lines = yamlSection.split(/\r?\n/);
  
  let currentKey = null;
  let blockBuffer = [];
  let isBlockMode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle indented block lines (multiline description parser)
    if (isBlockMode) {
      if (line.trim() === '' || /^\s+/.test(line)) {
        blockBuffer.push(line.trim());
        continue;
      } else {
        // Indentation ended, compile the multiline block
        metadata[currentKey] = blockBuffer.join(' ');
        isBlockMode = false;
        blockBuffer = [];
        currentKey = null;
      }
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      const key = line.substring(0, colonIdx).trim().toLowerCase();
      const val = line.substring(colonIdx + 1).trim();

      if (val === '>' || val === '|') {
        // Trigger multiline capture mode
        currentKey = key;
        isBlockMode = true;
        blockBuffer = [];
      } else {
        metadata[key] = val.replace(/^["']|["']$/g, '');
      }
    }
  }

  // Flush any remaining uncompiled block buffers
  if (isBlockMode && currentKey) {
    metadata[currentKey] = blockBuffer.join(' ');
  }

  // Fallback 1: Extract the Name
  let name = metadata.name || '';
  if (!name && filename) {
    // Generate clean capitalization from filename
    const baseName = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
    name = baseName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  // Fallback 2: Generate the Command trigger slug
  let command = metadata.command || '';
  if (!command && name) {
    command = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }

  // Final fallbacks
  if (!command) {
    command = `skill-${Date.now()}`;
  }
  if (!name) {
    name = command;
  }

  return {
    id: metadata.id || `custom-${command}-${Date.now()}`,
    name: name,
    command: command.toLowerCase().replace(/\s+/g, '-'),
    description: metadata.description || 'No description provided.',
    systemPrompt,
    isCustom: true
  };
}

/**
 * Dynamically unzips a skill file using fflate via a dynamic ESM import
 */
export async function parseZipFile(arrayBuffer) {
  const fflate = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/lib/browser.module.js');
  const decompressed = fflate.unzipSync(new Uint8Array(arrayBuffer));
  const decoder = new TextDecoder();
  
  let manifestData = null;
  let systemPrompt = '';

  for (const filename in decompressed) {
    if (filename.endsWith('manifest.json')) {
      const text = decoder.decode(decompressed[filename]);
      manifestData = JSON.parse(text);
    } else if (filename.endsWith('prompt.txt') || filename.endsWith('prompt.md')) {
      systemPrompt = decoder.decode(decompressed[filename]).trim();
    }
  }

  if (!manifestData || !manifestData.command) {
    throw new Error("ZIP file must contain a 'manifest.json' file with at least a 'command' value.");
  }
  if (!systemPrompt) {
    throw new Error("ZIP file must contain a 'prompt.txt' or 'prompt.md' instruction text file.");
  }

  return {
    id: manifestData.id || `custom-${manifestData.command}-${Date.now()}`,
    name: manifestData.name || manifestData.command,
    command: manifestData.command.toLowerCase().replace(/\s+/g, '-'),
    description: manifestData.description || 'No description provided.',
    systemPrompt,
    isCustom: true
  };
}

/**
 * Save user custom skill configurations and dispatch change event.
 */
export function saveCustomSkill(skill) {
  const current = loadSkills();
  const customOnly = current.filter(s => !DEFAULT_SKILLS.some(d => d.id === s.id));
  
  const index = customOnly.findIndex(s => s.id === skill.id || s.command === skill.command);
  if (index >= 0) {
    customOnly[index] = { ...skill, isCustom: true };
  } else {
    customOnly.push({ ...skill, isCustom: true });
  }
  
  localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(customOnly));
  window.dispatchEvent(new CustomEvent('skills-changed'));
  return loadSkills();
}

/**
 * Delete a custom skill from storage and dispatch change event.
 */
export function deleteCustomSkill(id) {
  const current = loadSkills();
  const customOnly = current.filter(s => !DEFAULT_SKILLS.some(d => d.id === s.id) && s.id !== id);
  localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(customOnly));
  window.dispatchEvent(new CustomEvent('skills-changed'));
  return loadSkills();
}