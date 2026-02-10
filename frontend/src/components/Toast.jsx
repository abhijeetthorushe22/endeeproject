import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const icons = {
  success: <CheckCircle size={16} style={{ color: "#34d399" }} />,
  error: <AlertCircle size={16} style={{ color: "#ef4444" }} />,
  info: <Info size={16} style={{ color: "#06b6d4" }} />,
};

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast ${toast.type}`}>
      {icons[toast.type] || icons.info}
      <span>{toast.message}</span>
      <button className="toast-close" onClick={onClose}>
        <X size={14} />
      </button>
    </div>
  );
}
