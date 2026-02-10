import { useRef, useState } from "react";
import {
  Bot,
  Search,
  Sparkles,
  Upload,
  FileText,
  Trash2,
  Loader2,
  FolderOpen,
  Database,
  Cpu,
  MessageSquare,
  Plus,
  MoreHorizontal,
  Pencil,
  Download,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react";

export default function Sidebar({
  mode,
  setMode,
  files,
  uploading,
  onFileUpload,
  onDeleteFile,
  onSummarize,
  stats,
  isOpen,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onExportConversation,
}) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [convExpanded, setConvExpanded] = useState(true);
  const [docsExpanded, setDocsExpanded] = useState(true);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [convMenuId, setConvMenuId] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      onFileUpload({ target: { files: [e.dataTransfer.files[0]] } });
    }
  };

  const formatBytes = (b) => {
    if (!b) return "0 B";
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts * 1000);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const startRename = (conv) => {
    setEditingConvId(conv.id);
    setEditTitle(conv.title);
    setConvMenuId(null);
  };

  const submitRename = () => {
    if (editTitle.trim() && editingConvId) {
      onRenameConversation(editingConvId, editTitle.trim());
    }
    setEditingConvId(null);
    setEditTitle("");
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="brand">
          <div className="brand-icon">
            <Bot size={22} />
          </div>
          <div className="brand-text">
            <h1>Endee RAG</h1>
            <span>Smart Document Assistant</span>
          </div>
        </div>
        <button className="new-chat-btn" onClick={onNewChat} title="New Chat (Ctrl+N)">
          <Plus size={18} />
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === "search" ? "active" : ""}`}
          onClick={() => setMode("search")}
        >
          <Search size={14} />
          Search
        </button>
        <button
          className={`mode-btn ${mode === "chat" ? "active" : ""}`}
          onClick={() => setMode("chat")}
        >
          <Sparkles size={14} />
          AI Chat
        </button>
      </div>

      {/* Scrollable middle section */}
      <div className="sidebar-scroll custom-scroll">
        {/* Conversations Section */}
        <div className="sidebar-section">
          <button
            className="section-header"
            onClick={() => setConvExpanded(!convExpanded)}
          >
            {convExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <MessageSquare size={12} />
            <span>Conversations ({conversations.length})</span>
          </button>

          {convExpanded && (
            <div className="section-content">
              {conversations.length === 0 ? (
                <div className="section-empty">
                  <MessageSquare size={18} />
                  <div>No conversations yet</div>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`conv-item ${currentConversationId === conv.id ? "active" : ""}`}
                    onClick={() => onSelectConversation(conv.id)}
                  >
                    <div className="conv-icon">
                      <MessageSquare size={13} />
                    </div>
                    <div className="conv-info">
                      {editingConvId === conv.id ? (
                        <input
                          className="conv-rename-input"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={submitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") submitRename();
                            if (e.key === "Escape") setEditingConvId(null);
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className="conv-title">{conv.title}</div>
                          <div className="conv-meta">
                            {conv.message_count} msgs · {formatTime(conv.updated_at)}
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      className="conv-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConvMenuId(convMenuId === conv.id ? null : conv.id);
                      }}
                    >
                      <MoreHorizontal size={14} />
                    </button>

                    {convMenuId === conv.id && (
                      <div className="conv-dropdown" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => startRename(conv)}>
                          <Pencil size={12} /> Rename
                        </button>
                        <button onClick={() => { onExportConversation(conv.id); setConvMenuId(null); }}>
                          <Download size={12} /> Export
                        </button>
                        <button
                          className="danger"
                          onClick={() => { onDeleteConversation(conv.id); setConvMenuId(null); }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="sidebar-section">
          <button
            className="section-header"
            onClick={() => setDocsExpanded(!docsExpanded)}
          >
            {docsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <FileText size={12} />
            <span>Documents ({files.length})</span>
          </button>

          {docsExpanded && (
            <div className="section-content">
              {/* Upload button */}
              <button
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                Upload Document
              </button>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".pdf,.txt,.md"
                onChange={onFileUpload}
              />

              {/* Drop zone */}
              <div
                className={`drop-zone ${dragActive ? "active" : ""}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen size={18} style={{ opacity: 0.5, marginBottom: 4 }} />
                <div>Drop files here</div>
                <div className="drop-hint">PDF, TXT, MD</div>
              </div>

              {/* File list */}
              {files.length === 0 ? (
                <div className="section-empty">
                  <FileText size={18} />
                  <div>No documents indexed</div>
                </div>
              ) : (
                files.map((f, i) => (
                  <div key={i} className="doc-item">
                    <div className="doc-icon">
                      <FileText size={13} />
                    </div>
                    <div className="doc-info">
                      <div className="doc-name">{f.filename || f}</div>
                      <div className="doc-meta">
                        {f.chunks ? `${f.chunks} chunks` : ""}
                        {f.size_bytes ? ` · ${formatBytes(f.size_bytes)}` : ""}
                      </div>
                    </div>
                    <div className="doc-actions">
                      {onSummarize && (
                        <button
                          className="doc-action-btn"
                          onClick={(e) => { e.stopPropagation(); onSummarize(f.filename || f); }}
                          title="AI Summary"
                        >
                          <BookOpen size={11} />
                        </button>
                      )}
                      <button
                        className="doc-action-btn danger"
                        onClick={() => onDeleteFile(f.filename || f)}
                        title="Remove"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div className="stat">
          <span className={`stat-dot ${stats?.endee_connected ? "green" : "red"}`} />
          <Database size={10} />
          Endee
        </div>
        <div className="stat">
          <span className={`stat-dot ${stats?.gemini_enabled ? "green" : "yellow"}`} />
          <Cpu size={10} />
          Gemini
        </div>
        <div className="stat" style={{ marginLeft: "auto" }}>
          {stats?.total_queries ?? 0} queries
        </div>
      </div>

      <div className="sidebar-footer">
        Powered by Endee Vector Database · v3.0
      </div>
    </div>
  );
}
