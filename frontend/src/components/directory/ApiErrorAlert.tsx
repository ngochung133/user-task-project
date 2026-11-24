import { AlertCircle } from 'lucide-react';
import { ApiError } from '../../api/client';

export interface ApiErrorAlertProps {
  error: ApiError | string | null;
  title?: string;
}

export function ApiErrorAlert({ error, title }: ApiErrorAlertProps) {
  if (!error) return null;

  const isApiError = error instanceof ApiError;
  const statusCode = isApiError ? error.statusCode : undefined;
  const errorLabel = isApiError ? error.error : undefined;
  const message = isApiError ? error.message : error;
  const details = isApiError ? error.details : [];

  return (
    <div
      role="alert"
      className="rounded-xl border border-ink/25 bg-block-pink p-3.5 text-ink space-y-2"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-ink shrink-0 mt-0.5" strokeWidth={2} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {statusCode !== undefined && statusCode > 0 && (
              <span className="px-3 py-2 text-xs leading-none font-mono font-semibold badge-black tabular-nums">
                HTTP {statusCode}
                {errorLabel ? ` · ${errorLabel}` : ''}
              </span>
            )}
            <span className="text-xs font-semibold text-ink">
              {title ?? 'Không thể hoàn tất yêu cầu'}
            </span>
          </div>
          <p className="text-xs text-ink leading-relaxed break-words">{message}</p>
        </div>
      </div>

      {details.length > 0 && (
        <ul className="pl-6 list-disc space-y-1 text-xs text-ink border-t border-ink/15 pt-2">
          {details.map((detail, idx) => (
            <li key={`${idx}-${detail}`} className="font-mono text-xs break-words">
              {detail}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
