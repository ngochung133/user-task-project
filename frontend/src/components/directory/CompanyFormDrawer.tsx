import React, { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { ApiError } from '../../api/client';
import { companiesApi, filesApi, getDemoPreviewUrl } from '../../api/hrService';
import { useToast } from '../../context/ToastContext';
import type { CompanyRequestDTO, CompanyResponseDTO } from '../../types/hr';
import { CompanyLogo } from '../ui/Badges';
import { Drawer } from '../ui/Drawer';
import { ApiErrorAlert } from './ApiErrorAlert';

export interface CompanyFormDrawerProps {
  open: boolean;
  editingCompany: CompanyResponseDTO | null;
  onClose: () => void;
  onSuccess: (savedCompany: CompanyResponseDTO, isEdit: boolean) => void;
}

interface CompanyFieldErrors {
  name?: string;
  address?: string;
  description?: string;
  logo?: string;
}

export function CompanyFormDrawer({
  open,
  editingCompany,
  onClose,
  onSuccess,
}: CompanyFormDrawerProps) {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<CompanyFieldErrors>({});
  const [apiError, setApiError] = useState<ApiError | string | null>(null);
  const [uploadError, setUploadError] = useState<ApiError | string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const objectUrlRef = useRef<string | null>(null);

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
    if (!open) return;

    revokeObjectUrl();
    setFieldErrors({});
    setApiError(null);
    setUploadError(null);
    setUploadingLogo(false);
    setSubmitting(false);

    if (editingCompany) {
      setName(editingCompany.name ?? '');
      setAddress(editingCompany.address ?? '');
      setDescription(editingCompany.description ?? '');
      setLogo(editingCompany.logo ?? '');
      setUploadedFileName(editingCompany.logo ?? null);
      setLogoPreview(getDemoPreviewUrl(editingCompany.logo) ?? null);
    } else {
      setName('');
      setAddress('');
      setDescription('');
      setLogo('');
      setUploadedFileName(null);
      setLogoPreview(null);
    }
  }, [open, editingCompany]);

  const isEdit = Boolean(editingCompany);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const prevPreview = logoPreview;
    const localUrl = URL.createObjectURL(file);

    setUploadError(null);
    setUploadingLogo(true);

    try {
      const uploaded = await filesApi.upload(file, 'logos');
      revokeObjectUrl();
      objectUrlRef.current = localUrl;

      setLogo(uploaded.fileName);
      setUploadedFileName(uploaded.fileName);
      setLogoPreview(getDemoPreviewUrl(uploaded.fileName) ?? localUrl);
      setFieldErrors((prev) => ({ ...prev, logo: undefined }));
      setApiError(null);
      showToast(`Bước 1/2: Đã tải logo lên (${uploaded.fileName}).`);
    } catch (err) {
      URL.revokeObjectURL(localUrl);
      setLogoPreview(prevPreview);
      if (err instanceof ApiError) {
        setUploadError(err);
        showToast(err.fullMessage, 'error');
      } else {
        const msg = err instanceof Error ? err.message : 'Không thể tải logo công ty.';
        setUploadError(msg);
        showToast(msg, 'error');
      }
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoInputChange = (nextValue: string) => {
    setLogo(nextValue);
    if (nextValue.trim() !== uploadedFileName) {
      setLogoPreview(getDemoPreviewUrl(nextValue.trim()) ?? null);
    }
    if (fieldErrors.logo) {
      setFieldErrors((prev) => ({ ...prev, logo: undefined }));
    }
    if (apiError) setApiError(null);
  };

  const clearLogo = () => {
    revokeObjectUrl();
    setLogo('');
    setUploadedFileName(null);
    setLogoPreview(null);
    setUploadError(null);
  };

  const validate = (): CompanyFieldErrors => {
    const errors: CompanyFieldErrors = {};

    const n = name.trim();
    const a = address.trim();
    const d = description.trim();
    const l = logo.trim();

    if (!n) {
      errors.name = 'Tên công ty không được để trống.';
    } else if (n.length > 255) {
      errors.name = 'Tên công ty không được vượt quá 255 ký tự.';
    }

    if (!a) {
      errors.address = 'Địa chỉ không được để trống.';
    } else if (a.length > 255) {
      errors.address = 'Địa chỉ không được vượt quá 255 ký tự.';
    }

    if (!d) {
      errors.description = 'Mô tả không được để trống.';
    } else if (d.length > 255) {
      errors.description = 'Mô tả không được vượt quá 255 ký tự.';
    }

    if (!l) {
      errors.logo = 'Logo không được để trống (hãy tải ảnh lên hoặc nhập tên file/URL).';
    } else if (l.length > 255) {
      errors.logo = 'Logo không được vượt quá 255 ký tự.';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || uploadingLogo) return;

    const errors = validate();
    setFieldErrors(errors);
    setApiError(null);

    if (Object.keys(errors).length > 0) {
      showToast('Vui lòng điền đầy đủ 4 trường bắt buộc của CompanyRequestDTO.', 'warning');
      return;
    }

    const payload: CompanyRequestDTO = {
      name: name.trim(),
      description: description.trim(),
      address: address.trim(),
      logo: logo.trim(),
    };

    setSubmitting(true);
    try {
      const saved = editingCompany
        ? await companiesApi.update(editingCompany.id, payload)
        : await companiesApi.create(payload);
      onSuccess(saved, isEdit);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(err);
        showToast(err.fullMessage, 'error');
      } else {
        const msg = err instanceof Error ? err.message : 'Không thể lưu thông tin công ty.';
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
      title={isEdit ? `Cập nhật công ty #${editingCompany?.id}` : 'Thêm công ty mới'}
      subtitle={
        isEdit
          ? 'PUT /api/v1/companies/{id} · CompanyRequestDTO'
          : 'POST /api/v1/companies · CompanyRequestDTO'
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
            form="company-crud-form"
            disabled={submitting || uploadingLogo}
            className="btn-primary px-5 py-2 text-xs focus-ring cursor-pointer"
          >
            {submitting ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo công ty'}
          </button>
        </>
      }
    >
      <form
        id="company-crud-form"
        className="space-y-4"
        onSubmit={(e) => void handleSubmit(e)}
        noValidate
      >
        <ApiErrorAlert
          error={apiError}
          title={isEdit ? 'Cập nhật công ty thất bại' : 'Tạo công ty thất bại'}
        />

        {/* ADR-002 2-Step Logo Upload */}
        <div className="tile-soft space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink">
              Logo công ty * (ADR-002 · Upload 2 bước)
            </span>
            <span className="font-mono text-xs px-3 py-2 leading-none badge-cream">
              folder=logos
            </span>
          </div>

          <div className="flex items-start gap-3.5">
            <CompanyLogo
              id={editingCompany?.id ?? 0}
              name={name || 'Logo'}
              logo={logo || null}
              previewUrl={logoPreview}
              sizeClass="w-12 h-12"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <input
                id="company-form-logo"
                type="text"
                required
                maxLength={255}
                value={logo}
                onChange={(e) => handleLogoInputChange(e.target.value)}
                placeholder="Tên file trả về từ /api/v1/files hoặc URL..."
                className="input-field w-full px-3 py-2 text-xs font-mono"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1.5 cursor-pointer focus-ring">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingLogo ? 'Đang tải logo...' : 'Tải ảnh logo lên'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,image/*"
                    disabled={uploadingLogo || submitting}
                    className="hidden"
                    onChange={(e) => void handleLogoUpload(e)}
                  />
                </label>
                {logo && (
                  <button
                    type="button"
                    disabled={uploadingLogo || submitting}
                    onClick={clearLogo}
                    className="btn-secondary px-3.5 py-2 text-xs inline-flex items-center gap-1 cursor-pointer focus-ring"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-ink-soft">
                Hỗ trợ JPG, PNG, GIF, WebP hoặc dán trực tiếp tên file/URL (≤ 255 ký tự).
              </p>
            </div>
          </div>

          {fieldErrors.logo && (
            <p className="text-xs text-[#991b1b] font-medium">{fieldErrors.logo}</p>
          )}
          <ApiErrorAlert error={uploadError} title="Upload logo thất bại" />
        </div>

        {/* Name */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="company-form-name" className="text-xs font-medium text-ink">
              Tên công ty * (duy nhất)
            </label>
            <span className="text-xs font-mono tabular-nums text-ink-soft">
              {name.trim().length} / 255
            </span>
          </div>
          <input
            id="company-form-name"
            type="text"
            required
            maxLength={255}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              if (apiError) setApiError(null);
            }}
            placeholder="Ví dụ: TechCorp Vietnam"
            className="input-field w-full px-3 py-2 text-sm"
          />
          {fieldErrors.name && (
            <p className="text-xs text-[#991b1b] mt-1 font-medium">{fieldErrors.name}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="company-form-address" className="text-xs font-medium text-ink">
              Địa chỉ *
            </label>
            <span className="text-xs font-mono tabular-nums text-ink-soft">
              {address.trim().length} / 255
            </span>
          </div>
          <input
            id="company-form-address"
            type="text"
            required
            maxLength={255}
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: undefined }));
              if (apiError) setApiError(null);
            }}
            placeholder="Địa chỉ trụ sở chính..."
            className="input-field w-full px-3 py-2 text-sm"
          />
          {fieldErrors.address && (
            <p className="text-xs text-[#991b1b] mt-1 font-medium">{fieldErrors.address}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="company-form-desc" className="text-xs font-medium text-ink">
              Mô tả *
            </label>
            <span className="text-xs font-mono tabular-nums text-ink-soft">
              {description.trim().length} / 255
            </span>
          </div>
          <textarea
            id="company-form-desc"
            required
            maxLength={255}
            rows={3}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (fieldErrors.description) {
                setFieldErrors((prev) => ({ ...prev, description: undefined }));
              }
              if (apiError) setApiError(null);
            }}
            placeholder="Mô tả lĩnh vực hoạt động của công ty..."
            className="input-field w-full px-3 py-2 text-sm"
          />
          {fieldErrors.description && (
            <p className="text-xs text-[#991b1b] mt-1 font-medium">{fieldErrors.description}</p>
          )}
        </div>
      </form>
    </Drawer>
  );
}
