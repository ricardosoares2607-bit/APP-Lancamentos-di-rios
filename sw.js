const CACHE_NAME = 'pmcd-sugarbo-v13';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS)).catch((err) => console.log('SW cache erro:', err))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Chamadas do banco de dados Firebase continuam em tempo real
  if (e.request.url.includes('firebaseio.com')) return;

  // Para navegação/páginas HTML: Network-First (busca na rede primeiro, fallback no cache se offline)
  if (e.request.mode === 'navigate' || e.request.destination === 'document' || e.request.url.includes('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            const clone = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return networkResp;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Demais recursos estáticos: Cache-first com fallback para rede
  e.respondWith(
    caches.match(e.request).then((resp) => {
      if (resp) return resp;
      return fetch(e.request).then((networkResp) => {
        if (networkResp && networkResp.status === 200 && e.request.method === 'GET') {
          const clone = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return networkResp;
      });
    })
  );
});
