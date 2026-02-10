import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import { Send, Bot, Menu, X, Plus } from "lucide-react";
import "./index.css";

import Sidebar from "./components/Sidebar";
import ChatMessage from "./components/ChatMessage";
import SearchResults from "./components/SearchResults";
import WelcomeScreen from "./components/WelcomeScreen";
import Toast from "./components/Toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function App() {
  // ─── State ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [files, setFiles] = useState([]);
  const [mode, setMode] = useState("chat");
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [stats, setStats] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ─── Helpers ────────────────────────────────────────────────────────
  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);
  const removeToast = useCallback(
    (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    []
  );

  const refreshData = async () => {
    try {
      const [statsRes, docsRes, convRes] = await Promise.all([
        axios.get(`${API_URL}/stats`).catch(() => null),
        axios.get(`${API_URL}/documents`).catch(() => null),
        axios.get(`${API_URL}/conversations`).catch(() => null),
      ]);
      if (statsRes) setStats(statsRes.data);
      if (docsRes) setFiles(docsRes.data);
      if (convRes) setConversations(convRes.data);
    } catch { /* ignore */ }
  };

  // ─── Effects ────────────────────────────────────────────────────────
  useEffect(() => scrollToBottom(), [messages]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+N: new chat
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        handleNewChat();
      }
      // Ctrl+K: focus input
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Send Message ───────────────────────────────────────────────────
  const handleSendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg = { role: "user", content: text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setProcessing(true);

    try {
      const res = await axios.post(`${API_URL}/query`, {
        query: text,
        top_k: 5,
        mode,
        conversation_id: conversationId,
      });

      const { results, answer, conversation_id } = res.data;

      if (conversation_id) {
        setConversationId(conversation_id);
      }

      if (mode === "chat") {
        const sources = results
          .filter((r) => r.score > 0)
          .slice(0, 3)
          .map((r) => ({ filename: r.filename, score: r.score }));

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: answer || "I couldn't generate an answer.",
            sources,
            timestamp: Date.now(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "search-results", results, timestamp: Date.now() },
        ]);
      }

      // Refresh conversations list
      const convRes = await axios.get(`${API_URL}/conversations`).catch(() => null);
      if (convRes) setConversations(convRes.data);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please make sure the backend is running and try again.",
          timestamp: Date.now(),
        },
      ]);
      addToast("Failed to get response", "error");
    } finally {
      setProcessing(false);
    }
  };

  // ─── Regenerate ─────────────────────────────────────────────────────
  const handleRegenerate = async (msg) => {
    // Find the preceding user message
    const idx = messages.indexOf(msg);
    if (idx < 1) return;
    const userMsg = messages[idx - 1];
    if (userMsg.role !== "user") return;

    // Remove the old assistant message
    setMessages((prev) => prev.filter((_, i) => i !== idx));
    setProcessing(true);

    try {
      const res = await axios.post(`${API_URL}/query`, {
        query: userMsg.content,
        top_k: 5,
        mode: "chat",
        conversation_id: conversationId,
      });

      const { results, answer } = res.data;
      const sources = results
        .filter((r) => r.score > 0)
        .slice(0, 3)
        .map((r) => ({ filename: r.filename, score: r.score }));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answer || "I couldn't generate an answer.",
          sources,
          timestamp: Date.now(),
        },
      ]);
    } catch {
      addToast("Failed to regenerate", "error");
    } finally {
      setProcessing(false);
    }
  };

  // ─── File Upload ────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_URL}/ingest`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await refreshData();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Successfully indexed **${file.name}** — ${res.data.chunks_processed} chunks created. You can now ask questions about it!`,
          timestamp: Date.now(),
        },
      ]);
      addToast(`${file.name} indexed successfully`, "success");
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Failed to upload **${file.name}**. Please check the backend and try again.`,
          timestamp: Date.now(),
        },
      ]);
      addToast(`Failed to upload ${file.name}`, "error");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // ─── File Operations ────────────────────────────────────────────────
  const handleDeleteFile = async (filename) => {
    try {
      await axios.delete(`${API_URL}/documents/${encodeURIComponent(filename)}`);
      await refreshData();
      addToast(`${filename} removed`, "info");
    } catch {
      addToast("Failed to delete document", "error");
    }
  };

  const handleSummarize = async (filename) => {
    addToast(`Generating summary for ${filename}…`, "info");
    try {
      const res = await axios.post(`${API_URL}/summarize`, { filename });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `📄 **Summary of ${filename}:**\n\n${res.data.summary}`,
          timestamp: Date.now(),
        },
      ]);
      addToast("Summary generated", "success");
    } catch {
      addToast("Failed to generate summary", "error");
    }
  };

  // ─── Conversation Management ────────────────────────────────────────
  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    inputRef.current?.focus();
  };

  const handleSelectConversation = async (convId) => {
    try {
      const res = await axios.get(`${API_URL}/conversations/${convId}`);
      const conv = res.data;
      setConversationId(convId);
      setMessages(
        conv.messages.map((m) => ({
          ...m,
          timestamp: conv.updated_at * 1000,
        }))
      );
      setSidebarOpen(false);
    } catch {
      addToast("Failed to load conversation", "error");
    }
  };

  const handleDeleteConversation = async (convId) => {
    try {
      await axios.delete(`${API_URL}/conversations/${convId}`);
      if (conversationId === convId) {
        handleNewChat();
      }
      await refreshData();
      addToast("Conversation deleted", "info");
    } catch {
      addToast("Failed to delete conversation", "error");
    }
  };

  const handleRenameConversation = async (convId, title) => {
    try {
      await axios.put(`${API_URL}/conversations/${convId}/rename`, { title });
      await refreshData();
    } catch {
      addToast("Failed to rename", "error");
    }
  };

  const handleExportConversation = async (convId) => {
    try {
      const res = await axios.get(`${API_URL}/conversations/${convId}/export`);
      const blob = new Blob([res.data], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${convId.slice(0, 8)}.md`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("Conversation exported", "success");
    } catch {
      addToast("Failed to export", "error");
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────
  const showWelcome = messages.length === 0;

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div
        className={`mobile-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Toasts */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Upload overlay */}
      {uploading && (
        <div className="upload-overlay">
          <div className="upload-modal">
            <div className="spinner" />
            <h3>Processing Document</h3>
            <p>Chunking, embedding, and indexing…</p>
          </div>
        </div>
      )}

      <div className="app-layout">
        <Sidebar
          mode={mode}
          setMode={setMode}
          files={files}
          uploading={uploading}
          onFileUpload={handleFileUpload}
          onDeleteFile={handleDeleteFile}
          onSummarize={handleSummarize}
          stats={stats}
          isOpen={sidebarOpen}
          conversations={conversations}
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          onExportConversation={handleExportConversation}
        />

        {/* Main */}
        <div className="main-area">
          {/* Header bar */}
          <div className="main-header">
            <div className="header-left">
              <Bot size={18} style={{ color: "var(--accent-hover)" }} />
              <span className="header-title">
                {conversationId
                  ? conversations.find((c) => c.id === conversationId)?.title || "Chat"
                  : "New Conversation"}
              </span>
            </div>
            <div className="header-right">
              <div className={`header-badge ${mode === "chat" ? "chat" : "search"}`}>
                {mode === "chat" ? "AI Chat" : "Search"} Mode
              </div>
              {conversationId && (
                <button className="header-btn" onClick={handleNewChat} title="New Chat">
                  <Plus size={16} />
                </button>
              )}
            </div>
          </div>

          {showWelcome ? (
            <WelcomeScreen
              onUploadClick={() => fileInputRef.current?.click()}
            />
          ) : (
            <div className="messages-area custom-scroll">
              <div className="messages-container">
                {messages.map((msg, idx) =>
                  msg.role === "search-results" ? (
                    <SearchResults key={idx} results={msg.results} />
                  ) : (
                    <ChatMessage
                      key={idx}
                      message={msg}
                      onRegenerate={msg.role === "assistant" ? handleRegenerate : null}
                    />
                  )
                )}

                {processing && (
                  <div className="typing-indicator">
                    <div className="message-avatar" style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent-hover)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      width: 36, height: 36,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Bot size={18} />
                    </div>
                    <div className="typing-dots">
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                      <div className="typing-dot" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          )}

          {/* Hidden file input for welcome CTA */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".pdf,.txt,.md"
            onChange={handleFileUpload}
          />

          {/* Input */}
          <div className="input-area">
            <div className="input-wrapper">
              <div className="input-glow" />
              <div className="input-container">
                <input
                  ref={inputRef}
                  type="text"
                  className="input-field"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !processing && handleSendMessage()
                  }
                  placeholder={
                    mode === "chat"
                      ? "Ask anything about your documents…"
                      : "Search your documents…"
                  }
                  disabled={processing}
                />
                <button
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={!input.trim() || processing}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
            <div className="input-footer">
              <span>{mode === "chat" ? "⚡ AI Chat" : "🔍 Search"} Mode</span>
              <span>·</span>
              <span>Endee RAG v3.0</span>
              <span>·</span>
              <span className="shortcut-hint">Ctrl+K to focus</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
