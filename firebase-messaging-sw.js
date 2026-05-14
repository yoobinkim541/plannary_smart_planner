importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyB1cHLdbvkLUDUKJSipDg3NQOsL38CUlBA',
    appId: '1:909174132550:web:03fd3a4ec514d6ad8a5f47',
    authDomain: 'planary-a2f6b.firebaseapp.com',
    measurementId: 'G-TEPGF6Z7C9',
    messagingSenderId: '909174132550',
    projectId: 'planary-a2f6b',
    storageBucket: 'planary-a2f6b.firebasestorage.app'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const title = (payload.notification && payload.notification.title) || 'Planary';
    const options = {
        body: (payload.notification && payload.notification.body) || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: payload.data || {}
    };
    self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
