import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { RoteadorProvider } from './router';
import './styles/global.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado.');

createRoot(raiz).render(
  <StrictMode>
    <RoteadorProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </RoteadorProvider>
  </StrictMode>,
);

// Service worker gerado pelo Workbox no build (RNF-PWA-01).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
