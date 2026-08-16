/* ==========================================================
   Registro Torii — sw.js
   Guarda la aplicación en el dispositivo para que abra sin internet.

   IMPORTANTE: cada vez que cambies index.html, styles.css o app.js,
   sube el número de VERSION. Eso avisa al navegador de que hay una
   versión nueva y le pide al usuario actualizar.
   ========================================================== */

const VERSION   = 'v1';
const CACHE_APP = 'torii-app-' + VERSION;
const CACHE_EXT = 'torii-externos-' + VERSION;

const ESENCIALES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

/* --- instalación: guarda los archivos de la app --- */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_APP).then(c => c.addAll(ESENCIALES))
  );
});

/* --- activación: borra las versiones viejas --- */
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(
      claves.filter(k => k !== CACHE_APP && k !== CACHE_EXT).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

/* --- la app pide aplicar la actualización --- */
self.addEventListener('message', e => {
  if (e.data && e.data.tipo === 'saltar') self.skipWaiting();
});

/* --- estrategia de respuesta --- */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  // Abrir la página: intenta la red y, si no hay, usa la copia guardada.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const red = await fetch(req);
        const cache = await caches.open(CACHE_APP);
        cache.put('./index.html', red.clone());
        return red;
      } catch (err) {
        const cache = await caches.open(CACHE_APP);
        return (await cache.match('./index.html')) ||
               (await cache.match('./')) ||
               new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  // Archivos propios: copia guardada primero, y se refresca por detrás.
  if (url.origin === self.location.origin) {
    e.respondWith(cachePrimero(req, CACHE_APP));
    return;
  }

  // Tipografías de Google: se guardan la primera vez que hay internet.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cachePrimero(req, CACHE_EXT));
  }
});

async function cachePrimero(req, nombreCache) {
  const cache = await caches.open(nombreCache);
  const guardado = await cache.match(req);

  const desdeRed = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);

  if (guardado) return guardado;
  const res = await desdeRed;
  return res || new Response('', { status: 504 });
}
