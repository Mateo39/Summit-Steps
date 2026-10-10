/* Summit Steps offline worker. Version changes whenever the app changes. */
const VERSION='summit-steps-2398c1abb6';
const FONT_CACHE='summit-steps-fonts';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION&&k!==FONT_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Google Fonts: keep a copy so the fonts work offline after the first visit
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(FONT_CACHE).then(async c=>{
      const hit=await c.match(req);if(hit)return hit;
      try{const res=await fetch(req);if(res&&(res.ok||res.type==='opaque'))c.put(req,res.clone());return res;}
      catch(err){return new Response('',{status:504});}
    }));
    return;
  }
  if(url.origin!==self.location.origin)return;
  // App files: answer from the cache straight away, and refresh the cache in the background
  e.respondWith(caches.open(VERSION).then(async c=>{
    const key=req.mode==='navigate'?'./index.html':req;
    const hit=await c.match(key,{ignoreSearch:true});
    const net=fetch(req).then(res=>{if(res&&res.ok)c.put(key,res.clone());return res;}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit;}
    const res=await net;return res||new Response('Offline',{status:503,headers:{'Content-Type':'text/plain'}});
  }));
});
