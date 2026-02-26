// Admin Dashboard JavaScript - Refactored with Clean Architecture
// ============================================================================
// MODULES: Separation of Concerns
// ============================================================================

// ----------------------------------------------------------------------------
// 1. STORAGE SERVICE - Handles all sessionStorage operations
// ----------------------------------------------------------------------------
const StorageService = {
  KEYS: {
    UNREAD_IDS: "unreadEvaluationIds",
    READ_IDS: "readEvaluationIds",
    INITIALIZED: "notificationSystemInitialized",
    LAST_VIEWED: "lastViewedEvaluations",
    PERMISSION_REQUESTED: "notificationPermissionRequested",
  },

  getJSON(key, defaultValue = []) {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn(`StorageService: Failed to parse ${key}`, e);
      return defaultValue;
    }
  },

  setJSON(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`StorageService: Failed to save ${key}`, e);
    }
  },

  get(key) {
    return sessionStorage.getItem(key);
  },

  set(key, value) {
    sessionStorage.setItem(key, value);
  },

  remove(key) {
    sessionStorage.removeItem(key);
  },

  has(key) {
    return sessionStorage.getItem(key) !== null;
  },
};

// ----------------------------------------------------------------------------
// 2. AUDIO SERVICE - Cross-device audio management
// ----------------------------------------------------------------------------
const AudioService = {
  context: null,
  enabled: false,
  cachedAudio: null,
  soundPath: "/notification sound/sound.wav",

  init() {
    if (!this.context) {
      try {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        console.log(
          "AudioService: Context initialized, state:",
          this.context.state,
        );
        return true;
      } catch (error) {
        console.warn("AudioService: AudioContext not supported");
        return false;
      }
    }
    return true;
  },

  async enable() {
    if (this.enabled) return true;

    if (!this.init()) return false;

    if (this.context.state === "suspended") {
      try {
        await this.context.resume();
        console.log("AudioService: Context resumed");
      } catch (e) {
        console.warn("AudioService: Failed to resume context", e);
        return false;
      }
    }

    this.enabled = true;
    this.preload();
    return true;
  },

  preload() {
    if (this.cachedAudio) return;

    try {
      this.cachedAudio = new Audio(this.soundPath);
      this.cachedAudio.volume = 0.8;
      this.cachedAudio.preload = "auto";
      this.cachedAudio.load();
      console.log("AudioService: Audio preloaded");
    } catch (error) {
      console.warn("AudioService: Preload failed", error);
    }
  },

  async playSound() {
    console.log("AudioService: Playing notification sound...");

    // Try to enable if not ready
    if (!this.enabled) {
      await this.enable();
    }

    // Always try HTML5 Audio first (works even when page is hidden on most browsers)
    const audioPlayed = await this._playHTML5Audio();
    if (audioPlayed) return true;

    // Fallback to Web Audio API beep
    return this._playBeep();
  },

  _playHTML5Audio() {
    return new Promise((resolve) => {
      try {
        // Always create a fresh audio element for reliability
        const audio = new Audio(this.soundPath + "?t=" + Date.now());
        audio.volume = 1.0;

        const timeout = setTimeout(() => {
          console.log("AudioService: Audio timeout, using fallback");
          resolve(false);
        }, 2000);

        audio.addEventListener(
          "canplaythrough",
          () => {
            clearTimeout(timeout);
            audio
              .play()
              .then(() => {
                console.log("AudioService: Sound played successfully");
                resolve(true);
              })
              .catch((e) => {
                console.log("AudioService: Play failed", e.name);
                resolve(false);
              });
          },
          { once: true },
        );

        audio.addEventListener(
          "error",
          () => {
            clearTimeout(timeout);
            resolve(false);
          },
          { once: true },
        );

        audio.load();
      } catch (error) {
        console.warn("AudioService: Audio creation failed", error);
        resolve(false);
      }
    });
  },

  _playBeep() {
    try {
      if (!this.context) {
        this.init();
      }

      // Resume context if suspended
      if (this.context.state === "suspended") {
        this.context.resume();
      }

      const oscillator = this.context.createOscillator();
      const gainNode = this.context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.context.destination);

      // Dual-tone notification (louder)
      oscillator.frequency.setValueAtTime(880, this.context.currentTime);
      oscillator.frequency.setValueAtTime(660, this.context.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(880, this.context.currentTime + 0.3);

      gainNode.gain.setValueAtTime(0.5, this.context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.context.currentTime + 0.5,
      );

      oscillator.start(this.context.currentTime);
      oscillator.stop(this.context.currentTime + 0.5);

      console.log("AudioService: Beep played");
      return true;
    } catch (error) {
      console.warn("AudioService: Beep failed", error);
      return false;
    }
  },

  setupUserInteractionListeners() {
    const events = [
      "click",
      "keydown",
      "touchstart",
      "touchend",
      "mousedown",
      "scroll",
    ];
    const handler = () => this.enable();

    events.forEach((event) => {
      document.addEventListener(event, handler, { once: true, passive: true });
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.enable();
    });
  },
};

