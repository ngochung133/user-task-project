import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { prefersReducedMotion } from '../../utils/format';

export interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  footer,
  children,
  maxWidthClass = 'max-w-lg',
}: DrawerProps) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (rendered) {
      setClosing(true);
      const timer = window.setTimeout(
        () => {
          setRendered(false);
          setClosing(false);
        },
        prefersReducedMotion() ? 115 : 185,
      );
      return () => window.clearTimeout(timer);
    }
  }, [open, rendered]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog" aria-label={title}>
      <div
        className={`fixed inset-0 drawer-backdrop ${
          closing ? 'drawer-backdrop-out' : 'drawer-backdrop-in'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 right-0 w-full ${maxWidthClass} bg-canvas border-l border-hairline shadow-xl flex flex-col ${
          closing ? 'drawer-panel-out' : 'drawer-panel-in'
        }`}
      >
        <div className="min-h-14 px-5 py-3 border-b border-hairline flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink truncate">{title}</h2>
            {subtitle && <p className="text-xs text-ink-soft truncate mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-soft flex items-center justify-center text-ink hover:bg-block-lime transition-colors focus-ring cursor-pointer shrink-0"
            aria-label="Đóng bảng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-hairline bg-soft flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
