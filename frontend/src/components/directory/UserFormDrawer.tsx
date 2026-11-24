import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Upload, X } from 'lucide-react';
import { ApiError } from '../../api/client';
import { filesApi, getDemoPreviewUrl, usersApi } from '../../api/hrService';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import {
  GENDERS,
  type CompanyResponseDTO,
  type GenderEnum,
  type RoleResponseDTO,
  type UserRequestDTO,
  type UserResponseDTO,
} from '../../types/hr';
import { genderLabel, utf8ByteLength } from '../../utils/format';
import { CompanyLogo, UserAvatar } from '../ui/Badges';
import { Drawer } from '../ui/Drawer';
import { ApiErrorAlert } from './ApiErrorAlert';

export interface UserFormDrawerProps {
  open: boolean;
  editingUser: UserResponseDTO | null;
  companies: CompanyResponseDTO[];
  roles: RoleResponseDTO[];
  referenceError?: string | null;
  onRetryReferences?: () => void;
  onClose: () => void;
  onSuccess: (savedUser: UserResponseDTO, isEdit: boolean) => void;
}

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  age?: string;
  address?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pickDefaultRoleIds(roleList: RoleResponseDTO[]): number[] {
  const preferred =
    roleList.find((r) => r.name.toUpperCase() === 'USER') ??
    roleList.find((r) => r.name.toUpperCase() === 'EMPLOYEE') ??
    roleList[0];
  return preferred ? [preferred.id] : [];
}

