// Vaqueiro Prateado — Service Worker v3 (01/10/2026)
// - Página (index.html): REDE PRIMEIRO → toda atualização publicada aparece na hora;
//   sem internet, abre a cópia guardada.
// - Ícones/manifest/bibliotecas: cache primeiro (rápido e offline).
// - Planilha (script.google.com): NUNCA passa pelo cache — sempre dado fresco.
const CACHE = 'vaqueiro-prateado-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon-180.png',
  './favicon-32.png',
  './header-logo.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

function guardar(req, res) {
  if (res && res.status === 200 && !res.redirected && (res.type === 'basic' || res.type === 'cors')) {
    const copy = res.clone();
    caches.open(CACHE).then((cache) => cache.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // dados da planilha: direto na rede, sem cache
  if (/(^|\.)script\.google(usercontent)?\.com$/.test(url.hostname)) return;

  const ehPagina = req.mode === 'navigate' || (url.origin === self.location.origin && /\/(index\.html)?$/.test(url.pathname));
  if (ehPagina) {
    event.respondWith(
      fetch(req).then((res) => guardar(req, res))
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const rede = fetch(req).then((res) => guardar(req, res)).catch(() => cached);
      return cached || rede;
    })
  );
});
