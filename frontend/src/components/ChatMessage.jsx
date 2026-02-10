import { useState } from "react";
import { Bot, User, FileText, Copy, Check, RefreshCw } from "lucide-react";
import Markdown from "react-markdown";

export default function ChatMessage({ message, onRegenerate }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback ignored */
    }
  };

  return (
    <div className={`message ${message.role}`}>
      <div className="message-avatar">
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>
      <div className="message-body">
        <div className="message-bubble">
          {isUser ? (
            message.content
          ) : (
            <>
              <Markdown>{message.content}</Markdown>
              {message.sources && message.sources.length > 0 && (
                <div className="sources-list">
                  <div className="sources-label">Sources</div>
                  {message.sources.map((s, i) => (
                    <div key={i} className="source-item">
                      <FileText size={11} />
                      <span>{s.filename}</span>
                      <span className="score">
                        {(s.score * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Message toolbar */}
        <div className="message-toolbar">
          <span className="message-label">
            {isUser ? "You" : "Endee Assistant"}
            {message.timestamp && (
              <span className="message-time"> · {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            )}
          </span>
          {!isUser && (
            <div className="message-actions">
              <button className="msg-action-btn" onClick={handleCopy} title="Copy">
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
              {onRegenerate && (
                <button className="msg-action-btn" onClick={() => onRegenerate(message)} title="Regenerate">
                  <RefreshCw size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
