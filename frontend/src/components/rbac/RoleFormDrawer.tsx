import React, { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../api/client';
import { rolesApi } from '../../api/hrService';
import {
  type PermissionResponseDTO,
  type RoleResponseDTO,
} from '../../types/hr';
import { collectPermissionModules, normalizeModuleName } from '../../utils/format';
import { MethodBadge } from '../ui/Badges';
import { Drawer } from '../ui/Drawer';

export interface RoleFormDrawerProps {
  open: boolean;
  role: RoleResponseDTO | null;
  initialPermissionIds?: number[];
  allPermissions: PermissionResponseDTO[];
  onClose: () => void;
  onSaved: (saved: RoleResponseDTO, isCreate: boolean) => void;
}

export function RoleFormDrawer({
  open,
  role,
  initialPermissionIds,
  allPermissions,
  onClose,
  onSaved,
}: RoleFormDrawerProps) {
  const isEdit = Boolean(role);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionIds, setPermissionIds] = useState<number[]>([]);
  const [permQuery, setPermQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [isConflict409, setIsConflict409] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setPermissionIds(
      initialPermissionIds ?? (role ? role.permissions.map((p) => p.id) : []),
    );
    setPermQuery('');
    setSubmitting(false);
    setErrorMessage(null);
    setErrorDetails([]);
    setIsConflict409(false);
  }, [open, role, initialPermissionIds]);

  const groupedPermissions = useMemo(() => {
    const q = permQuery.trim().toLowerCase();
    const modules = collectPermissionModules(allPermissions);
    return modules.map((mod) => {
      const items = allPermissions.filter((p) => {
        if (normalizeModuleName(p.module) !== mod) return false;
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.apiPath.toLowerCase().includes(q) ||
          String(p.method).toLowerCase().includes(q) ||
          mod.toLowerCase().includes(q)
        );
      });
      return { module: mod, items };
    });
  }, [allPermissions, permQuery]);

  const togglePermission = (permId: number) => {
    setPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId],
    );
  };

  const toggleModuleAll = (items: PermissionResponseDTO[], nextChecked: boolean) => {
    const ids = items.map((p) => p.id);
    if (nextChecked) {
      setPermissionIds((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      setPermissionIds((prev) => prev.filter((id) => !ids.includes(id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorDetails([]);
    setIsConflict409(false);

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (!trimmedName) {
      setErrorMessage('Tên vai trò không được để trống.');
      return;
    }
    if (trimmedName.length > 255) {
      setErrorMessage('Tên vai trò tối đa 255 ký tự.');
      return;
    }
    if (!trimmedDesc) {
      setErrorMessage('Mô tả vai trò không được để trống.');
      return;
    }
    if (trimmedDesc.length > 255) {
      setErrorMessage('Mô tả vai trò tối đa 255 ký tự.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        description: trimmedDesc,
        permissionIds: Array.from(new Set(permissionIds)),
      };
      const saved = role
        ? await rolesApi.update(role.id, payload)
        : await rolesApi.create(payload);
      onSaved(saved, !role);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setIsConflict409(true);
          setErrorMessage(
            `HTTP 409 Conflict: Tên vai trò "${trimmedName}" đã tồn tại trong hệ thống.`,
          );
        } else {
          setErrorMessage(err.message);
        }
        setErrorDetails(err.details);
      } else {
        setErrorMessage('Không thể lưu vai trò. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formId = 'rbac-role-form';

  return (
    <Drawer
      open={open}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title={isEdit && role ? `Sửa vai trò ${role.name}` : 'Tạo vai trò mới'}
      subtitle={
        isEdit && role
          ? `PUT /api/v1/roles/${role.id} · RoleRequestDTO`
          : 'POST /api/v1/roles · RoleRequestDTO'
      }
      maxWidthClass="max-w-xl"
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
            {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo vai trò'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div
            role="alert"
            className={`rounded-xl p-3 border text-xs space-y-1 ${
              isConflict409
                ? 'bg-block-pink border-ink text-ink font-medium'
                : 'bg-block-coral border-hairline text-ink font-medium'
            }`}
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
          <label htmlFor="drawer-role-name" className="block text-xs font-medium text-ink mb-1.5">
            Tên vai trò * (duy nhất, tối đa 255 ký tự)
          </label>
          <input
            id="drawer-role-name"
            type="text"
            required
            maxLength={255}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (isConflict409) {
                setIsConflict409(false);
                setErrorMessage(null);
              }
            }}
            placeholder="Ví dụ: PAYROLL_ADMIN"
            className={`input-field w-full px-3 py-2 text-sm font-mono ${
              isConflict409 ? 'border-ink' : ''
            }`}
          />
        </div>

        <div>
          <label htmlFor="drawer-role-desc" className="block text-xs font-medium text-ink mb-1.5">
            Mô tả vai trò * (tối đa 255 ký tự)
          </label>
          <textarea
            id="drawer-role-desc"
            required
            rows={3}
            maxLength={255}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Phạm vi trách nhiệm của vai trò trong hệ thống HR..."
            className="input-field w-full px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink">
              Danh sách quyền gán (<span className="font-mono">permissionIds</span>:{' '}
              <span className="font-mono tabular-nums font-semibold">
                {permissionIds.length}/{allPermissions.length}
              </span>
              )
            </span>
            {permissionIds.length > 0 && (
              <button
                type="button"
                onClick={() => setPermissionIds([])}
                className="btn-secondary px-3 py-1 text-xs focus-ring cursor-pointer"
              >
                Bỏ chọn hết
              </button>
            )}
          </div>

          <input
            type="text"
            value={permQuery}
            onChange={(e) => setPermQuery(e.target.value)}
            placeholder="Lọc nhanh quyền theo tên, apiPath hoặc method..."
            className="input-field w-full px-3 py-2 text-xs"
          />

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {groupedPermissions.map(({ module, items }) => {
              if (permQuery.trim() && items.length === 0) return null;
              const allChecked =
                items.length > 0 && items.every((p) => permissionIds.includes(p.id));
              return (
                <div key={module} className="border border-hairline rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-soft border-b border-hairline flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-ink">
                      {module} ({items.filter((p) => permissionIds.includes(p.id)).length}/
                      {items.length})
                    </span>
                    {items.length > 0 && (
                      <label className="inline-flex items-center gap-2 text-xs text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) => toggleModuleAll(items, e.target.checked)}
                          className="check-accent"
                        />
                        <span>Chọn module</span>
                      </label>
                    )}
                  </div>
                  {items.length > 0 ? (
                    <div className="divide-y divide-hairline">
                      {items.map((perm) => {
                        const checked = permissionIds.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-soft cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(perm.id)}
                                className="check-accent shrink-0"
                              />
                              <MethodBadge method={perm.method} className="shrink-0" />
                              <span className="text-xs text-ink truncate">{perm.name}</span>
                            </span>
                            <span className="font-mono text-xs text-ink-soft shrink-0 hidden sm:inline">
                              {perm.apiPath}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-ink-soft">
                      Chưa có quyền thuộc module {module}.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </Drawer>
  );
}
