# Endee RAG Assistant

A high-performance "Smart Document Assistant" built using **Endee Vector Database**, **FastAPI**, and **React**.

![Endee RAG](https://via.placeholder.com/800x400?text=Endee+RAG+Dashboard)

## 🚀 Features
- **Project-Based Evaluation**: Built specifically for the Endee Labs evaluation.
- **Endee Vector DB**: Uses Endee for ultra-fast vector similarity search.
- **RAG (Retrieval Augmented Generation)**: Indexes documents and retrieves relevant context for queries.
- **Dual Mode**: Switch between "Search Engine" mode (raw results) and "AI Chat" mode (Gemini powered).
- **Modern UI**: Dark-themed, responsive React interface.

## 🛠 Tech Stack
- **Database**: [Endee](https://github.com/EndeeLabs/endee) (Docker)
- **Backend**: Python (FastAPI, Sentence-Transformers, Google-GenAI)
- **Frontend**: React (Vite, TailwindCSS)

## 📦 Installation

### Prerequisites
- Docker & Docker Compose
- Python 3.8+
- Node.js 16+

### 1. Start Endee Database
```bash
docker-compose up -d
```
This starts the Endee server on port `8081`.

### 2. Setup Environment
Create a `.env` file in the root directory:
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (Optional for AI Chat)
```

### 3. Setup Backend
```bash
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --reload
```
The backend API will run at `http://localhost:8000`.

### 4. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend UI will be available at `http://localhost:5173`.

## 📖 Usage
1. Open the web interface at `http://localhost:5173`.
2. Click **Upload Document** to index a PDF or Text file.
3. Toggle between **Search** and **AI Chat** modes.
4. Type your question in the chat bar.

## 📂 Project Structure
```
├── backend/            # FastAPI Application
│   ├── main.py         # API Endpoints
│   ├── rag.py          # Endee Service Wrapper
├── frontend/           # React Application
│   ├── src/            # Components & Styles
├── docker-compose.yml  # Endee Service Config
└── README.md           # Documentation
```
