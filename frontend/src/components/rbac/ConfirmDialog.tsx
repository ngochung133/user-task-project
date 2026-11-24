import { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  secondaryActionLabel?: string;
  tone?: 'danger' | 'neutral';
  busy?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onSecondaryAction?: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  secondaryActionLabel,
  tone = 'danger',
  busy = false,
  errorMessage,
  onConfirm,
  onSecondaryAction,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 drawer-backdrop drawer-backdrop-in"
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div className="relative z-10 w-full max-w-md card-hairline p-6 space-y-4 shadow-xl inspector-reveal">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink leading-snug">{title}</h2>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="w-9 h-9 rounded-full bg-soft flex items-center justify-center text-ink hover:bg-block-lime transition-colors focus-ring cursor-pointer shrink-0 disabled:opacity-45"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-ink-soft leading-relaxed">{description}</p>

        {errorMessage && (
          <div className="rounded-xl p-3 bg-block-pink border border-ink text-xs text-ink font-medium">
            {errorMessage}
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
          >
            {cancelLabel}
          </button>
          {secondaryActionLabel && onSecondaryAction && (
            <button
              type="button"
              disabled={busy}
              onClick={onSecondaryAction}
              className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
            >
              {secondaryActionLabel}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`px-5 py-2 text-xs font-semibold rounded-full focus-ring cursor-pointer transition-opacity disabled:opacity-45 ${
              tone === 'danger'
                ? 'bg-block-pink text-ink border border-ink hover:opacity-85'
                : 'btn-primary'
            }`}
          >
            {busy ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