// ----------------------------------------------------------------------------
// 3. BADGE MANAGER - Notification badge state management
// ----------------------------------------------------------------------------
const BadgeManager = {
  element: null,
  unreadIds: new Set(),
  updateTimer: null,
  debounceMs: 100,

  init() {
    this.element = document.getElementById("newEvaluationsBadge");
    this._loadState();
    return this;
  },

  _loadState() {
    const saved = StorageService.getJSON(StorageService.KEYS.UNREAD_IDS, []);
    this.unreadIds = new Set(saved);
  },

  _saveState() {
    StorageService.setJSON(StorageService.KEYS.UNREAD_IDS, [...this.unreadIds]);
  },

  addUnread(id) {
    this.unreadIds.add(id);
    this._saveState();
    this.scheduleUpdate();
  },

  markAsRead(ids) {
    const readIds = StorageService.getJSON(StorageService.KEYS.READ_IDS, []);

    ids.forEach((id) => {
      if (!readIds.includes(id)) readIds.push(id);
      this.unreadIds.delete(id);
    });

    StorageService.setJSON(StorageService.KEYS.READ_IDS, readIds);
    this._saveState();
  },

  isRead(id) {
    const readIds = StorageService.getJSON(StorageService.KEYS.READ_IDS, []);
    return readIds.includes(id);
  },

  clearAll() {
    const ids = [...this.unreadIds];
    if (ids.length > 0) {
      this.markAsRead(ids);
    }
    this.unreadIds.clear();
    this._saveState();
    this._updateDisplay(0);
  },

  syncWithEvaluations(evaluations) {
    const currentIds = new Set(evaluations.map((e) => e._id));

    // Add unread evaluations
    evaluations.forEach((evaluation) => {
      if (!this.isRead(evaluation._id)) {
        this.unreadIds.add(evaluation._id);
      }
    });

    // Remove deleted evaluations
    this.unreadIds = new Set(
      [...this.unreadIds].filter((id) => currentIds.has(id)),
    );
    this._saveState();
  },

  scheduleUpdate() {
    if (this.updateTimer) clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => this.update(), this.debounceMs);
  },

  update() {
    const count = this.unreadIds.size;
    this._updateDisplay(count);

    console.log("BadgeManager: Updated", { count, ids: [...this.unreadIds] });
  },

  _updateDisplay(count) {
    if (!this.element) return;

    if (count > 0) {
      this.element.textContent = count;
      this.element.style.display = "block";
      this._animate();
    } else {
      this.element.style.display = "none";
      this.element.textContent = "0";
    }
  },

  _animate() {
    if (!this.element) return;
    this.element.style.animation = "pulse 0.8s ease-in-out 2";
    setTimeout(() => {
      if (this.element) this.element.style.animation = "";
    }, 1600);
  },

  animateNewNotification() {
    if (!this.element) return;
    this.element.style.backgroundColor = "#ff4444";
    this._animate();
    setTimeout(() => {
      if (this.element) this.element.style.backgroundColor = "";
    }, 1600);
  },

  getCount() {
    return this.unreadIds.size;
  },
};

