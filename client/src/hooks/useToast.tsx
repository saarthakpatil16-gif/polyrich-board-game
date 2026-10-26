import { useState, useCallback } from 'react';
import clsx from 'clsx';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

/**
 * Minimal toast hook used across the app. It provides a `toast` object with
 * `success`, `error`, and `info` helpers and a `ToastContainer` component that
 * renders the toasts in the top‑right corner.
 */
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, kind }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const toast = {
    success: (msg: string) => add(msg, 'success'),
    error: (msg: string) => add(msg, 'error'),
    info: (msg: string) => add(msg, 'info'),
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={clsx(
            'px-4 py-2 rounded-md text-sm shadow-lg pointer-events-auto',
            t.kind === 'success' && 'bg-emerald-800/90 text-emerald-100',
            t.kind === 'error' && 'bg-rose-800/90 text-rose-100',
            t.kind === 'info' && 'bg-slate-800/90 text-slate-100'
          )}
        >
          {t.message}
        </div>
      ))}
    </div>
  );

  return { toast, ToastContainer };
};
