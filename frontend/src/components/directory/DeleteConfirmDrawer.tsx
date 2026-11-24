import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import { Drawer } from '../ui/Drawer';
import { ApiErrorAlert } from './ApiErrorAlert';

export interface DeleteConfirmDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  itemName: string;
  itemMeta?: string;
  description: string;
  warningNote?: string;
  previewNode?: React.ReactNode;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteConfirmDrawer({
  open,
  title,
  subtitle,
  itemName,
  itemMeta,
  description,
  warningNote,
  previewNode,
  confirmLabel = 'Xác nhận xóa',
  onClose,
  onConfirm,
}: DeleteConfirmDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<ApiError | string | null>(null);

  useEffect(() => {
    if (open) {
      setSubmitting(false);
      setApiError(null);
    }
  }, [open, itemName]);

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    setApiError(null);
    try {
      await onConfirm();
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err);
      } else {
        setApiError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi xóa bản ghi.');
      }
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={title}
      subtitle={subtitle}
      onClose={() => {
        if (!submitting) onClose();
      }}
      maxWidthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleConfirm()}
            className="badge-pink border border-ink/25 px-4 py-2 text-xs font-semibold text-ink inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 focus-ring cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{submitting ? 'Đang xóa...' : confirmLabel}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="tile-soft flex items-center gap-3">
          {previewNode}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink truncate">{itemName}</p>
            {itemMeta && (
              <p className="text-xs font-mono text-ink-soft truncate mt-0.5">{itemMeta}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-ink leading-relaxed">{description}</p>

        {warningNote && (
          <div className="rounded-xl border border-hairline bg-block-cream p-3.5 text-xs text-ink leading-relaxed">
            {warningNote}
          </div>
        )}

        <ApiErrorAlert error={apiError} title="Xóa thất bại" />
      </div>
    </Drawer>
  );
}