// ----------------------------------------------------------------------------
// 4. BROWSER NOTIFICATION SERVICE
// ----------------------------------------------------------------------------
const BrowserNotification = {
  async requestPermission() {
    if (
      Notification.permission === "default" &&
      !StorageService.has(StorageService.KEYS.PERMISSION_REQUESTED)
    ) {
      StorageService.set(StorageService.KEYS.PERMISSION_REQUESTED, "true");
      await Notification.requestPermission();
    }
  },

  show(title, body, options = {}) {
    if (Notification.permission !== "granted") {
      this.requestPermission();
      return false;
    }

    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "new-evaluation",
        requireInteraction: false,
        silent: false,
        ...options,
      });
      return true;
    } catch (e) {
      console.warn("BrowserNotification: Failed", e);
      return false;
    }
  },
};

// ----------------------------------------------------------------------------
// 5. REAL-TIME CONNECTION SERVICE (SSE)
// ----------------------------------------------------------------------------
const RealTimeConnection = {
  eventSource: null,
  reconnectDelay: 5000,
  isAuthenticated: false,
  onNewEvaluation: null,

  connect(onNewEvaluation) {
    this.onNewEvaluation = onNewEvaluation;
    this._establish();
  },

  _establish() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    try {
      this.eventSource = new EventSource("/api/notifications", {
        withCredentials: true,
      });

      this.eventSource.onopen = () => {
        console.log("RealTimeConnection: Connected");
        this.isAuthenticated = true;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_evaluation" && this.onNewEvaluation) {
            console.log(
              "RealTimeConnection: New evaluation received",
              data.data._id,
            );
            this.onNewEvaluation(data.data);
          }
        } catch (e) {
          console.warn("RealTimeConnection: Parse error", e);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error("RealTimeConnection: Error", error);
        this.eventSource.close();

        if (this.isAuthenticated) {
          console.log(
            `RealTimeConnection: Reconnecting in ${this.reconnectDelay}ms`,
          );
          setTimeout(() => this._establish(), this.reconnectDelay);
        }
      };
    } catch (e) {
      console.error("RealTimeConnection: Failed to establish", e);
    }
  },

  disconnect() {
    this.isAuthenticated = false;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    console.log("RealTimeConnection: Disconnected");
  },
};

// ----------------------------------------------------------------------------
// 6. NOTIFICATION MANAGER - Orchestrates all notification concerns
// ----------------------------------------------------------------------------
const NotificationManager = {
  initialized: false,

  init() {
    if (this.initialized) return;

    AudioService.init();
    AudioService.setupUserInteractionListeners();
    BadgeManager.init();
    BrowserNotification.requestPermission();

    // Initialize storage state
    if (!StorageService.has(StorageService.KEYS.INITIALIZED)) {
      StorageService.remove(StorageService.KEYS.LAST_VIEWED);
      StorageService.set(StorageService.KEYS.INITIALIZED, "true");
      console.log("NotificationManager: System initialized");
    }

    this.initialized = true;
  },

  async notify(evaluation) {
    // Update badge
    BadgeManager.addUnread(evaluation._id);

    // Play sound
    await AudioService.playSound();

    // Visual feedback
    BadgeManager.animateNewNotification();

    // Browser notification
    BrowserNotification.show("تقييم جديد", "تم استلام تقييم جديد");

    console.log(
      "NotificationManager: Notification triggered for",
      evaluation._id,
    );
  },

  syncBadge(evaluations) {
    BadgeManager.syncWithEvaluations(evaluations);
    BadgeManager.update();
  },

  clearAll() {
    BadgeManager.clearAll();
  },

  getUnreadCount() {
    return BadgeManager.getCount();
  },
};

// ----------------------------------------------------------------------------
// 7. CLEAR BUTTON UI COMPONENT
// ----------------------------------------------------------------------------
const ClearNotificationsButton = {
  element: null,
  hideTimeout: null,

  create() {
    if (this.element) return this.element;

    this.element = document.createElement("button");
    this.element.textContent = "مسح الإشعارات";
    this.element.className = "clear-notifications-btn";
    this.element.style.cssText = `
      position: absolute;
      right: 117px;
      top: 11%;
      transform: translateY(-50%);
      background: linear-gradient(135deg, #b10f0f, #8c0c0c);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Cairo', sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(177, 15, 15, 0.3);
      transition: all 0.3s ease;
      z-index: 1000;
      display: none;
    `;

    this.element.addEventListener("mouseenter", () => {
      this.element.style.background =
        "linear-gradient(135deg, #8c0c0c, #6a0909)";
      this.element.style.transform = "translateY(-50%) scale(1.05)";
    });

    this.element.addEventListener("mouseleave", () => {
      this.element.style.background =
        "linear-gradient(135deg, #b10f0f, #8c0c0c)";
      this.element.style.transform = "translateY(-50%) scale(1)";
    });

    this.element.addEventListener("click", () => {
      NotificationManager.clearAll();
      this.hide();
      console.log("ClearNotificationsButton: Notifications cleared");
    });

    document.body.appendChild(this.element);
    return this.element;
  },

  toggle() {
    this.create();
    const isVisible = this.element.style.display === "block";

    if (isVisible) {
      this.hide();
    } else {
      this.show();
    }
  },

  show() {
    if (!this.element) this.create();
    this.element.style.display = "block";

    // Auto-hide after 5 seconds
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => this.hide(), 5000);
  },

  hide() {
    if (this.element) {
      this.element.style.display = "none";
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  },

  contains(target) {
    return this.element && this.element.contains(target);
  },
};

