import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, List, Plus, RotateCcw, Search } from 'lucide-react';
import { ApiError } from '../api/client';
import { companiesApi, usersApi } from '../api/hrService';
import { ApiErrorAlert } from '../components/directory/ApiErrorAlert';
import { CompanyFormDrawer } from '../components/directory/CompanyFormDrawer';
import { DeleteConfirmDrawer } from '../components/directory/DeleteConfirmDrawer';
import { CompanyLogo } from '../components/ui/Badges';
import { Pagination } from '../components/ui/Pagination';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { CompanyResponseDTO, PageResponseDTO } from '../types/hr';
import { formatShortDate } from '../utils/format';

type CompanyViewMode = 'table' | 'grid';

const EMPTY_PAGE: PageResponseDTO<CompanyResponseDTO> = {
  content: [],
  page: 1,
  size: 5,
  totalElements: 0,
  totalPages: 1,
  hasNext: false,
  hasPrevious: false,
};

export function CompaniesPage() {
  const { dataMode, refreshTick, triggerRefresh, navigate } = useApp();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<CompanyViewMode>('table');

  const [nameFilter, setNameFilter] = useState('');
  const [addressFilter, setAddressFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [debouncedFilters, setDebouncedFilters] = useState({
    name: '',
    address: '',
    description: '',
  });

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(5);

  const [pageData, setPageData] = useState<PageResponseDTO<CompanyResponseDTO>>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | string | null>(null);

  const [employeeCounts, setEmployeeCounts] = useState<Record<number, number> | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyResponseDTO | null>(null);
  const [deletingCompany, setDeletingCompany] = useState<CompanyResponseDTO | null>(null);

  const fetchSeqRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFilters({
        name: nameFilter,
        address: addressFilter,
        description: descriptionFilter,
      });
    }, 160);
    return () => window.clearTimeout(timer);
  }, [nameFilter, addressFilter, descriptionFilter]);

  const loadEmployeeCounts = useCallback(async () => {
    try {
      const res = await usersApi.list({ page: 1, size: 100 });
      if (res.totalElements > 100) {
        setEmployeeCounts(null);
        return;
      }
      const countsMap: Record<number, number> = {};
      res.content.forEach((u) => {
        if (u.companyInfo?.id) {
          countsMap[u.companyInfo.id] = (countsMap[u.companyInfo.id] ?? 0) + 1;
        }
      });
      setEmployeeCounts(countsMap);
    } catch {
      setEmployeeCounts(null);
    }
  }, []);

  useEffect(() => {
    void loadEmployeeCounts();
  }, [loadEmployeeCounts, dataMode, refreshTick]);

  const fetchCompanies = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    setLoading(true);
    setLoadError(null);

    try {
      const res = await companiesApi.list({
        name: debouncedFilters.name.trim() || undefined,
        address: debouncedFilters.address.trim() || undefined,
        description: debouncedFilters.description.trim() || undefined,
        page,
        size,
      });
      if (seq !== fetchSeqRef.current) return;

      if (res.totalPages >= 1 && page > res.totalPages) {
        setPage(res.totalPages);
        return;
      }
      setPageData(res);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      if (err instanceof ApiError) {
        setLoadError(err);
      } else {
        setLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách công ty.');
      }
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [
    debouncedFilters.name,
    debouncedFilters.address,
    debouncedFilters.description,
    page,
    size,
  ]);

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies, dataMode, refreshTick]);

  const hasActiveFilters = Boolean(
    nameFilter.trim() || addressFilter.trim() || descriptionFilter.trim(),
  );

  const clearFilters = () => {
    setNameFilter('');
    setAddressFilter('');
    setDescriptionFilter('');
    setDebouncedFilters({ name: '', address: '', description: '' });
    setPage(1);
  };

  const openCreateDrawer = () => {
    setEditingCompany(null);
    setFormOpen(true);
  };

  const openEditDrawer = (company: CompanyResponseDTO) => {
    setEditingCompany(company);
    setFormOpen(true);
  };

  const handleCompanySaved = (saved: CompanyResponseDTO, isEdit: boolean) => {
    setFormOpen(false);
    setEditingCompany(null);
    triggerRefresh();
    showToast(
      isEdit
        ? `Đã cập nhật công ty ${saved.name}.`
        : `Đã tạo công ty mới ${saved.name} (#${saved.id}).`,
    );
  };

  const handleConfirmDelete = async () => {
    if (!deletingCompany) return;
    const target = deletingCompany;
    await companiesApi.remove(target.id);
    setDeletingCompany(null);
    triggerRefresh();
    showToast(`Đã xóa công ty ${target.name}.`);
  };

  const deletingLinkedCount = useMemo(() => {
    if (!deletingCompany || !employeeCounts) return 0;
    return employeeCounts[deletingCompany.id] ?? 0;
  }, [deletingCompany, employeeCounts]);

  const viewCompanyUsers = (companyId: number) => {
    navigate('users', { userFilter: { companyId } });
  };

  return (
    <div className="space-y-5">
      {/* Header + View Toggle + Create CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl heading-display text-ink">Quản lý công ty</h1>
          <p className="text-sm text-ink-soft mt-1">
            Danh mục công ty với luồng upload logo 2 bước qua{' '}
            <span className="font-mono text-xs">/api/v1/files?folder=logos</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <div
            className="inline-flex items-center rounded-full border border-hairline bg-canvas p-2 gap-1"
            role="group"
            aria-label="Chế độ hiển thị công ty"
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-2 text-xs leading-none inline-flex items-center gap-1.5 focus-ring cursor-pointer ${
                viewMode === 'table' ? 'tab-pill-selected' : 'tab-pill-default'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Bảng</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3.5 py-2 text-xs leading-none inline-flex items-center gap-1.5 focus-ring cursor-pointer ${
                viewMode === 'grid' ? 'tab-pill-selected' : 'tab-pill-default'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Thẻ</span>
            </button>
          </div>

          <button
            type="button"
            onClick={openCreateDrawer}
            className="btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-1.5 focus-ring cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm công ty</span>
          </button>
        </div>
      </div>

      {/* Filter Bar matching CompanyFilterDTO */}
      <section className="card-hairline-md p-4" aria-label="Bộ lọc công ty">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-3">
            <label
              htmlFor="companies-filter-name"
              className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
            >
              Tên công ty
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-soft absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="companies-filter-name"
                type="text"
                value={nameFilter}
                onChange={(e) => {
                  setNameFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Lọc theo tên..."
                className="input-field w-full pl-8 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <label
              htmlFor="companies-filter-address"
              className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
            >
              Địa chỉ
            </label>
            <input
              id="companies-filter-address"
              type="text"
              value={addressFilter}
              onChange={(e) => {
                setAddressFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Hà Nội, TP.HCM..."
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="lg:col-span-4">
            <label
              htmlFor="companies-filter-desc"
              className="block text-xs font-mono uppercase tracking-wider text-ink-soft mb-1.5"
            >
              Mô tả
            </label>
            <input
              id="companies-filter-desc"
              type="text"
              value={descriptionFilter}
              onChange={(e) => {
                setDescriptionFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Lĩnh vực hoạt động..."
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="lg:col-span-2 flex items-center justify-end">
            <button
              type="button"
              disabled={!hasActiveFilters}
              onClick={clearFilters}
              className="btn-secondary w-full sm:w-auto px-4 py-2 text-xs inline-flex items-center justify-center gap-1.5 focus-ring cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        </div>
      </section>

      {/* Load Error Banner */}
      {loadError && (
        <div className="space-y-2.5">
          <ApiErrorAlert error={loadError} title="Không thể tải danh sách công ty" />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchCompanies()}
              className="btn-secondary px-4 py-2 text-xs focus-ring cursor-pointer"
            >
              Thử lại
            </button>
            {loadError instanceof ApiError && loadError.statusCode === 401 && (
              <button
                type="button"
                onClick={() => navigate('auth')}
                className="btn-primary px-4 py-2 text-xs focus-ring cursor-pointer"
              >
                Mở trang Đăng nhập
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid View ("Thẻ") */}
      {viewMode === 'grid' ? (
        <div className="space-y-4">
          {loading && pageData.content.length === 0 ? (
            <div className="card-hairline p-10 text-center text-sm text-ink-soft">
              Đang tải danh sách công ty...
            </div>
          ) : pageData.content.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pageData.content.map((c) => {
                const empCount = employeeCounts ? (employeeCounts[c.id] ?? 0) : null;
                return (
                  <article
                    key={c.id}
                    className="card-hairline p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <CompanyLogo id={c.id} name={c.name} logo={c.logo} sizeClass="w-11 h-11" />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openEditDrawer(c)}
                            className="text-base font-semibold text-ink truncate text-left underline decoration-transparent hover:decoration-current focus-ring rounded cursor-pointer"
                          >
                            {c.name}
                          </button>
                          {empCount !== null ? (
                            <button
                              type="button"
                              onClick={() => viewCompanyUsers(c.id)}
                              className="px-3 py-2 text-xs font-mono tabular-nums leading-none badge-cream whitespace-nowrap hover:opacity-85 focus-ring cursor-pointer shrink-0"
                              title="Xem nhân sự thuộc công ty này"
                            >
                              {empCount} nhân sự
                            </button>
                          ) : (
                            <span className="px-3 py-2 text-xs font-mono tabular-nums leading-none badge-soft whitespace-nowrap shrink-0">
                              #{c.id}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-soft leading-relaxed line-clamp-2">
                          {c.description}
                        </p>
                        <p className="text-xs text-ink truncate" title={c.address}>
                          {c.address}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-hairline flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-ink-soft truncate" title={c.logo}>
                        {c.logo}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditDrawer(c)}
                          className="btn-secondary px-3.5 py-2 text-xs leading-none focus-ring cursor-pointer"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCompany(c)}
                          className="badge-pink border border-ink/20 px-3.5 py-2 text-xs font-medium leading-none hover:opacity-85 focus-ring cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="card-hairline p-10 text-center">
              <p className="text-sm font-medium text-ink">
                Không tìm thấy công ty phù hợp bộ lọc
              </p>
              <p className="text-xs text-ink-soft mt-1">
                Thử xóa bớt điều kiện lọc hoặc thêm công ty mới.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-secondary mt-3 px-4 py-2 text-xs focus-ring cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}

          <div className="card-hairline-md overflow-hidden">
            <Pagination
              page={pageData.page}
              size={pageData.size}
              totalElements={pageData.totalElements}
              totalPages={pageData.totalPages}
              hasNext={pageData.hasNext}
              hasPrevious={pageData.hasPrevious}
              onPageChange={(nextPage) => setPage(nextPage)}
              onSizeChange={(nextSize) => {
                setSize(nextSize);
                setPage(1);
              }}
              pageSizeOptions={[5, 8, 10, 20]}
            />
          </div>
        </div>
      ) : (
        /* Table View ("Bảng") */
        <section className="card-hairline-md overflow-hidden" aria-label="Bảng danh sách công ty">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline bg-soft text-xs font-mono uppercase tracking-wider text-ink-soft">
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Công ty &amp; Logo</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Mô tả</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">Địa chỉ</th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap">
                    {employeeCounts !== null ? 'Nhân sự' : 'Ngày tạo'}
                  </th>
                  <th className="py-3 px-4 font-medium whitespace-nowrap hidden xl:table-cell">
                    Cập nhật
                  </th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading && pageData.content.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center text-sm text-ink-soft">
                      Đang tải danh sách công ty...
                    </td>
                  </tr>
                ) : pageData.content.length > 0 ? (
                  pageData.content.map((c) => {
                    const empCount = employeeCounts ? (employeeCounts[c.id] ?? 0) : null;
                    return (
                      <tr key={c.id} className="table-row">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <CompanyLogo
                              id={c.id}
                              name={c.name}
                              logo={c.logo}
                              sizeClass="w-10 h-10"
                            />
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => openEditDrawer(c)}
                                className="font-medium text-ink underline decoration-transparent hover:decoration-current truncate block text-left focus-ring rounded cursor-pointer"
                              >
                                {c.name}
                              </button>
                              <div className="text-xs font-mono text-ink-soft truncate max-w-[180px]">
                                {c.logo}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td
                          className="py-3 px-4 text-xs text-ink-soft max-w-[210px] truncate"
                          title={c.description}
                        >
                          {c.description}
                        </td>

                        <td
                          className="py-3 px-4 text-xs text-ink max-w-[190px] truncate"
                          title={c.address}
                        >
                          {c.address}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {empCount !== null ? (
                            <button
                              type="button"
                              onClick={() => viewCompanyUsers(c.id)}
                              className="px-3 py-2 text-xs font-mono tabular-nums leading-none badge-soft hover:bg-block-cream transition-colors focus-ring cursor-pointer"
                              title="Mở danh sách nhân sự của công ty này"
                            >
                              {empCount} người
                            </button>
                          ) : (
                            <span className="text-xs font-mono tabular-nums text-ink-soft">
                              {formatShortDate(c.createdAt)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap text-xs font-mono tabular-nums text-ink-soft hidden xl:table-cell">
                          {formatShortDate(c.updatedAt)}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditDrawer(c)}
                              className="btn-secondary px-3.5 py-2 text-xs leading-none focus-ring cursor-pointer"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCompany(c)}
                              className="badge-pink border border-ink/20 px-3.5 py-2 text-xs font-medium leading-none hover:opacity-85 focus-ring cursor-pointer"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 px-4 text-center">
                      <p className="text-sm font-medium text-ink">
                        Không tìm thấy công ty phù hợp
                      </p>
                      <p className="text-xs text-ink-soft mt-1">
                        Điều chỉnh lại tên, địa chỉ hoặc mô tả tìm kiếm.
                      </p>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="btn-secondary mt-3 px-4 py-2 text-xs focus-ring cursor-pointer"
                        >
                          Xóa bộ lọc
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pageData.page}
            size={pageData.size}
            totalElements={pageData.totalElements}
            totalPages={pageData.totalPages}
            hasNext={pageData.hasNext}
            hasPrevious={pageData.hasPrevious}
            onPageChange={(nextPage) => setPage(nextPage)}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              setPage(1);
            }}
            pageSizeOptions={[5, 8, 10, 20]}
          />
        </section>
      )}

      {/* Create / Edit Company Slide-Over Drawer */}
      <CompanyFormDrawer
        open={formOpen}
        editingCompany={editingCompany}
        onClose={() => {
          setFormOpen(false);
          setEditingCompany(null);
        }}
        onSuccess={handleCompanySaved}
      />

      {/* Delete Confirmation Drawer */}
      <DeleteConfirmDrawer
        open={Boolean(deletingCompany)}
        title={`Xóa công ty #${deletingCompany?.id ?? ''}`}
        subtitle="DELETE /api/v1/companies/{id}"
        itemName={deletingCompany?.name ?? ''}
        itemMeta={deletingCompany?.address}
        previewNode={
          deletingCompany ? (
            <CompanyLogo
              id={deletingCompany.id}
              name={deletingCompany.name}
              logo={deletingCompany.logo}
              sizeClass="w-10 h-10"
            />
          ) : null
        }
        description="Bạn có chắc chắn muốn xóa công ty này? Hành động không thể hoàn tác trong dữ liệu hiện tại."
        warningNote={
          deletingLinkedCount > 0
            ? `Hiện có ${deletingLinkedCount} nhân sự đang gắn với công ty này. Trong chế độ Demo, các nhân sự sẽ được chuyển về trạng thái chưa gán công ty; trong Live API, hệ thống có thể từ chối nếu đang bị ràng buộc khóa ngoại.`
            : undefined
        }
        onClose={() => setDeletingCompany(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

export default CompaniesPage;
