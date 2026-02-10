# Endee RAG Assistant v3.0

A high-performance **Smart Document Assistant** built with **Endee Vector Database**, **FastAPI**, and **React**.

## 🚀 Features

### Core
- **Endee Vector DB** — Ultra-fast vector similarity search
- **RAG (Retrieval Augmented Generation)** — Indexes documents and retrieves relevant context
- **Dual Mode** — Switch between **Search Engine** mode (raw results) and **AI Chat** mode (Gemini-powered)
- **Conversation Memory** — Follow-up questions use previous context for better answers

### Advanced
- **Smart Chunking** — Sliding-window text chunking with overlap for better retrieval
- **Conversation Management** — Create, switch, rename, export, and delete conversations
- **Document Management** — Upload, list, summarize, and delete indexed documents
- **AI Document Summarization** — Auto-generate bullet-point summaries of uploaded documents
- **Query Analytics** — Track total queries, average response time
- **Export Chat** — Download any conversation as a Markdown file
- **Drag & Drop Upload** — Drop files directly onto the sidebar
- **Markdown Rendering** — AI responses rendered with rich Markdown formatting
- **Toast Notifications** — Real-time feedback for all actions
- **Health Monitoring** — Live Endee & Gemini connection status indicators
- **Keyboard Shortcuts** — `Ctrl+N` new chat, `Ctrl+K` focus search
- **Responsive Design** — Works beautifully on mobile with collapsible sidebar
- **Model Fallback** — Automatically tries multiple Gemini models if one is rate-limited

### UI/UX
- **Premium Dark Theme** — Deep purple-violet palette with glassmorphism
- **Micro-animations** — Floating elements, typing indicators, message entrance animations
- **Copy & Regenerate** — Copy AI responses or regenerate answers with one click
- **Modern Typography** — Inter font from Google Fonts
- **Component Architecture** — Clean, modular React components

## 🛠 Tech Stack
- **Database**: [Endee](https://github.com/EndeeLabs/endee) (Docker)
- **Backend**: Python (FastAPI, Sentence-Transformers, Google-GenAI)
- **Frontend**: React 19 (Vite, TailwindCSS v4, React-Markdown)

---

## 📦 Quick Start

### Prerequisites
- **Docker & Docker Compose** — for Endee database
- **Python 3.8+** — for the backend
- **Node.js 16+** — for the frontend
- **Gemini API Key** — for AI Chat mode (free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### Step 1: Clone & Setup Environment
```bash
git clone <repo-url>
cd endee-rag

# Create your .env file from the template
cp .env.example .env
```

**⚠️ IMPORTANT:** Open `.env` and add your own Gemini API key:
```
GEMINI_API_KEY=your_actual_key_here
```
> Get a free key at: **https://aistudio.google.com/apikey**
>
> **Note:** Search mode works without a Gemini key. Only AI Chat mode requires it.

### Step 2: Start Endee Database
```bash
docker-compose up -d
```
This starts the Endee vector database server on port `8081`.

### Step 3: Install & Run Backend
```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload
```
The backend API will run at **http://localhost:8000**.

### Step 4: Install & Run Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend UI will be available at **http://localhost:5173**.

### Step 5: Use the App!
1. Open **http://localhost:5173** in your browser
2. Upload a PDF or text document using the sidebar
3. Toggle between **Search** and **AI Chat** modes
4. Ask questions about your documents!

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Root status check |
| `GET` | `/health` | Detailed health info |
| `GET` | `/stats` | Document & connection statistics |
| `GET` | `/documents` | List all indexed documents |
| `DELETE` | `/documents/{filename}` | Remove a document |
| `POST` | `/ingest` | Upload & index a document |
| `POST` | `/query` | Search or chat with documents |
| `POST` | `/summarize` | Generate AI summary of a document |
| `GET` | `/conversations` | List all conversations |
| `GET` | `/conversations/{id}` | Get conversation details |
| `PUT` | `/conversations/{id}/rename` | Rename a conversation |
| `DELETE` | `/conversations/{id}` | Delete a conversation |
| `GET` | `/conversations/{id}/export` | Export conversation as Markdown |
| `GET` | `/analytics` | Query analytics summary |

---

## 📂 Project Structure
```
├── backend/
│   ├── main.py              # FastAPI endpoints, chunking, conversation mgmt
│   ├── rag.py               # Endee service, embeddings, Gemini w/ fallback
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # Modular React components
│   │   │   ├── Sidebar.jsx      # Conversations, documents, upload
│   │   │   ├── ChatMessage.jsx  # Message bubble w/ copy, regenerate
│   │   │   ├── SearchResults.jsx
│   │   │   ├── WelcomeScreen.jsx
│   │   │   └── Toast.jsx
│   │   ├── App.jsx          # Main application
│   │   ├── index.css        # Complete design system
│   │   └── main.jsx         # Entry point
│   └── package.json
├── docker-compose.yml       # Endee database service
├── .env.example             # Environment template (copy to .env)
├── render.yaml              # Deployment config
└── README.md
```

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENDEE_URL` | Yes | URL for Endee vector database (default: `http://localhost:8081`) |
| `GEMINI_API_KEY` | For AI Chat | Google Gemini API key. Get free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

> **Note:** The `.env` file is git-ignored for security. Each user must create their own `.env` from `.env.example`.