// ============================================================================
// MAIN APPLICATION
// ============================================================================
document.addEventListener("DOMContentLoaded", function () {
  // -------------------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------------------
  const loginModal = document.getElementById("loginModal");
  const resetModal = document.getElementById("resetModal");
  const adminContent = document.getElementById("adminContent");
  const loginForm = document.getElementById("loginForm");
  const resetForm = document.getElementById("resetForm");
  const resetAdminPasswordBtn = document.getElementById(
    "resetAdminPasswordBtn",
  );
  const resetEmployeePasswordBtn = document.getElementById(
    "resetEmployeePasswordBtn",
  );
  const logoutBtn = document.getElementById("logoutBtn");
  const loginError = document.getElementById("loginError");
  const resetError = document.getElementById("resetError");
  const settingsIcon = document.querySelector(".settings-icon");
  const settingsMenu = document.getElementById("settingsMenu");
  const userRoleDisplay = document.getElementById("userRoleDisplay");
  const menuResetPasswordBtn = document.getElementById("menuResetPasswordBtn");
  const profileIcon = document.querySelector(".profile-icon");
  const profileMenu = document.getElementById("profileMenu");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const signOutBtn = document.getElementById("signOutBtn");
  const notificationIcon = document.querySelector(".notification-icon");

  // -------------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------------
  let userRole = null;
  let evaluations = [];
  let filteredEvaluations = [];
  let questionsChart = null;
  let overallChart = null;

  // -------------------------------------------------------------------------
  // Settings Menu
  // -------------------------------------------------------------------------
  settingsIcon.addEventListener("click", () => {
    settingsMenu.style.display =
      settingsMenu.style.display === "block" ? "none" : "block";
  });

  menuResetPasswordBtn.addEventListener("click", () => {
    resetModal.style.display = "block";
    resetModal.dataset.type = "admin";
    settingsMenu.style.display = "none";
  });

  // -------------------------------------------------------------------------
  // Push Notifications Button
  // -------------------------------------------------------------------------
  const pushNotificationsBtn = document.getElementById("pushNotificationsBtn");
  const pushStatusIndicator = document.getElementById("pushStatusIndicator");
  let pushServiceReady = false;

  // Check basic browser support for push notifications
  function checkBasicPushSupport() {
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasPushManager = "PushManager" in window;
    const hasNotification = "Notification" in window;
    return hasServiceWorker && hasPushManager && hasNotification;
  }

  // Update push notification status indicator
  function updatePushStatusUI() {
    if (typeof PushNotificationService === "undefined") {
      pushStatusIndicator.textContent = "غير متاح";
      pushStatusIndicator.style.background = "#999";
      return;
    }

    // Check basic support first
    if (!checkBasicPushSupport()) {
      pushStatusIndicator.textContent = "غير مدعوم";
      pushStatusIndicator.style.background = "#999";
      return;
    }

    const status = PushNotificationService.getStatus();
    if (status.permission === "denied") {
      pushStatusIndicator.textContent = "مرفوض";
      pushStatusIndicator.style.background = "#dc3545";
    } else if (status.subscribed) {
      pushStatusIndicator.textContent = "مفعل ✓";
      pushStatusIndicator.style.background = "#28a745";
    } else if (pushServiceReady) {
      pushStatusIndicator.textContent = "غير مفعل";
      pushStatusIndicator.style.background = "#666";
    } else {
      pushStatusIndicator.textContent = "جاري التحميل...";
      pushStatusIndicator.style.background = "#f0ad4e";
    }
  }

  // Handle push notification button click
  pushNotificationsBtn.addEventListener("click", async () => {
    if (typeof PushNotificationService === "undefined") {
      alert("خدمة الإشعارات غير متاحة");
      return;
    }

    // Check basic browser support
    if (!checkBasicPushSupport()) {
      alert(
        "متصفحك لا يدعم إشعارات الويب.\n\n" +
          "الحلول:\n" +
          "• استخدم متصفح Chrome أو Firefox أو Edge\n" +
          "• تأكد من أن المتصفح محدث\n" +
          "• على iOS: أضف الموقع للشاشة الرئيسية أولاً",
      );
      return;
    }

    // Initialize if not ready
    if (!pushServiceReady) {
      pushStatusIndicator.textContent = "جاري التحميل...";
      pushStatusIndicator.style.background = "#f0ad4e";

      try {
        await PushNotificationService.init();
        pushServiceReady = true;
      } catch (err) {
        console.error("Push init failed:", err);
        alert("فشل في تهيئة خدمة الإشعارات: " + err.message);
        updatePushStatusUI();
        return;
      }
    }

    const status = PushNotificationService.getStatus();

    if (status.permission === "denied") {
      alert(
        "تم رفض إذن الإشعارات.\n\n" +
          "لتفعيل الإشعارات:\n" +
          "1. انقر على أيقونة القفل بجانب عنوان الموقع\n" +
          "2. ابحث عن 'Notifications' أو 'الإشعارات'\n" +
          "3. غيّر الإعداد إلى 'Allow' أو 'السماح'",
      );
      return;
    }

    try {
      if (status.subscribed) {
        // Unsubscribe
        await PushNotificationService.unsubscribe();
        alert("تم إلغاء تفعيل إشعارات الهاتف");
      } else {
        // Subscribe
        const result = await PushNotificationService.subscribe();
        if (result.success) {
          alert(
            "تم تفعيل إشعارات الهاتف! ✓\nستتلقى إشعارات حتى عند إغلاق المتصفح.",
          );

          // Send test notification
          try {
            const subscription =
              await PushNotificationService.getSubscription();
            if (subscription) {
              await fetch("/api/push/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ endpoint: subscription.endpoint }),
              });
            }
          } catch (testErr) {
            console.log("Test notification skipped:", testErr.message);
          }
        } else {
          throw new Error(result.reason || "فشل في الاشتراك");
        }
      }
    } catch (error) {
      console.error("Push notification toggle error:", error);
      alert("حدث خطأ: " + error.message);
    }

    updatePushStatusUI();
    settingsMenu.style.display = "none";
  });

  // Update status on page load
  updatePushStatusUI();

  // -------------------------------------------------------------------------
  // Profile Menu
  // -------------------------------------------------------------------------
  profileIcon.addEventListener("click", () => {
    profileMenu.style.display =
      profileMenu.style.display === "block" ? "none" : "block";
  });

  signOutBtn.addEventListener("click", async () => {
    await handleLogout();
    profileMenu.style.display = "none";
  });

  editProfileBtn.addEventListener("click", () => {
    alert("تعديل الملف الشخصي - ميزة قادمة قريباً");
    profileMenu.style.display = "none";
  });

  // -------------------------------------------------------------------------
  // Notification Bell
  // -------------------------------------------------------------------------
  notificationIcon.addEventListener("click", () => {
    ClearNotificationsButton.toggle();
  });

  // -------------------------------------------------------------------------
  // Outside Click Handler
  // -------------------------------------------------------------------------
  document.addEventListener("click", (e) => {
    const isOutsideMenus =
      !settingsIcon.contains(e.target) &&
      !settingsMenu.contains(e.target) &&
      !profileIcon.contains(e.target) &&
      !profileMenu.contains(e.target) &&
      !notificationIcon.contains(e.target) &&
      !ClearNotificationsButton.contains(e.target);

    if (isOutsideMenus) {
      settingsMenu.style.display = "none";
      profileMenu.style.display = "none";
      ClearNotificationsButton.hide();
    }
  });

  // -------------------------------------------------------------------------
  // Modal Handlers
  // -------------------------------------------------------------------------
  resetModal.addEventListener("click", (e) => {
    if (e.target === resetModal) resetModal.style.display = "none";
  });

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------
  async function checkAuth() {
    try {
      const response = await fetch("/api/admin/check", {
        credentials: "include",
      });
      const data = await response.json();

      if (data.authenticated) {
        userRole = data.role;
        if (userRole === "employee") {
          window.location.href = "employee.html";
        } else {
          showAdminContent();
        }
      } else {
        showLoginModal();
      }
    } catch (error) {
      console.error("Auth check error:", error);
      showLoginModal();
    }
  }

  function showLoginModal() {
    loginModal.style.display = "block";
    adminContent.style.display = "none";
  }

  function showAdminContent() {
    loginModal.style.display = "none";
    resetModal.style.display = "none";
    adminContent.style.display = "block";

    // Role-based UI
    const isAdmin = userRole === "admin";
    document.getElementById("summaryCards").style.display = isAdmin
      ? "grid"
      : "none";
    document.getElementById("chartsSection").style.display = isAdmin
      ? "grid"
      : "none";
    document.getElementById("filterContainer").style.display = isAdmin
      ? "flex"
      : "none";
    document.getElementById("deleteHeader").style.display = isAdmin
      ? "table-cell"
      : "none";
    document.getElementById("resetAdminPasswordBtn").style.display = isAdmin
      ? "inline-block"
      : "none";
    document.getElementById("resetEmployeePasswordBtn").style.display = isAdmin
      ? "inline-block"
      : "none";
    userRoleDisplay.textContent = userRole;

    // Initialize systems
    NotificationManager.init();
    fetchEvaluations();
    setupRealTimeConnection();

    // Initialize Web Push Notifications (for mobile/desktop when browser closed)
    if (
      typeof PushNotificationService !== "undefined" &&
      checkBasicPushSupport()
    ) {
      PushNotificationService.init()
        .then(() => {
          console.log("Push notification service initialized");
          pushServiceReady = true;
          updatePushStatusUI();
          // Auto-subscribe if permission was already granted
          if (Notification.permission === "granted") {
            PushNotificationService.subscribe().catch((err) =>
              console.log("Auto-subscribe failed:", err.message),
            );
          }
        })
        .catch((err) => {
          console.log("Push service init failed:", err.message);
          updatePushStatusUI();
        });
    } else {
      updatePushStatusUI();
    }
  }

  async function handleLogout() {
    try {
      RealTimeConnection.disconnect();
      const response = await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (data.success) showLoginModal();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  // -------------------------------------------------------------------------
  // Login Handler
  // -------------------------------------------------------------------------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = new FormData(loginForm).get("password");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (data.success) {
        userRole = data.role;
        if (userRole === "employee") {
          window.location.href = "employee.html";
        } else {
          showAdminContent();
        }
      } else {
        loginError.textContent = "كلمة المرور غير صحيحة";
      }
    } catch (error) {
      console.error("Login error:", error);
      loginError.textContent = "حدث خطأ في تسجيل الدخول";
    }
  });

  logoutBtn.addEventListener("click", handleLogout);
  resetAdminPasswordBtn.addEventListener("click", () => {
    resetModal.style.display = "block";
    resetModal.dataset.type = "admin";
  });
  resetEmployeePasswordBtn.addEventListener("click", () => {
    resetModal.style.display = "block";
    resetModal.dataset.type = "employee";
  });

  // -------------------------------------------------------------------------
  // Reset Password Handler
  // -------------------------------------------------------------------------
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const resetType = resetModal.dataset.type;

    if (newPassword !== confirmPassword) {
      resetError.textContent = "كلمات المرور غير متطابقة";
      return;
    }

    const endpoint =
      resetType === "employee"
        ? "/api/admin/reset-employee-password"
        : "/api/admin/reset-admin-password";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword }),
      });
      const data = await response.json();

      if (data.success) {
        resetModal.style.display = "none";
        alert(
          `تم إعادة تعيين كلمة مرور ${resetType === "employee" ? "الموظف" : "المدير"} بنجاح`,
        );
      } else {
        resetError.textContent = "حدث خطأ في إعادة تعيين كلمة المرور";
      }
    } catch (error) {
      console.error("Reset password error:", error);
      resetError.textContent = "حدث خطأ في إعادة تعيين كلمة المرور";
    }
  });

  // -------------------------------------------------------------------------
  // Real-Time Connection
  // -------------------------------------------------------------------------
  function setupRealTimeConnection() {
    RealTimeConnection.connect(async (newEvaluation) => {
      // Notify user
      await NotificationManager.notify(newEvaluation);

      // Refresh data
      await fetchEvaluations();
    });
  }

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------
  async function fetchEvaluations() {
    try {
      const response = await fetch("/api/evaluations", {
        credentials: "include",
      });
      evaluations = await response.json();

      // Sort newest first
      evaluations.sort((a, b) => new Date(b.date) - new Date(a.date));
      filteredEvaluations = [...evaluations];

      // Sync notification state
      NotificationManager.syncBadge(evaluations);

      // Update UI
      applyFilters();
    } catch (error) {
      console.error("Fetch evaluations error:", error);
    }
  }

  // -------------------------------------------------------------------------
  // Dashboard Updates
  // -------------------------------------------------------------------------
  function updateDashboard(data) {
    populateTable(data);
    if (userRole === "admin") {
      calculateMetrics(data);
      createQuestionsChart(data);
      createOverallChart(data);
    }
  }

  function populateTable(data) {
    const tableBody = document.getElementById("tableBody");
    tableBody.innerHTML = "";

    data.forEach((evaluation) => {
      const row = document.createElement("tr");
      const date = new Date(evaluation.date).toLocaleDateString("ar-EG");
      const deleteCell =
        userRole === "admin"
          ? `<td><button class="delete-btn" data-id="${evaluation._id}" title="حذف">🗑️</button></td>`
          : "";

      row.setAttribute("data-date", evaluation.date);
      row.innerHTML = `
        <td>${date}</td>
        <td>${evaluation.name || "-"}</td>
        <td>${evaluation.phone || "-"}</td>
        <td class="eval-${evaluation.q1}">${evaluation.q1}</td>
        <td class="eval-${evaluation.q2}">${evaluation.q2}</td>
        <td class="eval-${evaluation.q3}">${evaluation.q3}</td>
        <td class="eval-${evaluation.q4}">${evaluation.q4}</td>
        <td>${evaluation.comments || "-"}</td>
        ${deleteCell}
      `;
      tableBody.appendChild(row);
    });
  }

  function calculateMetrics(data) {
    const total = data.length;
    const avg =
      total > 0
        ? (data.reduce((sum, e) => sum + e.q4, 0) / total).toFixed(1)
        : "0.0";
    const highest = total > 0 ? Math.max(...data.map((e) => e.q4)) : 0;
    const lowest = total > 0 ? Math.min(...data.map((e) => e.q4)) : 0;

    document.getElementById("totalEvaluations").textContent = total;
    document.getElementById("averageSatisfaction").textContent = avg;
    document.getElementById("highestRating").textContent = highest;
    document.getElementById("lowestRating").textContent = lowest;
  }

  // -------------------------------------------------------------------------
  // Charts
  // -------------------------------------------------------------------------
  const questionLabels = ["السؤال 1:", "السؤال 2:", "السؤال 3:", "السؤال 4:"];
  const chartColors = [
    { bg: "rgba(237, 171, 77, 0.8)", border: "rgba(237, 171, 77, 1)" },
    { bg: "rgba(177, 15, 15, 0.8)", border: "rgba(177, 15, 15, 1)" },
    { bg: "rgba(54, 162, 235, 0.8)", border: "rgba(54, 162, 235, 1)" },
    { bg: "rgba(75, 192, 192, 0.8)", border: "rgba(75, 192, 192, 1)" },
  ];

  function createQuestionsChart(data) {
    const ctx = document.getElementById("questionsChart").getContext("2d");

    const questionData = [1, 2, 3, 4].map((qNum) =>
      [1, 2, 3, 4, 5].map(
        (rating) => data.filter((e) => e[`q${qNum}`] === rating).length,
      ),
    );

    if (questionsChart) questionsChart.destroy();

    questionsChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["1", "2", "3", "4", "5"],
        datasets: questionLabels.map((label, i) => ({
          label,
          data: questionData[i],
          backgroundColor: chartColors[i].bg,
          borderColor: chartColors[i].border,
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(255,255,255,0.1)" },
            ticks: { color: "#070707", font: { size: 10 } },
          },
          x: {
            grid: { color: "rgba(255,255,255,0.1)" },
            ticks: { color: "#000", font: { size: 10 } },
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: "#000",
              font: { size: 12 },
              boxWidth: 10,
              padding: 5,
            },
          },
        },
      },
    });
  }

  function createOverallChart(data) {
    const ctx = document.getElementById("overallChart").getContext("2d");
    const counts = [1, 2, 3, 4, 5].map(
      (r) => data.filter((e) => e.q4 === r).length,
    );

    if (overallChart) overallChart.destroy();

    overallChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [
          "1 - غير راضٍ جداً",
          "2 - غير راضٍ",
          "3 - محايد",
          "4 - راضٍ",
          "5 - راضٍ جداً",
        ],
        datasets: [
          {
            data: counts,
            backgroundColor: [
              "rgba(177, 15, 15, 0.9)",
              "rgba(237, 171, 77, 0.9)",
              "rgba(255, 205, 86, 0.9)",
              "rgba(75, 192, 192, 0.9)",
              "rgba(54, 162, 235, 0.9)",
            ],
            borderColor: [
              "rgba(177, 15, 15, 1)",
              "rgba(237, 171, 77, 1)",
              "rgba(255, 205, 86, 1)",
              "rgba(75, 192, 192, 1)",
              "rgba(54, 162, 235, 1)",
            ],
            borderWidth: 2,
            hoverBorderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#000",
              font: { size: 15 },
              padding: 5,
              boxWidth: 12,
            },
          },
        },
      },
    });
  }

  // -------------------------------------------------------------------------
  // Filters
  // -------------------------------------------------------------------------
  const filterSelect = document.getElementById("satisfactionFilter");
  const searchInput = document.getElementById("searchInput");

  function applyFilters() {
    let filtered = [...evaluations];

    const searchTerm = searchInput?.value.toLowerCase().trim() || "";
    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.name?.toLowerCase().includes(searchTerm) ||
          e.phone?.toLowerCase().includes(searchTerm),
      );
    }

    const selectedValue = filterSelect?.value || "all";
    if (selectedValue !== "all") {
      filtered = filtered.filter((e) => e.q4 === parseInt(selectedValue));
    }

    filteredEvaluations = filtered;
    updateDashboard(filteredEvaluations);
  }

  filterSelect?.addEventListener("change", applyFilters);
  searchInput?.addEventListener("input", applyFilters);

  // -------------------------------------------------------------------------
  // Delete Handler
  // -------------------------------------------------------------------------
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-btn") && userRole === "admin") {
      const id = e.target.getAttribute("data-id");
      if (confirm("هل أنت متأكد من حذف هذا التقييم؟")) {
        try {
          const response = await fetch(`/api/evaluations/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (response.ok) {
            await fetchEvaluations();
          } else {
            alert("حدث خطأ في حذف التقييم");
          }
        } catch (error) {
          console.error("Delete error:", error);
          alert("حدث خطأ في حذف التقييم");
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // Print & Download
  // -------------------------------------------------------------------------
  document.getElementById("printBtn").addEventListener("click", () => {
    const printWindow = window.open("", "_blank");
    const tableHTML = document.getElementById("evaluationsTable").outerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>تقييمات العملاء</title>
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>تقييمات العملاء</h2>
          ${tableHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  });

  document.getElementById("downloadBtn").addEventListener("click", () => {
    const headers = [
      "التاريخ",
      "الاسم",
      "الهاتف",
      "السؤال 1",
      "السؤال 2",
      "السؤال 3",
      "السؤال 4",
      "التعليقات",
    ];
    let csv = headers.join(",") + "\n";

    filteredEvaluations.forEach((e) => {
      const date = new Date(e.date).toLocaleDateString("ar-EG");
      const row = [
        date,
        e.name || "-",
        e.phone || "-",
        e.q1,
        e.q2,
        e.q3,
        e.q4,
        e.comments || "-",
      ];
      csv += row.map((field) => `"${field}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "evaluations.csv";
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // -------------------------------------------------------------------------
  // Initialize
  // -------------------------------------------------------------------------
  checkAuth();
});
