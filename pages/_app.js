import { useEffect } from 'react';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[SW] Registrado com escopo:', registration.scope);

          // Verificar atualização do SW
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                // Nova versão disponível
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });

          // Registrar periodic background sync (se disponível)
          if ('periodicSync' in registration) {
            registration.periodicSync
              .register('check-decisions-periodic', { minInterval: 4 * 60 * 60 * 1000 })
              .then(() => console.log('[SW] Periodic sync registrado'))
              .catch((err) => console.warn('[SW] Periodic sync não disponível:', err));
          }
        })
        .catch((err) => console.error('[SW] Falha no registro:', err));
    });
  }, []);

  return <Component {...pageProps} />;
}
