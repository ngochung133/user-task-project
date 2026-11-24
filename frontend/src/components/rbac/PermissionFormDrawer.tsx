import React, { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../api/client';
import { permissionsApi } from '../../api/hrService';
import {
  HTTP_METHODS,
  type PermissionResponseDTO,
} from '../../types/hr';
import { collectPermissionModules, normalizeModuleName } from '../../utils/format';
import { MethodBadge } from '../ui/Badges';
import { Drawer } from '../ui/Drawer';

export interface PermissionFormDrawerProps {
  open: boolean;
  permission: PermissionResponseDTO | null;
  onClose: () => void;
  onSaved: (saved: PermissionResponseDTO, isCreate: boolean) => void;
}

export function PermissionFormDrawer({
  open,
  permission,
  onClose,
  onSaved,
}: PermissionFormDrawerProps) {
  const isEdit = Boolean(permission);
  const [name, setName] = useState('');
  const [apiPath, setApiPath] = useState('/api/v1/');
  const [method, setMethod] = useState<string>('GET');
  const [module, setModule] = useState<string>('USER');
  const [customModuleMode, setCustomModuleMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [conflict409, setConflict409] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(permission?.name ?? '');
    setApiPath(permission?.apiPath ?? '/api/v1/');
    const normalizedMethod = String(permission?.method ?? 'GET').trim().toUpperCase() || 'GET';
    setMethod(normalizedMethod);
    const normalizedModule = permission?.module ? normalizeModuleName(permission.module) : 'USER';
    setModule(normalizedModule);
    setCustomModuleMode(false);
    setSubmitting(false);
    setErrorMessage(null);
    setErrorDetails([]);
    setConflict409(null);
  }, [open, permission]);

  const methodOptions = useMemo(() => {
    const base = [...HTTP_METHODS] as string[];
    if (method && !base.includes(method)) {
      base.push(method);
    }
    return base;
  }, [method]);

  const moduleOptions = useMemo(
    () => collectPermissionModules([], [permission?.module, module]),
    [permission?.module, module],
  );

  const validateApiPath = (rawPath: string): string | null => {
    const trimmed = rawPath.trim();
    if (!trimmed) return 'API Path không được để trống.';
    if (trimmed.length > 255) return 'API Path tối đa 255 ký tự.';
    if (!trimmed.startsWith('/')) {
      return 'API Path phải bắt đầu bằng ký tự "/" (ví dụ: /api/v1/users/{id}).';
    }
    if (trimmed.includes('://') || trimmed.includes('?') || trimmed.includes('#')) {
      return 'API Path chỉ nhận đường dẫn nội bộ ứng dụng, không kèm domain, query (?) hoặc fragment (#).';
    }
    if (/\s/.test(trimmed)) {
      return 'API Path không được chứa khoảng trắng ở giữa.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorDetails([]);
    setConflict409(null);

    const trimmedName = name.trim();
    const trimmedPath = apiPath.trim();
    const normalizedMod = module.trim().toUpperCase();

    if (!trimmedName) {
      setErrorMessage('Tên quyền hạn không được để trống.');
      return;
    }
    if (trimmedName.length > 255) {
      setErrorMessage('Tên quyền hạn tối đa 255 ký tự.');
      return;
    }

    const pathError = validateApiPath(trimmedPath);
    if (pathError) {
      setErrorMessage(pathError);
      return;
    }

    if (!normalizedMod) {
      setErrorMessage('Module không được để trống.');
      return;
    }
    if (normalizedMod.length > 255) {
      setErrorMessage('Module tối đa 255 ký tự.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        apiPath: trimmedPath,
        method,
        module: normalizedMod,
      };
      const saved = permission
        ? await permissionsApi.update(permission.id, payload)
        : await permissionsApi.create(payload);
      onSaved(saved, !permission);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setConflict409(
            `Xung đột HTTP 409: Cặp (${method} ${trimmedPath}) đã tồn tại. Vui lòng đổi apiPath hoặc HTTP method.`,
          );
        } else {
          setErrorMessage(err.message);
        }
        setErrorDetails(err.details);
      } else {
        setErrorMessage('Không thể lưu quyền hạn. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'rbac-permission-form';

  return (
    <Drawer
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={isEdit && permission ? `Sửa quyền #${permission.id}` : 'Thêm quyền API mới'}
      subtitle={
        isEdit && permission
          ? `PUT /api/v1/permissions/${permission.id} · PermissionRequestDTO`
          : 'POST /api/v1/permissions · PermissionRequestDTO'
      }
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
            type="submit"
            form={formId}
            disabled={submitting}
            className="btn-primary px-5 py-2 text-xs focus-ring cursor-pointer"
          >
            {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo quyền'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {conflict409 && (
          <div
            role="alert"
            className="rounded-xl p-3 bg-block-pink border border-ink text-xs text-ink space-y-1"
          >
            <div className="font-semibold">{conflict409}</div>
            <p className="text-ink-soft">
              Ràng buộc duy nhất trong MySQL: <span className="font-mono">(api_path, method)</span>{' '}
              phân biệt hoa thường trên <span className="font-mono">api_path</span>.
            </p>
            {errorDetails.length > 0 && (
              <ul className="list-disc pl-4 space-y-0.5 font-normal">
                {errorDetails.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl p-3 bg-block-coral border border-hairline text-xs text-ink font-medium space-y-1"
          >
            <div>{errorMessage}</div>
            {errorDetails.length > 0 && (
              <ul className="list-disc pl-4 space-y-0.5 font-normal">
                {errorDetails.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <label htmlFor="drawer-perm-name" className="block text-xs font-medium text-ink mb-1.5">
            Tên quyền hạn *
          </label>
          <input
            id="drawer-perm-name"
            type="text"
            required
            maxLength={255}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Xem chi tiết nhân sự"
            className="input-field w-full px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="drawer-perm-path" className="block text-xs font-medium text-ink mb-1.5">
            API Path * (bắt đầu bằng <span className="font-mono">/</span>, giữ nguyên hoa thường)
          </label>
          <input
            id="drawer-perm-path"
            type="text"
            required
            maxLength={255}
            value={apiPath}
            onChange={(e) => {
              setApiPath(e.target.value);
              if (conflict409) setConflict409(null);
            }}
            placeholder="/api/v1/users/{id}"
            className={`input-field w-full px-3 py-2 text-sm font-mono ${
              conflict409 ? 'border-ink' : ''
            }`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="drawer-perm-method"
              className="block text-xs font-medium text-ink mb-1.5"
            >
              HTTP Method *
            </label>
            <select
              id="drawer-perm-method"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                if (conflict409) setConflict409(null);
              }}
              className="input-field w-full px-3 py-2 text-sm font-mono"
            >
              {methodOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="drawer-perm-module" className="text-xs font-medium text-ink">
                Module *
              </label>
              <button
                type="button"
                onClick={() => setCustomModuleMode((v) => !v)}
                className="text-xs text-ink underline hover:opacity-80 focus-ring rounded cursor-pointer"
              >
                {customModuleMode ? 'Chọn có sẵn' : 'Nhập module khác'}
              </button>
            </div>
            {customModuleMode ? (
              <input
                id="drawer-perm-module"
                type="text"
                required
                maxLength={255}
                value={module}
                onChange={(e) => setModule(e.target.value.toUpperCase())}
                placeholder="VD: FILE hoặc PAYROLL"
                className="input-field w-full px-3 py-2 text-sm font-mono"
              />
            ) : (
              <select
                id="drawer-perm-module"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="input-field w-full px-3 py-2 text-sm font-mono"
              >
                {moduleOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="tile-soft flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-ink-soft">Xem trước cặp duy nhất:</span>
          <span className="inline-flex items-center gap-2 min-w-0">
            <MethodBadge method={method} />
            <span className="font-mono text-xs text-ink truncate">
              {apiPath.trim() || '/...'}
            </span>
          </span>
        </div>
      </form>
    </Drawer>
  );
}
