# AI Chat — Design & Feature Documentation

> Purpose: This document describes everything that is **already built** in this project — the design system, UI patterns, components, and features — so that any new design or feature work stays consistent with the existing implementation.

---

## 1. Product Overview

A personal AI chat application (ChatGPT/Claude-style) built with **React 19 + Vite**, styled with **TailwindCSS v4**, backed by **Supabase** (auth, Postgres, storage), and wrapped for Android via **Capacitor**. It connects to any **OpenAI-compatible** `/chat/completions` endpoint (user supplies their own base URL + API key).

- Web app (deployed via GitHub Pages, base path `/ai-chat/`)
- Android app (Capacitor WebView, `appId: com.mohsinmustufa.aichat`)
- Dark-theme only UI

---

## 2. Design System

### 2.1 Color Tokens (CSS Custom Properties)

Defined in [src/index.css](src/index.css). **Always use these variables — never hardcode hex colors in components** (except within `index.css` itself and the code-highlighting surface `#0d0d0d`).

| Token | Value | Usage |
|---|---|---|
| `--color-surface` | `#171717` | App background, sidebar, header, input bar |
| `--color-surface-alt` | `#1e1e1e` | Cards, modals, assistant bubbles, input fields container |
| `--color-surface-hover` | `#262626` | Hover states, code block headers |
| `--color-surface-active` | `#2a2a2a` | Active/selected states |
| `--color-border` | `#2e2e2e` | Default borders |
| `--color-border-light` | `#3a3a3a` | Dashed borders, subtle separators |
| `--color-text` | `#e5e5e5` | Primary text |
| `--color-text-muted` | `#a3a3a3` | Secondary text |
| `--color-text-faint` | `#737373` | Tertiary/placeholder text, icons |
| `--color-accent` | `#6366f1` (indigo-500) | Primary actions, user bubbles, active states |
| `--color-accent-hover` | `#818cf8` (indigo-400) | Accent text/links on dark |
| `--color-accent-muted` | `#6366f120` | Accent-tinted backgrounds (13% opacity) |
| `--color-user-bubble` | `#6366f1` | User message bubble |
| `--color-user-bubble-text` | `#ffffff` | Text on user bubble |
| `--color-danger` | `#ef4444` | Destructive actions, stop button |
| `--color-danger-muted` | `#ef444420` | Error banner backgrounds |
| `--color-warning` | `#f59e0b` | Warnings |
| `--color-warning-muted` | `#f59e0b15` | Warning backgrounds |
| `--color-success` | `#22c55e` | Success states, "READY" badges |

**Special fixed surfaces:**
- Code blocks: `#0d0d0d` background (both inline and fenced)
- Artifact iframe preview: `#0f172a` (slate-900) background with Tailwind CDN injected

### 2.2 Typography

- Font: system stack (Tailwind default); monospace (`font-mono`) for code, model IDs, kbd hints
- Scale: `text-[10px]`–`text-xs` (labels, badges), `text-sm` (body/messages), `text-base`–`text-lg` (modal titles), `text-xl` (auth brand)
- Message body: `text-sm leading-relaxed`
- Uppercase tracking-wide micro-labels: `text-[10px] font-bold uppercase tracking-wider`

### 2.3 Shape & Spacing

- Border radius: `rounded-xl` (12px) for inputs/buttons/cards, `rounded-2xl` (16px) for bubbles/modals/containers, `rounded-lg` (8px) for avatars/small elements
- Message bubble: `rounded-2xl px-4 py-3`
- Buttons: `p-2 rounded-xl` (icon buttons), `rounded-xl py-2.5` (primary CTAs)
- Content max width: `max-w-3xl`–`max-w-5xl` centered (`mx-auto`) for chat column
- Modal pattern: `fixed inset-0 z-50 flex items-center justify-center p-4` + `rgba(0,0,0,0.7)` overlay

### 2.4 Effects & Motion

- **Glassmorphism utilities** (Phase 6, available in `index.css`): `.glass-surface`, `.glass-surface-alt`, `.glass-accent`, `.glass-user-bubble` — blur + saturate + translucent borders
- Transitions: restricted to `background, border-color, box-shadow` at `0.15s ease` (deliberate perf choice for WebView — **do not add `transition-all` or layout-affecting transitions**)
- Animations in use: `animate-spin` (loaders), `animate-pulse` (web-search globe), `animate-bounce` (scroll badge), `animate-fade-in` (panels), `active:scale-95` (button press)
- Custom scrollbar: 6px, thumb `--color-border-light`, transparent track

### 2.5 Icons

