// Keeps the game's files once they have been fetched, so it opens again without the network (and at once): the
// page itself is asked of the network first, so a new version is seen as soon as there is one; everything else is
// taken from what is kept, and fetched and kept if it isn't there. Files built with a hash in their names never
// change, and the few without (the wanderer, the ground textures, the footsteps) change with the cache's name.
const CACHE = 'spirit-valley-2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const keep = (response) => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  };
  if (request.mode === 'navigate' || request.url.endsWith('manifest.json')) {
    event.respondWith(
      fetch(request)
        .then(keep)
        .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? caches.match('./'))),
    );
    return;
  }
  event.respondWith(caches.match(request).then((hit) => hit ?? fetch(request).then(keep)));
});
