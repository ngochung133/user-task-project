import { useMemo } from 'react';

export interface DecodedJwtResult {
  isJwt: boolean;
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  notice?: string;
}

function decodeBase64UrlToJson(segment: string): Record<string, unknown> | null {
  if (!segment) return null;
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padding);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const jsonText = new TextDecoder('utf-8').decode(bytes);
  const parsed = JSON.parse(jsonText) as unknown;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return null;
}

export function decodeJwtSafely(token: string | null | undefined): DecodedJwtResult {
  if (!token || !token.trim()) {
    return {
      isJwt: false,
      header: null,
      payload: null,
      notice: 'Chưa có Access Token trong phiên hiện tại.',
    };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return {
      isJwt: false,
      header: null,
      payload: null,
      notice:
        'Token hiện tại không theo định dạng JWT 3 phần (header.payload.signature). Đang hiển thị chuỗi thô an toàn.',
    };
  }

  try {
    const header = decodeBase64UrlToJson(parts[0]);
    const payload = decodeBase64UrlToJson(parts[1]);
    if (!payload) {
      return {
        isJwt: false,
        header,
        payload: null,
        notice: 'Payload của token không phải JSON object hợp lệ.',
      };
    }
    return {
      isJwt: true,
      header,
      payload,
    };
  } catch {
    return {
      isJwt: false,
      header: null,
      payload: null,
      notice:
        'Không thể giải mã Base64URL/UTF-8 từ token (có thể là token mô phỏng hoặc mã hóa tùy biến).',
    };
  }
}

function formatEpochField(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const ms = value > 1e12 ? value : value * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('vi-VN');
}

export interface JwtPayloadViewerProps {
  accessToken: string | null;
  loggedIn: boolean;
}

export function JwtPayloadViewer({ accessToken, loggedIn }: JwtPayloadViewerProps) {
  const decoded = useMemo(() => decodeJwtSafely(accessToken), [accessToken]);

  const expMeta = useMemo(() => {
    const expVal = decoded.payload?.exp;
    if (typeof expVal !== 'number' || !Number.isFinite(expVal)) return null;
    const expMs = expVal > 1e12 ? expVal : expVal * 1000;
    const expired = Date.now() > expMs;
    return {
      expired,
      formatted: new Date(expMs).toLocaleString('vi-VN'),
    };
  }, [decoded.payload]);

  const iatFormatted = formatEpochField(decoded.payload?.iat);
  const rolesClaim = Array.isArray(decoded.payload?.roles)
    ? (decoded.payload?.roles as unknown[]).map((r) => String(r))
    : [];

  return (
    <div
      className="rounded-2xl p-4 space-y-3"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-mono uppercase tracking-wider text-white">
          Decoded JWT Payload Viewer
        </span>
        {decoded.isJwt && expMeta ? (
          <span
            className={`px-3 py-1 text-xs font-mono font-semibold ${
              expMeta.expired ? 'badge-pink' : 'badge-mint'
            }`}
          >
            {expMeta.expired ? 'Hết hạn (exp)' : 'Còn hạn'} · {expMeta.formatted}
          </span>
        ) : decoded.isJwt ? (
          <span className="px-3 py-1 text-xs font-mono font-semibold badge-cream">
            {loggedIn ? 'JWT Payload hợp lệ' : 'Token cũ'}
          </span>
        ) : (
          <span className="px-3 py-1 text-xs font-mono font-semibold badge-soft">
            Không giải mã JWT
          </span>
        )}
      </div>

      {decoded.isJwt && decoded.payload ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {decoded.header?.alg !== undefined && (
              <span className="px-3 py-1 text-xs font-mono badge-lilac">
                alg: {String(decoded.header.alg)}
              </span>
            )}
            {decoded.payload.sub !== undefined && (
              <span className="px-3 py-1 text-xs font-mono badge-cream">
                sub: {String(decoded.payload.sub)}
              </span>
            )}
            {decoded.payload.userId !== undefined && (
              <span className="px-3 py-1 text-xs font-mono badge-lime">
                userId: {String(decoded.payload.userId)}
              </span>
            )}
            {decoded.payload.type !== undefined && (
              <span className="px-3 py-1 text-xs font-mono badge-soft">
                type: {String(decoded.payload.type)}
              </span>
            )}
            {iatFormatted && (
              <span className="px-3 py-1 text-xs font-mono badge-soft">
                iat: {iatFormatted}
              </span>
            )}
            {rolesClaim.map((r) => (
              <span key={r} className="px-3 py-1 text-xs font-mono badge-mint">
                {r}
              </span>
            ))}
          </div>

          <pre
            className="rounded-xl p-3 text-xs font-mono text-white overflow-x-auto"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.28)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
            }}
          >
            {JSON.stringify(
              {
                header: decoded.header,
                payload: decoded.payload,
              },
              null,
              2,
            )}
          </pre>
        </div>
      ) : (
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.86)' }}>
          {decoded.notice}
        </p>
      )}
    </div>
  );
}
