import os
import time
from typing import List, Dict, Any, Optional
from endee import Endee, Precision
from sentence_transformers import SentenceTransformer
import uuid
import logging
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Configuration
ENDEE_URL = os.getenv("ENDEE_URL", "http://localhost:8081")
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
INDEX_NAME = "documents"
VECTOR_DIMENSION = 384


class RAGService:
    def __init__(self):
        # Endee client
        self.endee = Endee()
        base_url = f"{ENDEE_URL}/api/v1"
        self.endee.set_base_url(base_url)

        # Embedding model
        logger.info(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")
        self.model = SentenceTransformer(EMBEDDING_MODEL_NAME)

        # Gemini LLM – multiple models to fallback through on quota errors
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.GEMINI_MODEL_CHAIN = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-pro",
            "gemini-pro-latest",
        ]
        if self.api_key:
            logger.info("Gemini API Key found – Chat mode enabled.")
            genai.configure(api_key=self.api_key)
            self.has_gemini = True
        else:
            logger.warning("Gemini API Key NOT found – Chat mode disabled.")
            self.has_gemini = False

        # Ensure vector index
        self._ensure_index()

    # ------------------------------------------------------------------
    # Index management
    # ------------------------------------------------------------------
    def _ensure_index(self):
        try:
            try:
                self.index = self.endee.get_index(name=INDEX_NAME)
                logger.info(f"Index '{INDEX_NAME}' found.")
            except Exception:
                logger.info(f"Index '{INDEX_NAME}' not found – creating…")
                self.endee.create_index(
                    name=INDEX_NAME,
                    dimension=VECTOR_DIMENSION,
                    space_type="cosine",
                    precision=Precision.INT8D,
                )
                self.index = self.endee.get_index(name=INDEX_NAME)
                logger.info(f"Index '{INDEX_NAME}' created.")
        except Exception as e:
            logger.error(f"Error initialising index: {e}")

    # ------------------------------------------------------------------
    # Ingestion
    # ------------------------------------------------------------------
    def ingest_text(self, text: str, meta: Dict[str, Any] | None = None) -> Optional[str]:
        """Embed *text* and upsert into Endee."""
        if not text.strip():
            return None

        vector = self.model.encode(text).tolist()
        doc_id = str(uuid.uuid4())

        record = {
            "id": doc_id,
            "vector": vector,
            "meta": meta or {},
        }

        if hasattr(self, "index"):
            self.index.upsert([record])
            logger.debug(f"Ingested chunk {doc_id}")
            return doc_id
        else:
            logger.error("Index not initialised – cannot ingest.")
            return None

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------
    def search(self, query: str, top_k: int = 5) -> list:
        if not hasattr(self, "index"):
            return []

        query_vector = self.model.encode(query).tolist()
        results = self.index.query(vector=query_vector, top_k=top_k)
        return results

    # ------------------------------------------------------------------
    # Gemini caller with model fallback
    # ------------------------------------------------------------------
    def _call_gemini(self, prompt: str) -> str:
        """Try each model in the fallback chain until one succeeds."""
        if not self.has_gemini:
            return "Gemini API Key is missing. Please set GEMINI_API_KEY to enable AI chat."

        last_error = None
        for model_name in self.GEMINI_MODEL_CHAIN:
            for attempt in range(2):
                try:
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(prompt)
                    return response.text
                except Exception as e:
                    last_error = e
                    err_str = str(e)
                    if "429" in err_str or "quota" in err_str.lower() or "rate" in err_str.lower():
                        logger.warning(f"{model_name} attempt {attempt+1} hit rate limit, trying next…")
                        time.sleep(2)
                        continue
                    else:
                        logger.exception(f"Gemini error with {model_name}")
                        break

        logger.error(f"All Gemini models exhausted. Last error: {last_error}")
        return (
            "⚠️ All Gemini models are currently rate-limited. "
            "Please wait a minute and try again, or check your API quota at "
            "[ai.google.dev](https://ai.google.dev/gemini-api/docs/rate-limits)."
        )

    # ------------------------------------------------------------------
    # Answer generation
    # ------------------------------------------------------------------
    def generate_answer(
        self,
        query: str,
        context_chunks: List[str],
        history: List[dict] | None = None,
    ) -> str:
        """Generate an answer with Gemini, optionally using conversation history."""
        context_text = "\n\n".join(context_chunks) if context_chunks else "(no relevant documents found)"

        history_block = ""
        if history:
            history_block = "Previous conversation:\n"
            for msg in history:
                role = "User" if msg["role"] == "user" else "Assistant"
                history_block += f"{role}: {msg['content']}\n"
            history_block += "\n"

        prompt = f"""You are Endee Assistant — a knowledgeable, friendly AI document assistant.
Use the retrieved context below to answer the user's question accurately.
If the answer is not in the context, say so clearly but remain helpful.
Format your answer in Markdown for readability (use headers, bullet points, bold, etc.).

{history_block}---
Retrieved Context:
{context_text}

---
User Question: {query}

Answer (in Markdown):"""

        return self._call_gemini(prompt)

    # ------------------------------------------------------------------
    # Document summarisation
    # ------------------------------------------------------------------
    def summarize_text(self, text: str, filename: str) -> str:
        """Generate a concise summary of the given text."""
        prompt = f"""Summarise the following document in 3-5 bullet points.
Be concise but capture the key information. Format in Markdown.

Document: {filename}

Content:
{text}

Summary (Markdown bullet points):"""

        return self._call_gemini(prompt)
