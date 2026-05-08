self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("v2").then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/style.css",
        "/app.js",
        "/logo192.png",
        "/logo512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== "v2").map(k => caches.delete(k)))
    )
  );
});

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAD_GREG5WctQgYELILmwAQvz8hk7bujnw",
  authDomain: "velocirapptore.firebaseapp.com",
  projectId: "velocirapptore",
  storageBucket: "velocirapptore.firebasestorage.app",
  messagingSenderId: "138735528236",
  appId: "1:138735528236:web:0f71c7115f76acc6eb6489"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body
  });
});

