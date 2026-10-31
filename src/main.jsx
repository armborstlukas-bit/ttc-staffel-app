import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import BetaNav from './BetaNav.jsx'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
  });
}

// Nur lokal (npm run dev): Einzelansichten ohne Login ansehen, z. B. #vorschau=spielanzahl
const vorschau = import.meta.env.DEV && (location.hash.match(/vorschau=(\w+)/) || [])[1];
if (vorschau) {
  import('./devVorschau.jsx').then(({ default: Vorschau }) => createRoot(document.getElementById('root')).render(<Vorschau name={vorschau} />));
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
