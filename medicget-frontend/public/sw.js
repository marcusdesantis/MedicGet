/**
 * Service Worker — recibe pushes y los muestra como notificaciones
 * del sistema (aparecen aunque la pestaña esté cerrada o el navegador
 * en background).
 *
 * Está en /public/ así Vite lo sirve tal cual sin bundling.
 *
 * El payload que envía el backend es JSON:
 *   { title, body, url?, tag? }
 */

self.addEventListener('install', (event) => {
  // Activar inmediatamente al instalarse
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'MedicGet', body: 'Nueva notificación' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body:    data.body,
    icon:    '/icon-192.png',
    badge:   '/icon-192.png',
    tag:     data.tag || 'medicget',
    data:    { url: data.url || '/' },
    // Renotify=true hace que la notificación se muestre aunque ya
    // exista una con el mismo tag — útil para varios mensajes en un
    // mismo chat por ejemplo.
    renotify: true,
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  const fullUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      // Si hay una ventana abierta, focus + navega ahí
      for (const w of wins) {
        if ('focus' in w) {
          w.focus();
          if ('navigate' in w) w.navigate(fullUrl);
          return;
        }
      }
      // Sino, abrí una nueva
      return clients.openWindow(fullUrl);
    }),
  );
});
