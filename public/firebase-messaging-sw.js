/* eslint-disable no-undef */
/* Service Worker for Firebase Cloud Messaging (FCM).
 * Handles background messages when the web app is closed/inactive.
 *
 * Note: This file runs in the service worker context, not in the browser main thread.
 * Firebase config here contains only public project identifiers (no server key).
 */

importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js")
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js")

const firebaseConfig = {
  apiKey: "AIzaSyBWCxYER8hgbvTN8sr6pvMFyD0TC1H21HY",
  authDomain: "scoops-app-63e2a.firebaseapp.com",
  projectId: "scoops-app-63e2a",
  storageBucket: "scoops-app-63e2a.firebasestorage.app",
  messagingSenderId: "99463085090",
  appId: "1:99463085090:web:539c81f36ce17a478dde7b",
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || "Notification"
  const body = payload?.notification?.body || payload?.data?.body || ""

  const options = {
    body,
    // Attach custom data (if any) so you can use it in notification click handler.
    data: payload?.data || {},
  }

  self.registration.showNotification(title, options)
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const data = event?.notification?.data || {}
  const urlToOpen = data?.click_action || "/"

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus()
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }
      })
  )
})

