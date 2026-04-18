/**
 * Profile Module - View & update profile, avatar.
 */
const Profile = (() => {

    function render() {
        const user = window.APP_CONFIG.currentUser;
        if (!user) return '<p>Vui lòng đăng nhập.</p>';

        return `
        <div class="row g-4 justify-content-center">
            <div class="col-lg-8">
                <div class="mb-3"><a href="#home" class="btn btn-ghost btn-sm">${icon('arrow-left')} Trang chủ</a></div>
                <div class="detail-section">
                    <h1 class="section-title mb-4">Hồ sơ cá nhân</h1>
                    <form id="profileForm" novalidate>
                        <div class="text-center mb-4">
                            <div class="user-avatar-sm mx-auto mb-2" style="width:80px;height:80px;font-size:2rem" id="profileAvatar">
                                ${icon('person-fill')}
                            </div>
                            <label class="btn btn-ghost btn-sm">
                                ${icon('camera')} Đổi ảnh đại diện
                                <input type="file" class="d-none" id="avatarInput" accept="image/*">
                            </label>
                        </div>

                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label fw-medium">Họ và tên</label>
                                <input type="text" class="form-control" id="profName" value="">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-medium">Email</label>
                                <input type="email" class="form-control" id="profEmail" value="" disabled>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-medium">Số điện thoại</label>
                                <input type="tel" class="form-control" id="profPhone" value="">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-medium">Đối tượng</label>
                                <input type="text" class="form-control" id="profUserType" value="" disabled>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-medium">Mã sinh viên</label>
                                <input type="text" class="form-control" id="profStudentId" value="">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-medium">Khoa / Bộ môn</label>
                                <input type="text" class="form-control" id="profDepartment" value="">
                            </div>
                        </div>

                        <button type="submit" class="btn btn-accent mt-4" id="profSaveBtn">
                            <span class="btn-text">${icon('check')} Lưu thay đổi</span>
                            <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                        </button>
                    </form>
                </div>
            </div>
        </div>`;
    }

    async function init() {
        try {
            const res = await API.get('api/auth/me.php');
            const u = res.data;
            document.getElementById('profName').value = u.full_name || '';
            document.getElementById('profEmail').value = u.email || '';
            document.getElementById('profPhone').value = u.phone || '';
            document.getElementById('profUserType').value = { student: 'Sinh viên', lecturer: 'Giảng viên', external: 'Người ngoài' }[u.user_type] || u.user_type;
            document.getElementById('profStudentId').value = u.student_id || '';
            document.getElementById('profDepartment').value = u.department || '';
            if (u.avatar) {
                document.getElementById('profileAvatar').innerHTML = `<img src="uploads/avatars/${u.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
            }
        } catch {}

        document.getElementById('avatarInput')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const formData = new FormData();
            formData.append('avatar', file);
            try {
                const res = await API.upload('api/users/avatar.php', formData);
                Toast.success('Cập nhật ảnh đại diện thành công');
                if (res.data?.avatar) {
                    document.getElementById('profileAvatar').innerHTML = `<img src="uploads/avatars/${res.data.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
                }
            } catch (err) { Toast.error(err.message); }
        });

        document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('profSaveBtn');
            btn.disabled = true;
            btn.querySelector('.btn-text')?.classList.add('d-none');
            btn.querySelector('.spinner-border')?.classList.remove('d-none');

            try {
                await API.put('api/users/update.php', {
                    full_name: document.getElementById('profName').value.trim(),
                    phone: document.getElementById('profPhone').value.trim(),
                    student_id: document.getElementById('profStudentId').value.trim(),
                    department: document.getElementById('profDepartment').value.trim(),
                });

                const me = await API.get('api/auth/me.php');
                App.setUser(me.data);
                Toast.success('Cập nhật hồ sơ thành công');
            } catch (err) { Toast.error(err.message); }
            finally {
                btn.disabled = false;
                btn.querySelector('.btn-text')?.classList.remove('d-none');
                btn.querySelector('.spinner-border')?.classList.add('d-none');
            }
        });
    }

    return { render, init };
})();
