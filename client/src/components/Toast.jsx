// Small self-dismissing notification. The parent owns the message; this
// component just schedules the auto-hide and renders it.
import { useEffect } from 'react';

export default function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    if (!message) return undefined;
    const handle = setTimeout(() => onDone?.(), 3000);
    return () => clearTimeout(handle);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className={`toast toast--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  );
}
