const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const webpush = require("web-push");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// ============================================================================
// WEB PUSH CONFIGURATION
// ============================================================================
// Generate VAPID keys using: npx web-push generate-vapid-keys
// Then add to your .env file:
// VAPID_PUBLIC_KEY=your_public_key
// VAPID_PRIVATE_KEY=your_private_key
// VAPID_EMAIL=mailto:your@email.com
// ============================================================================

// VAPID keys for Web Push - MUST be set in environment variables for production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@example.com";

// Configure web-push if VAPID keys are available
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log("Web Push configured with VAPID keys");
} else {
  console.warn(
    "VAPID keys not configured! Web Push notifications will not work.",
    "\nGenerate keys with: npx web-push generate-vapid-keys",
    "\nThen add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL to .env",
  );
}

// Trust proxy - CRITICAL for Railway/production
if (isProduction) {
  app.set("trust proxy", 1);
}

// MongoDB connection string
const mongoUri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/memaar-form";

// Middleware
app.use(
  cors({
    origin: true, // Allow all origins in production (Railway needs this)
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.static("."));

// Security headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  if (isProduction) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  next();
});

// Session middleware - use mongoUrl instead of client
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: "sessions",
      ttl: 24 * 60 * 60, // 24 hours
    }),
    cookie: {
      secure: isProduction, // true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? "none" : "lax", // "none" required for Railway with credentials
    },
  }),
);

// MongoDB connection (without deprecated options)
mongoose
  .connect(mongoUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Evaluation Schema
const evaluationSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  name: { type: String, required: false },
  phone: { type: String, required: false },
  q1: { type: Number, required: true, min: 1, max: 5 },
  q2: { type: Number, required: true, min: 1, max: 5 },
  q3: { type: Number, required: true, min: 1, max: 5 },
  q4: { type: Number, required: true, min: 1, max: 5 },
  comments: { type: String, required: false },
});
const Evaluation = mongoose.model("Evaluation", evaluationSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
  password: { type: String, required: true },
});

const Admin = mongoose.model("Admin", adminSchema);

// Employee Schema
const employeeSchema = new mongoose.Schema({
  password: { type: String, required: true },
});

const Employee = mongoose.model("Employee", employeeSchema);

// Push Subscription Schema - for Web Push Notifications
const pushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now },
  lastUsed: { type: Date, default: Date.now },
  userAgent: { type: String },
  isActive: { type: Boolean, default: true },
});

const PushSubscription = mongoose.model(
  "PushSubscription",
  pushSubscriptionSchema,
);

// Admin-only middleware
function requireAdmin(req, res, next) {
  console.log("requireAdmin check:", {
    hasSession: !!req.session,
    isAdmin: req.session?.admin,
    sessionID: req.sessionID,
    role: req.session?.role,
  });
  if (req.session && req.session.admin) {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}

// Routes
app.get("/api/evaluations", requireAdmin, async (req, res) => {
  try {
    const evaluations = await Evaluation.find().sort({ date: -1 });
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/evaluations", async (req, res) => {
  try {
    const evaluation = new Evaluation(req.body);
    await evaluation.save();

    // Send SSE notification to all connected clients (in-browser)
    clients.forEach((client) => {
      client.write(
        `data: ${JSON.stringify({
          type: "new_evaluation",
          data: evaluation,
        })}\n\n`,
      );
    });

    // Send Web Push notification to all subscribers (even when browser closed)
    const avgRating = (
      (evaluation.q1 + evaluation.q2 + evaluation.q3 + evaluation.q4) /
      4
    ).toFixed(1);

    sendPushToAllSubscribers({
      title: "تقييم جديد! 📝",
      body: evaluation.name
        ? `${evaluation.name} - متوسط التقييم: ${avgRating}/5`
        : `تقييم مجهول - متوسط التقييم: ${avgRating}/5`,
      icon: "/images/Logo.PNG",
      badge: "/images/Logo.PNG",
      tag: `evaluation-${evaluation._id}`,
      data: {
        evaluationId: evaluation._id,
        url: "/admin.html",
      },
      timestamp: Date.now(),
    }).catch((err) => console.error("Push notification error:", err));

    res.status(201).json(evaluation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/api/evaluations/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await Evaluation.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes for admin authentication
app.get("/api/admin/check", (req, res) => {
  if (req.session.admin) {
    res.json({ authenticated: true, role: req.session.role || "admin" });
  } else {
    res.json({ authenticated: false });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    let user = await Employee.findOne();
    if (user && (await bcrypt.compare(password, user.password))) {
      req.session.admin = true;
      req.session.role = "employee";
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Session save failed" });
        }
        console.log("Employee logged in, session saved:", req.sessionID);
        res.json({ success: true, role: "employee" });
      });
    } else {
      user = await Admin.findOne();
      if (user && (await bcrypt.compare(password, user.password))) {
        req.session.admin = true;
        req.session.role = "admin";
        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ error: "Session save failed" });
          }
          console.log("Admin logged in, session saved:", req.sessionID);
          res.json({ success: true, role: "admin" });
        });
      } else {
        res.status(401).json({ success: false, message: "Invalid password" });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true });
    }
  });
});

