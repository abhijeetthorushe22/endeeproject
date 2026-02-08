# Deployment Guide (Free Tier)

Since this application uses **Docker** (for Endee) and **Python**, the best free hosting platform is **Render.com**, as it supports custom Docker containers.

We will split the deployment:
1.  **Backend & Database**: Render.com
2.  **Frontend**: Vercel (Optimized for React)

---

## Part 1: Prepare the Repo
1.  Create a **GitHub Account**.
2.  Create a **New Repository** (e.g., `endee-rag-app`).
3.  Push your code to GitHub:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    # Follow GitHub instructions to add remote and push
    ```

---

## Part 2: Deploy Backend + Endee (Render)

### 1. Create Endee Service (Vector DB)
1.  Sign up for [Render.com](https://render.com/).
2.  Click **New +** -> **Web Service**.
3.  Select **"Deploy an existing image from a registry"**.
4.  Enter Image URL: `endeeio/endee-server:latest`
5.  Click **Next**.
6.  **Name**: `endee-db`
7.  **Free Tier**: Select "Free".
8.  **Environment Variables**: None needed for basic setup.
9.  **Create Web Service**.
    *   *Note: Copy the `.onrender.com` URL once deployed (e.g., `https://endee-db.onrender.com`).*

### 2. Create Backend Service (Python API)
1.  Click **New +** -> **Web Service**.
2.  Select **"Build and deploy from a Git repository"**.
3.  Connect your GitHub repo.
4.  **Name**: `rag-backend`
5.  **Root Directory**: `backend` (Important!)
6.  **Runtime**: Python 3
7.  **Build Command**: `pip install -r requirements.txt`
8.  **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
9.  **Environment Variables**:
    *   `ENDEE_URL`: Paste the Endee URL from Step 1 (e.g., `https://endee-db.onrender.com`)
    *   `GEMINI_API_KEY`: Paste your actual API Key.
10. **Create Web Service**.

---

## Part 3: Deploy Frontend (Vercel)

### 1. Update Frontend Config
Before deploying, the frontend needs to know where the live backend is.
1.  Open `frontend/src/App.jsx`.
2.  Change `const API_URL = "http://localhost:8000";` to `const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";`
3.  Push changes to GitHub.

### 2. Deploy
1.  Sign up for [Vercel.com](https://vercel.com/).
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repo.
4.  **Root Directory**: Click "Edit" and select `frontend`.
5.  **Environment Variables**:
    *   `VITE_API_URL`: Your Render Backend URL (e.g., `https://rag-backend.onrender.com`)
6.  Click **Deploy**.

---

## ⚠️ Important Limitations (Free Tier)
1.  **Spin Down**: Render's free services "sleep" after 15 minutes of inactivity. The first request will take 30-60 seconds to wake them up.
2.  **Data Persistence**: On the free tier, if the Endee Docker container restarts, **you lose your indexed items**. You will need to re-upload documents.
    *   *Fix:* Upgrade to a paid plan with persistent disk, or re-upload documents for each demo session.