export function UserFormDrawer({
  open,
  editingUser,
  companies,
  roles,
  referenceError,
  onRetryReferences,
  onClose,
  onSuccess,
}: UserFormDrawerProps) {
  const { dataMode } = useApp();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<GenderEnum | ''>('MALE');
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [roleIDs, setRoleIDs] = useState<number[]>([]);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<ApiError | string | null>(null);
  const [uploadError, setUploadError] = useState<ApiError | string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const objectUrlRef = useRef<string | null>(null);
  const hasInitializedCreateRolesRef = useRef(false);
  const hasInitializedCreateCompanyRef = useRef(false);

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeObjectUrl();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      hasInitializedCreateRolesRef.current = false;
      hasInitializedCreateCompanyRef.current = false;
      return;
    }

    revokeObjectUrl();
    setFieldErrors({});
    setApiError(null);
    setUploadError(null);
    setUploadingAvatar(false);
    setSubmitting(false);

    if (editingUser) {
      hasInitializedCreateRolesRef.current = true;
      hasInitializedCreateCompanyRef.current = true;
      setName(editingUser.name ?? '');
      setEmail(editingUser.email ?? '');
      setPassword('');
      setAge(editingUser.age !== null && editingUser.age !== undefined ? String(editingUser.age) : '');
      setGender(editingUser.gender ?? '');
      setAddress(editingUser.address ?? '');
      setAvatar(editingUser.avatar ?? '');
      setAvatarPreview(getDemoPreviewUrl(editingUser.avatar) ?? null);
      setCompanyId(editingUser.companyInfo ? String(editingUser.companyInfo.id) : '');
      setRoleIDs(editingUser.roleInfo.map((r) => r.id));
    } else {
      const initialRoleIds = pickDefaultRoleIds(roles);
      hasInitializedCreateRolesRef.current = initialRoleIds.length > 0;
      hasInitializedCreateCompanyRef.current = companies.length > 0;
      setName('');
      setEmail('');
      setPassword('');
      setAge('25');
      setGender('MALE');
      setAddress('');
      setAvatar('');
      setAvatarPreview(null);
      setCompanyId(companies[0] ? String(companies[0].id) : '');
      setRoleIDs(initialRoleIds);
    }
  }, [open, editingUser]);

  useEffect(() => {
    if (!open || editingUser) return;
    if (!hasInitializedCreateRolesRef.current && roles.length > 0) {
      const nextRoleIds = pickDefaultRoleIds(roles);
      if (nextRoleIds.length > 0) {
        setRoleIDs((prev) => (prev.length > 0 ? prev : nextRoleIds));
        hasInitializedCreateRolesRef.current = true;
      }
    }
    if (!hasInitializedCreateCompanyRef.current && companies.length > 0) {
      setCompanyId((prev) => prev || String(companies[0].id));
      hasInitializedCreateCompanyRef.current = true;
    }
  }, [open, editingUser, roles, companies]);

  const companyOptions = useMemo(() => {
    const list = [...companies];
    if (
      editingUser?.companyInfo &&
      !list.some((c) => c.id === editingUser.companyInfo!.id)
    ) {
      list.unshift({
        id: editingUser.companyInfo.id,
        name: editingUser.companyInfo.name,
        description: '',
        address: '',
        logo: '',
        createdAt: null,
        updatedAt: null,
      });
    }
    return list;
  }, [companies, editingUser]);

  const roleOptions = useMemo(() => {
    const list = [...roles];
    if (editingUser) {
      editingUser.roleInfo.forEach((ri) => {
        if (!list.some((r) => r.id === ri.id)) {
          list.push({
            id: ri.id,
            name: ri.name,
            description: '',
            permissions: [],
            createdAt: null,
            updatedAt: null,
          });
        }
      });
    }
    return list;
  }, [roles, editingUser]);

  const selectedCompany = useMemo(() => {
    const parsed = Number(companyId);
    if (!companyId || !Number.isFinite(parsed)) return null;
    return companyOptions.find((c) => c.id === parsed) ?? null;
  }, [companyId, companyOptions]);

  const passwordBytes = useMemo(() => utf8ByteLength(password), [password]);
  const isEdit = Boolean(editingUser);
  const passwordRequired = !isEdit || dataMode === 'live';

  const toggleRoleId = (id: number) => {
    hasInitializedCreateRolesRef.current = true;
    setRoleIDs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
    setApiError(null);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const prevPreview = avatarPreview;
    const localUrl = URL.createObjectURL(file);

    setUploadError(null);
    setUploadingAvatar(true);

    try {
      const uploaded = await filesApi.upload(file, 'avatars');
      revokeObjectUrl();
      objectUrlRef.current = localUrl;

      setAvatar(uploaded.fileName);
      setAvatarPreview(getDemoPreviewUrl(uploaded.fileName) ?? localUrl);
      showToast(`Đã tải ảnh đại diện lên (${uploaded.fileName}).`);
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setAvatarPreview(prevPreview);
      if (err instanceof ApiError) {
        setUploadError(err);
        showToast(err.fullMessage, 'error');
      } else {
        const msg = err instanceof Error ? err.message : 'Không thể tải ảnh đại diện.';
        setUploadError(msg);
        showToast(msg, 'error');
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const clearAvatar = () => {
    revokeObjectUrl();
    setAvatar('');
    setAvatarPreview(null);
    setUploadError(null);
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName) {
      errors.name = 'Họ và tên không được để trống.';
    } else if (trimmedName.length < 2 || trimmedName.length > 100) {
      errors.name = 'Họ và tên phải có độ dài từ 2 đến 100 ký tự.';
    }

    if (!trimmedEmail) {
      errors.email = 'Email không được để trống.';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Định dạng email không hợp lệ.';
    }

    if (passwordRequired) {
      if (!password.trim()) {
        errors.password = isEdit
          ? 'Chế độ Live API yêu cầu đặt hoặc nhập lại mật khẩu (tối thiểu 6 ký tự).'
          : 'Mật khẩu là bắt buộc khi tạo nhân sự mới.';
      } else if (password.length < 6) {
        errors.password = 'Mật khẩu tối thiểu 6 ký tự.';
      } else if (utf8ByteLength(password) > 72) {
        errors.password = 'Mật khẩu vượt quá giới hạn 72 byte UTF-8 của BCrypt.';
      }
    } else if (password.length > 0) {
      if (!password.trim()) {
        errors.password = 'Mật khẩu mới không được chỉ chứa khoảng trắng.';
      } else if (password.length < 6) {
        errors.password = 'Mật khẩu tối thiểu 6 ký tự.';
      } else if (utf8ByteLength(password) > 72) {
        errors.password = 'Mật khẩu vượt quá giới hạn 72 byte UTF-8 của BCrypt.';
      }
    }

    if (age.trim()) {
      const parsedAge = Number(age.trim());
      if (!Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 150) {
        errors.age = 'Tuổi phải là số nguyên từ 1 đến 150.';
      }
    }

    if (!trimmedAddress) {
      errors.address = 'Địa chỉ không được để trống.';
    } else if (trimmedAddress.length > 255) {
      errors.address = 'Địa chỉ tối đa 255 ký tự.';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || uploadingAvatar) return;

    const errors = validate();
    setFieldErrors(errors);
    setApiError(null);

    if (Object.keys(errors).length > 0) {
      showToast('Vui lòng kiểm tra lại các trường thông tin bắt buộc.', 'warning');
      return;
    }

    const payload: UserRequestDTO = {
      name: name.trim(),
      email: email.trim(),
      password,
      age: age.trim() ? Number(age.trim()) : null,
      avatar: avatar.trim() ? avatar.trim() : null,
      gender: gender || null,
      companyId: companyId ? Number(companyId) : null,
      roleIDs: Array.from(new Set(roleIDs)),
      address: address.trim(),
    };

    setSubmitting(true);
    try {
      const saved = editingUser
        ? await usersApi.update(editingUser.id, payload)
        : await usersApi.create(payload);
      onSuccess(saved, isEdit);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err);
        showToast(err.fullMessage, 'error');
      } else {
        const msg = err instanceof Error ? err.message : 'Không thể lưu thông tin nhân sự.';
        setApiError(msg);
        showToast(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={isEdit ? `Cập nhật nhân sự #${editingUser?.id}` : 'Thêm nhân sự mới'}
      subtitle={
        isEdit
          ? 'PUT /api/v1/users/{id} · UserRequestDTO'
          : 'POST /api/v1/users · UserRequestDTO'
      }
      onClose={() => {
        if (!submitting) onClose();
      }}
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
            form="user-crud-form"
            disabled={submitting || uploadingAvatar}
            className="btn-primary px-5 py-2 text-xs focus-ring cursor-pointer"
          >
            {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo nhân sự'}
          </button>
        </>
      }
    >
      <form id="user-crud-form" className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <ApiErrorAlert
          error={apiError}
          title={isEdit ? 'Cập nhật nhân sự thất bại' : 'Tạo nhân sự thất bại'}
        />

        {/* Avatar Upload via POST /api/v1/files (folder=avatars) */}
        <div className="tile-soft space-y-3">
          <div className="flex items-start gap-3.5">
            <UserAvatar
              id={editingUser?.id ?? 0}
              name={name || 'Nhân sự'}
              avatar={avatar || null}
              previewUrl={avatarPreview}
              sizeClass="w-12 h-12 text-sm"
            />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink">
                  Ảnh đại diện (folder: <span className="font-mono">avatars</span>)
                </span>
                <span className="font-mono text-xs px-3 py-2 leading-none badge-lime">
                  POST /api/v1/files
                </span>
              </div>
              <p className="text-xs text-ink-soft font-mono truncate mt-1">
                {avatar ? avatar : 'Chưa tải ảnh đại diện'}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <label className="btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer focus-ring">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingAvatar ? 'Đang tải lên...' : 'Chọn file ảnh'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/*"
                    disabled={uploadingAvatar || submitting}
                    className="hidden"
                    onChange={(e) => void handleAvatarUpload(e)}
                  />
                </label>
                {avatar && (
                  <button
                    type="button"
                    disabled={uploadingAvatar || submitting}
                    onClick={clearAvatar}
                    className="btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1 cursor-pointer focus-ring"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Gỡ ảnh</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <ApiErrorAlert error={uploadError} title="Upload ảnh đại diện thất bại" />
        </div>

        {/* Name & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="user-form-name" className="block text-xs font-medium text-ink mb-1.5">
              Họ và tên *
            </label>
            <input
              id="user-form-name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                if (apiError) setApiError(null);
              }}
              placeholder="Nguyễn Văn A"
              className="input-field w-full px-3 py-2 text-sm"
            />
            {fieldErrors.name && (
              <p className="text-xs text-[#991b1b] mt-1 font-medium">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="user-form-email" className="block text-xs font-medium text-ink mb-1.5">
              Email *
            </label>
            <input
              id="user-form-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                if (apiError) setApiError(null);
              }}
              placeholder="name@company.vn"
              className="input-field w-full px-3 py-2 text-sm"
            />
            {fieldErrors.email && (
              <p className="text-xs text-[#991b1b] mt-1 font-medium">{fieldErrors.email}</p>
            )}
          </div>
        </div>

        {/* Age & Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="user-form-age" className="block text-xs font-medium text-ink mb-1.5">
              Tuổi (1–150)
            </label>
            <input
              id="user-form-age"
              type="number"
              min={1}
              max={150}
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                if (fieldErrors.age) setFieldErrors((prev) => ({ ...prev, age: undefined }));
                if (apiError) setApiError(null);
              }}
              placeholder="25"
              className="input-field w-full px-3 py-2 text-sm tabular-nums"
            />
            {fieldErrors.age && (
              <p className="text-xs text-[#991b1b] mt-1 font-medium">{fieldErrors.age}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="user-form-gender" className="block text-xs font-medium text-ink mb-1.5">
              Giới tính
            </label>
            <select
              id="user-form-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as GenderEnum | '')}
              className="input-field w-full px-3 py-2 text-sm"
            >
              <option value="">-- Chưa xác định --</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {genderLabel(g)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Password with UTF-8 72-byte BCrypt guard */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="user-form-password" className="text-xs font-medium text-ink">
              Mật khẩu {passwordRequired ? '*' : '(tùy chọn khi sửa ở Demo)'}
            </label>
            <span
              className={`text-xs font-mono tabular-nums ${
                passwordBytes > 72 ? 'text-[#991b1b] font-semibold' : 'text-ink-soft'
              }`}
            >
              {passwordBytes} / 72 bytes UTF-8
            </span>
          </div>
          <input
            id="user-form-password"
            type="password"
            required={passwordRequired}
            minLength={passwordRequired ? 6 : undefined}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) {
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }
              if (apiError) setApiError(null);
            }}
            placeholder={
              isEdit
                ? dataMode === 'live'
                  ? 'Đặt hoặc nhập lại mật khẩu (≥ 6 ký tự) cho Live PUT...'
                  : 'Để trống nếu giữ nguyên mật khẩu cũ'
                : 'Tối thiểu 6 ký tự, tối đa 72 bytes UTF-8'
            }
            className="input-field w-full px-3 py-2 text-sm"
          />
          {fieldErrors.password && (
            <p className="text-xs text-[#991b1b] mt-1 font-medium">{fieldErrors.password}</p>
          )}
          {isEdit && dataMode === 'live' && !fieldErrors.password && (
            <p className="text-xs text-ink-soft mt-1">
              Bắt buộc ở Live API: Spring Boot{' '}
              <span className="font-mono">PUT /api/v1/users/{'{id}'}</span> áp dụng{' '}
              <span className="font-mono">@NotBlank</span> và{' '}
              <span className="font-mono">@Size(min = 6)</span> trên{' '}
              <span className="font-mono">UserRequestDTO</span>, nên cần đặt hoặc nhập lại mật
              khẩu (6–72 bytes UTF-8).
            </p>
          )}
        </div>

        {/* Address */}
        <div>
          <label htmlFor="user-form-address" className="block text-xs font-medium text-ink mb-1.5">
            Địa chỉ *
          </label>
          <input
            id="user-form-address"
            type="text"
            required
            maxLength={255}
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (fieldErrors.address) {
                setFieldErrors((prev) => ({ ...prev, address: undefined }));
              }
              if (apiError) setApiError(null);
            }}
            placeholder="Số nhà, quận/huyện, tỉnh/thành phố"
            className="input-field w-full px-3 py-2 text-sm"
          />
          {fieldErrors.address && (
            <p className="text-xs text-[#991b1b] mt-1 font-medium">{fieldErrors.address}</p>
          )}
        </div>

        {/* Company Dropdown */}
        <div>
          <label htmlFor="user-form-company" className="block text-xs font-medium text-ink mb-1.5">
            Công ty trực thuộc (<span className="font-mono">companyId</span>)
          </label>
          <div className="flex items-center gap-2.5">
            {selectedCompany && (
              <CompanyLogo
                id={selectedCompany.id}
                name={selectedCompany.name}
                logo={selectedCompany.logo}
                sizeClass="w-9 h-9"
              />
            )}
            <select
              id="user-form-company"
              value={companyId}
              onChange={(e) => {
                hasInitializedCreateCompanyRef.current = true;
                setCompanyId(e.target.value);
                if (apiError) setApiError(null);
              }}
              className="input-field flex-1 px-3 py-2 text-sm"
            >
              <option value="">-- Không gán công ty --</option>
              {companyOptions.map((comp) => (
                <option key={comp.id} value={String(comp.id)}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Role Checkbox Pills (`roleIDs: number[]`) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink">
              Gán vai trò (<span className="font-mono">roleIDs: number[]</span>)
            </span>
            <span className="px-3 py-2 text-xs leading-none font-mono tabular-nums badge-soft">
              Đã chọn: {roleIDs.length}
            </span>
          </div>

          {referenceError && roleOptions.length === 0 && (
            <div className="rounded-xl border border-hairline bg-block-cream p-3 text-xs text-ink flex items-center justify-between gap-2">
              <span>{referenceError}</span>
              {onRetryReferences && (
                <button
                  type="button"
                  onClick={onRetryReferences}
                  className="btn-secondary px-3.5 py-2 text-xs leading-none inline-flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Tải lại</span>
                </button>
              )}
            </div>
          )}

          {roleOptions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roleOptions.map((role) => {
                const checked = roleIDs.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className={`rounded-xl border p-3 flex items-start gap-2.5 cursor-pointer transition-colors ${
                      checked ? 'row-selected' : 'row-idle'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRoleId(role.id)}
                      className="mt-0.5 check-accent shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-mono font-semibold text-ink truncate">
                        {role.name}
                      </span>
                      <span className="block text-xs text-ink-soft mt-0.5 truncate">
                        {role.permissions.length} quyền · #{role.id}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="tile-soft text-xs text-ink-soft">
              Chưa có danh sách vai trò khả dụng để gán.
            </div>
          )}
        </div>
      </form>
    </Drawer>
  );
}
