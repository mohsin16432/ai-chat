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

export function loadSkills() {
  const stored = localStorage.getItem(SKILLS_STORAGE_KEY);
  if (!stored) return DEFAULT_SKILLS;
  try {
    const parsed = JSON.parse(stored);
    const merged = [...DEFAULT_SKILLS];
    parsed.forEach(custom => {
      if (!merged.some(m => m.id === custom.id || m.command === custom.command)) {
        merged.push(custom);
      }
    });
    return merged;
  } catch (e) {
    console.warn('Error loading custom skills:', e);
    return DEFAULT_SKILLS;
  }
}

/**
 * Robust frontmatter parser supporting multiline YAML blocks.
 */
export function parseMarkdownSkill(text, filename = '') {
  const trimmed = text.trim();
  const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid format. Metadata should be wrapped in '---' frontmatter.");
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
    if (isBlockMode) {
      if (line.trim() === '' || /^\s+/.test(line)) {
        blockBuffer.push(line.trim());
        continue;
      } else {
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
        currentKey = key;
        isBlockMode = true;
        blockBuffer = [];
      } else {
        metadata[key] = val.replace(/^["']|["']$/g, '');
      }
    }
  }
  if (isBlockMode && currentKey) {
    metadata[currentKey] = blockBuffer.join(' ');
  }

  let name = metadata.name || '';
  if (!name && filename) {
    const baseName = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
    name = baseName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  let command = metadata.command || '';
  if (!command && name) {
    command = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  }
  if (!command) command = `skill-${Date.now()}`;
  if (!name) name = command;

  return {
    id: metadata.id || `custom-${command}-${Date.now()}`,
    name,
    command: command.toLowerCase().replace(/\s+/g, '-'),
    description: metadata.description || 'No description provided.',
    systemPrompt,
    isCustom: true
  };
}

/**
 * Fetch raw text from a URL, returns null on failure (used for path probing).
 */
async function tryFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Use GitHub Contents API to list directory contents.
 */
async function listGitHubDir(owner, repo, path = '') {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return await res.json();
}

/**
 * Recursively discover all .md skill files inside a GitHub repo directory.
 */
async function discoverSkillFiles(owner, repo, dirPath, depth = 0) {
  if (depth > 3) return []; // Prevent infinite recursion
  const items = await listGitHubDir(owner, repo, dirPath);
  const results = [];

  for (const item of items) {
    if (item.type === 'file' && item.name.toLowerCase().endsWith('.md')) {
      results.push({ name: item.name, downloadUrl: item.download_url, path: item.path });
    } else if (item.type === 'dir') {
      const nested = await discoverSkillFiles(owner, repo, item.path, depth + 1);
      results.push(...nested);
    }
  }
  return results;
}

/**
 * Main remote installer. Returns an array of parsed skills.
 */
export async function downloadSkillFromRemote(inputString) {
  const cleanInput = inputString.trim();
  let owner = '';
  let repo = '';
  let skillName = '';
  let directRawUrl = '';

  // Case A: Direct raw GitHub URL
  if (cleanInput.startsWith('https://raw.githubusercontent.com/') && cleanInput.endsWith('.md')) {
    directRawUrl = cleanInput;
  }
  // Case B: GitHub blob URL
  else if (cleanInput.startsWith('https://github.com/') && cleanInput.includes('/blob/') && cleanInput.endsWith('.md')) {
    directRawUrl = cleanInput
      .replace('https://github.com/', 'https://raw.githubusercontent.com/')
      .replace('/blob/', '/');
  }
  // Case C: NPX command with --skill
  else if (cleanInput.includes('skills add') || cleanInput.includes('skill add')) {
    const skillParamMatch = cleanInput.match(/--skill\s+([^\s]+)/);
    const repoMatch = cleanInput.match(/https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)/);
    if (!repoMatch) throw new Error("Could not parse GitHub repository URL from command.");
    owner = repoMatch[1];
    repo = repoMatch[2].replace(/\.git$/, '');
    if (skillParamMatch) skillName = skillParamMatch[1].replace(/\.md$/, '');
  }
  // Case D: Plain GitHub repo URL (bulk install all skills)
  else if (cleanInput.startsWith('https://github.com/')) {
    const repoMatch = cleanInput.match(/https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)/);
    if (!repoMatch) throw new Error("Could not parse GitHub repository URL.");
    owner = repoMatch[1];
    repo = repoMatch[2].replace(/\.git$/, '');
  }
  else {
    throw new Error("Unrecognized format. Paste a GitHub repo URL, raw .md URL, or NPX command.");
  }

  // Direct URL fetch
  if (directRawUrl) {
    const text = await tryFetch(directRawUrl);
    if (!text) throw new Error(`Failed to download: ${directRawUrl}`);
    const filename = directRawUrl.split('/').pop() || 'skill.md';
    return [parseMarkdownSkill(text, filename)];
  }

  // Single skill install: try multiple path patterns
  if (skillName) {
    const branches = ['main', 'master'];
    const patterns = [
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/skills/${skillName}/SKILL.md`,
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/skills/${skillName}/skill.md`,
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/skills/${skillName}/${skillName}.md`,
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/skills/${skillName}.md`,
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${skillName}/SKILL.md`,
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${skillName}/skill.md`,
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${skillName}/${skillName}.md`,
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${skillName}.md`,
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/prompts/${skillName}/SKILL.md`,
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/prompts/${skillName}.md`,
      (b) => `https://raw.githubusercontent.com/${owner}/${repo}/${b}/prompts/${skillName}/${skillName}.md`,
    ];

    for (const branch of branches) {
      for (const patternFn of patterns) {
        const url = patternFn(branch);
        const text = await tryFetch(url);
        if (text && text.includes('---')) {
          console.log(`%c✅ Found skill at: ${url}`, 'color: #10b981; font-weight: bold;');
          return [parseMarkdownSkill(text, `${skillName}.md`)];
        }
      }
    }
    throw new Error(`Skill "${skillName}" not found in repository ${owner}/${repo}. Try installing without --skill to discover available skills.`);
  }

  // Bulk install: discover all skills in the repo using GitHub Contents API
  console.log(`%c🔍 Scanning repository ${owner}/${repo} for skills...`, 'color: #3b82f6; font-weight: bold;');

  // First, detect default branch
  let defaultBranch = 'main';
  try {
    const repoInfo = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (repoInfo.ok) {
      const info = await repoInfo.json();
      defaultBranch = info.default_branch || 'main';
    }
  } catch {}

  // Discover all .md files recursively
  const allFiles = await discoverSkillFiles(owner, repo, '');
  
  if (allFiles.length === 0) {
    throw new Error(`No Markdown skill files found in repository ${owner}/${repo}.`);
  }

  console.log(`%c📦 Found ${allFiles.length} potential skill file(s). Parsing...`, 'color: #f59e0b; font-weight: bold;');

  const parsedSkills = [];
  for (const file of allFiles) {
    try {
      const text = await tryFetch(file.downloadUrl);
      if (text && text.includes('---')) {
        const skill = parseMarkdownSkill(text, file.name);
        parsedSkills.push(skill);
        console.log(`%c  ✅ Parsed: /${skill.command} (${file.path})`, 'color: #10b981;');
      }
    } catch (err) {
      console.warn(`  ⚠️ Skipped ${file.path}: ${err.message}`);
    }
  }

  if (parsedSkills.length === 0) {
    throw new Error(`Found ${allFiles.length} .md file(s) but none contained valid skill frontmatter.`);
  }

  return parsedSkills;
}

