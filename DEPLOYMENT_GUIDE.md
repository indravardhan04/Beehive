# Beehive Deployment Guide

## Overview
This guide helps you deploy the Beehive project:
- **Frontend**: Vercel (static HTML/CSS/JS)
- **Backend**: Railway (Node.js/Express)
- **Database**: Neo4j (you manage separately)

---

## Prerequisites

1. **Neo4j Database**
   - You should already have Neo4j credentials ready
   - Get your connection URI, username, and password

2. **Git Repository**
   - Push your project to GitHub (Railway and Vercel integrate with GitHub)
   - You'll need a GitHub account

3. **Accounts**
   - Railway account (https://railway.app)
   - Vercel account (https://vercel.com)

---

## Step 1: Prepare Backend Environment Variables

Before deploying, fill in your credentials in the `.env` file:

```
NEO4J_URI=<your-neo4j-uri>
NEO4J_USERNAME=<your-neo4j-username>
NEO4J_PASSWORD=<your-neo4j-password>
JWT_SECRET=<generate-a-strong-secret-key>
```

**Important**: Never commit the `.env` file to GitHub. Add it to `.gitignore`:
```
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
```

---

## Step 2: Deploy Backend to Railway

### 2.1 Create a Railway Project
1. Go to https://railway.app and sign in
2. Click "New Project" → "Deploy from GitHub"
3. Select your GitHub repository and the `backend` folder as the root directory

### 2.2 Add Environment Variables
1. In Railway dashboard, go to your project
2. Click "Variables" 
3. Add these variables:
   - `NEO4J_URI`
   - `NEO4J_USERNAME`
   - `NEO4J_PASSWORD`
   - `JWT_SECRET` (use a strong random string)
   - `PORT=5000` (optional; Railway sets this automatically)

### 2.3 Deploy
1. Railway automatically deploys when you push to GitHub
2. Your backend URL will be something like: `https://beehive-production-3a0a.up.railway.app`
3. Copy this URL — you'll need it for the frontend

---

## Step 3: Update Frontend Configuration

1. Open `frontend/js/config.js`
2. Update the `backendUrl` with your Railway URL:
   ```javascript
   const backendUrl = "https://your-railway-url.up.railway.app";
   ```

3. Update `backend/server.js` CORS allowed origins if needed:
   ```javascript
   const allowedOrigins = [
       "https://your-vercel-domain.vercel.app",
       "https://your-custom-domain.com"
   ];
   ```

4. Commit these changes:
   ```bash
   git add .
   git commit -m "Update Backend URL for production"
   git push
   ```

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Create a Vercel Project
1. Go to https://vercel.com and sign in
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. **Important**: Set the "Root Directory" to `frontend`

### 4.2 Configure Build Settings
1. **Framework**: Select "Other" (since it's static HTML)
2. **Build Command**: Leave blank (no build needed)
3. **Output Directory**: Leave blank
4. Click "Deploy"

### 4.3 Custom Domain (Optional)
1. After deployment, go to project settings
2. Add a custom domain under "Domains"

---

## Step 5: Test Your Deployment

1. Visit your Vercel frontend URL
2. Try registering a new account
3. Test login functionality
4. Check browser console for any errors

If you see CORS errors, update the `allowedOrigins` in `backend/server.js` with your Vercel URL.

---

## Troubleshooting

### Backend not connecting to Neo4j
- Verify Neo4j credentials in Railway variables
- Check that your Neo4j database is running and accessible
- Look at Railway logs: Project → Deployments → View logs

### CORS errors in browser console
- Update `allowedOrigins` in `backend/server.js`
- Make sure it includes your Vercel domain
- Redeploy backend after changes

### Frontend can't connect to backend
- Verify the `backendUrl` in `frontend/js/config.js` is correct
- Check that the backend is running (visit the health endpoint: `/api/health`)
- Verify CORS is configured correctly

### "Database not configured" error
- Check that Neo4j environment variables are set in Railway
- Verify the URI format is correct (should be `neo4j+s://`)

---

## Environment Variables Reference

### Backend (.env or Railway Variables)
| Variable | Example | Required |
|----------|---------|----------|
| NEO4J_URI | neo4j+s://xyz.neo4j.io | ✓ |
| NEO4J_USERNAME | neo4j | ✓ |
| NEO4J_PASSWORD | your-password | ✓ |
| JWT_SECRET | abc123xyz | ✓ |
| PORT | 5000 | Optional |

---

## Next Steps

- Monitor your deployments in Railway and Vercel dashboards
- Set up CI/CD: Railway and Vercel auto-deploy on GitHub push
- Configure custom domains for both services
- Set up automated logs and monitoring

Good luck with your Beehive deployment! 🐝
