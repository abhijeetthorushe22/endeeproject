import { FileText } from "lucide-react";

export default function SearchResults({ results }) {
  if (!results || results.length === 0) {
    return (
      <div className="message assistant">
        <div className="message-body">
          <div className="message-bubble">
            No relevant results found in your documents.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message assistant">
      <div className="message-body" style={{ maxWidth: "85%" }}>
        <div className="message-bubble" style={{ padding: 0, background: "transparent", border: "none" }}>
          <div className="search-results">
            {results.map((r, i) => (
              <div key={i} className="search-card">
                <div className="search-card-header">
                  <span className="search-card-title">
                    <FileText size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                    {r.filename || "Unknown"}
                  </span>
                  <span className="search-card-score">
                    {(r.score * 100).toFixed(1)}% match
                  </span>
                </div>
                <div className="search-card-content">{r.content}</div>
              </div>
            ))}
          </div>
        </div>
        <span className="message-label">Search Results</span>
      </div>
    </div>
  );
}
