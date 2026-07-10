import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // If compiling for Android, use relative paths to support local WebViews
  const isAndroid = mode === 'android';
  
  return {
    plugins: [react(), tailwindcss()],
    base: isAndroid ? './' : '/ai-chat/',
    build: {
      cssCodeSplit: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-syntax-highlighter')) {
                return 'syntax-highlighter';
              }
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
              if (id.includes('@supabase') || id.includes('websocket')) {
                return 'supabase-client';
              }
              if (id.includes('react-dom') || id.includes('react/')) {
                return 'react-core';
              }
              if (id.includes('lucide-react')) {
                return 'icons';
              }
              return 'vendor-utils';
            }
          }
        }
      }
    }
  };
});