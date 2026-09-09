const CACHE_NAME='mzansi-learning-hub-v0.1d-03';
const APP_SHELL=['./','./index.html','./styles.css','./app.js','./hub-storage.js','./umla-import.js','./programmes.json','./fixtures/boilermaker-km04-l03-umla.json','./manifest.webmanifest','./icons/mzansi-learning-hub-192.png','./icons/mzansi-learning-hub-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));});
