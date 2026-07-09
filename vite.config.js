import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/ai-chat/',
  build: {
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split heavy syntax highlighting out
            if (id.includes('react-syntax-highlighter')) {
              return 'syntax-highlighter';
            }
            // Split Markdown parsing and rendering modules
            if (
              id.includes('react-markdown') || 
              id.includes('micromark') || 
              id.includes('mdast') || 
              id.includes('unist') || 
              id.includes('unified') || 
              id.includes('vfile')
            ) {
              return 'markdown-parser';
            }
            // Split Supabase connection dependencies
            if (id.includes('@supabase') || id.includes('websocket')) {
              return 'supabase-client';
            }
            // Split core react runtime configurations
            if (id.includes('react-dom') || id.includes('react/')) {
              return 'react-core';
            }
            // Split icons library
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // Fallback for general remaining small dependencies
            return 'vendor-utils';
          }
        }
      }
    }
  }
})