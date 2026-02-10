from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
import uvicorn
import shutil
import os
import time
import uuid
import logging
from pypdf import PdfReader
from backend.rag import RAGService

# -------------------------------------------------------------------
# Logging
# -------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
logger = logging.getLogger(__name__)

# -------------------------------------------------------------------
# In-memory stores
# -------------------------------------------------------------------
conversation_store: Dict[str, dict] = {}   # conv_id -> { id, title, messages[], created_at, updated_at }
document_store: Dict[str, dict] = {}       # filename -> meta
query_analytics: List[dict] = []           # [{query, mode, timestamp, response_time_ms}]

# -------------------------------------------------------------------
# Lifespan
# -------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up… Initialising RAG Service")
    try:
        app.state.rag_service = RAGService()
        logger.info("RAG Service initialised successfully!")
    except Exception as e:
        logger.warning(f"Could not connect to Endee on startup: {e}")
        app.state.rag_service = None
    yield
    logger.info("Shutting down…")


app = FastAPI(
    title="Endee RAG API",
    description="A smart document assistant powered by Endee Vector DB, Sentence-Transformers & Gemini.",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------------------------
# Helpers
# -------------------------------------------------------------------
def get_rag_service(request: Request) -> RAGService:
    if request.app.state.rag_service is None:
        try:
            request.app.state.rag_service = RAGService()
        except Exception as e:
            logger.error(f"Failed to initialise RAGService: {e}")
            raise HTTPException(status_code=503, detail=f"RAG Service unavailable: {e}")
    return request.app.state.rag_service


def smart_chunk(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """Sliding-window chunker that respects sentence boundaries."""
    sentences = []
    for para in text.split("\n"):
        para = para.strip()
        if not para:
            continue
        for sent in para.replace(". ", ".\n").split("\n"):
            sent = sent.strip()
            if sent:
                sentences.append(sent)

    chunks: List[str] = []
    current_chunk = ""
    for sent in sentences:
        if len(current_chunk) + len(sent) + 1 > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            words = current_chunk.split()
            overlap_words = words[-min(len(words), overlap // 5):]
            current_chunk = " ".join(overlap_words) + " " + sent
        else:
            current_chunk += " " + sent
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    return chunks


def generate_title_from_query(query: str) -> str:
    """Create a short title from the first user query."""
    title = query.strip()[:60]
    if len(query.strip()) > 60:
        title += "…"
    return title


# -------------------------------------------------------------------
# Models
# -------------------------------------------------------------------
class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    mode: str = "chat"
    conversation_id: Optional[str] = None

class QueryResponse(BaseModel):
    results: List[dict]
    answer: Optional[str] = None
    conversation_id: Optional[str] = None

class DocumentInfo(BaseModel):
    filename: str
    chunks: int
    size_bytes: int
    uploaded_at: float

class StatsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    total_conversations: int
    total_queries: int
    endee_connected: bool
    gemini_enabled: bool

class ConversationSummary(BaseModel):
    id: str
    title: str
    message_count: int
    created_at: float
    updated_at: float

class ConversationDetail(BaseModel):
    id: str
    title: str
    messages: List[dict]
    created_at: float
    updated_at: float

class RenameRequest(BaseModel):
    title: str

class SummarizeRequest(BaseModel):
    filename: str

# -------------------------------------------------------------------
# Core Endpoints
# -------------------------------------------------------------------
@app.get("/")
def read_root():
    return {"status": "ok", "service": "Endee RAG API", "version": "3.0.0"}


@app.get("/health")
def health_check(request: Request):
    rag_ok = request.app.state.rag_service is not None
    gemini_ok = rag_ok and getattr(request.app.state.rag_service, "has_gemini", False)
    return {
        "status": "healthy" if rag_ok else "degraded",
        "endee_connected": rag_ok,
        "gemini_enabled": gemini_ok,
        "documents_loaded": len(document_store),
        "active_conversations": len(conversation_store),
    }


@app.get("/stats", response_model=StatsResponse)
def get_stats(request: Request):
    rag = request.app.state.rag_service
    total_chunks = sum(d.get("chunks", 0) for d in document_store.values())
    return StatsResponse(
        total_documents=len(document_store),
        total_chunks=total_chunks,
        total_conversations=len(conversation_store),
        total_queries=len(query_analytics),
        endee_connected=rag is not None,
        gemini_enabled=rag is not None and getattr(rag, "has_gemini", False),
    )


# -------------------------------------------------------------------
# Document Endpoints
# -------------------------------------------------------------------
@app.get("/documents", response_model=List[DocumentInfo])
def list_documents():
    return [
        DocumentInfo(
            filename=meta["filename"],
            chunks=meta["chunks"],
            size_bytes=meta["size_bytes"],
            uploaded_at=meta["uploaded_at"],
        )
        for meta in document_store.values()
    ]


@app.delete("/documents/{filename}")
def delete_document(filename: str):
    if filename in document_store:
        del document_store[filename]
        return {"status": "deleted", "filename": filename}
    raise HTTPException(status_code=404, detail="Document not found")


@app.post("/ingest")
async def ingest_file(request: Request, file: UploadFile = File(...)):
    service = get_rag_service(request)
    temp_file = f"temp_{file.filename}"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(temp_file)

    try:
        text_content = ""
        if file.filename.lower().endswith(".pdf"):
            reader = PdfReader(temp_file)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_content += page_text + "\n"
        else:
            with open(temp_file, "r", encoding="utf-8", errors="ignore") as f:
                text_content = f.read()

        if not text_content.strip():
            raise HTTPException(status_code=400, detail="Could not extract any text from the file.")

        chunks = smart_chunk(text_content)

        count = 0
        for chunk in chunks:
            service.ingest_text(chunk, meta={"filename": file.filename, "content": chunk})
            count += 1

        # Store metadata with text preview
        preview = text_content[:300].strip()
        document_store[file.filename] = {
            "filename": file.filename,
            "chunks": count,
            "size_bytes": file_size,
            "uploaded_at": time.time(),
            "preview": preview,
            "full_text": text_content,
        }

        logger.info(f"Ingested '{file.filename}': {count} chunks, {file_size} bytes")
        return {
            "filename": file.filename,
            "status": "ingested",
            "chunks_processed": count,
            "size_bytes": file_size,
            "preview": preview,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Ingestion error")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)


@app.post("/summarize")
async def summarize_document(request: Request, body: SummarizeRequest):
    """Generate an AI summary of an indexed document."""
    service = get_rag_service(request)
    if body.filename not in document_store:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = document_store[body.filename]
    full_text = doc.get("full_text", doc.get("preview", ""))
    # Truncate to ~3000 chars to stay within token limits
    truncated = full_text[:3000]

    summary = service.summarize_text(truncated, body.filename)
    return {"filename": body.filename, "summary": summary}


# -------------------------------------------------------------------
# Query
# -------------------------------------------------------------------
@app.post("/query", response_model=QueryResponse)
async def query_index(request: Request, query_data: QueryRequest):
    service = get_rag_service(request)
    start_time = time.time()

    results = service.search(query_data.query, top_k=query_data.top_k)

    formatted_results = []
    context_chunks = []

    for item in results:
        content = item.get("meta", {}).get("content", "No content available")
        if content and content != "No content available":
            context_chunks.append(content)

        formatted_results.append({
            "id": item.get("id"),
            "score": item.get("similarity"),
            "content": content,
            "filename": item.get("meta", {}).get("filename", "unknown"),
        })

    answer = None
    conv_id = query_data.conversation_id

    if query_data.mode == "chat":
        history = []
        if conv_id and conv_id in conversation_store:
            history = conversation_store[conv_id]["messages"][-6:]

        answer = service.generate_answer(query_data.query, context_chunks, history=history)

        # Manage conversation
        if conv_id is None or conv_id not in conversation_store:
            conv_id = str(uuid.uuid4())
            conversation_store[conv_id] = {
                "id": conv_id,
                "title": generate_title_from_query(query_data.query),
                "messages": [],
                "created_at": time.time(),
                "updated_at": time.time(),
            }

        conversation_store[conv_id]["messages"].append({"role": "user", "content": query_data.query})
        conversation_store[conv_id]["messages"].append({"role": "assistant", "content": answer})
        conversation_store[conv_id]["updated_at"] = time.time()

    # Track analytics
    elapsed = int((time.time() - start_time) * 1000)
    query_analytics.append({
        "query": query_data.query,
        "mode": query_data.mode,
        "timestamp": time.time(),
        "response_time_ms": elapsed,
        "results_count": len(formatted_results),
    })

    return QueryResponse(results=formatted_results, answer=answer, conversation_id=conv_id)


# -------------------------------------------------------------------
# Conversation Endpoints
# -------------------------------------------------------------------
@app.get("/conversations", response_model=List[ConversationSummary])
def list_conversations():
    """List all conversations sorted by most recent."""
    convos = sorted(conversation_store.values(), key=lambda c: c["updated_at"], reverse=True)
    return [
        ConversationSummary(
            id=c["id"],
            title=c["title"],
            message_count=len(c["messages"]),
            created_at=c["created_at"],
            updated_at=c["updated_at"],
        )
        for c in convos
    ]


@app.get("/conversations/{conv_id}", response_model=ConversationDetail)
def get_conversation(conv_id: str):
    """Get full conversation detail."""
    if conv_id not in conversation_store:
        raise HTTPException(status_code=404, detail="Conversation not found")
    c = conversation_store[conv_id]
    return ConversationDetail(
        id=c["id"],
        title=c["title"],
        messages=c["messages"],
        created_at=c["created_at"],
        updated_at=c["updated_at"],
    )


@app.put("/conversations/{conv_id}/rename")
def rename_conversation(conv_id: str, body: RenameRequest):
    if conv_id not in conversation_store:
        raise HTTPException(status_code=404, detail="Conversation not found")
    conversation_store[conv_id]["title"] = body.title
    return {"status": "renamed", "id": conv_id, "title": body.title}


@app.delete("/conversations/{conv_id}")
def delete_conversation(conv_id: str):
    if conv_id in conversation_store:
        del conversation_store[conv_id]
        return {"status": "deleted", "id": conv_id}
    raise HTTPException(status_code=404, detail="Conversation not found")


@app.get("/conversations/{conv_id}/export", response_class=PlainTextResponse)
def export_conversation(conv_id: str):
    """Export a conversation as Markdown."""
    if conv_id not in conversation_store:
        raise HTTPException(status_code=404, detail="Conversation not found")

    c = conversation_store[conv_id]
    lines = [f"# {c['title']}\n", f"*Exported from Endee RAG Assistant*\n\n---\n"]

    for msg in c["messages"]:
        role = "**You**" if msg["role"] == "user" else "**Endee Assistant**"
        lines.append(f"{role}:\n\n{msg['content']}\n\n---\n")

    return "\n".join(lines)


# -------------------------------------------------------------------
# Analytics
# -------------------------------------------------------------------
@app.get("/analytics")
def get_analytics():
    """Query analytics summary."""
    if not query_analytics:
        return {"total_queries": 0, "avg_response_ms": 0, "recent": []}

    avg = sum(q["response_time_ms"] for q in query_analytics) / len(query_analytics)
    recent = query_analytics[-10:][::-1]
    return {
        "total_queries": len(query_analytics),
        "avg_response_ms": round(avg),
        "recent": recent,
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
