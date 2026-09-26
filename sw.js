// Navigation fallback only. Audio, byte ranges, pages and scripts stay on the
// network so playback is not served stale code or broken partial media caches.
const CACHE='cmd-app-offline-v1';
const OFFLINE='/app/offline.html';
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.add(OFFLINE)));
  // No skipWaiting: an update must not take over an ongoing listening session.
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cmd-app-offline-')&&key!==CACHE).map(key=>caches.delete(key)))));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||event.request.mode!=='navigate')return;
  event.respondWith(fetch(event.request).catch(async()=>await caches.match(OFFLINE)||new Response('You are offline. Reconnect to listen.',{status:503,headers:{'content-type':'text/plain'}})));
});