- Library: **lucide-react** exclusively (e.g. `SendHorizonal`, `Paperclip`, `Globe`, `Terminal`, `Sparkles`, `Bot`, `User`, `Copy`, `Check`, `RotateCw`, `Edit3`, `Loader2`)
- Sizes: 12–14px (inline/toolbars), 16–18px (buttons), 20px+ (empty states/brand)
- Capability emoji icons (models): �� text, ��️ vision, �� imageGen, �� speech

### 2.6 Safe Areas (Mobile)

- `.pt-safe` / `.pb-safe` utilities use `env(safe-area-inset-*)`
- `.native-app` overrides enforce minimum padding in WebViews
- Root layout: `flex h-dvh pt-safe overflow-hidden`

---

## 3. Layout Architecture

```
┌──────────────────────────────────────────────────────┐
│ Sidebar (w-72, fixed on mobile, static on md+)       │
│ ┌──────────┬────────────────────────────────────────┐│
│ │ Chats    │ Header (title, export, chat settings,  ││
│ │ list     │  model picker)                         ││
│ │          ├──────────────────────────┬─────────────┤│
│ │ + New    │ MessageList              │ Artifacts   ││
│ │ + Search │  (max-w-5xl, centered)   │ Panel       ││
│ │          │                          │ (50vw/45vw, ││
│ │          │ ChatInput (bottom bar)   │  slide-out) ││
│ ├──────────┴──────────────────────────┴─────────────┤│
│ │ Settings · email · Sign out                       ││
│ └───────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

- Mobile: sidebar slides over content (`z-50` + `rgba(0,0,0,0.6)` backdrop); hamburger in header opens it
- Artifacts panel: split-pane on desktop (`md:flex-row`), stacks below on mobile
- Root: [src/App.jsx](src/App.jsx)

---

## 4. Feature Inventory (Already Built)

### 4.1 Authentication
- Email/password sign-in & sign-up via Supabase Auth — [AuthScreen.jsx](src/components/auth/AuthScreen.jsx)
- Session subscription + auth gate in App; sign-out in sidebar footer
- Brand: indigo `✦` logo tile, "AI Chat / Your personal assistant"

### 4.2 Chat Management
- Create / rename / delete chats, sorted by `created_at` desc — [useChats.js](src/hooks/useChats.js)
- Sidebar list items with inline rename & delete — [ChatListItem.jsx](src/components/chat/ChatListItem.jsx)
- **Auto-titling**: after first exchange, LLM generates ≤4-word title (only if title still "New chat")
- Deleting a chat also deletes its storage files

### 4.3 Messaging
- Streaming responses (SSE, OpenAI `delta.content` format) — [llm.js](src/lib/llm.js)
- Stop/cancel generation mid-stream (AbortController); partial text is saved
- **Edit user message** → deletes subsequent messages, regenerates
- **Regenerate** assistant response
- Copy-to-clipboard per message (with `CheckCheck` confirmation, 2s)
- Markdown rendering with `react-markdown` + `@tailwindcss/typography` (`prose-chat` dark overrides)
- Per-message model name header + avatar (custom model icon → preset Unsplash fallback by provider keyword → `Bot` icon)
- Message caching per chat (`messagesCache` Map), signed-URL caching (`urlCache`) — [useMessages.js](src/hooks/useMessages.js)

### 4.4 Code Blocks & Artifacts
- Syntax highlighting via `react-syntax-highlighter` (Prism `oneDark`, lazy-loaded) — [CodeBlock.jsx](src/components/chat/CodeBlock.jsx)
- Line numbers when >3 lines; copy button with fallback `execCommand`
- **"View Artifact"** button on `html/svg/xml/css/js/ts(x)` blocks → dispatches `view-artifact` event → opens [ArtifactsPanel.jsx](src/components/chat/ArtifactsPanel.jsx)
- Artifacts panel: sandboxed iframe (`sandbox="allow-scripts"`), Tailwind CDN injected, Preview/Code tabs, copy source, auto-Code tab for js/css

### 4.5 File & Image Attachments
- Attach images, PDF, CSV, JSON, TXT via paperclip — [ChatInput.jsx](src/components/chat/ChatInput.jsx)
- Images: downscaled client-side (max 1568px, JPEG 0.85) — [image.js](src/lib/image.js) — uploaded to Supabase Storage bucket `media` (`{uid}/{uuid}.{ext}`), displayed via signed URLs (1h TTL)
- Documents: parsed **client-side** — PDF via PDF.js CDN, CSV → markdown table, JSON prettified — [documentParser.js](src/lib/documentParser.js) — injected into prompt as `[ATTACHED FILE REFERENCE]` blocks
- Attachment tray in input with previews + "READY" badge; file chips in message bubbles

### 4.6 Web Search
- Globe toggle in chat input (accent highlight + pulse when active)
- Providers: Tavily, Serper, or free aggregator (Google News RSS via allorigins proxy + Wikipedia API, run in parallel, top 6 results) — [search.js](src/lib/search.js)
- Results injected into prompt with `[index]` citation instructions; "Searching the web…" loader shown
- Configurable in Settings (provider + API key)

### 4.7 Skills System (Slash Commands)
- Type `/` in input → command palette with keyboard navigation (↑↓ Enter Esc)
- Built-in: `/security-review`, `/refactor` — [skills.js](src/lib/skills.js)
- Custom skills: install from GitHub URL / raw .md / simulated `npx skills add` command / local `.md` (YAML frontmatter) / `.zip` (`manifest.json` + `prompt.txt`)
- Stored in `localStorage` (`ai-chat-skills`); `skills-changed` event syncs UI
- Skill directives injected into system prompt; badge shown on user bubble; persists through regenerate

### 4.8 Settings
- **Global Settings modal** (tabs: "General & Models" / "Skills Center") — [SettingsModal.jsx](src/components/settings/SettingsModal.jsx)
  - Base URL, API key, search provider/key
  - Model manager: add/remove models, display names, set default (star), capability toggles — [ModelManager.jsx](src/components/settings/ModelManager.jsx)
  - Skills installer (CLI-style input + file dropzone + installed list)
- **Per-chat settings** — [ChatSettings.jsx](src/components/chat/ChatSettings.jsx): system prompt, temperature (0–2 slider, default 0.7), top_p (0–1 slider, default 1.0), reset to defaults
- Settings persisted to `localStorage` (`llm-settings`); legacy single-`model` migration supported — [settings.js](src/lib/settings.js)

### 4.9 Model Picker & Capability Warning
- Per-chat model override (stored on chat row; `null` = use default) — [ModelPicker.jsx](src/components/chat/ModelPicker.jsx)
- Capability warning banner suggests switching models when capability mismatch — [CapabilityWarning.jsx](src/components/chat/CapabilityWarning.jsx)

### 4.10 Search (In-App)
- ⌘K modal: debounced (300ms) `ilike` search across chat titles + message content — [SearchModal.jsx](src/components/chat/SearchModal.jsx)
- Highlighted matches, role badges, footer kbd hints

### 4.11 Export & Keyboard Shortcuts
- Export chat — [ExportButton.jsx](src/components/chat/ExportButton.jsx)
- Shortcuts ([useKeyboardShortcuts.js](src/hooks/useKeyboardShortcuts.js)): `⌘K` search · `⌘N` new chat · `⌘,` settings · `⌘E` export · `⌘⇧S` chat settings · `⌘B` toggle sidebar

### 4.12 UX Details Already Implemented
- Smart scroll: auto-scroll on new user message; during streaming only if user is at bottom; floating "New messages below" bounce badge otherwise — [MessageList.jsx](src/components/chat/MessageList.jsx)
- "Thinking…" streaming placeholder with model avatar
- Hover-reveal action toolbars on bubbles (always visible on mobile)
- Textarea auto-height (`field-sizing: content`), max-height 10rem
- Console diagnostics: styled `console.groupCollapsed` logs for LLM payloads, code blocks, skill installs
- PWA shell: `manifest.json`, service worker, icons in `public/`

---

## 5. Data Model (Supabase)

**`chats`**: `id`, `user_id`, `title`, `model` (nullable override), `system_prompt`, `temperature`, `top_p`, `created_at`, `updated_at`

**`messages`**: `id`, `chat_id`, `role` (`user|assistant`), `content`, `attachments` (text[] of storage paths), `created_at`

**Storage bucket `media`**: images, path `{user_id}/{uuid}.{ext}`, signed URLs

**localStorage**: `llm-settings` (baseUrl, apiKey, models[], defaultModelId, searchProvider, searchApiKey), `ai-chat-skills`

---

## 6. Guidelines for New Design Work

1. **Reuse tokens** — all colors via `var(--color-*)`; dark theme only
2. **Match component patterns** — modals (overlay + `rounded-2xl` + `--color-surface-alt`), icon buttons (`p-2 rounded-xl`, `--color-text-faint`), badges (`text-[10px]` uppercase or rounded chips with tinted bg)
3. **Keep transitions cheap** — colors/shadows only, `0.15s ease` (WebView perf)
4. **lucide-react icons only**, sizes 12–20px
5. **Respect safe areas** — `.pt-safe` / `.pb-safe` on top/bottom bars
6. **Max content width** `max-w-5xl mx-auto` for chat-column elements
7. **Accent = indigo** (`#6366f1`); success emerald, danger red, warning amber — no new hues
8. New modals/panels should follow z-index convention (`z-40` backdrop, `z-50` modal/panel)
9. Message-surface code is always on `#0d0d0d`; artifact previews on `#0f172a`
10. Any new chat-column UI must work in both web and Capacitor WebView (no layout-shifting transitions, touch