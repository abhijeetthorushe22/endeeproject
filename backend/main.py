from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from contextlib import asynccontextmanager
import uvicorn
import shutil
import os
from pypdf import PdfReader
from backend.rag import RAGService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up... Initializing RAG Service")
    try:
        app.state.rag_service = RAGService()
        print("RAG Service initialized successfully!")
    except Exception as e:
        print(f"Warning: Could not connect to Endee on startup: {e}")
        app.state.rag_service = None
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(title="Endee RAG API", lifespan=lifespan)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_rag_service(request: Request):
    print(f"get_rag_service called, current state: {request.app.state.rag_service}")
    if request.app.state.rag_service is None:
        print("rag_service is None, attempting to initialize...")
        try:
            request.app.state.rag_service = RAGService()
        except Exception as e:
            print(f"Failed to initialize RAGService: {e}")
            raise HTTPException(status_code=503, detail=f"RAG Service unavailable: {e}")
    return request.app.state.rag_service

class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    mode: str = "search" # "search" or "chat"

class QueryResponse(BaseModel):
    results: List[dict]
    answer: Optional[str] = None

@app.get("/")
def read_root():
    return {"status": "ok", "service": "Endee RAG API"}

@app.post("/ingest")
async def ingest_file(request: Request, file: UploadFile = File(...)):
    service = get_rag_service(request)
    
    # Save file temporarily
    temp_file = f"temp_{file.filename}"
    with open(temp_file, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        text_content = ""
        if file.filename.endswith(".pdf"):
            reader = PdfReader(temp_file)
            for page in reader.pages:
                text_content += page.extract_text() + "\n"
        else:
            # Assume text file
            with open(temp_file, "r", encoding="utf-8") as f:
                text_content = f.read()
        
        # Simple chunking (by paragraphs for now)
        chunks = [c.strip() for c in text_content.split("\n\n") if c.strip()]
        
        count = 0
        for chunk in chunks:
            # Ingest chunk
            service.ingest_text(chunk, meta={"filename": file.filename, "content": chunk})
            count += 1
            
        return {"filename": file.filename, "status": "ingested", "chunks_processed": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file):
            os.remove(temp_file)

@app.post("/query", response_model=QueryResponse)
async def query_index(request: Request, query_data: QueryRequest):
    service = get_rag_service(request)
    results = service.search(query_data.query, top_k=query_data.top_k)
    
    # Format results & Collect Context
    formatted_results = []
    context_chunks = []
    
    for item in results:
        # Extract content from meta
        content = item.get('meta', {}).get('content', "No content available")
        if content and content != "No content available":
            context_chunks.append(content)
            
        formatted_results.append({
            "id": item.get('id'),
            "score": item.get('similarity'),
            "content": content,
            "filename": item.get('meta', {}).get('filename', 'unknown')
        })
        
    # Generate Answer if in Chat Mode
    answer = None
    if query_data.mode == "chat":
        answer = service.generate_answer(query_data.query, context_chunks)
    
    return QueryResponse(results=formatted_results, answer=answer)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
