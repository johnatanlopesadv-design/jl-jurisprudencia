import { useState, useEffect } from 'react';

export default function NotificationButton() {
  const [status, setStatus] = useState('idle'); // idle | requesting | active | denied | unsupported
  const [swRegistration, setSwRegistration] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setStatus('unsupported');
      return;
    }

    // Verificar permissão já concedida
    if (Notification.permission === 'granted') {
      setStatus('active');
    } else if (Notification.permission === 'denied') {
      setStatus('denied');
    }

    // Pegar registro do SW
    navigator.serviceWorker.ready.then((reg) => setSwRegistration(reg));
  }, []);

  async function handleActivate() {
    if (status === 'active') {
      // Desativar: remover subscription
      try {
        const reg = swRegistration || await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch('/api/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        localStorage.removeItem('pushSubscription');
        setStatus('idle');
      } catch (err) {
        console.error('[Push] Erro ao desativar:', err);
      }
      return;
    }

    setStatus('requesting');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const reg = swRegistration || await navigator.serviceWorker.ready;

      // Buscar VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        // Sem VAPID key configurada: só mostrar notificação local de teste
        await reg.showNotification('JL Jurisprudência', {
          body: 'Notificações ativadas! Você será avisado sobre novas decisões.',
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          tag: 'activation-test',
        });
        setStatus('active');
        return;
      }

      // Converter VAPID key de base64url para Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Enviar subscription ao servidor
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      localStorage.setItem('pushSubscription', JSON.stringify(subscription));

      // Notificação de confirmação
      await reg.showNotification('JL Jurisprudência', {
        body: 'Notificações ativadas! Você será avisado sobre novas decisões do STJ e STF.',
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
        tag: 'activation-confirmation',
      });

      setStatus('active');
    } catch (err) {
      console.error('[Push] Erro ao ativar:', err);
      setStatus('idle');
    }
  }

  if (status === 'unsupported') return null;

  const labels = {
    idle:       { icon: '🔔', text: 'Ativar alertas de novas decisões' },
    requesting: { icon: '⏳', text: 'Aguardando permissão...' },
    active:     { icon: '🔕', text: 'Alertas ativos — clique para desativar' },
    denied:     { icon: '🚫', text: 'Notificações bloqueadas no navegador' },
  };

  const { icon, text } = labels[status] || labels.idle;
  const isActive = status === 'active';

  return (
    <div className="notification-wrapper">
      <button
        className={`notification-btn ${isActive ? 'active' : ''}`}
        onClick={handleActivate}
        disabled={status === 'requesting' || status === 'denied'}
        aria-label={text}
        title={status === 'denied' ? 'Habilite notificações nas configurações do navegador' : undefined}
      >
        <span className="notification-btn-icon" role="img" aria-hidden="true">{icon}</span>
        {text}
      </button>
    </div>
  );
}

// Converte base64url para Uint8Array (necessário para VAPID)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
