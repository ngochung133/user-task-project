import { useEffect, useState } from 'react';
import { getDataMode, getDemoPreviewUrl } from '../../api/hrService';
import type { HttpMethod, UploadFolder } from '../../types/hr';
import { getInitials, methodBadgeClass, resolveUploadUrl } from '../../utils/format';

const PASTEL_VARS = [
  'var(--fg-block-lime)',
  'var(--fg-block-lilac)',
  'var(--fg-block-cream)',
  'var(--fg-block-mint)',
] as const;

export interface MethodBadgeProps {
  method: HttpMethod | string;
  className?: string;
}

export function MethodBadge({ method, className = '' }: MethodBadgeProps) {
  const normalized = String(method || '').toUpperCase();
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-mono font-semibold ${methodBadgeClass(
        normalized,
      )} ${className}`}
    >
      {normalized}
    </span>
  );
}

function resolveRenderableImageSrc(
  fileName: string | null | undefined,
  folder: UploadFolder,
  previewOverride?: string | null,
): string | null {
  if (previewOverride) return previewOverride;
  const trimmed = String(fileName ?? '').trim();
  if (!trimmed) return null;
  const demoPreview = getDemoPreviewUrl(trimmed);
  if (demoPreview) return demoPreview;
  if (getDataMode() === 'demo') {
    if (
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')
    ) {
      return trimmed;
    }
    // Seeded filenames in demo mode render clean pastel fallback tiles instead of broken 404 images
    return null;
  }
  return resolveUploadUrl(trimmed, folder);
}

export interface UserAvatarProps {
  id?: number;
  name: string;
  avatar?: string | null;
  previewUrl?: string | null;
  sizeClass?: string;
}

export function UserAvatar({
  id = 0,
  name,
  avatar,
  previewUrl,
  sizeClass = 'w-9 h-9 text-xs',
}: UserAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const candidateSrc = resolveRenderableImageSrc(avatar, 'avatars', previewUrl);

  useEffect(() => {
    setFailedSrc(null);
  }, [candidateSrc]);

  const src = candidateSrc && candidateSrc !== failedSrc ? candidateSrc : null;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailedSrc(src)}
        className={`${sizeClass} rounded-lg object-cover border border-hairline shrink-0`}
      />
    );
  }

  const bg = PASTEL_VARS[Math.abs(id) % PASTEL_VARS.length];
  return (
    <span
      className={`${sizeClass} rounded-lg border border-hairline flex items-center justify-center font-semibold text-ink shrink-0`}
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}

export interface CompanyLogoProps {
  id?: number;
  name: string;
  logo?: string | null;
  previewUrl?: string | null;
  sizeClass?: string;
}

export function CompanyLogo({
  id = 0,
  name,
  logo,
  previewUrl,
  sizeClass = 'w-10 h-10',
}: CompanyLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const candidateSrc = resolveRenderableImageSrc(logo, 'logos', previewUrl);

  useEffect(() => {
    setFailedSrc(null);
  }, [candidateSrc]);

  const src = candidateSrc && candidateSrc !== failedSrc ? candidateSrc : null;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setFailedSrc(src)}
        className={`${sizeClass} rounded-lg object-cover border border-hairline shrink-0`}
      />
    );
  }

  const bg = PASTEL_VARS[Math.abs(id) % PASTEL_VARS.length];
  return (
    <span
      className={`${sizeClass} rounded-lg flex items-center justify-center shrink-0 border border-hairline text-xs font-semibold text-ink`}
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}
