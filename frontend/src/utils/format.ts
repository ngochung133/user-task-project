import { HR_MODULES, type GenderEnum, type HttpMethod, type UploadFolder } from '../types/hr';

export function utf8ByteLength(str: string): number {
  return new TextEncoder().encode(str || '').length;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getInitials(name: string | null | undefined): string {
  const parts = String(name || '')
    .trim()
    .split(/[\s_]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function normalizeModuleName(module: string | null | undefined): string {
  const normalized = String(module ?? '').trim().toUpperCase();
  return normalized || 'OTHER';
}

export function collectPermissionModules(
  permissions: readonly { module?: string | null }[],
  extraModules: readonly (string | null | undefined)[] = [],
): string[] {
  const seen = new Set<string>(HR_MODULES);
  const dynamic: string[] = [];

  const registerModule = (normalized: string) => {
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    dynamic.push(normalized);
  };

  permissions.forEach((p) => {
    registerModule(normalizeModuleName(p.module));
  });

  extraModules.forEach((raw) => {
    const trimmed = String(raw ?? '').trim().toUpperCase();
    if (trimmed) {
      registerModule(trimmed);
    }
  });

  dynamic.sort((a, b) => a.localeCompare(b));
  return [...HR_MODULES, ...dynamic];
}

export function methodBadgeClass(method: HttpMethod | string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'badge-mint';
    case 'POST':
      return 'badge-lilac';
    case 'PUT':
    case 'PATCH':
      return 'badge-coral';
    case 'DELETE':
      return 'badge-pink';
    default:
      return 'badge-soft';
  }
}

export function genderLabel(gender: GenderEnum | null | undefined): string {
  if (gender === 'MALE') return 'Nam (MALE)';
  if (gender === 'FEMALE') return 'Nữ (FEMALE)';
  if (gender === 'OTHER') return 'Khác (OTHER)';
  return '-';
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Resolve an uploaded file name / URL to an image src.
 * Supports data: URLs (demo mode uploads), absolute http(s) URLs, `/uploads/...` paths,
 * or bare filenames (stored in User.avatar / Company.logo) mapped to `/uploads/{folder}/{fileName}`.
 */
export function resolveUploadUrl(
  value: string | null | undefined,
  folder: UploadFolder,
  previewMap?: Record<string, string>,
): string | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  if (previewMap && previewMap[trimmed]) return previewMap[trimmed];
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  if (trimmed.startsWith('/uploads/')) return trimmed;
  if (trimmed.startsWith('uploads/')) return `/${trimmed}`;
  // Bare filenames stored in User.avatar / Company.logo (e.g. uuid.png) resolve to Spring Boot /uploads/{folder}/{fileName}
  return `/uploads/${folder}/${encodeURIComponent(trimmed)}`;
}
