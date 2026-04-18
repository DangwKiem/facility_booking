/**
 * API helper - Fetch wrapper with CSRF, auth, and error handling.
 */
const API = (() => {
    const baseUrl = window.APP_CONFIG.baseUrl || '';
    let csrfToken = window.APP_CONFIG.csrfToken || '';

    async function request(url, options = {}) {
        const defaultHeaders = {
            'X-CSRF-TOKEN': csrfToken,
        };

        if (!(options.body instanceof FormData)) {
            defaultHeaders['Content-Type'] = 'application/json';
        }

        const config = {
            credentials: 'same-origin',
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(`${baseUrl}/${url.replace(/^\//, '')}`, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    App.setUser(null);
                    App.navigate('login');
                    Toast.show('Phiên làm việc hết hạn, vui lòng đăng nhập lại', 'warning');
                }
                throw { status: response.status, ...data };
            }

            return data;
        } catch (err) {
            if (err.success === false) throw err;
            console.error('API Error:', err);
            throw { success: false, message: 'Lỗi kết nối server' };
        }
    }

    return {
        get:    (url) => request(url, { method: 'GET' }),
        post:   (url, body) => request(url, { method: 'POST', body }),
        put:    (url, body) => request(url, { method: 'PUT', body }),
        delete: (url) => request(url, { method: 'DELETE' }),
        upload: (url, formData) => request(url, { method: 'POST', body: formData }),
        setCsrfToken: (token) => { csrfToken = token; },
    };
})();
