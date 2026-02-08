import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Upload, FileText, Bot, User, Loader2, AlertCircle, Sparkles, Search } from 'lucide-react';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your Endee document assistant. Upload a PDF or text file to get started.' }
  ]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [files, setFiles] = useState([]);
  const [mode, setMode] = useState('chat'); // 'search' or 'chat'
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setProcessing(true);

    try {
      const response = await axios.post(`${API_URL}/query`, {
        query: userMessage.content,
        top_k: 3,
        mode: mode
      });
      
      const results = response.data.results;
      const answer = response.data.answer;
      
      let botContent = "";
      
      if (mode === 'chat' && answer) {
         botContent = answer;
         if (results.length > 0) {
             botContent += "\n\n---\n**Sources:**\n";
             results.forEach((res, i) => {
                 botContent += `• ${res.filename || 'Unknown'} (Confidence: ${(res.score * 100).toFixed(0)}%)\n`;
             });
         }
      } else {
          // Search Mode Display
          botContent = "Here's what I found:\n\n";
          if (results.length === 0) {
            botContent = "I couldn't find any relevant information in your documents.";
          } else {
            results.forEach((res, i) => {
              botContent += `**Reference ${i + 1} (Score: ${res.score.toFixed(3)}):**\n${res.content}\n\n`;
            });
          }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: botContent }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error searching your documents." }]);
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_URL}/ingest`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setFiles(prev => [...prev, file.name]);
      setMessages(prev => [...prev, { role: 'assistant', content: `Success! I have indexed **${file.name}**. You can now ask questions about it.` }]);
    } catch (error) {
       setMessages(prev => [...prev, { role: 'assistant', content: `Error uploading **${file.name}**. Please try again.` }]);
       console.error(error);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Sidebar */}
      <div className="w-80 bg-slate-950 border-r border-slate-800 p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
             <Bot size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Endee RAG
          </h1>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 bg-slate-900/50 p-1 rounded-lg flex border border-slate-800">
          <button 
            onClick={() => setMode('search')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2
              ${mode === 'search' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            <Search size={14} />
            Search
          </button>
          <button 
            onClick={() => setMode('chat')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200 flex items-center justify-center gap-2
              ${mode === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            <Sparkles size={14} />
            AI Chat
          </button>
        </div>

        <div className="mb-6">
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-indigo-900/20 font-medium"
          >
            {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
            Upload Document
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".pdf,.txt,.md"
            onChange={handleFileUpload}
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Indexed Documents</h2>
          {files.length === 0 ? (
            <div className="text-slate-600 text-sm italic p-4 border border-dashed border-slate-800 rounded-lg text-center">
              No documents yet
            </div>
          ) : (
             <div className="space-y-2">
               {files.map((file, i) => (
                 <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-800/50 hover:border-slate-700 rounded-lg transition-colors group">
                   <div className="p-2 bg-slate-800/50 rounded-md text-slate-400 group-hover:text-indigo-400 transition-colors">
                     <FileText size={16} />
                   </div>
                   <span className="text-sm text-slate-300 truncate">{file}</span>
                 </div>
               ))}
             </div>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500 text-center">
          Powered by Endee Vector DB
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-image-dots">
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 
                  ${msg.role === 'assistant' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-300'}`}>
                  {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                </div>
                
                <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-bl-none backdrop-blur-sm'}`}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">
                    {msg.role === 'assistant' ? 'Endee Assistant' : 'You'}
                  </span>
                </div>
              </div>
            ))}
            {processing && (
              <div className="flex gap-4">
                 <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex-shrink-0 flex items-center justify-center mt-1">
                  <Bot size={18} />
                </div>
                 <div className="flex items-center gap-2 px-5 py-4 bg-slate-800/50 rounded-2xl rounded-bl-none border border-slate-700/30">
                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-slate-950/50 border-t border-slate-800 backdrop-blur-md">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 to-cyan-500/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur"></div>
            <div className="relative flex items-center bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all duration-200">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !processing && handleSendMessage()}
                placeholder="Ask something about your documents..."
                className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 px-5 py-4 focus:outline-none focus:ring-0 text-sm"
                disabled={processing}
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || processing}
                className="p-3 mr-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 text-white rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
          <div className="text-center mt-3">
             <p className="text-[10px] text-slate-500">Endee Project Evaluation • Built with React & FastAPI</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
