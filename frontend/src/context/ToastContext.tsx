import React, { createContext, useCallback, useContext, useState } from 'react';
import { prefersReducedMotion } from '../utils/format';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastSeq = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = toastSeq++;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      window.setTimeout(
        () => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        },
        prefersReducedMotion() ? 115 : 170,
      );
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((toast) => {
          const badgeClass =
            toast.type === 'error'
              ? 'badge-pink'
              : toast.type === 'warning'
                ? 'badge-coral'
                : 'badge-lime';
          const label =
            toast.type === 'error' ? 'LỖI' : toast.type === 'warning' ? 'LƯU Ý' : 'OK';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto card-hairline-md px-4 py-3 shadow-lg flex items-center gap-2.5 text-xs font-medium max-w-sm ${
                toast.exiting ? 'toast-out' : 'toast-in'
              }`}
            >
              <span className={`px-2 py-0.5 font-mono font-semibold shrink-0 ${badgeClass}`}>
                {label}
              </span>
              <span className="text-ink leading-snug">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
