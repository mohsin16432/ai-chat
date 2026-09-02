import{r as e}from"./rolldown-runtime-hePW80VL.js";import{f as t,p as n}from"./markdown-parser-BEGTKu4_.js";import{$ as r,E as i,L as a,Z as o,t as s,tt as c}from"./react-core-BU8aj2IZ.js";var l=e(n(),1),u=t();function d({artifact:e,onClose:t}){let[n,d]=(0,l.useState)(`preview`),[f,p]=(0,l.useState)(!1),m=(0,l.useRef)(null);(0,l.useEffect)(()=>{e.language===`javascript`||e.language===`css`?d(`code`):d(`preview`)},[e]);let h=()=>{let t=e.code;return e.language===`svg`||t.trim().startsWith(`<svg`)?`
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                margin: 0;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: #0f172a;
              }
              svg {
                max-width: 90%;
                max-height: 90vh;
                height: auto;
              }
            </style>
          </head>
          <body>
            ${t}
          </body>
        </html>
      `:`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"><\/script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    accent: '#6366f1',
                  }
                }
              }
            }
          <\/script>
          <style>
            body {
              margin: 0;
              padding: 1.5rem;
              font-family: ui-sans-serif, system-ui, sans-serif;
              background-color: #0f172a;
              color: #f1f5f9;
            }
            /* Custom Scrollbar */
            ::-webkit-scrollbar {
              width: 6px;
              height: 6px;
            }
            ::-webkit-scrollbar-track {
              background: #1e293b;
            }
            ::-webkit-scrollbar-thumb {
              background: #475569;
              border-radius: 9999px;
            }
          </style>
        </head>
        <body>
          ${t}
        </body>
      </html>
    `};async function g(){try{await navigator.clipboard.writeText(e.code),p(!0),setTimeout(()=>p(!1),2e3)}catch{}}return(0,u.jsxs)(`div`,{className:`w-full md:w-[50vw] xl:w-[45vw] h-full flex flex-col border-t md:border-t-0 md:border-l shrink-0 relative transition-all animate-fade-in`,style:{background:`var(--color-surface-alt)`,borderColor:`var(--color-border)`},children:[(0,u.jsxs)(`div`,{className:`flex items-center justify-between px-4 py-3 border-b`,style:{borderColor:`var(--color-border)`,background:`var(--color-surface)`},children:[(0,u.jsxs)(`div`,{className:`flex items-center gap-2 min-w-0`,children:[(0,u.jsx)(`div`,{className:`p-1 rounded-md bg-[var(--color-accent-muted)]`,children:(0,u.jsx)(a,{size:14,className:`text-[var(--color-accent-hover)]`})}),(0,u.jsxs)(`div`,{className:`min-w-0`,children:[(0,u.jsx)(`h3`,{className:`font-semibold text-xs truncate`,style:{color:`var(--color-text)`},children:`Interactive Artifact Explorer`}),(0,u.jsxs)(`p`,{className:`text-[10px] font-mono tracking-wide uppercase mt-0.5`,style:{color:`var(--color-text-faint)`},children:[`Render context: `,e.language]})]})]}),(0,u.jsxs)(`div`,{className:`flex items-center gap-1.5 shrink-0`,children:[(0,u.jsx)(`button`,{onClick:g,className:`p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-all`,title:`Copy source code`,children:f?(0,u.jsx)(c,{size:14,className:`text-emerald-400`}):(0,u.jsx)(o,{size:14})}),(0,u.jsx)(`button`,{onClick:t,className:`p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-faint)] hover:text-red-400 transition-all`,title:`Close Panel`,children:(0,u.jsx)(s,{size:14})})]})]}),e.language!==`javascript`&&e.language!==`css`&&(0,u.jsxs)(`div`,{className:`flex border-b shrink-0 px-4 py-1.5`,style:{borderColor:`var(--color-border)`,background:`var(--color-surface)`},children:[(0,u.jsxs)(`button`,{onClick:()=>d(`preview`),className:`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all`,style:{background:n===`preview`?`var(--color-surface-hover)`:`transparent`,color:n===`preview`?`var(--color-text)`:`var(--color-text-faint)`},children:[(0,u.jsx)(i,{size:12,className:`text-emerald-400`}),` Preview Render`]}),(0,u.jsxs)(`button`,{onClick:()=>d(`code`),className:`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all`,style:{background:n===`code`?`var(--color-surface-hover)`:`transparent`,color:n===`code`?`var(--color-text)`:`var(--color-text-faint)`},children:[(0,u.jsx)(r,{size:12,className:`text-[var(--color-accent)]`}),` Raw Code`]})]}),(0,u.jsx)(`div`,{className:`flex-1 min-h-0 relative bg-[#0d0d0d]`,children:n===`preview`?(0,u.jsx)(`iframe`,{ref:m,srcDoc:h(),className:`w-full h-full border-none bg-[#0f172a]`,sandbox:`allow-scripts`,title:`Artifact Preview Sandbox`}):(0,u.jsx)(`div`,{className:`w-full h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-300`,children:(0,u.jsx)(`pre`,{className:`whitespace-pre-wrap select-text`,children:e.code})})})]})}export{d as default};