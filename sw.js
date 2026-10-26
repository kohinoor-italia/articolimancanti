const CACHE = 'mancanze-v1';
const PRECACHE = [
  './',
  'manifest.json',
  'icon.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Mrs+Saint+Delafield&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(PRECACHE.map(u =>
        fetch(new Request(u, { mode: u.startsWith('http') ? 'no-cors' : 'same-origin' }))
          .then(r => (r.ok || r.type === 'opaque') ? c.put(u, r) : null)
          .catch(() => {})
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;
  // datele Supabase (REST, realtime, ping) trec direct, neatinse
  if (url.hostname.endsWith('supabase.co')) return;
  const ok = url.hostname === location.hostname ||
    /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com|gstatic\.com/.test(url.hostname);
  if (!ok) return;

  const store = res => {
    if (res && (res.status === 200 || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  };

  // pagina: întâi rețeaua, fără internet varianta salvată
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(store).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./'))
      )
    );
    return;
  }

  // restul: din cache instant, reîmprospătat în fundal
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(store).catch(() => hit);
      return hit || net;
    })
  );
});