/**
 * Dynamically unzips a skill file.
 */
export async function parseZipFile(arrayBuffer) {
  const fflate = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/lib/browser.module.js');
  const decompressed = fflate.unzipSync(new Uint8Array(arrayBuffer));
  const decoder = new TextDecoder();
  let manifestData = null;
  let systemPrompt = '';
  for (const filename in decompressed) {
    if (filename.endsWith('manifest.json')) {
      manifestData = JSON.parse(decoder.decode(decompressed[filename]));
    } else if (filename.endsWith('prompt.txt') || filename.endsWith('prompt.md')) {
      systemPrompt = decoder.decode(decompressed[filename]).trim();
    }
  }
  if (!manifestData || !manifestData.command) throw new Error("ZIP must contain 'manifest.json' with a 'command' value.");
  if (!systemPrompt) throw new Error("ZIP must contain 'prompt.txt' or 'prompt.md'.");
  return {
    id: manifestData.id || `custom-${manifestData.command}-${Date.now()}`,
    name: manifestData.name || manifestData.command,
    command: manifestData.command.toLowerCase().replace(/\s+/g, '-'),
    description: manifestData.description || 'No description provided.',
    systemPrompt,
    isCustom: true
  };
}

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

export function saveCustomSkills(skillsArray) {
  let current = loadSkills();
  for (const skill of skillsArray) {
    current = saveCustomSkill(skill);
  }
  return current;
}

export function deleteCustomSkill(id) {
  const current = loadSkills();
  const customOnly = current.filter(s => !DEFAULT_SKILLS.some(d => d.id === s.id) && s.id !== id);
  localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(customOnly));
  window.dispatchEvent(new CustomEvent('skills-changed'));
  return loadSkills();
}