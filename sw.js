importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBi2OG-WbnvU3SPcJ-KdxNG6v63Ai1nD1o",
  authDomain: "nosso-espaco-5be9b.firebaseapp.com",
  projectId: "nosso-espaco-5be9b",
  storageBucket: "nosso-espaco-5be9b.firebasestorage.app",
  messagingSenderId: "514169341317",
  appId: "1:514169341317:web:c6b59383804fd21bd230ec"
});

const messaging = firebase.messaging();

// Notificações em segundo plano (app fechado/minimizado)
messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || '♡ Nosso Espaço', {
    body: body || 'Nova mensagem de quem você ama.',
    icon: '/nosso-espaco/icon-192.svg',
    badge: '/nosso-espaco/icon-192.svg',
    data: { url: '/nosso-espaco/' }
  });
});

// Ao clicar na notificação, abre o app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/nosso-espaco/';
  e.waitUntil(clients.openWindow(url));
});

// Cache básico
const CACHE = 'nosso-espaco-v2';
const ASSETS = ['/nosso-espaco/', '/nosso-espaco/index.html', '/nosso-espaco/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
