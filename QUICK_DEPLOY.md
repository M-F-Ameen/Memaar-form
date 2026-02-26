# 🚀 Quick Deploy to Railway

## 1️⃣ Setup Railway Project

```bash
# Login to Railway (if using CLI)
railway login

# Or use Railway web dashboard: https://railway.app
```

## 2️⃣ Add MongoDB

- Click "New" → "Database" → "Add MongoDB"
- Copy the `MONGODB_URI` connection string

## 3️⃣ Set Environment Variables

Add these in Railway project settings:

| Variable         | Value                  | Example                                                                         |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------- |
| `NODE_ENV`       | `production`           | production                                                                      |
| `PORT`           | `8080`                 | 8080                                                                            |
| `MONGODB_URI`    | From MongoDB service   | mongodb://mongo:...                                                             |
| `SESSION_SECRET` | Generate strong secret | Use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FRONTEND_URL`   | Your Railway URL       | https://yourapp.railway.app                                                     |

## 4️⃣ Deploy

```bash
# Option A: Connect GitHub repo
# - Push code to GitHub
# - Connect repo in Railway dashboard

# Option B: Use Railway CLI
cd "z:\Memaar form\memaar working in location\version one\version one"
railway up
```

## 5️⃣ Verify Deployment

✅ Check Railway logs - should see:

```
Connected to MongoDB
Admin password already set
Employee password already set
Server running on port 8080
```

✅ NO warnings about:

- MemoryStore
- useNewUrlParser
- useUnifiedTopology

## 6️⃣ Change Default Passwords!

⚠️ **CRITICAL SECURITY STEP**

- Login with `admin123` or `employee123`
- Go to settings and change passwords immediately!

## 🎉 Done!

Your app is now:

- ✅ Production-ready
- ✅ Scalable
- ✅ Secure
- ✅ No memory leaks
- ✅ Persistent sessions

## 📝 Need Help?

See `DEPLOYMENT.md` for detailed instructions.
