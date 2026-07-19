// Firebase Cloud Messaging Service Worker
// Empfängt Push-Nachrichten im Hintergrund (App geschlossen / Tab nicht aktiv)
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCrx34HEgaHnRE187Cja4JNAtbexvrA6Vg",
  authDomain: "ttc-staffel-app.firebaseapp.com",
  projectId: "ttc-staffel-app",
  storageBucket: "ttc-staffel-app.firebasestorage.app",
  messagingSenderId: "393124037099",
  appId: "1:393124037099:web:74188e37a786b7a81819ae",
});

const messaging = firebase.messaging();

// Reine Daten-Nachrichten (kein "notification"-Feld im Payload) – sonst zeigen
// manche Browser die Benachrichtigung doppelt an (einmal automatisch, einmal hier).
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || 'TTC Grün-Weiß Staffel';
  const options = {
    body: payload.data?.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  const targetAbsUrl = new URL(targetUrl, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try { await client.navigate(targetAbsUrl); } catch {}
          }
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
