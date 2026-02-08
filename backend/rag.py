import os
from typing import List, Dict, Any
from endee import Endee, Precision
from sentence_transformers import SentenceTransformer
import uuid
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configuration
ENDEE_URL = os.getenv("ENDEE_URL", "http://localhost:8081")
# Using a small, fast model for local embeddings
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2" 
INDEX_NAME = "documents"
# Dimension for all-MiniLM-L6-v2 is 384
VECTOR_DIMENSION = 384 

class RAGService:
    def __init__(self):
        # Initialize Endee Client
        self.endee = Endee()
        # Set base URL for local server
        base_url = f"{ENDEE_URL}/api/v1"
        self.endee.set_base_url(base_url)
        
        # Initialize Embedding Model
        self.model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        
        # Initialize Gemini
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            print("Gemini API Key found. Chat mode enabled.")
            genai.configure(api_key=self.api_key)
            try:
                # Try the generic 'latest' alias which is confirmed to exist
                self.gemini_model = genai.GenerativeModel('gemini-flash-latest')
            except:
                # Fallback to pro-latest
                self.gemini_model = genai.GenerativeModel('gemini-pro-latest')
            self.has_gemini = True
        else:
            print("Gemini API Key NOT found. Chat mode disabled.")
            self.has_gemini = False
        
        # Ensure index exists
        self._ensure_index()

    def _ensure_index(self):
        try:
            # Check if our index is in the list. 
            # For safety, let's try to create it and catch error if it exists 
            # OR check if we can get it.
            
            # Let's try to get it first
            try:
                self.index = self.endee.get_index(name=INDEX_NAME)
                print(f"Index '{INDEX_NAME}' found.")
            except Exception:
                print(f"Index '{INDEX_NAME}' not found. Creating...")
                self.endee.create_index(
                    name=INDEX_NAME,
                    dimension=VECTOR_DIMENSION,
                    space_type="cosine",
                    precision=Precision.INT8D # Using INT8 for efficiency as per docs
                )
                self.index = self.endee.get_index(name=INDEX_NAME)
                print(f"Index '{INDEX_NAME}' created.")
                
        except Exception as e:
            print(f"Error initializing index: {e}")
            # If we can't ensure index, simple operations might fail, but let's not crash app immediately
            # pass 

    def ingest_text(self, text: str, meta: Dict[str, Any] = None):
        """
        Ingests text into the vector database.
        1. Generates embedding
        2. Upserts to Endee
        """
        if not text.strip():
            return
            
        # Generate embedding
        vector = self.model.encode(text).tolist()
        
        # Create unique ID
        doc_id = str(uuid.uuid4())
        
        # Payload
        record = {
            "id": doc_id,
            "vector": vector,
            "meta": meta or {},
            # "filter": {} # Optional filter
        }
        
        # Upsert
        if hasattr(self, 'index'):
             self.index.upsert([record])
             print(f"Ingested document chunk {doc_id}")
             return doc_id
        else:
             print("Error: Index not initialized.")

    def search(self, query: str, top_k: int = 5):
        """
        Searches the vector database for relevant content.
        """
        if not hasattr(self, 'index'):
             return []

        query_vector = self.model.encode(query).tolist()
        
        results = self.index.query(
            vector=query_vector,
            top_k=top_k
        )
        
        return results

    def generate_answer(self, query: str, context_chunks: List[str]):
        """
        Generates an answer using Gemini based on the provided context.
        """
        if not self.has_gemini:
            return "Gemini API Key is missing. Please set GEMINI_API_KEY environment variable to enable AI chat."
        
        context_text = "\n\n".join(context_chunks)
        
        prompt = f"""You are a helpful assistant. Use the following context to answer the user's question.
If the answer is not in the context, say "I don't have enough information in the documents to answer that."

Context:
{context_text}

Question: {query}

Answer:"""

        try:
            response = self.gemini_model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating answer: {str(e)}"
