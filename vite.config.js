import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// Stellt die Spielanzahl-Daten zusätzlich öffentlich bereit (app.ttc-staffel.de/spielanzahl.json),
// damit die Vereinswebseite dieselbe Liste anzeigen kann wie die App.
const spielAnzahlOeffentlich = {
  name: 'spielanzahl-json',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'spielanzahl.json', source: readFileSync('src/data/spielAnzahl.json', 'utf8') });
  },
}

export default defineConfig({
  plugins: [react(), spielAnzahlOeffentlich],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase')) return 'firebase';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor';
          if (id.includes('node_modules/lucide-react')) return 'icons';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
