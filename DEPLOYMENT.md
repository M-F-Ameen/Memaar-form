# Memaar Evaluation Form - Deployment Guide

## Production-Ready Features ✅

Your application has been optimized for production deployment on Railway:

### Fixed Issues

- ✅ **MongoDB Session Store**: Replaced MemoryStore with `connect-mongo` for scalable, production-ready sessions
- ✅ **Removed Deprecated Options**: Eliminated `useNewUrlParser` and `useUnifiedTopology` warnings
- ✅ **Security Headers**: Added X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, and HSTS
- ✅ **Proper CORS**: Configured with credentials support
- ✅ **Graceful Shutdown**: Added SIGTERM and SIGINT handlers for clean shutdowns
- ✅ **Middleware Protection**: Routes are now properly protected with authentication
- ✅ **Production Cookie Settings**: Secure cookies in production with httpOnly and sameSite
- ✅ **Error Handling**: Improved error handling with process.exit on MongoDB connection failure

## Deployment Steps for Railway

### 1. Prerequisites

- Create a [Railway](https://railway.app) account
- Install Railway CLI (optional): `npm install -g @railway/cli`

### 2. Set Up MongoDB

1. In Railway dashboard, click "New Project"
2. Add MongoDB from the service catalog
3. Copy the MongoDB connection string from the MongoDB service variables

### 3. Deploy Your Application

1. Click "New Service" → "GitHub Repo" (or use Railway CLI)
2. Select your repository
3. Railway will auto-detect the Node.js app

### 4. Configure Environment Variables

In Railway, add these environment variables:

```
NODE_ENV=production
PORT=8080
MONGODB_URI=<your-mongodb-connection-string-from-railway>
SESSION_SECRET=<generate-a-strong-random-secret>
FRONTEND_URL=https://<your-app-name>.railway.app
```

**Important**: Generate a strong SESSION_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Deploy

- Railway will automatically build and deploy your app
- Access your app at the generated Railway URL

## Default Passwords

⚠️ **IMPORTANT**: Change these immediately after first deployment!

- **Admin**: `admin123`
- **Employee**: `employee123`

Change passwords through the admin interface after logging in.

## Environment Variables Reference

| Variable         | Required | Default | Description                                   |
| ---------------- | -------- | ------- | --------------------------------------------- |
| `NODE_ENV`       | Yes      | -       | Set to `production`                           |
| `PORT`           | No       | 3000    | Port number (Railway sets this automatically) |
| `MONGODB_URI`    | Yes      | -       | MongoDB connection string                     |
| `SESSION_SECRET` | Yes      | -       | Secret key for session encryption             |
| `FRONTEND_URL`   | No       | \*      | Frontend URL for CORS (use your Railway URL)  |

## Health Check

Your app will respond on:

- `http://localhost:PORT` (locally)
- `https://<your-app>.railway.app` (production)

## Monitoring

- Check Railway logs for any errors
- MongoDB connection status is logged on startup
- Server listens on `0.0.0.0` to accept external connections

## Security Notes

1. ✅ Sessions stored in MongoDB (persistent, scalable)
2. ✅ Passwords hashed with bcrypt
3. ✅ Secure cookies in production (HTTPS only)
4. ✅ CORS configured to prevent unauthorized access
5. ✅ Security headers protect against common vulnerabilities
6. ⚠️ Remember to change default passwords!
7. ⚠️ Use a strong SESSION_SECRET in production

## Troubleshooting

### MongoDB Connection Issues

- Verify `MONGODB_URI` is correct
- Ensure MongoDB service is running in Railway
- Check Railway logs for connection errors

### Session Issues

- Ensure `SESSION_SECRET` is set
- Verify MongoDB connection is stable
- Check that `connect-mongo` is installed

### Build Fails

- Ensure Node.js version is 18+ (specified in package.json)
- Run `npm install` locally to verify dependencies
- Check Railway build logs

## Local Development

```bash
# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your local MongoDB URI
# Run the app
npm start
```

## Support

For issues, check:

- Railway deployment logs
- MongoDB connection status
- Environment variables are properly set
