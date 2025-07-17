# 🚀 Vercel Deployment Guide

## Quick Deploy Steps

### 1. Push to GitHub
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - AI Code Editor ready for deployment"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy on Vercel

1. **Go to [vercel.com](https://vercel.com)**
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Import your repository** from GitHub
5. **Vercel will auto-detect** it's a Vite app
6. **Click "Deploy"**

### 3. Configuration (Optional)

Vercel will automatically:
- ✅ Install dependencies from `package.json`
- ✅ Run `npm run build`
- ✅ Serve from `dist/` directory
- ✅ Handle routing with `vercel.json`

## Environment Variables (Future)

When you add backend features, you can set environment variables in Vercel:
- Go to Project Settings → Environment Variables
- Add variables like `VITE_API_URL`

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS instructions

## Automatic Deployments

- Every push to `main` branch = automatic deployment
- Preview deployments for pull requests
- Rollback to previous versions anytime

---

**Your AI Code Editor will be live at: `https://your-project-name.vercel.app`** 