app.post("/api/admin/reset-admin-password", async (req, res) => {
  try {
    // Allow unauthenticated access only if no admin password is set yet
    const existingAdmin = await Admin.findOne();
    if (existingAdmin && !req.session.admin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Admin.findOneAndUpdate(
      {},
      { password: hashedPassword },
      { upsert: true },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/reset-employee-password", async (req, res) => {
  try {
    // Only admin can reset employee password
    if (!req.session.admin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await Employee.findOneAndUpdate(
      {},
      { password: hashedPassword },
      { upsert: true },
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize default passwords if not set
async function initializePasswords() {
  try {
    let admin = await Admin.findOne();
    if (!admin) {
      const hashedAdminPassword = await bcrypt.hash("admin123", 10);
      await Admin.create({ password: hashedAdminPassword });
      console.log("Admin password initialized to: admin123");
    } else {
      console.log("Admin password already set");
    }

    let employee = await Employee.findOne();
    if (!employee) {
      const hashedEmployeePassword = await bcrypt.hash("employee123", 10);
      await Employee.create({ password: hashedEmployeePassword });
      console.log("Employee password initialized to: employee123");
    } else {
      console.log("Employee password already set");
    }
  } catch (error) {
    console.error("Error initializing passwords:", error);
  }
}

// Call initialization after MongoDB connection
mongoose.connection.once("open", () => {
  initializePasswords();
});

// ============================================================================
// WEB PUSH API ENDPOINTS
// ============================================================================

// Get public VAPID key for client subscription
app.get("/api/push/vapid-public-key", (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res
      .status(503)
      .json({ error: "Push notifications not configured on server" });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
app.post("/api/push/subscribe", requireAdmin, async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "Invalid subscription object" });
    }

    // Upsert subscription (update if exists, create if not)
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: userAgent || "Unknown",
        lastUsed: new Date(),
        isActive: true,
      },
      { upsert: true, new: true },
    );

    console.log("Push subscription saved:", subscription.endpoint.slice(-20));
    res.json({ success: true, message: "Subscription saved" });
  } catch (error) {
    console.error("Error saving push subscription:", error);
    res.status(500).json({ error: error.message });
  }
});

// Unsubscribe from push notifications
app.post("/api/push/unsubscribe", requireAdmin, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint required" });
    }

    await PushSubscription.findOneAndDelete({ endpoint });
    console.log("Push subscription removed:", endpoint.slice(-20));
    res.json({ success: true, message: "Subscription removed" });
  } catch (error) {
    console.error("Error removing push subscription:", error);
    res.status(500).json({ error: error.message });
  }
});

// Sync subscription status (check if still subscribed)
app.post("/api/push/sync", requireAdmin, async (req, res) => {
  try {
    const { endpoint } = req.body;

    const subscription = await PushSubscription.findOne({ endpoint });
    res.json({
      isSubscribed: !!subscription && subscription.isActive,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test push notification (admin only)
app.post("/api/push/test", requireAdmin, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(503).json({ error: "Push not configured" });
    }

    // Find the specific subscription to test
    const subscription = await PushSubscription.findOne({
      endpoint,
      isActive: true,
    });

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const pushPayload = JSON.stringify({
      title: "اختبار الإشعارات",
      body: "إشعارات الدفع تعمل بنجاح! 🎉",
      icon: "/images/Logo.PNG",
      badge: "/images/Logo.PNG",
      tag: "test-notification",
      timestamp: Date.now(),
    });

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      pushPayload,
    );

    subscription.lastUsed = new Date();
    await subscription.save();

    res.json({ success: true, message: "Test notification sent" });
  } catch (error) {
    console.error("Error sending test push:", error);

    // Handle expired/invalid subscriptions
    if (error.statusCode === 410 || error.statusCode === 404) {
      await PushSubscription.findOneAndUpdate(
        { endpoint: req.body.endpoint },
        { isActive: false },
      );
      return res
        .status(410)
        .json({ error: "Subscription expired", needsResubscribe: true });
    }

    res.status(500).json({ error: error.message });
  }
});

// Function to send push notification to all active subscribers
async function sendPushToAllSubscribers(payload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("Push not configured, skipping push notifications");
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await PushSubscription.find({ isActive: true });
  const pushPayload = JSON.stringify(payload);

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        pushPayload,
      );
      sub.lastUsed = new Date();
      await sub.save();
      sent++;
    } catch (error) {
      console.error("Push failed for:", sub.endpoint.slice(-20), error.message);

      // Mark expired subscriptions as inactive
      if (error.statusCode === 410 || error.statusCode === 404) {
        sub.isActive = false;
        await sub.save();
      }
      failed++;
    }
  }

  console.log(`Push notifications: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

// Server-Sent Events for real-time notifications
const clients = [];

app.get("/api/notifications", requireAdmin, (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  clients.push(res);
  req.on("close", () => {
    clients.splice(clients.indexOf(res), 1);
  });
});

// Start server
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  if (!isProduction) {
    console.log(`Access on your phone: http://192.168.1.76:${PORT}`);
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    mongoose.connection.close().then(() => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    mongoose.connection.close().then(() => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});
