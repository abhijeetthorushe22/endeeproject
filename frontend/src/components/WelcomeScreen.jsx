import { Bot, Upload, Search, Sparkles, Zap, Shield } from "lucide-react";

export default function WelcomeScreen({ onUploadClick }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-orb" />
      <div className="welcome-icon">
        <Bot size={36} />
      </div>
      <h2 className="welcome-title">Endee RAG Assistant</h2>
      <p className="welcome-subtitle">
        Upload your documents and unlock AI-powered insights.
        Ask questions, search semantically, and get context-aware answers — all powered by vector search.
      </p>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon-wrap">
            <Upload size={20} />
          </div>
          <h3>Smart Ingestion</h3>
          <p>Upload PDF, TXT & Markdown with intelligent sliding-window chunking</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-wrap">
            <Search size={20} />
          </div>
          <h3>Vector Search</h3>
          <p>Semantic similarity search powered by Endee Vector Database</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-wrap">
            <Sparkles size={20} />
          </div>
          <h3>AI Chat</h3>
          <p>Context-aware answers with conversation memory via Gemini</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-wrap">
            <Zap size={20} />
          </div>
          <h3>Blazing Fast</h3>
          <p>Ultra-low latency with optimised INT8 vector quantisation</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon-wrap">
            <Shield size={20} />
          </div>
          <h3>Private & Local</h3>
          <p>Documents stay on your machine — nothing leaves your server</p>
        </div>
        <div className="feature-card highlight" onClick={onUploadClick}>
          <div className="feature-icon-wrap accent">
            <Upload size={20} />
          </div>
          <h3>Get Started →</h3>
          <p>Upload your first document and start asking questions</p>
        </div>
      </div>

      <div className="welcome-shortcuts">
        <span><kbd>Ctrl</kbd>+<kbd>N</kbd> New Chat</span>
        <span><kbd>Ctrl</kbd>+<kbd>K</kbd> Focus Search</span>
        <span><kbd>Enter</kbd> Send Message</span>
      </div>
    </div>
  );
}
