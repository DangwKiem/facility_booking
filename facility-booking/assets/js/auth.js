/**
 * Auth Module - Login, Register, Logout.
 * CSRF tokens are refreshed after login/register/logout to prevent stale-token bugs.
 */
const Auth = (() => {

    function renderLogin() {
        return `
        <div class="auth-container">
            <div class="auth-card">
                <div class="text-center mb-3">
                    <div class="brand-icon mx-auto mb-3" style="width:52px;height:52px;font-size:1.4rem">
                        ${icon('building')}
                    </div>
                </div>
                <h1 class="auth-title">Đăng nhập</h1>
                <p class="auth-subtitle">Chào mừng trở lại! Đăng nhập để đặt lịch mượn cơ sở vật chất.</p>

                <form id="loginForm" novalidate>
                    <div class="form-floating mb-3">
                        <input type="email" class="form-control" id="loginEmail" placeholder="Email" required autocomplete="email">
                        <label for="loginEmail">${icon('envelope')} Email</label>
                    </div>
                    <div class="form-floating mb-3">
                        <input type="password" class="form-control" id="loginPassword" placeholder="Mật khẩu" required autocomplete="current-password">
                        <label for="loginPassword">${icon('lock')} Mật khẩu</label>
                    </div>
                    <button type="submit" class="btn btn-accent w-100 py-2 mb-3" id="loginSubmitBtn">
                        <span class="btn-text">Đăng nhập</span>
                        <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                    </button>
                </form>

                <p class="text-center mb-0" style="font-size:0.875rem;color:var(--text-muted)">
                    Chưa có tài khoản? <a href="#register" class="text-accent fw-semibold">Đăng ký ngay</a>
                </p>
            </div>
        </div>`;
    }

    function renderRegister() {
        return `
        <div class="auth-container">
            <div class="auth-card">
                <div class="text-center mb-3">
                    <div class="brand-icon mx-auto mb-3" style="width:52px;height:52px;font-size:1.4rem">
                        ${icon('person-plus')}
                    </div>
                </div>
                <h1 class="auth-title">Tạo tài khoản</h1>
                <p class="auth-subtitle">Đăng ký để bắt đầu đặt lịch mượn cơ sở vật chất.</p>

                <form id="registerForm" novalidate>
                    <div class="form-floating mb-3">
                        <input type="text" class="form-control" id="regName" placeholder="Họ và tên" required>
                        <label for="regName">${icon('person')} Họ và tên</label>
                    </div>
                    <div class="form-floating mb-3">
                        <input type="email" class="form-control" id="regEmail" placeholder="Email" required>
                        <label for="regEmail">${icon('envelope')} Email</label>
                    </div>
                    <div class="form-floating mb-3">
                        <input type="tel" class="form-control" id="regPhone" placeholder="Số điện thoại">
                        <label for="regPhone">${icon('phone')} Số điện thoại</label>
                    </div>
                    <div class="form-floating mb-3">
                        <select class="form-select" id="regUserType">
                            <option value="student">Sinh viên</option>
                            <option value="lecturer">Giảng viên</option>
                            <option value="external">Người ngoài</option>
                        </select>
                        <label for="regUserType">${icon('people')} Đối tượng</label>
                    </div>
                    <div class="form-floating mb-3" id="regStudentIdGroup">
                        <input type="text" class="form-control" id="regStudentId" placeholder="Mã sinh viên">
                        <label for="regStudentId">${icon('card-text')} Mã sinh viên</label>
                    </div>
                    <div class="form-floating mb-3">
                        <input type="text" class="form-control" id="regDepartment" placeholder="Khoa / Bộ môn">
                        <label for="regDepartment">${icon('bank')} Khoa / Bộ môn</label>
                    </div>
                    <div class="form-floating mb-3">
                        <input type="password" class="form-control" id="regPassword" placeholder="Mật khẩu" required minlength="6">
                        <label for="regPassword">${icon('lock')} Mật khẩu (tối thiểu 6 ký tự)</label>
                    </div>
                    <div class="form-floating mb-3">
                        <input type="password" class="form-control" id="regPasswordConfirm" placeholder="Xác nhận mật khẩu" required>
                        <label for="regPasswordConfirm">${icon('lock')} Xác nhận mật khẩu</label>
                    </div>
                    <button type="submit" class="btn btn-accent w-100 py-2 mb-3" id="registerSubmitBtn">
                        <span class="btn-text">Đăng ký</span>
                        <span class="spinner-border spinner-border-sm d-none" role="status"></span>
                    </button>
                </form>

                <p class="text-center mb-0" style="font-size:0.875rem;color:var(--text-muted)">
                    Đã có tài khoản? <a href="#login" class="text-accent fw-semibold">Đăng nhập</a>
                </p>
            </div>
        </div>`;
    }

    function bindLogin() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginSubmitBtn');
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                Toast.warning('Vui lòng nhập đầy đủ email và mật khẩu');
                return;
            }

            setLoading(btn, true);
            try {
                const res = await API.post('api/auth/login.php', { email, password });
                // Update CSRF token from server response
                if (res.data?.csrf_token) {
                    API.setCsrfToken(res.data.csrf_token);
                }
                App.setUser(res.data);
                Toast.success('Đăng nhập thành công!');
                App.navigate('home');
            } catch (err) {
                Toast.error(err.message || 'Đăng nhập thất bại');
            } finally {
                setLoading(btn, false);
            }
        });
    }

    function bindRegister() {
        const form = document.getElementById('registerForm');
        if (!form) return;

        const userTypeSelect = document.getElementById('regUserType');
        userTypeSelect?.addEventListener('change', () => {
            const show = userTypeSelect.value === 'student';
            document.getElementById('regStudentIdGroup').style.display = show ? '' : 'none';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('registerSubmitBtn');
            const data = {
                full_name: document.getElementById('regName').value.trim(),
                email: document.getElementById('regEmail').value.trim(),
                phone: document.getElementById('regPhone').value.trim(),
                user_type: document.getElementById('regUserType').value,
                student_id: document.getElementById('regStudentId').value.trim(),
                department: document.getElementById('regDepartment').value.trim(),
                password: document.getElementById('regPassword').value,
                password_confirm: document.getElementById('regPasswordConfirm').value,
            };

            if (!data.full_name || !data.email || !data.password) {
                Toast.warning('Vui lòng nhập đầy đủ thông tin bắt buộc');
                return;
            }
            if (data.password.length < 6) {
                Toast.warning('Mật khẩu tối thiểu 6 ký tự');
                return;
            }
            if (data.password !== data.password_confirm) {
                Toast.warning('Mật khẩu xác nhận không khớp');
                return;
            }

            setLoading(btn, true);
            try {
                const res = await API.post('api/auth/register.php', data);
                // Update CSRF token from server response
                if (res.data?.csrf_token) {
                    API.setCsrfToken(res.data.csrf_token);
                }
                App.setUser(res.data);
                Toast.success('Đăng ký thành công!');
                App.navigate('home');
            } catch (err) {
                Toast.error(err.message || 'Đăng ký thất bại');
            } finally {
                setLoading(btn, false);
            }
        });
    }

    async function logout() {
        try {
            const res = await API.post('api/auth/logout.php');
            // Update CSRF token from server response
            if (res.data?.csrf_token) {
                API.setCsrfToken(res.data.csrf_token);
            }
        } catch {}
        App.setUser(null);
        Toast.info('Đã đăng xuất');
        App.navigate('home');
    }

    function setLoading(btn, loading) {
        if (!btn) return;
        btn.disabled = loading;
        btn.querySelector('.btn-text')?.classList.toggle('d-none', loading);
        btn.querySelector('.spinner-border')?.classList.toggle('d-none', !loading);
    }

    return { renderLogin, renderRegister, bindLogin, bindRegister, logout };
})();
