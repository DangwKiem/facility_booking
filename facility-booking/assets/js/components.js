/**
 * Reusable UI Components - Toast, Modal, Skeleton, Pagination.
 */

/* --- Toast Notifications --- */
const Toast = {
    show(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        const iconMap = {
            success: 'check-circle-fill',
            error: 'exclamation-circle-fill',
            warning: 'exclamation-triangle-fill',
            info: 'info-circle-fill',
        };
        const colorMap = {
            success: 'text-success',
            error: 'text-danger',
            warning: 'text-warning',
            info: 'text-info',
        };

        const toastEl = document.createElement('div');
        toastEl.className = 'toast toast-custom';
        toastEl.setAttribute('role', 'alert');
        toastEl.innerHTML = `
            <div class="toast-body">
                <span class="${colorMap[type] || ''}">${icon(iconMap[type] || 'info-circle-fill')}</span>
                <span>${message}</span>
                <button type="button" class="btn-close btn-close-sm ms-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        container.appendChild(toastEl);
        const bsToast = new bootstrap.Toast(toastEl, { delay: duration });
        bsToast.show();
        toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
    },

    success: (msg) => Toast.show(msg, 'success'),
    error:   (msg) => Toast.show(msg, 'error'),
    warning: (msg) => Toast.show(msg, 'warning'),
    info:    (msg) => Toast.show(msg, 'info'),
};

/* --- Confirm Dialog --- */
const Confirm = {
    _resolve: null,

    show(title, body, actionText = 'Xác nhận', actionClass = 'btn-danger') {
        return new Promise((resolve) => {
            this._resolve = resolve;
            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmBody').innerHTML = body;
            const actionBtn = document.getElementById('confirmAction');
            actionBtn.textContent = actionText;
            actionBtn.className = `btn ${actionClass}`;
            actionBtn.onclick = () => {
                resolve(true);
                bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
            };
            const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
            modal.show();
            document.getElementById('confirmModal').addEventListener('hidden.bs.modal', () => {
                resolve(false);
            }, { once: true });
        });
    },
};

/* --- Skeleton Loaders --- */
const Skeleton = {
    cards(count = 6) {
        let html = '<div class="row g-3">';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="col-sm-6 col-lg-4">
                    <div class="card-facility">
                        <div class="skeleton skeleton-img"></div>
                        <div class="card-facility-body">
                            <div class="skeleton skeleton-text" style="width:40%"></div>
                            <div class="skeleton skeleton-title"></div>
                            <div class="skeleton skeleton-text" style="width:80%"></div>
                            <div class="skeleton skeleton-text" style="width:50%"></div>
                        </div>
                    </div>
                </div>`;
        }
        html += '</div>';
        return html;
    },

    table(rows = 5, cols = 5) {
        let html = '<div class="data-table-wrapper"><table class="data-table table"><thead><tr>';
        for (let c = 0; c < cols; c++) html += '<th><div class="skeleton skeleton-text" style="width:70%"></div></th>';
        html += '</tr></thead><tbody>';
        for (let r = 0; r < rows; r++) {
            html += '<tr>';
            for (let c = 0; c < cols; c++) html += `<td><div class="skeleton skeleton-text" style="width:${60 + Math.random() * 30}%"></div></td>`;
            html += '</tr>';
        }
        html += '</tbody></table></div>';
        return html;
    },
};

/* --- Pagination --- */
const Pagination = {
    render(page, totalPages, onPageChange) {
        if (totalPages <= 1) return '';

        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

        let html = '<nav><ul class="pagination pagination-sm mb-0">';

        html += `<li class="page-item ${page <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${page - 1}">${icon('chevron-left')}</a></li>`;

        if (start > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (start > 2) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
        }

        for (let i = start; i <= end; i++) {
            html += `<li class="page-item ${i === page ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }

        if (end < totalPages) {
            if (end < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        html += `<li class="page-item ${page >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${page + 1}">${icon('chevron-right')}</a></li>`;
        html += '</ul></nav>';

        setTimeout(() => {
            document.querySelectorAll('.pagination .page-link[data-page]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const p = parseInt(link.dataset.page);
                    if (p >= 1 && p <= totalPages && p !== page) onPageChange(p);
                });
            });
        }, 0);

        return html;
    },
};

/* --- Helper: Render status badge --- */
function statusBadge(status) {
    const map = {
        pending:     { label: 'Chờ duyệt', cls: 'badge-pending' },
        approved:    { label: 'Đã duyệt', cls: 'badge-approved' },
        rejected:    { label: 'Từ chối', cls: 'badge-rejected' },
        cancelled:   { label: 'Đã hủy', cls: 'badge-cancelled' },
        active:      { label: 'Hoạt động', cls: 'badge-active' },
        maintenance: { label: 'Bảo trì', cls: 'badge-maintenance' },
        closed:      { label: 'Đóng cửa', cls: 'badge-closed' },
        blocked:     { label: 'Khóa', cls: 'badge-rejected' },
    };
    const s = map[status] || { label: status, cls: 'badge-pending' };
    return `<span class="badge-status ${s.cls}">${s.label}</span>`;
}

/* --- Helper: Facility type labels --- */
function facilityTypeLabel(type) {
    const labels = {
        room: 'Phòng họp',
        lab: 'Phòng thực hành',
        sports_field: 'Sân thể thao',
        pool: 'Bể bơi',
        auditorium: 'Hội trường',
        other: 'Khác',
    };
    return labels[type] || type;
}

function facilityTypeIcon(type) {
    const iconMap = {
        room: 'door-open',
        lab: 'pc-display',
        sports_field: 'dribbble',
        pool: 'water',
        auditorium: 'megaphone',
        other: 'building',
    };
    return icon(iconMap[type] || 'building');
}

/* --- Helper: Format datetime --- */
function formatDateTime(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dt) {
    if (!dt) return '';
    return new Date(dt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* --- Empty State --- */
function emptyState(iconName, title, desc) {
    return `<div class="empty-state">
        <div class="empty-state-icon">${icon(iconName)}</div>
        <div class="empty-state-title">${title}</div>
        <div class="empty-state-desc">${desc}</div>
    </div>`;
}
