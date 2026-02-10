# 🚀 Deployment Guide — Endee RAG v3.0

Deploy for **free** using **Render.com** (backend + database) and **Vercel** (frontend).

---

## Step 1: Deploy Backend + Database on Render

### 1A. Create Endee Database Service

1. Go to [render.com](https://render.com/) and sign up (use GitHub login).
2. Click **New +** → **Web Service**.
3. Select **"Deploy an existing image from a registry"**.
4. Enter Image URL: `endeeio/endee-server:latest`
5. Click **Next**.
6. Set:
   - **Name**: `endee-db`
   - **Region**: Any (choose closest to you)
   - **Instance Type**: **Free**
7. Click **Create Web Service**.
8. ⏳ Wait for it to deploy (2-3 minutes).
9. **📋 Copy the URL** once deployed (e.g., `https://endee-db-xxxx.onrender.com`).

### 1B. Create Backend Service

1. Click **New +** → **Web Service**.
2. Select **"Build and deploy from a Git repository"**.
3. Connect your GitHub account and select `abhijeetthorushe22/endeeproject`.
4. Set:
   - **Name**: `rag-backend`
   - **Root Directory**: Leave empty (root of repo)
   - **Runtime**: **Python 3**
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: **Free**
5. **Environment Variables** — Click "Add Environment Variable":
   - `ENDEE_URL` = paste the Endee URL from Step 1A (e.g., `https://endee-db-xxxx.onrender.com`)
   - `GEMINI_API_KEY` = your Gemini API key (get free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
6. Click **Create Web Service**.
7. ⏳ Wait for it to deploy (5-8 minutes, first build downloads the ML model).
8. **📋 Copy the backend URL** (e.g., `https://rag-backend-xxxx.onrender.com`).

---

## Step 2: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com/) and sign up (use GitHub login).
2. Click **Add New...** → **Project**.
3. Import `abhijeetthorushe22/endeeproject` from GitHub.
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: Click **Edit** → type `frontend` → **Continue**
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
5. **Environment Variables** — Click "Add":
   - **Name**: `VITE_API_URL`  
   - **Value**: paste the backend URL from Step 1B (e.g., `https://rag-backend-xxxx.onrender.com`)
6. Click **Deploy**.
7. ⏳ Wait ~1 minute. Vercel will give you a URL like `https://endeeproject.vercel.app`.

---

## ✅ Done!

Your app is now live at your **Vercel URL**! Share this URL with anyone.

### Your URLs:
| Service | URL |
|---------|-----|
| Frontend | `https://endeeproject.vercel.app` (or similar) |
| Backend API | `https://rag-backend-xxxx.onrender.com` |
| Endee DB | `https://endee-db-xxxx.onrender.com` |

---

## ⚠️ Free Tier Notes

1. **Cold Starts**: Render free services "sleep" after 15 min of inactivity. First request takes ~30-60 seconds to wake up. This is normal.
2. **No Persistence**: Endee data is lost when the container restarts. You'll need to re-upload documents for each demo session.
3. **ML Model Download**: The first backend startup downloads the `all-MiniLM-L6-v2` model (~90MB). Subsequent starts are faster if cached.

### Tips:
- **Before demo**: Open the backend URL in your browser first to "wake it up".
- **Search mode** works without Gemini API key. Only AI Chat needs it.
- Vercel frontend is always fast (no cold starts).
