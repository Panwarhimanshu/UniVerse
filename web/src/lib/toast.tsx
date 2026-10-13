import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface ToastItem { id: number; msg: string; out: boolean }
const ToastContext = createContext<(msg: string) => void>(() => {});

let nextId = 1;

/** Toasts stacked in the bottom-right corner */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((msg: string) => {
    const id = nextId++;
    setItems((xs) => [...xs, { id, msg, out: false }]);
    setTimeout(() => setItems((xs) => xs.map((t) => (t.id === id ? { ...t, out: true } : t))), 3400);
    setTimeout(() => setItems((xs) => xs.filter((t) => t.id !== id)), 3720);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-zone" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.out ? ' out' : ''}`}>
            <span className="ti">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
