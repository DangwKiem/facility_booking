/**
 * Facilities Module - Browse, search, filter, detail view (PUBLIC).
 */
const Facilities = (() => {
    let currentFilters = { search: '', type: '', campus: '', page: 1 };

    /* --- Home Page (Hero + Featured Facilities) --- */
    function renderHome() {
        return `
        <section class="hero-section">
            <h1 class="hero-title">Đặt lịch mượn <span class="text-gradient">cơ sở vật chất</span></h1>
            <p class="hero-subtitle">Tra cứu, đặt lịch và quản lý việc mượn phòng học, sân thể thao, hội trường và nhiều tài nguyên khác của trường đại học.</p>
            <div class="hero-search">
                <div class="search-input-group">
                    <span class="search-icon">${icon('search')}</span>
                    <input type="text" class="form-control form-control-lg" id="heroSearch" placeholder="Tìm kiếm phòng, sân, bể bơi..." autocomplete="off">
                </div>
            </div>
            <div class="hero-stats" id="heroStats"></div>
        </section>

        <section class="mb-4">
            <div class="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h2 class="section-title mb-1">Cơ sở vật chất nổi bật</h2>
                    <div class="ub-accent-line"></div>
                </div>
                <a href="#facilities" class="btn btn-ghost btn-sm">Xem tất cả ${icon('arrow-right')}</a>
            </div>
            <div id="featuredFacilities">${Skeleton.cards(6)}</div>
        </section>`;
    }

    async function initHome() {
        loadFeatured();
        loadStats();

        document.getElementById('heroSearch')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                currentFilters.search = e.target.value.trim();
                App.navigate('facilities');
            }
        });
    }

    async function loadStats() {
        try {
            const res = await API.get('api/facilities/index.php?limit=1');
            const total = res.data?.total || 0;
            const el = document.getElementById('heroStats');
            if (el) {
                el.innerHTML = `
                    <div><div class="hero-stat-value">${total}</div><div class="hero-stat-label">Cơ sở vật chất</div></div>
                    <div><div class="hero-stat-value">24/7</div><div class="hero-stat-label">Đặt lịch online</div></div>
                    <div><div class="hero-stat-value">100%</div><div class="hero-stat-label">Miễn phí</div></div>
                `;
            }
        } catch {}
    }

    async function loadFeatured() {
        try {
            const res = await API.get('api/facilities/index.php?limit=6&status=active');
            const el = document.getElementById('featuredFacilities');
            if (!el) return;

            if (!res.data?.items?.length) {
                el.innerHTML = emptyState('building', 'Chưa có cơ sở', 'Chưa có cơ sở vật chất nào được thêm vào hệ thống.');
                return;
            }
            el.innerHTML = renderFacilityGrid(res.data.items);
        } catch (err) {
            document.getElementById('featuredFacilities').innerHTML = emptyState('exclamation-triangle', 'Lỗi tải dữ liệu', err.message);
        }
    }

    /* --- Facility Listing Page --- */
    function renderList() {
        return `
        <div class="d-flex align-items-center justify-content-between mb-3">
            <div>
                <h1 class="section-title">Cơ sở vật chất</h1>
                <p class="section-subtitle">Tra cứu và tìm kiếm tài nguyên trường học</p>
            </div>
        </div>

        <div class="filter-bar">
            <div class="row g-2 align-items-center">
                <div class="col-md-5">
                    <div class="search-input-group">
                        <span class="search-icon">${icon('search')}</span>
                        <input type="text" class="form-control" id="facilitySearch" placeholder="Tìm theo tên..." value="${currentFilters.search}">
                    </div>
                </div>
                <div class="col-md-3">
                    <select class="form-select" id="filterType">
                        <option value="">Tất cả loại</option>
                        <option value="room">Phòng họp</option>
                        <option value="lab">Phòng thực hành</option>
                        <option value="sports_field">Sân thể thao</option>
                        <option value="pool">Bể bơi</option>
                        <option value="auditorium">Hội trường</option>
                        <option value="other">Khác</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <select class="form-select" id="filterCampus">
                        <option value="">Tất cả cơ sở</option>
                        <option value="Cơ sở A">Cơ sở A</option>
                        <option value="Cơ sở B">Cơ sở B</option>
                        <option value="Cơ sở C">Cơ sở C</option>
                    </select>
                </div>
                <div class="col-md-1">
                    <button class="btn btn-accent w-100" id="filterBtn" title="Lọc">
                        ${icon('funnel')}
                    </button>
                </div>
            </div>
        </div>

        <div id="facilityList">${Skeleton.cards(6)}</div>
        <div id="facilityPagination" class="mt-3 d-flex justify-content-center"></div>`;
    }

    function bindList() {
        document.getElementById('filterBtn')?.addEventListener('click', applyFilters);
        document.getElementById('facilitySearch')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
        document.getElementById('filterType')?.addEventListener('change', applyFilters);
        document.getElementById('filterCampus')?.addEventListener('change', applyFilters);

        if (currentFilters.type) document.getElementById('filterType').value = currentFilters.type;
        if (currentFilters.campus) document.getElementById('filterCampus').value = currentFilters.campus;

        loadFacilities();
    }

    function applyFilters() {
        currentFilters.search = document.getElementById('facilitySearch')?.value.trim() || '';
        currentFilters.type = document.getElementById('filterType')?.value || '';
        currentFilters.campus = document.getElementById('filterCampus')?.value || '';
        currentFilters.page = 1;
        loadFacilities();
    }

    async function loadFacilities() {
        const el = document.getElementById('facilityList');
        el.innerHTML = Skeleton.cards(6);

        const params = new URLSearchParams();
        params.set('page', currentFilters.page);
        params.set('limit', '12');
        if (currentFilters.search) params.set('search', currentFilters.search);
        if (currentFilters.type) params.set('type', currentFilters.type);
        if (currentFilters.campus) params.set('campus', currentFilters.campus);
        params.set('status', 'active');

        try {
            const res = await API.get(`api/facilities/index.php?${params}`);
            const data = res.data;

            if (!data.items?.length) {
                el.innerHTML = emptyState('search', 'Không tìm thấy', 'Không có cơ sở vật chất nào phù hợp với bộ lọc.');
                document.getElementById('facilityPagination').innerHTML = '';
                return;
            }

            el.innerHTML = renderFacilityGrid(data.items);
            document.getElementById('facilityPagination').innerHTML =
                Pagination.render(data.page, data.total_pages, (p) => {
                    currentFilters.page = p;
                    loadFacilities();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
        } catch (err) {
            el.innerHTML = emptyState('exclamation-triangle', 'Lỗi', err.message);
        }
    }

    /* --- Card Grid Render --- */
    function renderFacilityGrid(items) {
        return `<div class="row g-3">${items.map(f => `
            <div class="col-sm-6 col-lg-4">
                <div class="card-facility" onclick="App.navigate('facility/${f.id}')">
                    <div class="card-facility-img-wrap">
                        ${f.primary_image
                            ? `<img class="card-facility-img" src="uploads/facilities/${f.primary_image}" alt="${f.name}" loading="lazy">`
                            : `<div class="card-facility-img-placeholder">${facilityTypeIcon(f.type)}</div>`
                        }
                        <span class="card-facility-badge">${facilityTypeLabel(f.type)}</span>
                    </div>
                    <div class="card-facility-body">
                        <div class="card-facility-type">${facilityTypeLabel(f.type)}</div>
                        <div class="card-facility-name">${f.name}</div>
                        <div class="card-facility-meta">
                            <span>${icon('people')} ${f.capacity} người</span>
                            <span>${icon('geo-alt')} ${f.campus || 'N/A'}</span>
                            ${f.building ? `<span>${icon('building')} ${f.building}</span>` : ''}
                        </div>
                        <div class="card-facility-footer">
                            <div class="facility-rating">
                                <span class="star">${icon('star-fill')}</span>
                                <span>${f.avg_rating ? parseFloat(f.avg_rating).toFixed(1) : '—'}</span>
                                <span class="count">(${f.review_count || 0})</span>
                            </div>
                            ${statusBadge(f.status)}
                        </div>
                    </div>
                </div>
            </div>`).join('')}</div>`;
    }

    /* --- Facility Detail Page --- */
    function renderDetail() {
        return `<div id="facilityDetail"><div class="text-center py-5">${Skeleton.cards(1)}</div></div>`;
    }

    async function loadDetail(id) {
        const el = document.getElementById('facilityDetail');
        try {
            const res = await API.get(`api/facilities/show.php?id=${id}`);
            const f = res.data;

            let equipmentHtml = '';
            if (f.equipment?.length) {
                equipmentHtml = f.equipment.map(eq =>
                    `<span class="equipment-tag">${icon('check-circle')} ${eq.name} (${eq.quantity})</span>`
                ).join(' ');
            }

            let reviewsHtml = '';
            if (f.reviews?.length) {
                reviewsHtml = f.reviews.map(r => `
                    <div class="d-flex gap-3 mb-3 pb-3 border-bottom" style="border-color:var(--border-light)!important">
                        <div class="user-avatar-sm flex-shrink-0">${icon('person-fill')}</div>
                        <div>
                            <div class="fw-semibold" style="font-size:0.875rem">${r.full_name}</div>
                            <div class="mb-1">${(`<span style="color:#f59e0b">${icon('star-fill')}</span>`).repeat(r.rating)}${(`<span style="color:var(--text-muted)">${icon('star')}</span>`).repeat(5 - r.rating)}</div>
                            <div style="font-size:0.85rem;color:var(--text-secondary)">${r.comment || ''}</div>
                            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem">${formatDate(r.created_at)}</div>
                        </div>
                    </div>`).join('');
            } else {
                reviewsHtml = '<p class="text-muted" style="font-size:0.875rem">Chưa có đánh giá nào.</p>';
            }

            const isUser = window.APP_CONFIG.currentUser && window.APP_CONFIG.currentUser.role !== 'admin';

            el.innerHTML = `
            <div class="mb-3">
                <a href="#facilities" class="btn btn-ghost btn-sm">${icon('arrow-left')} Quay lại</a>
            </div>

            <div class="detail-header">
                ${f.images?.length
                    ? `<img class="detail-hero-img" src="uploads/facilities/${f.images[0].image_path}" alt="${f.name}">`
                    : `<div class="detail-hero-placeholder">${facilityTypeIcon(f.type)}</div>`
                }
                <div class="detail-hero-overlay">
                    <span class="badge bg-white bg-opacity-25 mb-2">${facilityTypeLabel(f.type)}</span>
                    <h1 class="h3 fw-bold mb-1">${f.name}</h1>
                    <div class="d-flex gap-3 flex-wrap" style="font-size:0.9rem">
                        <span>${icon('people')} ${f.capacity} người</span>
                        <span>${icon('geo-alt')} ${f.campus || ''} ${f.building || ''} ${f.floor || ''}</span>
                        <span><span style="color:#f59e0b">${icon('star-fill')}</span> ${f.avg_rating ? parseFloat(f.avg_rating).toFixed(1) : '—'} (${f.review_count || 0} đánh giá)</span>
                    </div>
                </div>
            </div>

            ${f.images?.length > 1 ? `
            <div class="detail-section">
                <h3 class="detail-section-title">${icon('images')} Hình ảnh</h3>
                <div class="gallery-grid">
                    ${f.images.map(img => `<img class="gallery-thumb" src="uploads/facilities/${img.image_path}" alt="" loading="lazy">`).join('')}
                </div>
            </div>` : ''}

            <div class="row g-3">
                <div class="col-lg-8">
                    <div class="detail-section">
                        <h3 class="detail-section-title">${icon('info-circle')} Mô tả</h3>
                        <p style="white-space:pre-line;color:var(--text-secondary);font-size:0.9rem;line-height:1.7">${f.description || 'Không có mô tả.'}</p>
                    </div>

                    ${f.rules ? `
                    <div class="detail-section">
                        <h3 class="detail-section-title">${icon('shield-check')} Quy định sử dụng</h3>
                        <p style="white-space:pre-line;color:var(--text-secondary);font-size:0.9rem;line-height:1.7">${f.rules}</p>
                    </div>` : ''}

                    ${equipmentHtml ? `
                    <div class="detail-section">
                        <h3 class="detail-section-title">${icon('tools')} Trang thiết bị</h3>
                        <div class="d-flex flex-wrap gap-2">${equipmentHtml}</div>
                    </div>` : ''}

                    <div class="detail-section">
                        <h3 class="detail-section-title">${icon('chat-dots')} Đánh giá</h3>
                        ${reviewsHtml}
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="detail-section position-sticky" style="top:calc(var(--nav-height) + 1rem)">
                        <h3 class="detail-section-title">${icon('calendar-check')} Đặt lịch</h3>
                        ${isUser
                            ? `<a href="#bookings/new/${f.id}" class="btn btn-accent w-100 mb-3">
                                ${icon('calendar-plus')} Đặt lịch ngay</a>`
                            : (window.APP_CONFIG.currentUser
                                ? `<p class="text-muted" style="font-size:0.85rem">Admin không cần đặt lịch.</p>`
                                : `<a href="#login" class="btn btn-accent w-100 mb-3">
                                    ${icon('box-arrow-in-right')} Đăng nhập để đặt lịch</a>`)
                        }

                        <h4 class="detail-section-title mt-4">${icon('clock')} Giờ hoạt động</h4>
                        ${renderOperatingHours(f.operating_hours)}

                        <div class="mt-3">
                            ${statusBadge(f.status)}
                        </div>
                    </div>
                </div>
            </div>`;
        } catch (err) {
            el.innerHTML = emptyState('exclamation-triangle', 'Không tìm thấy', err.message || 'Cơ sở vật chất không tồn tại.');
        }
    }

    function renderOperatingHours(hours) {
        if (!hours) return '<p class="text-muted" style="font-size:0.85rem">Không có thông tin.</p>';
        const dayLabels = { mon: 'Thứ 2', tue: 'Thứ 3', wed: 'Thứ 4', thu: 'Thứ 5', fri: 'Thứ 6', sat: 'Thứ 7', sun: 'CN' };
        let parsed = typeof hours === 'string' ? JSON.parse(hours) : hours;
        let html = '<div style="font-size:0.85rem">';
        for (const [key, label] of Object.entries(dayLabels)) {
            const val = parsed[key] || 'closed';
            html += `<div class="d-flex justify-content-between py-1 border-bottom" style="border-color:var(--border-light)!important">
                <span class="fw-medium">${label}</span>
                <span class="${val === 'closed' ? 'text-danger' : 'text-success'}">${val === 'closed' ? 'Đóng cửa' : val}</span>
            </div>`;
        }
        html += '</div>';
        return html;
    }

    return {
        renderHome, initHome,
        renderList, bindList,
        renderDetail, loadDetail,
        currentFilters,
    };
})();
