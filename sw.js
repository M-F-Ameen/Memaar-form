// ============================================================================
// SERVICE WORKER - Web Push Notifications
// ============================================================================
// This service worker handles:
// 1. Push notification reception when browser is closed/background
// 2. Notification display with proper icons, title, body
// 3. Notification click handling (opens specific page)
// 4. Offline caching (optional, for PWA support)
// ============================================================================

const SW_VERSION = "1.0.0";
const CACHE_NAME = `memaar-cache-v${SW_VERSION}`;

// Assets to cache for offline support (optional)
const ASSETS_TO_CACHE = [
  "/admin.html",
  "/style.css",
  "/admin.js",
  "/images/icon-192.png",
  "/images/icon-512.png",
];

// ============================================================================
// INSTALL EVENT - Cache essential assets
// ============================================================================
self.addEventListener("install", (event) => {
  console.log("[SW] Installing Service Worker v" + SW_VERSION);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching app shell");
        // Don't fail installation if caching fails
        return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
          console.warn("[SW] Some assets failed to cache:", err);
        });
      })
      .then(() => {
        // Force activation without waiting for old SW to terminate
        return self.skipWaiting();
      }),
  );
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating Service Worker v" + SW_VERSION);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      }),
  );
});

// ============================================================================
// PUSH EVENT - Handle incoming push notifications
// ============================================================================
// This is the CRITICAL event for Web Push Notifications
// It fires even when the browser tab is closed!
// ============================================================================
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received");

  // Default notification data
  let notificationData = {
    title: "تقييم جديد",
    body: "تم استلام تقييم جديد من عميل",
    icon: "/images/icon-192.png",
    badge: "/images/icon-192.png",
    tag: "new-evaluation",
    url: "/admin.html",
    timestamp: Date.now(),
  };

  // Parse the push payload if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        ...payload,
      };
      console.log("[SW] Push payload:", payload);
    } catch (e) {
      // If not JSON, try as text
      const text = event.data.text();
      if (text) {
        notificationData.body = text;
      }
      console.log("[SW] Push text:", text);
    }
  }

  // Notification options with all features
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag, // Prevents duplicate notifications with same tag
    renotify: true, // Vibrate/sound even if replacing same tag
    requireInteraction: false, // Auto-dismiss on mobile
    silent: false, // Play sound
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    timestamp: notificationData.timestamp,
    data: {
      url: notificationData.url,
      evaluationId: notificationData.evaluationId,
    },
    // Actions for interactive notifications (Android)
    actions: [
      {
        action: "view",
        title: "عرض التقييم",
        icon: "/images/icon-192.png",
      },
      {
        action: "dismiss",
        title: "تجاهل",
      },
    ],
    // iOS Safari requires these
    dir: "rtl",
    lang: "ar",
  };

  // Show the notification
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options),
  );
});

// ============================================================================
// NOTIFICATION CLICK EVENT - Handle user clicking the notification
// ============================================================================
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action);

  // Close the notification
  event.notification.close();

  // Handle different actions
  if (event.action === "dismiss") {
    // User clicked dismiss, do nothing
    return;
  }

  // Get the URL to open (default to admin page)
  const urlToOpen = event.notification.data?.url || "/admin.html";

  // Open or focus the appropriate window/tab
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window/tab open with our app
        for (const client of clientList) {
          if (client.url.includes("/admin") && "focus" in client) {
            // Focus existing window and navigate if needed
            client.postMessage({
              type: "NOTIFICATION_CLICK",
              evaluationId: event.notification.data?.evaluationId,
            });
            return client.focus();
          }
        }

        // No existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

// ============================================================================
// NOTIFICATION CLOSE EVENT - Track when user dismisses notification
// ============================================================================
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed by user");
  // You can track analytics here if needed
});

// ============================================================================
// FETCH EVENT - Network-first strategy with cache fallback
// ============================================================================
// Optional: Provides offline support for the PWA
// ============================================================================
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API requests (always go to network)
  if (event.request.url.includes("/api/")) return;

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseClone = response.clone();

        // Cache the fresh response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return offline page if available
          return caches.match("/admin.html");
        });
      }),
  );
});

// ============================================================================
// MESSAGE EVENT - Handle messages from the main app
// ============================================================================
self.addEventListener("message", (event) => {
  console.log("[SW] Message received:", event.data);

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: SW_VERSION });
  }
});

// ============================================================================
// PUSH SUBSCRIPTION CHANGE EVENT - Handle subscription updates
// ============================================================================
// This fires when the push subscription expires or is invalidated
// Important for maintaining reliable push notifications
// ============================================================================
self.addEventListener("pushsubscriptionchange", (event) => {
  console.log("[SW] Push subscription changed");

  event.waitUntil(
    // Re-subscribe and update the server
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: self.VAPID_PUBLIC_KEY,
      })
      .then((newSubscription) => {
        // Send new subscription to server
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: newSubscription,
            resubscribe: true,
          }),
        });
      })
      .catch((error) => {
        console.error("[SW] Failed to resubscribe:", error);
      }),
  );
});

console.log("[SW] Service Worker loaded v" + SW_VERSION);
