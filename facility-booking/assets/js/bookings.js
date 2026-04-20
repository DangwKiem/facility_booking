/**
 * Bookings Module - FullCalendar, booking form, my bookings.
 */
const Bookings = (() => {
    let calendar = null;
    let myBookingStatus = '';
    let myBookingPage = 1;
    let currentQrUrl = '';

    function renderNew(facilityId) {
        return `
        <div class="mb-3">
            <a href="${facilityId ? `#facility/${facilityId}` : '#facilities'}" class="btn btn-ghost btn-sm">${icon('arrow-left')} Quay lại</a>
        </div>
        <div class="row g-4">
            <div class="col-lg-7">
                <div class="detail-section">
                    <h3 class="detail-section-title">${icon('calendar3')} Lịch sử dụng</h3>
                    <div id="bookingCalendarHint" class="alert alert-info py-2 mb-3" style="font-size:0.85rem"></div>
                    <div id="bookingCalendar"></div>
                </div>
            </div>
            <div class="col-lg-5">
                <div class="booking-form-card">
                    <h3 class="detail-section-title">${icon('calendar-plus')} Đặt lịch mới</h3>
                    <div id="facilityNameForBooking" class="mb-3"></div>
                    <form id="bookingForm" novalidate>
                        <input type="hidden" id="bookFacilityId" value="${facilityId || ''}">

                        ${!facilityId ? `
                        <div class="mb-3">
                            <label class="form-label fw-medium">Chọn cơ sở vật chất</label>
                            <select class="form-select" id="bookFacilitySelect" required>
                                <option value="">-- Chọn --</option>
                            </select>
                        </div>` : ''}

                        <div class="mb-3">
                            <label class="form-label fw-medium">Tiêu đề</label>
                            <input type="text" class="form-control" id="bookTitle" placeholder="VD: Họp nhóm đồ án" required>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label fw-medium">Bắt đầu</label>
                                <input type="datetime-local" class="form-control" id="bookStart" required>
                            </div>
                            <div class="col-6">
                                <label class="form-label fw-medium">Kết thúc</label>
                                <input type="datetime-local" class="form-control" id="bookEnd" required>
                            </div>
                        </div>
                        <div class="mb-2">
                            <div class="form-text">Giới hạn thời lượng tối đa: 8 giờ cho mỗi yêu cầu.</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-medium">Lý do sử dụng <span class="text-danger">*</span></label>
                            <textarea class="form-control" id="bookReason" rows="3" placeholder="Mô tả mục đích sử dụng..." required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-medium">Lặp lại</label>
                            <select class="form-select" id="bookRepeat">
                                <option value="none">Không lặp</option>
                                <option value="weekly">Hàng tuần</option>
                                <option value="monthly">Hàng tháng</option>
                            </select>
                        </div>
                        <div class="mb-3 d-none" id="repeatUntilGroup">
                            <label class="form-label fw-medium">Lặp đến ngày</label>
                            <input type="date" class="form-control" id="bookRepeatUntil">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-medium">File đính kèm</label>
                            <input type="file" class="form-control" id="bookAttachment" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.xlsx">
                            <div class="form-text">PDF, DOC, DOCX, JPG, PNG (tối đa 5MB mỗi file)</div>
                        </div>

                        <div id="conflictWarning" class="alert alert-warning d-none" style="font-size:0.85rem">
                            ${icon('exclamation-triangle')}
                            <span id="conflictText"></span>
                        </div>

                        <button type="submit" class="btn btn-accent w-100 py-2" id="bookSubmitBtn">
                            <span class="btn-text">${icon('check')} Gửi yêu cầu đặt lịch</span>
                            <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                        </button>
                    </form>
                </div>
            </div>
        </div>`;
    }

    async function initNew(facilityId) {
        updateCalendarHint('', facilityId);
        const nowLocal = toLocalDatetime(new Date());

        document.getElementById('bookStart')?.setAttribute('min', nowLocal);
        document.getElementById('bookEnd')?.setAttribute('min', nowLocal);

        if (facilityId) {
            try {
                const res = await API.get(`api/facilities/show.php?id=${facilityId}`);
                const nameEl = document.getElementById('facilityNameForBooking');
                if (nameEl) {
                    nameEl.innerHTML = `<div class="alert alert-info py-2 mb-0" style="font-size:0.875rem">${icon('building')} <strong>${res.data.name}</strong></div>`;
                }
                updateCalendarHint(res.data?.name || '', facilityId);
            } catch {
                updateCalendarHint('', facilityId);
            }
        }

        if (!facilityId) {
            try {
                const res = await API.get('api/facilities/index.php?limit=100&status=active');
                const sel = document.getElementById('bookFacilitySelect');
                if (sel && res.data?.items) {
                    res.data.items.forEach((facility) => {
                        sel.innerHTML += `<option value="${facility.id}">${facility.name} (${facilityTypeLabel(facility.type)})</option>`;
                    });

                    sel.addEventListener('change', () => {
                        document.getElementById('bookFacilityId').value = sel.value;
                        initCalendar(sel.value);
                        updateCalendarHint(sel.options[sel.selectedIndex]?.text || '', sel.value);
                        checkConflict();
                    });
                }
            } catch {}
        }

        initCalendar(facilityId || '');
        if (!facilityId) updateCalendarHint('', '');

        document.getElementById('bookRepeat')?.addEventListener('change', (e) => {
            document.getElementById('repeatUntilGroup')?.classList.toggle('d-none', e.target.value === 'none');
        });

        document.getElementById('bookStart')?.addEventListener('change', (e) => {
            document.getElementById('bookEnd')?.setAttribute('min', e.target.value || nowLocal);
            checkConflict();
        });
        document.getElementById('bookEnd')?.addEventListener('change', checkConflict);
        document.getElementById('bookingForm')?.addEventListener('submit', handleSubmit);
    }

    function initCalendar(facilityId) {
        const calEl = document.getElementById('bookingCalendar');
        if (!calEl) return;

        if (calendar) calendar.destroy();

        calendar = new FullCalendar.Calendar(calEl, {
            initialView: 'timeGridWeek',
            locale: 'vi',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'timeGridWeek,dayGridMonth',
            },
            buttonText: {
                today: 'Today',
            },
            views: {
                timeGridWeek: { buttonText: 'Week' },
                dayGridMonth: { buttonText: 'Month' },
            },
            slotMinTime: '06:00:00',
            slotMaxTime: '23:00:00',
            allDaySlot: false,
            height: 'auto',
            nowIndicator: true,
            selectable: true,
            selectMirror: true,
            unselectAuto: false,
            eventSources: [{
                url: `${window.APP_CONFIG.baseUrl}/api/bookings/calendar.php`,
                method: 'GET',
                extraParams: () => facilityId ? { facility_id: facilityId } : {},
                failure: () => Toast.error('Lỗi tải lịch'),
            }],
            select: (info) => {
                document.getElementById('bookStart').value = toLocalDatetime(info.start);
                document.getElementById('bookEnd').value = toLocalDatetime(info.end);
                document.getElementById('bookEnd')?.setAttribute('min', toLocalDatetime(info.start));
                checkConflict();
            },
            eventClick: (info) => {
                const props = info.event.extendedProps || {};
                Toast.info(`${info.event.title} - ${props.status || ''}`);
            },
        });

        calendar.render();
    }

    function updateCalendarHint(selectedLabel = '', fallbackFacilityId = '') {
        const hint = document.getElementById('bookingCalendarHint');
        const facilityId = document.getElementById('bookFacilityId')?.value || fallbackFacilityId;
        if (!hint) return;

        if (facilityId) {
            const facilityName = selectedLabel.split(' (')[0]?.trim();
            hint.innerHTML = facilityName
                ? `${icon('building')} Đang hiển thị lịch của <strong>${facilityName}</strong>.`
                : `${icon('building')} Đang hiển thị lịch sử dụng của cơ sở vật chất đã chọn.`;
            return;
        }

        hint.innerHTML = `${icon('calendar-week')} Hãy chọn cơ sở vật chất để hiển thị lịch sử dụng tương ứng.`;
    }

    async function checkConflict() {
        const facilityId = document.getElementById('bookFacilityId')?.value;
        const start = document.getElementById('bookStart')?.value;
        const end = document.getElementById('bookEnd')?.value;
        const warning = document.getElementById('conflictWarning');

        if (!facilityId || !start || !end) {
            warning?.classList.add('d-none');
            return;
        }

        try {
            const params = new URLSearchParams({ facility_id: facilityId, start, end });
            const res = await API.get(`api/facilities/availability.php?${params}`);
            if (res.data?.conflicts?.length > 0) {
                warning?.classList.remove('d-none');
                document.getElementById('conflictText').textContent = `Có ${res.data.conflicts.length} lịch trùng trong khung giờ này!`;
            } else {
                warning?.classList.add('d-none');
            }
        } catch {}
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('bookSubmitBtn');
        const facilityId = document.getElementById('bookFacilityId').value;
        const title = document.getElementById('bookTitle').value.trim();
        const start = document.getElementById('bookStart').value;
        const end = document.getElementById('bookEnd').value;
        const reason = document.getElementById('bookReason').value.trim();
        const repeatType = document.getElementById('bookRepeat').value;
        const repeatUntil = document.getElementById('bookRepeatUntil')?.value || '';

        if (!facilityId || !title || !start || !end || !reason) {
            Toast.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        if (new Date(end) <= new Date(start)) {
            Toast.warning('Thời gian kết thúc phải sau thời gian bắt đầu');
            return;
        }
        if (new Date(start) < new Date()) {
            Toast.warning('Chỉ được đặt lịch từ thời điểm hiện tại trở đi');
            return;
        }

        setLoading(btn, true);
        try {
            const formData = new FormData();
            formData.append('facility_id', facilityId);
            formData.append('title', title);
            formData.append('start_time', start);
            formData.append('end_time', end);
            formData.append('reason', reason);
            formData.append('repeat_type', repeatType);
            if (repeatUntil) formData.append('repeat_until', repeatUntil);

            const files = document.getElementById('bookAttachment').files;
            for (let i = 0; i < files.length; i += 1) {
                formData.append('attachments[]', files[i]);
            }

            await API.upload('api/bookings/create.php', formData);
            Toast.success('Gửi yêu cầu đặt lịch thành công! Vui lòng chờ duyệt.');
            App.navigate('my-bookings');
        } catch (err) {
            Toast.error(err.message || 'Lỗi tạo booking');
        } finally {
            setLoading(btn, false);
        }
    }

    function renderMyBookings() {
        return `
        <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap mb-3">
            <div>
                <h1 class="section-title">Lịch đã đặt</h1>
                <p class="section-subtitle">Xem, check-in/check-out và đánh giá các lịch sử dụng của bạn</p>
            </div>
            <div class="d-flex align-items-center gap-2 flex-wrap">
                <a href="#bookings" class="btn btn-ghost btn-sm">${icon('arrow-left')} Quay lại đặt lịch</a>
                <a href="#bookings/new" class="btn btn-accent btn-sm">${icon('plus')} Đặt lịch mới</a>
            </div>
        </div>

        <ul class="nav nav-tabs-custom mb-3" id="myBookingTabs">
            <li class="nav-item"><a class="nav-link active" href="#" data-status="">Tất cả</a></li>
            <li class="nav-item"><a class="nav-link" href="#" data-status="pending">Chờ duyệt</a></li>
            <li class="nav-item"><a class="nav-link" href="#" data-status="approved">Đã duyệt</a></li>
            <li class="nav-item"><a class="nav-link" href="#" data-status="rejected">Từ chối</a></li>
        </ul>

        <div id="myBookingsList">${Skeleton.table(5)}</div>
        <div id="myBookingsPagination" class="mt-3 d-flex justify-content-center"></div>

        <div class="modal fade" id="reviewModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal">
                    <div class="modal-header border-0">
                        <h5 class="modal-title">Đánh giá cơ sở vật chất</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="reviewBookingId">
                        <div class="mb-3">
                            <div class="form-label fw-medium mb-2">Chọn số sao</div>
                            <div class="star-rating">
                                ${[5, 4, 3, 2, 1].map((value) => `
                                    <input type="radio" id="reviewStar${value}" name="reviewRating" value="${value}">
                                    <label for="reviewStar${value}">${icon('star-fill')}</label>
                                `).join('')}
                            </div>
                        </div>
                        <div>
                            <label class="form-label fw-medium">Nhận xét</label>
                            <textarea class="form-control" id="reviewComment" rows="4" placeholder="Chia sẻ trải nghiệm sử dụng của bạn..."></textarea>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button type="button" class="btn btn-ghost" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-accent" id="reviewSubmitBtn" onclick="Bookings.submitReview()">
                            <span class="btn-text">Gửi đánh giá</span>
                            <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="qrModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-modal">
                    <div class="modal-header border-0">
                        <h5 class="modal-title" id="qrModalTitle">QR check-in</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <div class="mb-3 text-muted small">Đưa mã này cho quản trị viên quét hoặc dùng ngay trên thiết bị của bạn.</div>
                        <img id="qrPreviewImage" alt="QR attendance" class="img-fluid rounded-3 border" style="max-width:240px;background:#fff;padding:12px">
                        <div class="mt-3">
                            <button type="button" class="btn btn-accent" id="qrActionBtn">
                                <span class="btn-text">Thực hiện</span>
                                <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function bindMyBookings() {
        document.querySelectorAll('#myBookingTabs .nav-link').forEach((tab) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#myBookingTabs .nav-link').forEach((item) => item.classList.remove('active'));
                tab.classList.add('active');
                myBookingStatus = tab.dataset.status;
                myBookingPage = 1;
                loadMyBookings();
            });
        });

        loadMyBookings();
    }

    async function loadMyBookings() {
        const el = document.getElementById('myBookingsList');
        el.innerHTML = Skeleton.table(5);

        const params = new URLSearchParams({ page: myBookingPage, limit: 10, mine: '1' });
        if (myBookingStatus) params.set('status', myBookingStatus);

        try {
            const res = await API.get(`api/bookings/index.php?${params}`);
            const data = res.data;

            if (!data.items?.length) {
                el.innerHTML = emptyState('calendar-x', 'Chưa có lịch đặt', 'Bạn chưa có yêu cầu đặt lịch nào.');
                document.getElementById('myBookingsPagination').innerHTML = '';
                return;
            }

            el.innerHTML = `
            <div class="data-table-wrapper">
                <div class="table-responsive">
                    <table class="data-table table">
                        <thead>
                            <tr>
                                <th>Cơ sở</th>
                                <th>Tiêu đề</th>
                                <th>Thời gian</th>
                                <th>Trạng thái</th>
                                <th>Điểm danh</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.items.map((booking) => `
                            <tr>
                                <td class="fw-medium">${booking.facility_name || ''}</td>
                                <td>
                                    <div>${booking.title}</div>
                                    <div class="small text-muted mt-1">${formatDate(booking.created_at)}</div>
                                </td>
                                <td style="font-size:0.85rem">${formatDateTime(booking.start_time)}<br>-> ${formatDateTime(booking.end_time)}</td>
                                <td>
                                    ${statusBadge(booking.status)}
                                    ${booking.admin_note ? `<div class="small text-warning mt-2">${icon('chat-left-text')} ${booking.admin_note}</div>` : ''}
                                </td>
                                <td style="font-size:0.82rem">
                                    ${booking.checked_in_at ? `<div>Vào: ${formatDateTime(booking.checked_in_at)}</div>` : '<div class="text-muted">Chưa check-in</div>'}
                                    ${booking.checked_out_at ? `<div>Ra: ${formatDateTime(booking.checked_out_at)}</div>` : ''}
                                </td>
                                <td>${renderBookingActions(booking)}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;

            document.getElementById('myBookingsPagination').innerHTML = Pagination.render(data.page, data.total_pages, (page) => {
                myBookingPage = page;
                loadMyBookings();
            });
        } catch (err) {
            el.innerHTML = emptyState('exclamation-triangle', 'Lỗi', err.message);
        }
    }

    function renderBookingActions(booking) {
        const actions = [];
        const hasEnded = new Date(booking.end_time) <= new Date();
        const canReviewNow = Boolean(booking.checked_out_at) || hasEnded;

        if (booking.status === 'cancelled' || booking.status === 'rejected') {
            return '<span class="text-muted small">Không có</span>';
        }

        if (booking.status === 'pending') {
            actions.push(`<button class="btn btn-ghost btn-sm me-1 mb-1" onclick="Bookings.cancelBooking(${booking.id})">${icon('x')} Hủy</button>`);
        }

        if (booking.status === 'approved') {
            if (booking.qr_checkin_url) {
                actions.push(`<button class="btn btn-accent btn-sm me-1 mb-1" onclick="Bookings.showQrModal(${booking.id}, 'checkin', '${booking.qr_checkin_url}')">${icon('check-circle')} QR vào</button>`);
            }
            if (booking.qr_checkout_url) {
                actions.push(`<button class="btn btn-ghost btn-sm me-1 mb-1" onclick="Bookings.showQrModal(${booking.id}, 'checkout', '${booking.qr_checkout_url}')">${icon('box-arrow-right')} QR ra</button>`);
            }
            if (canReviewNow) {
                if (!booking.has_review) {
                    actions.push(`<button class="btn btn-ghost btn-sm mb-1" onclick="Bookings.showReviewModal(${booking.id})">${icon('star-fill')} Đánh giá</button>`);
                } else {
                    actions.push(`<span class="text-muted small">${icon('check')} Đã đánh giá</span>`);
                }
            }
        }

        return actions.join('') || '<span class="text-muted small">Không có</span>';
    }

    function showReviewModal(bookingId) {
        document.getElementById('reviewBookingId').value = bookingId;
        document.getElementById('reviewComment').value = '';
        document.querySelectorAll('input[name="reviewRating"]').forEach((input) => {
            input.checked = false;
        });
        new bootstrap.Modal(document.getElementById('reviewModal')).show();
    }

    async function submitReview() {
        const btn = document.getElementById('reviewSubmitBtn');
        const bookingId = parseInt(document.getElementById('reviewBookingId').value, 10);
        const rating = parseInt(document.querySelector('input[name="reviewRating"]:checked')?.value || '0', 10);
        const comment = document.getElementById('reviewComment').value.trim();

        if (!rating) {
            Toast.warning('Vui lòng chọn số sao đánh giá');
            return;
        }

        setLoading(btn, true);
        try {
            await API.post('api/reviews/create.php', { booking_id: bookingId, rating, comment });
            Toast.success('Đánh giá đã được gửi');
            bootstrap.Modal.getInstance(document.getElementById('reviewModal'))?.hide();
            loadMyBookings();
        } catch (err) {
            Toast.error(err.message);
        } finally {
            setLoading(btn, false);
        }
    }

    function showQrModal(bookingId, action, qrUrl) {
        currentQrUrl = qrUrl;
        document.getElementById('qrModalTitle').textContent = action === 'checkin' ? 'QR check-in' : 'QR check-out';
        document.getElementById('qrPreviewImage').src = `https://quickchart.io/qr?size=240&text=${encodeURIComponent(qrUrl)}`;
        const button = document.getElementById('qrActionBtn');
        button.querySelector('.btn-text').textContent = action === 'checkin' ? 'Tự check-in ngay' : 'Tự check-out ngay';
        button.onclick = () => markAttendance(action);
        new bootstrap.Modal(document.getElementById('qrModal')).show();
    }

    async function markAttendance(action) {
        const btn = document.getElementById('qrActionBtn');
        if (!currentQrUrl) return;

        setLoading(btn, true);
        try {
            const response = await fetch(currentQrUrl, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { Accept: 'application/json' },
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Không thể thực hiện điểm danh');
            }
            Toast.success(action === 'checkin' ? 'Check-in thành công' : 'Check-out thành công');
            bootstrap.Modal.getInstance(document.getElementById('qrModal'))?.hide();
            loadMyBookings();
        } catch (err) {
            Toast.error(err.message);
        } finally {
            setLoading(btn, false);
        }
    }

    async function cancelBooking(id) {
        const confirmed = await Confirm.show('Hủy đặt lịch', 'Bạn có chắc muốn hủy yêu cầu đặt lịch này?', 'Hủy yêu cầu');
        if (!confirmed) return;

        try {
            await API.put('api/bookings/cancel.php', { id });
            Toast.success('Đã hủy yêu cầu');
            loadMyBookings();
        } catch (err) {
            Toast.error(err.message);
        }
    }

    function toLocalDatetime(date) {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    function setLoading(btn, loading) {
        if (!btn) return;
        btn.disabled = loading;
        btn.querySelector('.btn-text')?.classList.toggle('d-none', loading);
        btn.querySelector('.spinner-border')?.classList.toggle('d-none', !loading);
    }

    return {
        renderNew,
        initNew,
        renderMyBookings,
        bindMyBookings,
        cancelBooking,
        showReviewModal,
        submitReview,
        showQrModal,
    };
})();
