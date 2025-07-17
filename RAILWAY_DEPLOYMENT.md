# Railway Backend Deployment Guide

## Overview
This guide will help you deploy your AI Code Editor backend to Railway's $5 hobby tier, which provides:
- Full file system operations
- Git integration
- Package installation capabilities
- WebSocket support
- Persistent storage

## Prerequisites
1. Railway account (sign up at https://railway.app)
2. GitHub account (for connecting your repository)
3. Your backend code ready for deployment

## Step 1: Prepare Your Repository

### Option A: Deploy from GitHub (Recommended)
1. Push your backend code to a GitHub repository
2. Make sure the backend folder is at the root or in a subdirectory
3. Ensure all Railway configuration files are included:
   - `railway.json`
   - `.railwayignore`
   - `Dockerfile`

### Option B: Deploy from Local Files
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`

## Step 2: Deploy to Railway

### Via Railway Dashboard (Recommended)
1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the backend directory as the source
6. Railway will automatically detect the Dockerfile and deploy

### Via Railway CLI
```bash
# Navigate to backend directory
cd backend

# Login to Railway
railway login

# Initialize project
railway init

# Deploy
railway up
```

## Step 3: Configure Environment Variables

In your Railway project dashboard, add these environment variables:

### Required Variables
```
NODE_ENV=production
PORT=8080
WORKSPACE_PATH=/workspace
```

### Optional Variables (for enhanced features)
```
OLLAMA_URL=your-ollama-url:11434
ENABLE_SSH=true
SSH_PRIVATE_KEY=your-ssh-key
GITHUB_TOKEN=your-github-token
```

## Step 4: Get Your Backend URL

After deployment, Railway will provide you with:
- **Production URL**: `https://your-app-name.railway.app`
- **Custom Domain**: You can add your own domain in the Railway dashboard

## Step 5: Update Frontend Configuration

Update your frontend to use the Railway backend URL:

### For Development
In `src/config/api.ts` or similar:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
```

### For Production
Set these environment variables in your Vercel deployment:
- `VITE_API_URL=https://your-app-name.railway.app`
- `VITE_WS_URL=wss://your-app-name.railway.app`

## Step 6: Test Your Deployment

1. **Health Check**: Visit `https://your-app-name.railway.app/api/health`
2. **File Operations**: Test file upload/download through your frontend
3. **Terminal**: Verify terminal functionality works
4. **WebSocket**: Check real-time features

## Railway Hobby Tier Features

### What's Included ($5/month):
- ✅ 500 hours of runtime
- ✅ 1GB RAM
- ✅ Shared CPU
- ✅ 1GB storage
- ✅ Custom domains
- ✅ Automatic deployments
- ✅ Environment variables
- ✅ Logs and monitoring

### Perfect for:
- Development and testing
- Small to medium projects
- File system operations
- Git integration
- WebSocket connections

## Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check Railway logs in the dashboard
   - Verify Dockerfile syntax
   - Ensure all dependencies are in package.json

2. **Port Issues**
   - Railway automatically assigns PORT environment variable
   - Make sure your app uses `process.env.PORT || 8080`

3. **File System Permissions**
   - Railway provides persistent storage at `/workspace`
   - Ensure your app creates necessary directories

4. **WebSocket Issues**
   - Railway supports WebSockets out of the box
   - Use `wss://` for secure WebSocket connections in production

### Getting Help:
- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check deployment logs in Railway dashboard

## Next Steps

After successful deployment:
1. Test all features thoroughly
2. Set up custom domain (optional)
3. Configure monitoring and alerts
4. Set up automatic deployments from GitHub
5. Consider upgrading to Pro tier for more resources

## Cost Optimization

- Railway charges per hour of runtime
- Your app will sleep after 15 minutes of inactivity
- Wake up time is ~30 seconds
- Monitor usage in Railway dashboard
- Consider using Railway's sleep feature for development 