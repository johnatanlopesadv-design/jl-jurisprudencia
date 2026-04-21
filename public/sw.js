const CACHE_VERSION = 'v2';
const STATIC_CACHE = `jl-juris-static-${CACHE_VERSION}`;
const API_CACHE = `jl-juris-api-${CACHE_VERSION}`;
const FONT_CACHE = `jl-juris-fonts-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// ─── INSTALL ─────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Falha ao pré-cachear assets:', err);
      })
    )
  );
});

// ─── ACTIVATE ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (n) =>
                n !== STATIC_CACHE && n !== API_CACHE && n !== FONT_CACHE
            )
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests (except fonts)
  if (
    url.origin !== self.location.origin &&
    !url.hostname.includes('fonts.googleapis.com') &&
    !url.hostname.includes('fonts.gstatic.com')
  ) {
    return;
  }

  // Google Fonts – cache-first
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }

  // API routes – network-first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Everything else – stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

// ─── CACHE STRATEGIES ────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'Offline', cached: true }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || fetchPromise;
}

// ─── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'JL Jurisprudência', body: event.data?.text() };
  }

  const title = data.title || 'JL Jurisprudência';
  const options = {
    body: data.body || 'Nova decisão relevante disponível.',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    vibrate: [200, 100, 200],
    tag: data.tag || 'jl-juris-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      area: data.area,
      tribunal: data.tribunal,
    },
    actions: [
      { action: 'open', title: 'Ver decisão' },
      { action: 'dismiss', title: 'Fechar' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── NOTIFICATION CLICK ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ─── BACKGROUND SYNC ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-new-decisions') {
    event.waitUntil(checkNewDecisions());
  }
});

// ─── PERIODIC BACKGROUND SYNC ────────────────────────────────────────────────
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-decisions-periodic') {
    event.waitUntil(checkNewDecisions());
  }
});

// ─── MESSAGE FROM MAIN THREAD ────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CHECK_DECISIONS') {
    checkNewDecisions();
  }
});

// ─── NEW DECISIONS CHECK ─────────────────────────────────────────────────────
async function checkNewDecisions() {
  try {
    const res = await fetch('/api/decisoes?tribunal=ambos');
    if (!res.ok) return;

    const data = await res.json();
    const decisoes = data.decisoes || [];
    if (!decisoes.length) return;

    // Compare with cached data to find truly new ones
    const cache = await caches.open(API_CACHE);
    const cachedRes = await cache.match('/api/decisoes?tribunal=ambos');

    let cachedIds = new Set();
    if (cachedRes) {
      try {
        const cachedData = await cachedRes.json();
        cachedIds = new Set((cachedData.decisoes || []).map((d) => d.id));
      } catch {/* ignore */}
    }

    // Filter: published in last 24h and not previously seen
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const novas = decisoes.filter(
      (d) => new Date(d.data).getTime() > cutoff && !cachedIds.has(d.id)
    );

    if (novas.length > 0) {
      const areas = [...new Set(novas.map((d) => d.area).filter(Boolean))];
      const areaLabels = {
        saude: 'Plano de Saúde',
        inss: 'INSS',
        consumidor: 'Consumidor',
        familia: 'Família',
      };

      await self.registration.showNotification('JL Jurisprudência — Nova decisão', {
        body:
          novas.length === 1
            ? `${novas[0].tribunal}: ${novas[0].titulo.slice(0, 80)}...`
            : `${novas.length} novas decisões em: ${areas.map((a) => areaLabels[a] || a).join(', ')}`,
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
        vibrate: [200, 100, 200],
        tag: 'jl-new-decisions',
        renotify: true,
        data: { url: '/' },
        actions: [{ action: 'open', title: 'Abrir app' }],
      });
    }

    // Update cache
    cache.put(
      '/api/decisoes?tribunal=ambos',
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch (err) {
    console.warn('[SW] checkNewDecisions error:', err);
  }
}
