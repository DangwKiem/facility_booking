<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

$auth = requireAuth();
$db = getDB();
syncBookingAutomation($db);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $selectedUserId = $auth['role'] === 'admin'
        ? max(0, (int) getQueryParam('user_id', 0))
        : (int) $auth['id'];

    $threads = [];
    if ($auth['role'] === 'admin') {
        $threadStmt = $db->query("
            SELECT
                u.id AS user_id,
                u.full_name,
                u.email,
                u.status,
                MAX(sm.created_at) AS last_message_at,
                (
                    SELECT sm2.message
                    FROM support_messages sm2
                    WHERE sm2.user_id = u.id
                    ORDER BY sm2.created_at DESC, sm2.id DESC
                    LIMIT 1
                ) AS last_message,
                SUM(CASE WHEN sm.sender_role = 'user' AND sm.read_by_admin = 0 THEN 1 ELSE 0 END) AS unread_count
            FROM users u
            JOIN support_messages sm ON sm.user_id = u.id
            WHERE u.role != 'admin'
            GROUP BY u.id, u.full_name, u.email, u.status
            ORDER BY last_message_at DESC, user_id DESC
        ");
        $threads = $threadStmt->fetchAll();
        foreach ($threads as &$thread) {
            $thread['user_id'] = (int) $thread['user_id'];
            $thread['unread_count'] = (int) $thread['unread_count'];
        }
        unset($thread);

        if ($selectedUserId < 1 && !empty($threads)) {
            $selectedUserId = (int) $threads[0]['user_id'];
        }
    }

    $messages = [];
    if ($selectedUserId > 0) {
        if ($auth['role'] === 'admin') {
            $userStmt = $db->prepare("SELECT id FROM users WHERE id = ? AND role != 'admin' LIMIT 1");
            $userStmt->execute([$selectedUserId]);
            if (!$userStmt->fetch()) {
                notFound('Không tìm thấy cuộc trò chuyện');
            }
        }

        $messageStmt = $db->prepare("
            SELECT sm.id, sm.user_id, sm.sender_id, sm.sender_role, sm.message, sm.read_by_user, sm.read_by_admin,
                   sm.created_at, u.full_name AS sender_name
            FROM support_messages sm
            JOIN users u ON u.id = sm.sender_id
            WHERE sm.user_id = ?
            ORDER BY sm.created_at ASC, sm.id ASC
            LIMIT 200
        ");
        $messageStmt->execute([$selectedUserId]);
        $messages = $messageStmt->fetchAll();
        foreach ($messages as &$message) {
            $message['id'] = (int) $message['id'];
            $message['user_id'] = (int) $message['user_id'];
            $message['sender_id'] = (int) $message['sender_id'];
            $message['read_by_user'] = (bool) $message['read_by_user'];
            $message['read_by_admin'] = (bool) $message['read_by_admin'];
            $message['is_mine'] = (int) $message['sender_id'] === (int) $auth['id'];
        }
        unset($message);
    }

    $unreadCountStmt = $auth['role'] === 'admin'
        ? $db->query("SELECT COUNT(*) FROM support_messages WHERE sender_role = 'user' AND read_by_admin = 0")
        : $db->prepare("SELECT COUNT(*) FROM support_messages WHERE user_id = ? AND sender_role = 'admin' AND read_by_user = 0");

    if ($auth['role'] !== 'admin') {
        $unreadCountStmt->execute([(int) $auth['id']]);
    }
    $unreadCount = (int) $unreadCountStmt->fetchColumn();

    success([
        'role' => $auth['role'],
        'selected_user_id' => $selectedUserId ?: null,
        'threads' => $threads,
        'messages' => $messages,
        'unread_count' => $unreadCount,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrfToken();
    $input = getJsonInput();
    $message = trim((string) ($input['message'] ?? ''));
    if ($message === '') {
        error('Vui lòng nhập nội dung tin nhắn');
    }
    if (mb_strlen($message) > 2000) {
        error('Tin nhắn không được vượt quá 2000 ký tự');
    }

    $threadUserId = $auth['role'] === 'admin'
        ? max(0, (int) ($input['user_id'] ?? 0))
        : (int) $auth['id'];

    if ($threadUserId < 1) {
        error('Thiếu người nhận cuộc trò chuyện');
    }

    if ($auth['role'] === 'admin') {
        $userStmt = $db->prepare("SELECT id, full_name FROM users WHERE id = ? AND role != 'admin' LIMIT 1");
        $userStmt->execute([$threadUserId]);
        $targetUser = $userStmt->fetch();
        if (!$targetUser) {
            notFound('Không tìm thấy người dùng để hỗ trợ');
        }
    } else {
        $targetUser = ['id' => $auth['id'], 'full_name' => $auth['full_name']];
    }

    $stmt = $db->prepare("
        INSERT INTO support_messages (user_id, sender_id, sender_role, message, read_by_user, read_by_admin)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $senderRole = $auth['role'] === 'admin' ? 'admin' : 'user';
    $stmt->execute([
        $threadUserId,
        (int) $auth['id'],
        $senderRole,
        $message,
        $senderRole === 'user' ? 1 : 0,
        $senderRole === 'admin' ? 1 : 0,
    ]);

    if ($senderRole === 'user') {
        notifyAdmins(
            $db,
            'Tin nhắn hỗ trợ mới',
            $auth['full_name'] . ' vừa gửi một tin nhắn hỗ trợ mới.',
            'info',
            ['notification_key' => 'support_chat', 'user_id' => (int) $auth['id']]
        );
    } else {
        createNotification(
            $db,
            $threadUserId,
            'Phản hồi từ quản trị viên',
            'Bạn có tin nhắn hỗ trợ mới từ quản trị viên.',
            'info',
            ['notification_key' => 'support_chat', 'user_id' => $threadUserId]
        );
    }

    created(['id' => (int) $db->lastInsertId()], 'Gửi tin nhắn thành công');
}

methodNotAllowed();
