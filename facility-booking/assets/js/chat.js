const Chat = (() => {
    let currentUser = window.APP_CONFIG.currentUser;
    let modalInstance = null;
    let pollTimer = null;
    let loading = false;
    let sending = false;
    let selectedUserId = null;
    let lastMessageId = 0;
    let currentMessages = [];
    let optimisticSeed = 0;

    function init() {
        bindTriggers();
        bindComposer();
        bindModalLifecycle();
        updateUI();
    }

    function setUser(user) {
        currentUser = user;
        if (!user) {
            stopPolling();
            selectedUserId = null;
            lastMessageId = 0;
            currentMessages = [];
        }
        updateUI();
    }

    function updateUI() {
        const visible = !!currentUser;
        document.querySelectorAll('.chat-required').forEach((el) => {
            el.classList.toggle('d-none', !visible);
        });

        const layout = document.getElementById('supportChatLayout');
        if (layout) {
            layout.classList.toggle('user-mode', !!currentUser && currentUser.role !== 'admin');
            layout.classList.toggle('admin-mode', !!currentUser && currentUser.role === 'admin');
        }

        if (!visible) {
            updateBadge(0);
        }
    }

    function bindTriggers() {
        document.getElementById('chatToggle')?.addEventListener('click', () => open());
    }

    function bindComposer() {
        document.getElementById('supportChatForm')?.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!currentUser || sending) return;

            const input = document.getElementById('supportChatInput');
            const message = input?.value?.trim() || '';
            if (!message) return;

            const payload = { message };
            if (currentUser.role === 'admin' && selectedUserId) {
                payload.user_id = selectedUserId;
            }

            const optimisticId = appendOptimisticMessage(message);

            try {
                sending = true;
                if (input) input.value = '';
                setSendingState(true);
                await API.post('api/chat/index.php', payload);
                removeOptimisticMessage(optimisticId);
                await loadConversation({ forceRead: true });
            } catch (err) {
                rollbackOptimisticMessage(optimisticId, message);
                Toast.error(err.message);
            } finally {
                sending = false;
                setSendingState(false);
            }
        });
    }

    function bindModalLifecycle() {
        const modalEl = document.getElementById('supportChatModal');
        if (!modalEl) return;

        modalEl.addEventListener('shown.bs.modal', async () => {
            await loadConversation({ forceRead: true });
            startPolling();
        });

        modalEl.addEventListener('hidden.bs.modal', () => {
            stopPolling();
        });
    }

    function getModal() {
        const modalEl = document.getElementById('supportChatModal');
        if (!modalEl) return null;
        if (!modalInstance) {
            modalInstance = new bootstrap.Modal(modalEl);
        }
        return modalInstance;
    }

    function open() {
        if (!currentUser) {
            Toast.warning('Vui lòng đăng nhập để sử dụng chat hỗ trợ');
            App.navigate('login');
            return;
        }
        getModal()?.show();
    }

    function startPolling() {
        if (!currentUser || pollTimer) return;
        pollTimer = window.setInterval(() => {
            loadConversation();
        }, 2500);
    }

    function stopPolling() {
        if (!pollTimer) return;
        clearInterval(pollTimer);
        pollTimer = null;
    }

    async function refreshBadge() {
        if (!currentUser) return;
        try {
            const res = await API.get('api/chat/index.php');
            updateBadge(res.data?.unread_count || 0);
        } catch {}
    }

    async function loadConversation(options = {}) {
        if (!currentUser || loading) return;

        const chatBody = document.getElementById('supportChatMessages');
        const params = currentUser.role === 'admin' && selectedUserId
            ? `?user_id=${selectedUserId}`
            : '';

        try {
            loading = true;
            if (chatBody && !chatBody.dataset.loaded) {
                chatBody.innerHTML = '<div class="text-muted small">Đang tải cuộc trò chuyện...</div>';
            }

            const res = await API.get(`api/chat/index.php${params}`);
            const data = res.data || {};
            updateBadge(data.unread_count || 0);

            if (currentUser.role === 'admin') {
                renderThreads(data.threads || [], data.selected_user_id || null);
                selectedUserId = data.selected_user_id || null;
            } else {
                selectedUserId = currentUser.id;
            }

            currentMessages = data.messages || [];
            renderMessages(currentMessages);
            toggleComposer(false, currentUser.role === 'admin' && !selectedUserId);

            const newestId = currentMessages.length ? currentMessages[currentMessages.length - 1].id : 0;
            if ((options.forceRead || newestId !== lastMessageId) && newestId > 0) {
                await markRead();
            }
            lastMessageId = newestId;
        } catch (err) {
            if (chatBody) {
                chatBody.innerHTML = `<div class="text-danger small">${escapeHtml(err.message || 'Không thể tải cuộc trò chuyện')}</div>`;
            }
        } finally {
            if (chatBody) chatBody.dataset.loaded = 'true';
            loading = false;
        }
    }

    function renderThreads(threads, activeUserId) {
        const listEl = document.getElementById('supportThreadList');
        const emptyEl = document.getElementById('supportThreadEmpty');
        if (!listEl) return;

        if (!threads.length) {
            listEl.innerHTML = '';
            emptyEl?.classList.remove('d-none');
            return;
        }

        emptyEl?.classList.add('d-none');
        listEl.innerHTML = threads.map((thread) => `
            <button type="button" class="support-thread-item ${thread.user_id === activeUserId ? 'active' : ''}" data-user-id="${thread.user_id}">
                <div class="d-flex justify-content-between align-items-start gap-2">
                    <div class="text-start">
                        <div class="fw-semibold">${escapeHtml(thread.full_name)}</div>
                        <div class="small text-muted">${escapeHtml(thread.email || '')}</div>
                    </div>
                    ${thread.unread_count > 0 ? `<span class="badge rounded-pill text-bg-danger">${thread.unread_count}</span>` : ''}
                </div>
                <div class="small text-muted mt-2 text-start">${escapeHtml(thread.last_message || 'Chưa có nội dung')}</div>
                <div class="small text-muted mt-1 text-start">${formatDateTime(thread.last_message_at)}</div>
            </button>
        `).join('');

        listEl.querySelectorAll('.support-thread-item').forEach((button) => {
            button.addEventListener('click', async () => {
                selectedUserId = Number(button.dataset.userId);
                await loadConversation({ forceRead: true });
            });
        });
    }

    function renderMessages(messages) {
        const chatBody = document.getElementById('supportChatMessages');
        const titleEl = document.getElementById('supportChatTitle');
        if (!chatBody) return;

        if (titleEl) {
            titleEl.textContent = currentUser?.role === 'admin'
                ? (selectedUserId ? 'Hỗ trợ người dùng' : 'Chat hỗ trợ')
                : 'Hỗ trợ trực tuyến';
        }

        if (!messages.length) {
            chatBody.innerHTML = '<div class="support-chat-empty">Chưa có tin nhắn nào. Hãy gửi câu hỏi để được hỗ trợ.</div>';
            return;
        }

        chatBody.innerHTML = messages.map((message) => `
            <div class="support-message ${message.is_mine ? 'mine' : 'theirs'} ${message.optimistic ? 'optimistic' : ''}">
                <div class="support-message-meta">
                    <span>${escapeHtml(message.sender_name || (message.sender_role === 'admin' ? 'Quản trị viên' : 'Người dùng'))}</span>
                    <span>${formatDateTime(message.created_at)}</span>
                    ${message.optimistic ? '<span>Đang gửi...</span>' : ''}
                </div>
                <div class="support-message-bubble">${nl2br(escapeHtml(message.message || ''))}</div>
            </div>
        `).join('');
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    async function markRead() {
        if (!currentUser) return;
        if (currentUser.role === 'admin' && !selectedUserId) return;
        try {
            await API.put('api/chat/read.php', currentUser.role === 'admin' ? { user_id: selectedUserId } : {});
            refreshBadge();
        } catch {}
    }

    function updateBadge(count) {
        document.querySelectorAll('.support-chat-count').forEach((badge) => {
            badge.textContent = count > 9 ? '9+' : String(count);
            badge.classList.toggle('d-none', !count);
        });
    }

    function toggleComposer(disabled, forceDisable = false) {
        const input = document.getElementById('supportChatInput');
        const button = document.getElementById('supportChatSendBtn');
        const shouldDisable = disabled || forceDisable;
        if (input) {
            input.disabled = shouldDisable;
            input.placeholder = forceDisable
                ? 'Hãy chọn một cuộc trò chuyện để trả lời'
                : 'Nhập nội dung cần hỗ trợ...';
        }
        if (button) button.disabled = shouldDisable;
    }

    function setSendingState(isSending) {
        const input = document.getElementById('supportChatInput');
        const button = document.getElementById('supportChatSendBtn');
        if (input) input.disabled = isSending;
        if (button) {
            button.disabled = isSending;
            button.textContent = isSending ? 'Đang gửi...' : 'Gửi tin nhắn';
        }
    }

    function appendOptimisticMessage(message) {
        optimisticSeed += 1;
        const optimisticId = `optimistic-${optimisticSeed}`;
        currentMessages = [
            ...currentMessages,
            {
                id: optimisticId,
                user_id: selectedUserId || currentUser?.id || 0,
                sender_id: currentUser?.id || 0,
                sender_role: currentUser?.role || 'user',
                sender_name: currentUser?.full_name || 'Bạn',
                message,
                created_at: new Date().toISOString(),
                is_mine: true,
                optimistic: true,
            }
        ];
        renderMessages(currentMessages);
        return optimisticId;
    }

    function removeOptimisticMessage(optimisticId) {
        currentMessages = currentMessages.filter((message) => String(message.id) !== String(optimisticId));
    }

    function rollbackOptimisticMessage(optimisticId, message) {
        currentMessages = currentMessages.filter((item) => String(item.id) !== String(optimisticId));
        renderMessages(currentMessages);

        const input = document.getElementById('supportChatInput');
        if (input && !input.value.trim()) {
            input.value = message;
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function nl2br(value) {
        return value.replace(/\n/g, '<br>');
    }

    return { init, setUser, open, refreshBadge };
})();
