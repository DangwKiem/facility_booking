/**
 * Admin Module - Dashboard, facility management, booking approval, user management.
 */
const Admin = (() => {

    /* --- Admin Dashboard --- */
    function renderDashboard() {
        return `
        <h1 class="section-title">Bảng điều khiển</h1>
        <p class="section-subtitle mb-4">Tổng quan hệ thống quản lý cơ sở vật chất</p>

        <div class="row g-3 mb-4" id="adminStats">
            ${[1,2,3,4].map(() => '<div class="col-sm-6 col-lg-3"><div class="stat-card"><div class="skeleton skeleton-text" style="width:60%;height:40px"></div></div></div>').join('')}
        </div>

        <div class="row g-3">
            <div class="col-lg-8">
                <div class="detail-section">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h3 class="detail-section-title mb-0">${icon('clock-history')} Yêu cầu chờ duyệt</h3>
                        <a href="#admin/bookings" class="btn btn-ghost btn-sm">Xem tất cả</a>
                    </div>
                    <div id="pendingBookingsPreview">${Skeleton.table(3, 4)}</div>
                </div>
            </div>
            <div class="col-lg-4">
                <div class="detail-section">
                    <h3 class="detail-section-title">${icon('lightning')} Thao tác nhanh</h3>
                    <div class="d-grid gap-2">
                        <a href="#admin/facilities" class="btn btn-ghost text-start">${icon('building-add')} Quản lý cơ sở vật chất</a>
                        <a href="#admin/bookings" class="btn btn-ghost text-start">${icon('calendar-check')} Duyệt yêu cầu</a>
                        <a href="#admin/users" class="btn btn-ghost text-start">${icon('people')} Quản lý người dùng</a>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-3 mt-1">
            <div class="col-lg-8">
                <div class="detail-section">
                    <h3 class="detail-section-title">${icon('speedometer')} Dashboard analytics</h3>
                    <div id="analyticsDashboard">${Skeleton.table(4, 2)}</div>
                </div>
            </div>
            <div class="col-lg-4">
                <div class="detail-section">
                    <h3 class="detail-section-title">${icon('exclamation-triangle')} Blacklist / vi phạm</h3>
                    <div id="analyticsViolations">${Skeleton.table(4, 2)}</div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="violationDetailModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content glass-modal">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">Chi tiết vi phạm 90 ngày</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="violationDetailContent">${Skeleton.table(4, 4)}</div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Đóng</button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    async function initDashboard() {
        await refreshAdminOverview();
    }

    let analyticsViolationDetails = [];
    let bookingDetailModalInstance = null;

    function cleanupModalArtifacts() {
        document.querySelectorAll('.modal-backdrop').forEach((backdrop, index, list) => {
            if (index < list.length - 1) {
                backdrop.remove();
            }
        });

        if (!document.querySelector('.modal.show')) {
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('padding-right');
            document.body.style.removeProperty('overflow');
        }
    }

    function getBookingDetailModal() {
        const modalEl = document.getElementById('bookingDetailModal');
        if (!modalEl) return null;

        if (!bookingDetailModalInstance) {
            bookingDetailModalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
            modalEl.addEventListener('hidden.bs.modal', () => {
                cleanupModalArtifacts();
            });
        }

        return bookingDetailModalInstance;
    }

    async function refreshAdminOverview() {
        const statsEl = document.getElementById('adminStats');
        const pendingEl = document.getElementById('pendingBookingsPreview');
        const analyticsEl = document.getElementById('analyticsDashboard');
        const violationsEl = document.getElementById('analyticsViolations');

        if (!statsEl && !pendingEl && !analyticsEl && !violationsEl) {
            return;
        }

        try {
            const res = await API.get('api/admin/overview.php');
            const data = res.data || {};
            renderDashboardStats(data.stats || {});
            renderPendingPreview(data.pending_preview || []);
            renderAnalyticsDashboard(data.analytics || {});
        } catch (err) {
            if (statsEl) {
                statsEl.innerHTML = `
                    <div class="col-12">${emptyState('exclamation-triangle', 'Lỗi', err.message)}</div>
                `;
            }
            if (pendingEl) pendingEl.innerHTML = emptyState('exclamation-triangle', 'Lỗi', err.message);
            if (analyticsEl) analyticsEl.innerHTML = emptyState('exclamation-triangle', 'Lỗi', err.message);
            if (violationsEl) violationsEl.innerHTML = emptyState('exclamation-triangle', 'Lỗi', err.message);
        }
    }

    function renderDashboardStats(stats = {}) {
        const el = document.getElementById('adminStats');
        if (!el) return;

        el.innerHTML = `
            <div class="col-sm-6 col-lg-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center gap-3">
                        <div class="stat-card-icon" style="background:rgba(var(--accent-rgb),0.1);color:var(--accent)">${icon('building')}</div>
                        <div><div class="stat-card-value">${stats.facilities || 0}</div><div class="stat-card-label">Cơ sở vật chất</div></div>
                    </div>
                </div>
            </div>
            <div class="col-sm-6 col-lg-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center gap-3">
                        <div class="stat-card-icon" style="background:rgba(245,158,11,0.1);color:#d97706">${icon('clock')}</div>
                        <div><div class="stat-card-value">${stats.pending_bookings || 0}</div><div class="stat-card-label">Chờ duyệt</div></div>
                    </div>
                </div>
            </div>
            <div class="col-sm-6 col-lg-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center gap-3">
                        <div class="stat-card-icon" style="background:rgba(59,130,246,0.1);color:#3b82f6">${icon('people')}</div>
                        <div><div class="stat-card-value">${stats.users || 0}</div><div class="stat-card-label">Người dùng</div></div>
                    </div>
                </div>
            </div>
            <div class="col-sm-6 col-lg-3">
                <div class="stat-card">
                    <div class="d-flex align-items-center gap-3">
                        <div class="stat-card-icon" style="background:rgba(16,185,129,0.1);color:#059669">${icon('check-circle')}</div>
                        <div><div class="stat-card-value">${stats.approved_today || 0}</div><div class="stat-card-label">Đã duyệt hôm nay</div></div>
                    </div>
                </div>
            </div>`;
    }

    function renderPendingPreview(items = []) {
        const el = document.getElementById('pendingBookingsPreview');
        if (!el) return;

        if (!items.length) {
            el.innerHTML = emptyState('check-circle', 'Không có yêu cầu', 'Không có yêu cầu nào đang chờ duyệt.');
            return;
        }

        el.innerHTML = `<div class="table-responsive">
            <table class="data-table table">
                <thead><tr><th>Người yêu cầu</th><th>Cơ sở</th><th>Thời gian</th><th>Trạng thái</th></tr></thead>
                <tbody>${items.map(b => `
                    <tr>
                        <td class="fw-medium">${b.user_name || ''}</td>
                        <td>${b.facility_name || ''}</td>
                        <td style="font-size:0.8rem">${formatDateTime(b.start_time)}</td>
                        <td>${statusBadge(b.status)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    }

    function renderAnalyticsDashboard(data = {}) {
        const analyticsEl = document.getElementById('analyticsDashboard');
        const violationsEl = document.getElementById('analyticsViolations');

        if (analyticsEl) {
            analyticsEl.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="small text-muted mb-2">Trạng thái yêu cầu</div>
                        ${(data.status_breakdown || []).map(item => `
                            <div class="mb-2">
                                <div class="d-flex justify-content-between small mb-1"><span>${statusBadge(item.status)}</span><strong>${item.total}</strong></div>
                                <div class="progress" style="height:8px;background:rgba(255,255,255,0.08)"><div class="progress-bar" style="width:${Math.min(100, item.total * 10)}%"></div></div>
                            </div>
                        `).join('') || '<div class="text-muted small">Chưa có dữ liệu.</div>'}
                    </div>
                    <div class="col-md-6">
                        <div class="small text-muted mb-2">Xu hướng 6 tháng</div>
                        ${(data.monthly_trend || []).map(item => `
                            <div class="d-flex justify-content-between align-items-center small py-1 border-bottom" style="border-color:var(--border-light)!important">
                                <span>${item.month_key}</span>
                                <strong>${item.total}</strong>
                            </div>
                        `).join('') || '<div class="text-muted small">Chưa có dữ liệu.</div>'}
                    </div>
                    <div class="col-md-6">
                        <div class="small text-muted mb-2">Cơ sở được đặt nhiều nhất</div>
                        ${(data.top_facilities || []).map(item => `<div class="d-flex justify-content-between small py-1"><span>${item.name}</span><strong>${item.total}</strong></div>`).join('') || '<div class="text-muted small">Chưa có dữ liệu.</div>'}
                    </div>
                    <div class="col-md-6">
                        <div class="small text-muted mb-2">Số giờ sử dụng 30 ngày</div>
                        ${(data.utilization || []).map(item => `<div class="d-flex justify-content-between small py-1"><span>${item.name}</span><strong>${item.booked_hours || 0} giờ</strong></div>`).join('') || '<div class="text-muted small">Chưa có dữ liệu.</div>'}
                    </div>
                </div>`;
        }

        if (violationsEl) {
            analyticsViolationDetails = data.violation_details || [];
            violationsEl.innerHTML = `
                <div class="small text-muted mb-2">Tổng hợp vi phạm 90 ngày</div>
                <button class="btn btn-ghost w-100 text-start mb-3" onclick="Admin.showViolationDetailsModal()">
                    <div class="d-flex justify-content-between align-items-center gap-3">
                        <span>Tổng số vi phạm</span>
                        <strong class="ms-auto">${data.violation_total_90d || 0}</strong>
                    </div>
                </button>
                ${(data.violation_summary || []).map(item => `<div class="d-flex justify-content-between small py-1"><span>${formatViolationType(item.type)}</span><strong>${item.total}</strong></div>`).join('') || '<div class="text-muted small mb-3">Chưa ghi nhận vi phạm.</div>'}
                <hr>
                <div class="small text-muted mb-2">Người dùng đang bị blacklist</div>
                ${(data.blacklisted_users || []).map(item => `
                    <div class="small py-2 border-bottom" style="border-color:var(--border-light)!important">
                        <div class="fw-semibold">${item.full_name}</div>
                        <div class="text-muted">${item.email}</div>
                        <div class="text-danger">Đến ${formatDateTime(item.blacklist_until)}</div>
                    </div>
                `).join('') || '<div class="text-muted small">Hiện không có ai bị blacklist.</div>'}`;
        }
    }

    function showViolationDetailsModal() {
        const contentEl = document.getElementById('violationDetailContent');
        if (!contentEl) return;

        if (!analyticsViolationDetails.length) {
            contentEl.innerHTML = emptyState('exclamation-triangle', 'Chưa có vi phạm', 'Hiện chưa ghi nhận chi tiết vi phạm trong 90 ngày gần đây.');
        } else {
            contentEl.innerHTML = `
                <div class="table-responsive">
                    <table class="data-table table">
                        <thead>
                            <tr>
                                <th>Người dùng</th>
                                <th>Loại vi phạm</th>
                                <th>Số lần</th>
                                <th>Gần nhất</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${analyticsViolationDetails.map(item => `
                                <tr>
                                    <td>
                                        <div class="fw-semibold">${item.full_name}</div>
                                        <div class="small text-muted">${item.email}</div>
                                    </td>
                                    <td>${formatViolationType(item.type)}</td>
                                    <td>${item.total_count} lần</td>
                                    <td>${formatDateTime(item.last_violation_at)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
        }

        new bootstrap.Modal(document.getElementById('violationDetailModal')).show();
    }

    /* --- Admin: Manage Facilities --- */
    function renderFacilities() {
        return `
        <div class="mb-3"><a href="#admin/dashboard" class="btn btn-ghost btn-sm">${icon('arrow-left')} Bảng điều khiển</a></div>
        <div class="d-flex align-items-center justify-content-between mb-3">
            <div><h1 class="section-title">Quản lý cơ sở vật chất</h1></div>
            <button class="btn btn-accent btn-sm" onclick="Admin.showFacilityModal()">
                ${icon('plus')} Thêm mới
            </button>
        </div>
        <div id="adminFacilityList">${Skeleton.table(5)}</div>
        <div id="adminFacilityPagination" class="mt-3 d-flex justify-content-center"></div>

        <!-- Facility Modal -->
        <div class="modal fade" id="facilityModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content glass-modal">
                    <div class="modal-header border-0">
                        <h5 class="modal-title" id="facilityModalTitle">Thêm cơ sở vật chất</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="facilityForm" novalidate>
                            <input type="hidden" id="facId">
                            <div class="row g-3">
                                <div class="col-md-8">
                                    <label class="form-label fw-medium">Tên cơ sở <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="facName" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label fw-medium">Loại <span class="text-danger">*</span></label>
                                    <select class="form-select" id="facType" required>
                                        <option value="room">Phòng họp</option>
                                        <option value="lab">Phòng thực hành</option>
                                        <option value="sports_field">Sân thể thao</option>
                                        <option value="pool">Bể bơi</option>
                                        <option value="auditorium">Hội trường</option>
                                        <option value="other">Khác</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-medium">Sức chứa</label>
                                    <input type="number" class="form-control" id="facCapacity" min="0">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-medium">Cơ sở</label>
                                    <select class="form-select" id="facCampus">
                                        <option value="">--</option>
                                        <option value="Cơ sở A">Cơ sở A</option>
                                        <option value="Cơ sở B">Cơ sở B</option>
                                        <option value="Cơ sở C">Cơ sở C</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-medium">Tòa nhà</label>
                                    <input type="text" class="form-control" id="facBuilding" placeholder="VD: Tòa A">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label fw-medium">Tầng</label>
                                    <input type="text" class="form-control" id="facFloor" placeholder="VD: Tầng 3">
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-medium">Mô tả</label>
                                    <textarea class="form-control" id="facDescription" rows="3"></textarea>
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-medium">Quy định sử dụng</label>
                                    <textarea class="form-control" id="facRules" rows="3"></textarea>
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-medium">Thiết bị của phòng</label>
                                    <div class="form-text mb-2">Mỗi dòng theo định dạng: Tên thiết bị | số lượng | trạng thái (available, broken, maintenance).</div>
                                    <textarea class="form-control" id="facEquipment" rows="4" placeholder="Máy chiếu | 1 | available"></textarea>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-medium">Trạng thái</label>
                                    <select class="form-select" id="facStatus">
                                        <option value="active">Hoạt động</option>
                                        <option value="maintenance">Bảo trì</option>
                                        <option value="closed">Đóng cửa</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-medium">Hình ảnh</label>
                                    <input type="file" class="form-control" id="facImages" multiple accept="image/*">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-accent" id="facSaveBtn" onclick="Admin.saveFacility()">
                            <span class="btn-text">Lưu</span>
                            <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    let adminFacPage = 1;

    async function initFacilities() {
        loadAdminFacilities();
    }

    async function loadAdminFacilities() {
        const el = document.getElementById('adminFacilityList');
        el.innerHTML = Skeleton.table(5);
        try {
            const res = await API.get(`api/facilities/index.php?page=${adminFacPage}&limit=10`);
            const data = res.data;
            if (!data.items?.length) {
                el.innerHTML = emptyState('building', 'Chưa có cơ sở', 'Hãy thêm cơ sở vật chất đầu tiên.');
                return;
            }
            el.innerHTML = `
            <div class="data-table-wrapper">
                <div class="table-responsive"><table class="data-table table">
                    <thead><tr><th>Tên</th><th>Loại</th><th>Sức chứa</th><th>Cơ sở</th><th>Trạng thái</th><th></th></tr></thead>
                    <tbody>${data.items.map(f => `
                        <tr>
                            <td class="fw-semibold">${f.name}</td>
                            <td>${facilityTypeLabel(f.type)}</td>
                            <td>${f.capacity}</td>
                            <td>${f.campus || '—'}</td>
                            <td>${statusBadge(f.status)}</td>
                            <td>
                                <button class="btn btn-ghost btn-sm me-1" onclick="Admin.editFacility(${f.id})" title="Sửa">${icon('pencil')}</button>
                                <button class="btn btn-ghost btn-sm text-danger" onclick="Admin.deleteFacility(${f.id})" title="Xóa">${icon('trash')}</button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table></div>
            </div>`;
            document.getElementById('adminFacilityPagination').innerHTML =
                Pagination.render(data.page, data.total_pages, (p) => { adminFacPage = p; loadAdminFacilities(); });
        } catch (err) { el.innerHTML = emptyState('exclamation-triangle', 'Lỗi', err.message); }
    }

    function showFacilityModal(id = null) {
        document.getElementById('facilityModalTitle').textContent = id ? 'Sửa cơ sở vật chất' : 'Thêm cơ sở vật chất';
        document.getElementById('facilityForm').reset();
        document.getElementById('facId').value = id || '';
        document.getElementById('facEquipment').value = '';
        new bootstrap.Modal(document.getElementById('facilityModal')).show();
    }

    async function editFacility(id) {
        try {
            const res = await API.get(`api/facilities/show.php?id=${id}`);
            const f = res.data;
            document.getElementById('facId').value = f.id;
            document.getElementById('facName').value = f.name;
            document.getElementById('facType').value = f.type;
            document.getElementById('facCapacity').value = f.capacity;
            document.getElementById('facCampus').value = f.campus || '';
            document.getElementById('facBuilding').value = f.building || '';
            document.getElementById('facFloor').value = f.floor || '';
            document.getElementById('facDescription').value = f.description || '';
            document.getElementById('facRules').value = f.rules || '';
            document.getElementById('facStatus').value = f.status;
            document.getElementById('facEquipment').value = (f.equipment || []).map(item => `${item.name} | ${item.quantity} | ${item.status}`).join('\n');
            document.getElementById('facilityModalTitle').textContent = 'Sửa cơ sở vật chất';
            new bootstrap.Modal(document.getElementById('facilityModal')).show();
        } catch (err) { Toast.error(err.message); }
    }

    function parseEquipmentInput() {
        return (document.getElementById('facEquipment')?.value || '')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const parts = line.split('|').map(part => part.trim());
                return {
                    name: parts[0] || '',
                    quantity: Math.max(1, parseInt(parts[1] || '1', 10)),
                    status: ['available', 'broken', 'maintenance'].includes(parts[2]) ? parts[2] : 'available',
                };
            })
            .filter(item => item.name);
    }

    async function saveFacility() {
        const btn = document.getElementById('facSaveBtn');
        const id = document.getElementById('facId').value;
        const name = document.getElementById('facName').value.trim();
        if (!name) { Toast.warning('Vui lòng nhập tên'); return; }

        const formData = new FormData();
        if (id) formData.append('id', id);
        formData.append('name', name);
        formData.append('type', document.getElementById('facType').value);
        formData.append('capacity', document.getElementById('facCapacity').value || '0');
        formData.append('campus', document.getElementById('facCampus').value);
        formData.append('building', document.getElementById('facBuilding').value);
        formData.append('floor', document.getElementById('facFloor').value);
        formData.append('description', document.getElementById('facDescription').value);
        formData.append('rules', document.getElementById('facRules').value);
        formData.append('equipment_json', JSON.stringify(parseEquipmentInput()));
        formData.append('status', document.getElementById('facStatus').value);

        const files = document.getElementById('facImages')?.files;
        if (files) for (let i = 0; i < files.length; i++) formData.append('images[]', files[i]);

        setLoading(btn, true);
        try {
            const url = id ? 'api/facilities/update.php' : 'api/facilities/create.php';
            await API.upload(url, formData);
            Toast.success(id ? 'Cập nhật thành công' : 'Thêm mới thành công');
            bootstrap.Modal.getInstance(document.getElementById('facilityModal'))?.hide();
            loadAdminFacilities();
        } catch (err) { Toast.error(err.message); }
        finally { setLoading(btn, false); }
    }

    async function deleteFacility(id) {
        const confirmed = await Confirm.show('Xóa cơ sở vật chất', 'Hành động này không thể hoàn tác. Tất cả lịch đặt liên quan sẽ bị ảnh hưởng.', 'Xóa', 'btn-danger');
        if (!confirmed) return;
        try {
            await API.delete(`api/facilities/delete.php?id=${id}`);
            Toast.success('Đã xóa thành công');
            loadAdminFacilities();
        } catch (err) { Toast.error(err.message); }
    }

    /* --- Admin: Manage Bookings --- */
    function renderBookings() {
        return `
        <div class="mb-3"><a href="#admin/dashboard" class="btn btn-ghost btn-sm">${icon('arrow-left')} Bảng điều khiển</a></div>
        <div class="d-flex align-items-center justify-content-between mb-3">
            <div><h1 class="section-title">Quản lý yêu cầu đặt lịch</h1></div>
        </div>

        <ul class="nav nav-tabs-custom mb-3" id="adminBookingTabs">
            <li class="nav-item"><a class="nav-link active" href="#" data-status="pending">Chờ duyệt</a></li>
            <li class="nav-item"><a class="nav-link" href="#" data-status="approved">Đã duyệt</a></li>
            <li class="nav-item"><a class="nav-link" href="#" data-status="rejected">Từ chối</a></li>
            <li class="nav-item"><a class="nav-link" href="#" data-status="">Tất cả</a></li>
        </ul>

        <div id="bulkBar" class="bulk-actions-bar d-none">
            <input type="checkbox" class="form-check-input" id="selectAll">
            <span class="bulk-count"><span id="selectedCount">0</span> đã chọn</span>
            <button class="btn btn-accent btn-sm" onclick="Admin.bulkApprove()">${icon('check-all')} Duyệt hàng loạt</button>
        </div>

        <div id="adminBookingList">${Skeleton.table(5)}</div>
        <div id="adminBookingPagination" class="mt-3 d-flex justify-content-center"></div>

        <div class="modal fade" id="bookingDetailModal" tabindex="-1">
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content glass-modal">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">Chi tiết yêu cầu</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div id="bookingDetailContent">${Skeleton.table(4, 2)}</div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Đóng</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Reject Modal -->
        <div class="modal fade" id="rejectModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">Từ chối yêu cầu</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label fw-medium">Chọn mẫu lý do</label>
                            <select class="form-select" id="rejectTemplate"><option value="">-- Chọn mẫu --</option></select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-medium">Lý do từ chối</label>
                            <textarea class="form-control" id="rejectReason" rows="3" placeholder="Nhập lý do..."></textarea>
                        </div>
                        <input type="hidden" id="rejectBookingId">
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-danger" onclick="Admin.submitReject()">Từ chối</button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    let adminBookingStatus = 'pending';
    let adminBookingPage = 1;
    let selectedBookingIds = new Set();

    function bindBookings() {
        document.querySelectorAll('#adminBookingTabs .nav-link').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#adminBookingTabs .nav-link').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                adminBookingStatus = tab.dataset.status;
                adminBookingPage = 1;
                selectedBookingIds.clear();
                loadAdminBookings();
            });
        });
        document.getElementById('selectAll')?.addEventListener('change', (e) => {
            document.querySelectorAll('.booking-check').forEach(cb => {
                cb.checked = e.target.checked;
                if (e.target.checked) selectedBookingIds.add(parseInt(cb.value));
                else selectedBookingIds.delete(parseInt(cb.value));
            });
            updateBulkCount();
        });
        loadAdminBookings();
        loadRejectTemplates();
    }

    async function loadRejectTemplates() {
        try {
            const res = await API.get('api/bookings/reject.php?templates=1');
            const sel = document.getElementById('rejectTemplate');
            if (sel && res.data) {
                res.data.forEach(t => sel.innerHTML += `<option value="${t.content}">${t.title}</option>`);
                sel.addEventListener('change', () => {
                    document.getElementById('rejectReason').value = sel.value;
                });
            }
        } catch {}
    }

    async function loadAdminBookings() {
        const el = document.getElementById('adminBookingList');
        el.innerHTML = Skeleton.table(5);
        const params = new URLSearchParams({ page: adminBookingPage, limit: 10 });
        if (adminBookingStatus) params.set('status', adminBookingStatus);

        try {
            const res = await API.get(`api/bookings/index.php?${params}`);
            const data = res.data;
            const showBulk = adminBookingStatus === 'pending' && data.items?.length > 0;
            document.getElementById('bulkBar')?.classList.toggle('d-none', !showBulk);

            if (!data.items?.length) {
                el.innerHTML = emptyState('inbox', 'Không có yêu cầu', 'Không có yêu cầu nào trong mục này.');
                return;
            }

            el.innerHTML = `
            <div class="data-table-wrapper"><div class="table-responsive"><table class="data-table table">
                <thead><tr>
                    ${showBulk ? '<th style="width:40px"></th>' : ''}
                    <th>Người yêu cầu</th><th>Cơ sở</th><th>Tiêu đề</th><th>Thời gian</th><th>Trạng thái</th><th></th>
                </tr></thead>
                <tbody>${data.items.map(b => `
                    <tr>
                        ${showBulk ? `<td><input type="checkbox" class="form-check-input booking-check" value="${b.id}" onchange="Admin.toggleCheck(this)"></td>` : ''}
                        <td class="fw-medium">${b.user_name || ''}<br><small class="text-muted">${b.user_email || ''}</small></td>
                        <td>${b.facility_name || ''}</td>
                        <td>${b.title}</td>
                        <td style="font-size:0.8rem">${formatDateTime(b.start_time)}<br>→ ${formatDateTime(b.end_time)}</td>
                        <td>${statusBadge(b.status)}</td>
                        <td>${renderAdminBookingActions(b)}</td>
                    </tr>`).join('')}
                </tbody>
            </table></div></div>`;
            document.getElementById('adminBookingPagination').innerHTML =
                Pagination.render(data.page, data.total_pages, (p) => { adminBookingPage = p; loadAdminBookings(); });
        } catch (err) { el.innerHTML = emptyState('exclamation-triangle', 'Lỗi', err.message); }
    }

    function toggleCheck(cb) {
        if (cb.checked) selectedBookingIds.add(parseInt(cb.value));
        else selectedBookingIds.delete(parseInt(cb.value));
        updateBulkCount();
    }

    function updateBulkCount() {
        const el = document.getElementById('selectedCount');
        if (el) el.textContent = selectedBookingIds.size;
    }

    function renderAdminBookingActions(booking) {
        const actions = [
            `<button class="btn btn-sm btn-ghost me-1 mb-1" onclick="Admin.showBookingDetail(${booking.id})" title="Chi tiết">${icon('info-circle')}</button>`
        ];

        if (booking.status === 'pending') {
            actions.push(`<button class="btn btn-sm btn-accent me-1 mb-1" onclick="Admin.approveBooking(${booking.id})" title="Duyệt">${icon('check')}</button>`);
            actions.push(`<button class="btn btn-sm btn-ghost text-danger mb-1" onclick="Admin.showRejectModal(${booking.id})" title="Từ chối">${icon('x')}</button>`);
            return actions.join('');
        }

        if (booking.status === 'approved') {
            if (booking.qr_checkout_url) {
                actions.push(`<button class="btn btn-sm btn-ghost me-1 mb-1" onclick="Bookings.showQrModal(${booking.id}, 'checkout', '${booking.qr_checkout_url}')" title="QR ra">${icon('box-arrow-right')}</button>`);
            }
            if (booking.qr_checkin_url) {
                actions.push(`<button class="btn btn-sm btn-accent me-1 mb-1" onclick="Bookings.showQrModal(${booking.id}, 'checkin', '${booking.qr_checkin_url}')" title="QR vào">${icon('check-circle')}</button>`);
            }
        }

        return actions.join('');
    }

    async function showBookingDetail(id) {
        const contentEl = document.getElementById('bookingDetailContent');
        if (!contentEl) return;

        contentEl.innerHTML = Skeleton.table(4, 2);
        const modal = getBookingDetailModal();
        if (!modal) return;

        const modalEl = document.getElementById('bookingDetailModal');
        if (!modalEl?.classList.contains('show')) {
            modal.show();
        }

        try {
            const res = await API.get(`api/bookings/show.php?id=${id}`);
            const b = res.data;
            const repeatLabel = {
                none: 'Không lặp',
                weekly: 'Hàng tuần',
                monthly: 'Hàng tháng',
            };

            const attachmentsHtml = b.attachments?.length
                ? `<div class="d-flex flex-column gap-2">
                    ${b.attachments.map(file => `
                        <a class="btn btn-ghost btn-sm justify-content-start" href="${window.APP_CONFIG.baseUrl}/api/bookings/attachment.php?id=${file.id}" target="_blank" rel="noopener noreferrer">
                            ${icon('card-text')} ${file.file_name}
                        </a>
                    `).join('')}
                </div>`
                : '<span class="text-muted">Không có file đính kèm</span>';

            const inspectionHtml = b.checked_out_at ? `
                <div class="col-12">
                    <div class="detail-section mb-0">
                        <h3 class="detail-section-title">${icon('shield-check')} Kiểm tra sau check-out</h3>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="small text-muted mb-1">Trạng thái hiện tại</div>
                                <div class="fw-semibold">${formatInspectionStatus(b.inspection_status)}</div>
                            </div>
                            <div class="col-md-6">
                                <div class="small text-muted mb-1">Đã kiểm tra lúc</div>
                                <div>${b.inspected_at ? formatDateTime(b.inspected_at) : '-'}</div>
                            </div>
                            <div class="col-md-6">
                                <div class="small text-muted mb-1">Người kiểm tra</div>
                                <div>${b.inspected_by_name || '-'}</div>
                            </div>
                            <div class="col-md-6">
                                <div class="small text-muted mb-1">Thời điểm check-out</div>
                                <div>${formatDateTime(b.checked_out_at)}</div>
                            </div>
                            <div class="col-12">
                                <label class="form-label fw-medium">Ghi chú kiểm tra</label>
                                <textarea class="form-control" id="inspectionNote" rows="3" placeholder="Mô tả tình trạng phòng, thiết bị, hư hỏng nếu có...">${b.inspection_note || ''}</textarea>
                            </div>
                            <div class="col-12 d-flex gap-2 flex-wrap">
                                <button class="btn btn-accent btn-sm" onclick="Admin.submitInspection(${b.id}, 'ok')">${icon('check-circle')} Xác nhận bình thường</button>
                                <button class="btn btn-danger btn-sm" onclick="Admin.submitInspection(${b.id}, 'damaged')">${icon('exclamation-triangle')} Ghi nhận hư hỏng / vi phạm</button>
                            </div>
                        </div>
                    </div>
                </div>` : '';

            contentEl.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="detail-section mb-0 h-100">
                            <h3 class="detail-section-title">${icon('person')} Người yêu cầu</h3>
                            <div class="small text-muted mb-1">Họ tên</div>
                            <div class="fw-semibold mb-3">${b.user_name || '-'}</div>
                            <div class="small text-muted mb-1">Email</div>
                            <div class="mb-3">${b.user_email || '-'}</div>
                            <div class="small text-muted mb-1">Số điện thoại</div>
                            <div>${b.user_phone || '-'}</div>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="detail-section mb-0 h-100">
                            <h3 class="detail-section-title">${icon('building')} Cơ sở vật chất</h3>
                            <div class="fw-semibold mb-2">${b.facility_name || '-'}</div>
                            <div class="text-muted" style="font-size:0.9rem">${(b.campus || '')} ${(b.building || '')} ${(b.floor || '')}</div>
                            <div class="mt-3">${statusBadge(b.status)}</div>
                        </div>
                    </div>
                    <div class="col-12">
                        <div class="detail-section mb-0">
                            <h3 class="detail-section-title">${icon('calendar3')} Thông tin đặt lịch</h3>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <div class="small text-muted mb-1">Tiêu đề</div>
                                    <div class="fw-semibold">${b.title || '-'}</div>
                                </div>
                                <div class="col-md-6">
                                    <div class="small text-muted mb-1">Tạo lúc</div>
                                    <div>${formatDateTime(b.created_at)}</div>
                                </div>
                                <div class="col-md-6">
                                    <div class="small text-muted mb-1">Bắt đầu</div>
                                    <div>${formatDateTime(b.start_time)}</div>
                                </div>
                                <div class="col-md-6">
                                    <div class="small text-muted mb-1">Kết thúc</div>
                                    <div>${formatDateTime(b.end_time)}</div>
                                </div>
                                <div class="col-md-6">
                                    <div class="small text-muted mb-1">Lặp lại</div>
                                    <div>${repeatLabel[b.repeat_type] || b.repeat_type || '-'}</div>
                                </div>
                                <div class="col-md-6">
                                    <div class="small text-muted mb-1">Lặp đến</div>
                                    <div>${b.repeat_until ? formatDate(b.repeat_until) : '-'}</div>
                                </div>
                                <div class="col-12">
                                    <div class="small text-muted mb-1">Lý do sử dụng</div>
                                    <div style="white-space:pre-line">${b.reason || '-'}</div>
                                </div>
                                <div class="col-12">
                                    <div class="small text-muted mb-1">Ghi chú admin</div>
                                    <div style="white-space:pre-line">${b.admin_note || '-'}</div>
                                </div>
                                <div class="col-md-6">
                                    <div class="small text-muted mb-1">Người xử lý</div>
                                    <div>${b.approved_by_name || '-'}</div>
                                </div>
                                <div class="col-md-6">
                                    <div class="small text-muted mb-1">Thời gian xử lý</div>
                                    <div>${b.approved_at ? formatDateTime(b.approved_at) : '-'}</div>
                                </div>
                                <div class="col-12">
                                    <div class="small text-muted mb-2">File đính kèm</div>
                                    ${attachmentsHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                    ${inspectionHtml}
                </div>`;
        } catch (err) {
            contentEl.innerHTML = emptyState('exclamation-triangle', 'Lỗi', err.message);
        }
    }

    async function submitInspection(bookingId, inspectionStatus) {
        const inspectionNote = document.getElementById('inspectionNote')?.value.trim() || '';
        if (inspectionStatus === 'damaged' && !inspectionNote) {
            Toast.warning('Vui lòng nhập mô tả hư hỏng hoặc vi phạm');
            return;
        }

        try {
            await API.put('api/bookings/inspection.php', {
                booking_id: bookingId,
                inspection_status: inspectionStatus,
                inspection_note: inspectionNote,
            });
            Toast.success(inspectionStatus === 'ok' ? 'Đã xác nhận tình trạng bình thường' : 'Đã ghi nhận vi phạm cho người dùng');
            showBookingDetail(bookingId);
            loadAdminBookings();
            refreshAdminOverview();
        } catch (err) {
            Toast.error(err.message);
        }
    }

    async function approveBooking(id) {
        try {
            await API.put('api/bookings/approve.php', { id });
            Toast.success('Đã duyệt yêu cầu');
            loadAdminBookings();
            refreshAdminOverview();
        } catch (err) { Toast.error(err.message); }
    }

    function showRejectModal(id) {
        document.getElementById('rejectBookingId').value = id;
        document.getElementById('rejectReason').value = '';
        document.getElementById('rejectTemplate').value = '';
        new bootstrap.Modal(document.getElementById('rejectModal')).show();
    }

    async function submitReject() {
        const id = document.getElementById('rejectBookingId').value;
        const reason = document.getElementById('rejectReason').value.trim();
        if (!reason) { Toast.warning('Vui lòng nhập lý do từ chối'); return; }
        try {
            await API.put('api/bookings/reject.php', { id: parseInt(id), reason });
            Toast.success('Đã từ chối yêu cầu');
            bootstrap.Modal.getInstance(document.getElementById('rejectModal'))?.hide();
            loadAdminBookings();
            refreshAdminOverview();
        } catch (err) { Toast.error(err.message); }
    }

    async function bulkApprove() {
        if (selectedBookingIds.size === 0) { Toast.warning('Chưa chọn yêu cầu nào'); return; }
        const confirmed = await Confirm.show('Duyệt hàng loạt', `Bạn có chắc muốn duyệt ${selectedBookingIds.size} yêu cầu?`, 'Duyệt tất cả', 'btn-accent');
        if (!confirmed) return;
        try {
            await API.put('api/bookings/bulk-approve.php', { ids: [...selectedBookingIds] });
            Toast.success(`Đã duyệt ${selectedBookingIds.size} yêu cầu`);
            selectedBookingIds.clear();
            updateBulkCount();
            loadAdminBookings();
            refreshAdminOverview();
        } catch (err) { Toast.error(err.message); }
    }

    /* --- Admin: Users --- */
    function renderUsers() {
        return `
        <div class="mb-3"><a href="#admin/dashboard" class="btn btn-ghost btn-sm">${icon('arrow-left')} Bảng điều khiển</a></div>
        <div class="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
            <div><h1 class="section-title">Quản lý người dùng</h1></div>
            <button class="btn btn-accent btn-sm" onclick="Admin.showImportModal()">${icon('plus')} Import từ Excel/CSV</button>
        </div>
        <div id="adminUserList">${Skeleton.table(5)}</div>
        <div id="adminUserPagination" class="mt-3 d-flex justify-content-center"></div>

        <div class="modal fade" id="userImportModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">Import người dùng</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="form-text mb-3">Hỗ trợ file .csv hoặc .xlsx với các cột: full_name, email, phone, user_type, student_id, department, password.</div>
                        <input type="file" class="form-control" id="userImportFile" accept=".csv,.xlsx">
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-accent" id="userImportBtn" onclick="Admin.importUsers()">
                            <span class="btn-text">Import</span>
                            <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit User Modal -->
        <div class="modal fade" id="editUserModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">Chỉnh sửa thông tin người dùng</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editUserForm" novalidate>
                            <input type="hidden" id="editUserId">
                            <div class="row g-3">
                                <div class="col-12">
                                    <label class="form-label fw-medium">Họ và tên</label>
                                    <input type="text" class="form-control" id="editUserName" required>
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-medium">Email</label>
                                    <input type="email" class="form-control" id="editUserEmail" disabled>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-medium">Số điện thoại</label>
                                    <input type="tel" class="form-control" id="editUserPhone">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-medium">Đối tượng</label>
                                    <select class="form-select" id="editUserType">
                                        <option value="student">Sinh viên</option>
                                        <option value="lecturer">Giảng viên</option>
                                        <option value="external">Người ngoài</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-medium">Mã sinh viên</label>
                                    <input type="text" class="form-control" id="editUserStudentId">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label fw-medium">Khoa / Bộ môn</label>
                                    <input type="text" class="form-control" id="editUserDepartment">
                                </div>
                                <div class="col-12">
                                    <label class="form-label fw-medium">Đặt lại mật khẩu</label>
                                    <input type="password" class="form-control" id="editUserPassword" placeholder="Để trống nếu không đổi">
                                    <div class="form-text">Admin có thể nhập mật khẩu mới để reset cho tài khoản này.</div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-accent" id="editUserSaveBtn" onclick="Admin.saveUserEdit()">
                            <span class="btn-text">Lưu thay đổi</span>
                            <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }

    let adminUserPage = 1;

    async function initUsers() { loadAdminUsers(); }

    async function loadAdminUsers() {
        const el = document.getElementById('adminUserList');
        el.innerHTML = Skeleton.table(5);
        try {
            const res = await API.get(`api/users/index.php?page=${adminUserPage}&limit=10`);
            const data = res.data;
            if (!data.items?.length) { el.innerHTML = emptyState('people', 'Chưa có người dùng', ''); return; }
            const userTypeLabels = { student: 'Sinh viên', lecturer: 'Giảng viên', external: 'Người ngoài' };
            el.innerHTML = `
            <div class="data-table-wrapper"><div class="table-responsive"><table class="data-table table">
                <thead><tr><th>Tên</th><th>Email</th><th>Đối tượng</th><th>Khoa</th><th>Vi phạm</th><th>Trạng thái</th><th></th></tr></thead>
                <tbody>${data.items.map(u => `
                    <tr>
                        <td class="fw-semibold">${u.full_name}</td>
                        <td>${u.email}</td>
                        <td>${userTypeLabels[u.user_type] || u.user_type}</td>
                        <td>${u.department || '—'}</td>
                        <td>
                            <div>${u.active_violation_count || 0} vi phạm</div>
                            ${u.blacklist_until ? `<div class="small text-danger">Blacklist đến ${formatDateTime(u.blacklist_until)}</div>` : ''}
                        </td>
                        <td>${statusBadge(u.status)}</td>
                        <td>
                            <button class="btn btn-ghost btn-sm me-1" onclick="Admin.showEditUser(${u.id})" title="Sửa">${icon('pencil')}</button>
                            <button class="btn btn-ghost btn-sm" onclick="Admin.toggleUserBlock(${u.id}, '${u.status}')" title="${u.status === 'active' ? 'Khóa' : 'Mở khóa'}">
                                ${u.status === 'active' ? icon('lock') : icon('unlock')}
                            </button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table></div></div>`;
            document.getElementById('adminUserPagination').innerHTML =
                Pagination.render(data.page, data.total_pages, (p) => { adminUserPage = p; loadAdminUsers(); });
        } catch (err) { el.innerHTML = emptyState('exclamation-triangle', 'Lỗi', err.message); }
    }

    function showImportModal() {
        document.getElementById('userImportFile').value = '';
        new bootstrap.Modal(document.getElementById('userImportModal')).show();
    }

    async function importUsers() {
        const btn = document.getElementById('userImportBtn');
        const file = document.getElementById('userImportFile').files[0];
        if (!file) { Toast.warning('Vui lòng chọn file import'); return; }
        setLoading(btn, true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await API.upload('api/users/import.php', formData);
            const skipped = res.data?.skipped?.length ? `, bỏ qua ${res.data.skipped.length} dòng` : '';
            Toast.success(`Import thành công ${res.data?.created || 0} người dùng${skipped}`);
            bootstrap.Modal.getInstance(document.getElementById('userImportModal'))?.hide();
            loadAdminUsers();
        } catch (err) {
            Toast.error(err.message);
        } finally {
            setLoading(btn, false);
        }
    }

    async function showEditUser(id) {
        try {
            const res = await API.get(`api/users/index.php?page=1&limit=100`);
            const user = res.data?.items?.find(u => u.id === id || u.id === String(id));
            if (!user) { Toast.error('Không tìm thấy người dùng'); return; }

            document.getElementById('editUserId').value = user.id;
            document.getElementById('editUserName').value = user.full_name || '';
            document.getElementById('editUserEmail').value = user.email || '';
            document.getElementById('editUserPhone').value = user.phone || '';
            document.getElementById('editUserType').value = user.user_type || 'student';
            document.getElementById('editUserStudentId').value = user.student_id || '';
            document.getElementById('editUserDepartment').value = user.department || '';
            document.getElementById('editUserPassword').value = '';
            new bootstrap.Modal(document.getElementById('editUserModal')).show();
        } catch (err) { Toast.error(err.message); }
    }

    async function saveUserEdit() {
        const btn = document.getElementById('editUserSaveBtn');
        const userId = document.getElementById('editUserId').value;
        const data = {
            user_id: parseInt(userId),
            full_name: document.getElementById('editUserName').value.trim(),
            phone: document.getElementById('editUserPhone').value.trim(),
            user_type: document.getElementById('editUserType').value,
            student_id: document.getElementById('editUserStudentId').value.trim(),
            department: document.getElementById('editUserDepartment').value.trim(),
            new_password: document.getElementById('editUserPassword').value,
        };

        if (!data.full_name) { Toast.warning('Vui lòng nhập họ tên'); return; }

        setLoading(btn, true);
        try {
            await API.put('api/users/update.php', data);
            Toast.success('Cập nhật thông tin thành công');
            bootstrap.Modal.getInstance(document.getElementById('editUserModal'))?.hide();
            loadAdminUsers();
        } catch (err) { Toast.error(err.message); }
        finally { setLoading(btn, false); }
    }

    async function toggleUserBlock(id, currentStatus) {
        const action = currentStatus === 'active' ? 'block' : 'unblock';
        const label = action === 'block' ? 'Khóa' : 'Mở khóa';
        const confirmed = await Confirm.show(`${label} tài khoản`, `Bạn có chắc muốn ${label.toLowerCase()} tài khoản này?`, label);
        if (!confirmed) return;
        try {
            await API.put('api/users/block.php', { id, action });
            Toast.success(`${label} thành công`);
            loadAdminUsers();
        } catch (err) { Toast.error(err.message); }
    }

    function setLoading(btn, loading) {
        if (!btn) return;
        btn.disabled = loading;
        btn.querySelector('.btn-text')?.classList.toggle('d-none', loading);
        btn.querySelector('.spinner-border')?.classList.toggle('d-none', !loading);
    }

    function formatViolationType(type) {
        const map = {
            no_show: 'Không check-in',
            missing_checkout: 'Không check-out',
            late_cancel: 'Hủy sát giờ',
            facility_damage: 'Làm hỏng cơ sở vật chất',
        };
        return map[type] || type;
    }

    function formatInspectionStatus(status) {
        const map = {
            ok: 'Đã xác nhận bình thường',
            damaged: 'Đã ghi nhận hư hỏng / vi phạm',
        };
        return map[status] || 'Chưa kiểm tra';
    }

    return {
        renderDashboard, initDashboard,
        renderFacilities, initFacilities, showFacilityModal, editFacility, saveFacility, deleteFacility,
        renderBookings, bindBookings, approveBooking, showBookingDetail, showRejectModal, submitReject, bulkApprove, toggleCheck, showViolationDetailsModal, submitInspection,
        renderUsers, initUsers, showImportModal, importUsers, showEditUser, saveUserEdit, toggleUserBlock,
    };
})();
