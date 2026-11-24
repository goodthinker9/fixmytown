// Self-dismissing toast notification with an icon.
import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  info:    Info,
};

export default function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const handle = setTimeout(() => onDone?.(), 4000);
    return () => clearTimeout(handle);
  }, [message, onDone]);

  if (!message) return null;

  const Icon = ICONS[type] || Info;

  return (
    <div
      className={`toast toast--${type}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      <Icon size={16} aria-hidden="true" className="toast__icon" />
      <span>{message}</span>
      <button
        type="button"
        className="toast__dismiss"
        onClick={() => onDone?.()}
        aria-label="Dismiss notification"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
