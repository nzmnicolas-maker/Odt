/* ======================================================
   SERVICE WORKER - Odonto Estudos
   Suporte offline e cache de recursos
   ====================================================== */

// 🔧 MELHORIA: versão do cache incrementada (v5 → v6) por causa dos ajustes
// em assistant.js e manifest.json nesta rodada — sem esse bump, clientes com
// o SW antigo continuariam servindo as versões antigas desses arquivos direto
// do cache, ignorando os arquivos novos. Regra geral: sempre que styles.css,
// app.js, assistant.js, site-data.js ou manifest.json mudarem, incremente
// este número.
const CACHE_NAME = 'odonto-estudos-v6';
const RUNTIME_CACHE = 'odonto-runtime-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/site-data.js',
  '/marked.umd.js',
  '/manifest.json',
  '/assistant.js',
  '/sw.js'
];

// ============================================
// INSTALL EVENT - Cache inicial
// ============================================
self.addEventListener('install', event => {
  console.log('📦 Service Worker instalando...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ Cacheando arquivos essenciais');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('⚠️ Alguns arquivos não puderam ser cacheados:', err);
        // Continuar mesmo com erros
        return Promise.resolve();
      });
    })
  );

  self.skipWaiting(); // Ativar imediatamente
});

// ============================================
// ACTIVATE EVENT - Limpar caches antigos
// ============================================
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker ativando...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log(`🗑️ Removendo cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim(); // Controlar clientes imediatamente
});

// ============================================
// FETCH EVENT - Cache first, Network fallback
// ============================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // NÃO cachear requisições à API (sempre usar rede)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(err => {
        console.warn('⚠️ API indisponível (offline):', url.pathname);
        return new Response(
          JSON.stringify({ error: 'Você está offline. API não disponível.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Para GET requests - Cache First
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          // Retornar do cache mas atualizar em background
          if (!url.pathname.includes('site-data.js')) {
            // Atualizar cache em background para alguns arquivos
            fetch(request).then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                caches.open(RUNTIME_CACHE).then(cache => {
                  cache.put(request, responseClone);
                });
              }
            }).catch(() => {
              // Offline, usar cache
            });
          }
          return cachedResponse;
        }

        // Não está em cache, buscar da rede
        return fetch(request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Clonar resposta para cachear
          const responseToCache = networkResponse.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        }).catch(err => {
          console.warn('⚠️ Falha ao buscar:', url.pathname);

          // Retornar página de offline se disponível
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }

          // Para outros tipos, retornar erro genérico
          return new Response(
            'Você está offline e este recurso não foi cacheado.',
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
            }
          );
        });
      })
    );
    return;
  }

  // Para requisições não-GET, sempre usar rede
  event.respondWith(fetch(request));
});

// ============================================
// MESSAGE EVENT - Comunicação com clientes
// ============================================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLIENTS_CLAIM') {
    self.clients.claim();
  }
});

console.log('✅ Service Worker pronto (v6)');
