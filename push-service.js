// ============================================================================
// PUSH NOTIFICATION SERVICE - Frontend Module
// ============================================================================
// This module handles:
// 1. Service Worker registration
// 2. Push notification permission requests
// 3. Push subscription management
// 4. Communication with backend API
// ============================================================================
// USAGE:
// await PushNotificationService.init();
// await PushNotificationService.subscribe();
// ============================================================================

const PushNotificationService = {
  // -------------------------------------------------------------------------
  // Configuration
  // -------------------------------------------------------------------------
  // VAPID public key - must match the one on the server
  // This is safe to expose publicly (it's the PUBLIC key)
  // Generate your own keys using: npx web-push generate-vapid-keys
  VAPID_PUBLIC_KEY: null, // Will be fetched from server

  // State
  registration: null,
  subscription: null,
  isSupported: false,
  isSubscribed: false,
  permissionState: "default",

  // -------------------------------------------------------------------------
  // Initialize the Push Notification Service
  // -------------------------------------------------------------------------
  async init() {
    console.log("[Push] Initializing Push Notification Service...");

    // Check browser support
    this.isSupported = this._checkSupport();
    if (!this.isSupported) {
      console.warn("[Push] Push notifications not supported in this browser");
      return false;
    }

    // Fetch VAPID public key from server
    try {
      const response = await fetch("/api/push/vapid-public-key");
      const data = await response.json();
      this.VAPID_PUBLIC_KEY = data.publicKey;
      console.log("[Push] VAPID public key fetched");
    } catch (error) {
      console.error("[Push] Failed to fetch VAPID key:", error);
      return false;
    }

    // Register service worker
    const registered = await this._registerServiceWorker();
    if (!registered) return false;

    // Check current permission state
    this.permissionState = Notification.permission;
    console.log("[Push] Current permission state:", this.permissionState);

    // Check if already subscribed
    await this._checkExistingSubscription();

    console.log(
      "[Push] Initialization complete. Subscribed:",
      this.isSubscribed,
    );
    return true;
  },

  // -------------------------------------------------------------------------
  // Check browser support for Push Notifications
  // -------------------------------------------------------------------------
  _checkSupport() {
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasPushManager = "PushManager" in window;
    const hasNotification = "Notification" in window;

    console.log("[Push] Support check:", {
      serviceWorker: hasServiceWorker,
      pushManager: hasPushManager,
      notification: hasNotification,
    });

    // iOS Safari PWA check
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOSSafari) {
      // iOS 16.4+ supports web push in PWA mode
      const isStandalone = window.matchMedia(
        "(display-mode: standalone)",
      ).matches;
      const isPWA = window.navigator.standalone === true;

      if (!isStandalone && !isPWA) {
        console.warn(
          "[Push] iOS Safari detected. Push notifications require:",
          "\n1. iOS 16.4 or later",
          "\n2. App must be added to Home Screen (PWA mode)",
          "\n3. HTTPS is required",
        );
      }
    }

    return hasServiceWorker && hasPushManager && hasNotification;
  },

  // -------------------------------------------------------------------------
  // Register the Service Worker
  // -------------------------------------------------------------------------
  async _registerServiceWorker() {
    try {
      // Register the service worker
      this.registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("[Push] Service Worker registered:", this.registration.scope);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log("[Push] Service Worker is ready");

      // Listen for messages from the service worker
      navigator.serviceWorker.addEventListener("message", (event) => {
        this._handleServiceWorkerMessage(event);
      });

      return true;
    } catch (error) {
      console.error("[Push] Service Worker registration failed:", error);
      return false;
    }
  },

  // -------------------------------------------------------------------------
  // Check for existing subscription
  // -------------------------------------------------------------------------
  async _checkExistingSubscription() {
    try {
      if (!this.registration) return;

      const subscription =
        await this.registration.pushManager.getSubscription();

      if (subscription) {
        this.subscription = subscription;
        this.isSubscribed = true;
        console.log("[Push] Existing subscription found");

        // Verify subscription is still valid on server
        await this._syncSubscriptionWithServer(subscription);
      }
    } catch (error) {
      console.error("[Push] Error checking existing subscription:", error);
    }
  },

  // -------------------------------------------------------------------------
  // Request permission and subscribe to push notifications
  // -------------------------------------------------------------------------
  async subscribe() {
    if (!this.isSupported) {
      console.warn("[Push] Cannot subscribe - not supported");
      return { success: false, reason: "not_supported" };
    }

    // Request notification permission
    const permission = await this._requestPermission();
    if (permission !== "granted") {
      console.warn("[Push] Permission denied");
      return { success: false, reason: "permission_denied" };
    }

    try {
      // Convert VAPID key to Uint8Array
      const applicationServerKey = this._urlBase64ToUint8Array(
        this.VAPID_PUBLIC_KEY,
      );

      // Subscribe to push manager
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true, // Required - must always show notification
        applicationServerKey: applicationServerKey,
      });

      this.subscription = subscription;
      this.isSubscribed = true;

      console.log("[Push] Successfully subscribed:", subscription.endpoint);

      // Send subscription to server
      const serverResponse = await this._sendSubscriptionToServer(subscription);

      if (serverResponse.success) {
        console.log("[Push] Subscription saved on server");
        return { success: true, subscription };
      } else {
        throw new Error("Failed to save subscription on server");
      }
    } catch (error) {
      console.error("[Push] Subscription failed:", error);
      return { success: false, reason: error.message };
    }
  },

  // -------------------------------------------------------------------------
  // Unsubscribe from push notifications
  // -------------------------------------------------------------------------
  async unsubscribe() {
    if (!this.subscription) {
      console.warn("[Push] No subscription to unsubscribe");
      return { success: false, reason: "not_subscribed" };
    }

    try {
      // Unsubscribe from push manager
      await this.subscription.unsubscribe();

      // Remove subscription from server
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          endpoint: this.subscription.endpoint,
        }),
      });

      this.subscription = null;
      this.isSubscribed = false;

      console.log("[Push] Successfully unsubscribed");
      return { success: true };
    } catch (error) {
      console.error("[Push] Unsubscribe failed:", error);
      return { success: false, reason: error.message };
    }
  },

  // -------------------------------------------------------------------------
  // Request notification permission from user
  // -------------------------------------------------------------------------
  async _requestPermission() {
    // Check current permission
    if (Notification.permission === "granted") {
      this.permissionState = "granted";
      return "granted";
    }

    if (Notification.permission === "denied") {
      this.permissionState = "denied";
      console.warn(
        "[Push] Notifications are blocked. User must enable in browser settings.",
      );
      return "denied";
    }

    // Request permission
    try {
      const permission = await Notification.requestPermission();
      this.permissionState = permission;
      console.log("[Push] Permission result:", permission);
      return permission;
    } catch (error) {
      console.error("[Push] Permission request failed:", error);
      return "denied";
    }
  },

  // -------------------------------------------------------------------------
  // Send subscription to server
  // -------------------------------------------------------------------------
  async _sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[Push] Failed to send subscription to server:", error);
      throw error;
    }
  },

  // -------------------------------------------------------------------------
  // Sync existing subscription with server
  // -------------------------------------------------------------------------
  async _syncSubscriptionWithServer(subscription) {
    try {
      await fetch("/api/push/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      });
    } catch (error) {
      console.warn("[Push] Failed to sync subscription:", error);
    }
  },

  // -------------------------------------------------------------------------
  // Handle messages from Service Worker
  // -------------------------------------------------------------------------
  _handleServiceWorkerMessage(event) {
    console.log("[Push] Message from SW:", event.data);

    if (event.data.type === "NOTIFICATION_CLICK") {
      // Handle notification click - could refresh data, scroll to item, etc.
      if (typeof fetchEvaluations === "function") {
        fetchEvaluations();
      }
    }
  },

  // -------------------------------------------------------------------------
  // Utility: Convert base64 URL to Uint8Array (for VAPID key)
  // -------------------------------------------------------------------------
  _urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  },

  // -------------------------------------------------------------------------
  // Get subscription status for UI
  // -------------------------------------------------------------------------
  getStatus() {
    return {
      supported: this.isSupported,
      subscribed: this.isSubscribed,
      permission: Notification.permission,
      permissionState: this.permissionState,
      endpoint: this.subscription?.endpoint || null,
    };
  },

  // -------------------------------------------------------------------------
  // Get current subscription object
  // -------------------------------------------------------------------------
  async getSubscription() {
    if (this.subscription) {
      return this.subscription;
    }

    if (this.registration) {
      this.subscription = await this.registration.pushManager.getSubscription();
      return this.subscription;
    }

    return null;
  },

  // -------------------------------------------------------------------------
  // Test notification (for debugging)
  // -------------------------------------------------------------------------
  async testNotification() {
    if (!this.isSubscribed) {
      console.warn("[Push] Not subscribed - cannot test");
      return false;
    }

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const data = await response.json();
      console.log("[Push] Test notification result:", data);
      return data.success;
    } catch (error) {
      console.error("[Push] Test notification failed:", error);
      return false;
    }
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PushNotificationService;
}
