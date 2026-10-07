const CACHE_NAME = 'nook-v1.04';
const PREFIX = 'nook-';
const LOCAL_ASSETS = [ './', './index.html', './style.css', './manifest.json', './js/app.js', './js/store.js', './js/rules.js', './js/utils.js', './js/modules/navigation.js', './js/modules/onboarding.js', './js/modules/home.js', './js/modules/lists.js', './js/modules/agenda.js', './js/modules/goals.js', './js/modules/finances.js', './js/modules/settings.js', './img/icon-192.png', './img/icon-512.png', './img/icon.svg' ];
const OPTIONAL_ASSETS = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@phosphor-icons/web',
    'https://cdn.jsdelivr.net/npm/mobile-drag-drop@2.3.0-rc.2/default.css',
    'https://cdn.jsdelivr.net/npm/mobile-drag-drop@2.3.0-rc.2/index.min.js',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(LOCAL_ASSETS);
        await Promise.allSettled(OPTIONAL_ASSETS.map(url => cache.add(url)));
        // Sem skipWaiting: uma sessão aberta continua usando a versão antiga completa.
    })());
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
        // Sem clients.claim: não troca arquivos por baixo de uma página antiga aberta.
    })());
});
self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    const local = url.origin === self.location.origin;
    const optional = OPTIONAL_ASSETS.includes(request.url);
    // Nunca interceptar Auth, Data API, Realtime ou fotos privadas de Supabase.
    if (!local && !optional) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
            const response = await fetch(request);
            if (response.ok || response.type === 'opaque') {
                try { await cache.put(request, response.clone()); } catch { /* Cache indisponível não invalida resposta online. */ }
            }
            return response;
        } catch {
            if (request.mode === 'navigate') {
                const shell = await cache.match('./index.html');
                if (shell) return shell;
                return new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Nook offline</title><p>Sem conexão. Reconecte para abrir seu espaço.</p></html>', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            }
            return new Response('', { status: 503, statusText: 'Offline' });
        }
    })());
});