/**
 * App - Main router, theme, initialization.
 */
const App = (() => {
    let currentUser = window.APP_CONFIG.currentUser;
    let notificationPollTimer = null;
    let notificationsLoading = false;
    let lastNotificationSignature = '';

    function init() {
        initTheme();
        updateUI();
        initNotifications();
        Chat.init();
        bindNavigation();
        bindBackButton();
        bindLogout();
        bindVisibilityRefresh();
        window.addEventListener('hashchange', handleRoute);
        handleRoute();
    }

    /* --- Routing --- */
    function handleRoute() {
        const hash = (location.hash || '#home').slice(1);
        const parts = hash.split('/');
        const route = parts[0];
        const subRoute = parts[1] || null;
        const param = parts[2] || parts[1] || null;

        const content = document.getElementById('pageContent');
        const loader = document.getElementById('pageLoader');

        loader.classList.add('active');
        content.style.display = 'none';

        setTimeout(() => {
            let html = '';
            let afterRender = null;

            // Public routes
            if (route === 'home' || hash === '') {
                html = Facilities.renderHome();
                afterRender = () => Facilities.initHome();
            } else if (route === 'facilities' && !subRoute) {
                html = Facilities.renderList();
                afterRender = () => Facilities.bindList();
            } else if (route === 'facility') {
                html = Facilities.renderDetail();
                afterRender = () => Facilities.loadDetail(subRoute || param);
            } else if (route === 'login') {
                if (currentUser) { navigate('home'); return; }
                html = Auth.renderLogin();
                afterRender = () => Auth.bindLogin();
            } else if (route === 'register') {
                if (currentUser) { navigate('home'); return; }
                html = Auth.renderRegister();
                afterRender = () => Auth.bindRegister();
            }
            // Auth-required routes
            else if (route === 'bookings' && subRoute === 'new') {
                if (!requireLogin()) return;
                const facilityId = parts[2] || '';
                html = Bookings.renderNew(facilityId);
                afterRender = () => Bookings.initNew(facilityId);
            } else if (route === 'my-bookings') {
                if (!requireLogin()) return;
                html = Bookings.renderMyBookings();
                afterRender = () => Bookings.bindMyBookings();
            } else if (route === 'bookings') {
                if (!requireLogin()) return;
                html = Bookings.renderNew('');
                afterRender = () => Bookings.initNew('');
            } else if (route === 'profile') {
                if (!requireLogin()) return;
                html = Profile.render();
                afterRender = () => Profile.init();
            }
            // Admin routes
            else if (route === 'admin') {
                if (!requireAdmin()) return;
                if (subRoute === 'facilities') {
                    html = Admin.renderFacilities();
                    afterRender = () => Admin.initFacilities();
                } else if (subRoute === 'bookings') {
                    html = Admin.renderBookings();
                    afterRender = () => Admin.bindBookings();
                } else if (subRoute === 'users') {
                    html = Admin.renderUsers();
                    afterRender = () => Admin.initUsers();
                } else {
                    html = Admin.renderDashboard();
                    afterRender = () => Admin.initDashboard();
                }
            }
            // 404
            else {
                html = emptyState('signpost-split', 'Trang không tồn tại', 'Đường dẫn bạn truy cập không tồn tại.');
            }

            content.innerHTML = html;
            content.style.display = '';
            loader.classList.remove('active');

            content.style.animation = 'none';
            content.offsetHeight;
            content.style.animation = '';

            if (afterRender) afterRender();
            updateActiveNav(route, subRoute);
        }, 120);
    }

    function navigate(hash) {
        location.hash = hash;
    }

    function requireLogin() {
        if (!currentUser) {
            Toast.warning('Vui lòng đăng nhập để tiếp tục');
            navigate('login');
            return false;
        }
        return true;
    }

    function requireAdmin() {
        if (!currentUser) {
            Toast.warning('Vui lòng đăng nhập');
            navigate('login');
            return false;
        }
        if (currentUser.role !== 'admin') {
            Toast.error('Bạn không có quyền truy cập khu vực này');
            navigate('home');
            return false;
        }
        return true;
    }

    /* --- Active Nav --- */
    function updateActiveNav(route, subRoute) {
        document.querySelectorAll('[data-nav]').forEach(link => {
            link.classList.remove('active');
            const nav = link.dataset.nav;
            if (
                nav === route ||
                (nav === 'admin' && route === 'admin') ||
                (nav === 'home' && (route === 'home' || route === '')) ||
                (nav === 'bookings' && route === 'bookings') ||
                (nav === 'my-bookings' && route === 'my-bookings')
            ) {
                link.classList.add('active');
            }
        });
        updateBackButton(route, subRoute);
    }

    /* --- User State --- */
    function setUser(user) {
        currentUser = user;
        window.APP_CONFIG.currentUser = user;
        Chat.setUser(user);
        updateUI();
        if (user) {
            loadNotifications({ force: true });
            Chat.refreshBadge();
        }
    }

    function updateUI() {
        const isLoggedIn = !!currentUser;
        const isAdmin = currentUser?.role === 'admin';

        // Guest / User menus
        document.getElementById('guestActions')?.classList.toggle('d-none', isLoggedIn);
        document.getElementById('userMenu')?.classList.toggle('d-none', !isLoggedIn);
        document.getElementById('notificationMenu')?.classList.toggle('d-none', !isLoggedIn);
        document.getElementById('mobileGuestActions')?.classList.toggle('d-none', isLoggedIn);
        document.getElementById('mobileUserActions')?.classList.toggle('d-none', !isLoggedIn);

        // Auth-required items (any logged-in user)
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = isLoggedIn ? '' : 'none';
        });

        // Logged-in user feature items (including admin)
        document.querySelectorAll('.user-only').forEach(el => {
            el.style.display = isLoggedIn ? '' : 'none';
        });

        // Admin-only items
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? '' : 'none';
        });

        // User name in nav
        if (currentUser) {
            const nameEl = document.getElementById('navUserName');
            const dropdownNameEl = document.getElementById('dropdownUserName');
            if (nameEl) nameEl.textContent = currentUser.full_name;
            if (dropdownNameEl) dropdownNameEl.textContent = currentUser.full_name;
            startNotificationPolling();
            loadNotifications({ force: true, silent: true });
            Chat.setUser(currentUser);
            Chat.refreshBadge();
        } else {
            stopNotificationPolling();
            lastNotificationSignature = '';
            Chat.setUser(null);
            const countEl = document.getElementById('notificationCount');
            const listEl = document.getElementById('notificationList');
            if (countEl) countEl.classList.add('d-none');
            if (listEl) listEl.innerHTML = '<div class="text-muted small px-2 py-3">Chưa có thông báo nào.</div>';
        }
    }

    /* --- Navigation Bindings --- */
    function bindNavigation() {
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.addEventListener('click', () => {
                const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('sidebarMobile'));
                offcanvas?.hide();
            });
        });
    }

    function bindBackButton() {
        document.getElementById('navBackBtn')?.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
                return;
            }
            location.hash = '#home';
        });
    }

    function updateBackButton(route, subRoute) {
        const backBtn = document.getElementById('navBackBtn');
        if (!backBtn) return;

        const shouldShow = !(
            route === 'home' ||
            route === '' ||
            route === 'login' ||
            route === 'register' ||
            (route === 'facilities' && !subRoute) ||
            (route === 'admin' && !subRoute)
        );

        backBtn.classList.toggle('d-none', !shouldShow);
    }

    function bindLogout() {
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
        document.getElementById('mobileLogoutBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
            const offcanvas = bootstrap.Offcanvas.getInstance(document.getElementById('sidebarMobile'));
            offcanvas?.hide();
        });
    }

    function initNotifications() {
        document.getElementById('notificationToggle')?.addEventListener('click', () => {
            if (currentUser) loadNotifications({ force: true });
        });
        document.getElementById('markAllNotificationsBtn')?.addEventListener('click', async () => {
            try {
                await API.put('api/notifications/read.php', {});
                loadNotifications({ force: true });
            } catch (err) {
                Toast.error(err.message);
            }
        });
    }

    function bindVisibilityRefresh() {
        document.addEventListener('visibilitychange', () => {
            if (!currentUser) return;
            if (document.visibilityState === 'visible') {
                startNotificationPolling();
                loadNotifications({ force: true, silent: true });
                Chat.refreshBadge();
            } else {
                stopNotificationPolling();
            }
        });

        window.addEventListener('focus', () => {
            if (currentUser) {
                loadNotifications({ force: true, silent: true });
                Chat.refreshBadge();
            }
        });
    }

    function startNotificationPolling() {
        if (!currentUser || notificationPollTimer || document.visibilityState === 'hidden') return;
        notificationPollTimer = window.setInterval(() => {
            loadNotifications();
            Chat.refreshBadge();
        }, 3000);
    }

    function stopNotificationPolling() {
        if (!notificationPollTimer) return;
        clearInterval(notificationPollTimer);
        notificationPollTimer = null;
    }

    async function loadNotifications(options = {}) {
        if (!currentUser) return;
        if (notificationsLoading && !options.force) return;

        notificationsLoading = true;
        try {
            const res = await API.get('api/notifications/index.php?limit=8');
            const countEl = document.getElementById('notificationCount');
            const listEl = document.getElementById('notificationList');
            if (!countEl || !listEl) return;

            const unread = res.data?.unread || 0;
            const items = res.data?.items || [];
            const newestId = items[0]?.id || 0;
            const signature = `${unread}:${newestId}:${items.length}`;

            if (!options.silent && signature !== lastNotificationSignature && lastNotificationSignature !== '') {
                const newest = items[0];
                if (newest && !newest.is_read) {
                    Toast.info(newest.title);
                }
            }

            lastNotificationSignature = signature;
            countEl.textContent = unread > 9 ? '9+' : unread;
            countEl.classList.toggle('d-none', unread === 0);

            if (!items.length) {
                listEl.innerHTML = '<div class="text-muted small px-2 py-3">Chưa có thông báo nào.</div>';
                return;
            }

            listEl.innerHTML = items.map((item) => `
                <button type="button" class="dropdown-item rounded-3 px-3 py-2 notification-item ${item.is_read ? '' : 'fw-semibold'}" data-id="${item.id}" style="white-space:normal">
                    <div class="d-flex align-items-start gap-2">
                        <span class="${notificationColor(item.type)}" style="margin-top:2px">${icon(notificationIcon(item.type))}</span>
                        <div class="flex-grow-1 text-start">
                            <div class="small">${item.title}</div>
                            <div class="small text-muted mt-1">${item.message}</div>
                            <div class="small text-muted mt-1">${formatDateTime(item.created_at)}</div>
                        </div>
                    </div>
                </button>
            `).join('');

            listEl.querySelectorAll('.notification-item').forEach((button) => {
                button.addEventListener('click', async () => {
                    try {
                        await API.put('api/notifications/read.php', { id: parseInt(button.dataset.id, 10) });
                        loadNotifications({ force: true });
                    } catch {}
                });
            });

            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {});
            }
        } catch {}
        finally {
            notificationsLoading = false;
        }
    }

    function notificationIcon(type) {
        return ({ success: 'check-circle-fill', error: 'exclamation-circle-fill', warning: 'exclamation-triangle-fill' }[type] || 'info-circle-fill');
    }

    function notificationColor(type) {
        return ({ success: 'text-success', error: 'text-danger', warning: 'text-warning' }[type] || 'text-info');
    }

    /* --- Theme Toggle --- */
    function initTheme() {
        const saved = localStorage.getItem('theme');
        if (saved) document.documentElement.setAttribute('data-bs-theme', saved);

        const moonSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278"/></svg>';
        const sunSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M3.757 4.464a.5.5 0 0 1-.707 0L1.636 3.05a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707"/></svg>';

        const updateIcon = () => {
            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
            const newSvg = isDark ? sunSvg : moonSvg;
            const desktopBtn = document.getElementById('themeToggleDesktop');
            const mobileBtn = document.getElementById('themeToggleMobile');
            if (desktopBtn) desktopBtn.innerHTML = newSvg;
            if (mobileBtn) mobileBtn.innerHTML = newSvg;
        };

        const toggle = () => {
            const isDark = document.documentElement.getAttribute('data-bs-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateIcon();
        };

        document.getElementById('themeToggleDesktop')?.addEventListener('click', toggle);
        document.getElementById('themeToggleMobile')?.addEventListener('click', toggle);
        updateIcon();
    }

    return { init, navigate, setUser, handleRoute };
})();

// Boot
document.addEventListener('DOMContentLoaded', App.init);
