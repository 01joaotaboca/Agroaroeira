// Service Worker — AgroAroeira
// Faz cache do "app shell" (HTML, manifest, ícones) para abrir offline.
// Dados (Firestore) continuam exigindo internet — isso aqui só cobre o app em si.

const CACHE_NAME = 'agroaroeira-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só cuida de requisições GET do mesmo domínio (app shell).
  // Chamadas para Firebase/Firestore, CDNs (jsPDF, fontes) e afins
  // seguem direto pela rede — não interferimos nelas.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkResp) => {
          if (networkResp && networkResp.status === 200) {
            const clone = networkResp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResp;
        })
        .catch(() => cached); // offline: cai pro cache

      // Stale-while-revalidate: responde rápido com o cache (se existir)
      // e atualiza o cache em segundo plano.
      return cached || fetchPromise;
    })
  );
});
