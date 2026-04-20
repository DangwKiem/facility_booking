<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    methodNotAllowed();
}

verifyCsrfToken();
$auth = requireAuth();
$db = getDB();
syncBookingAutomation($db);

$input = getJsonInput();
$threadUserId = $auth['role'] === 'admin'
    ? max(0, (int) ($input['user_id'] ?? 0))
    : (int) $auth['id'];

if ($threadUserId < 1) {
    error('Thiếu cuộc trò chuyện cần cập nhật');
}

if ($auth['role'] === 'admin') {
    $stmt = $db->prepare("
        UPDATE support_messages
        SET read_by_admin = 1
        WHERE user_id = ?
          AND sender_role = 'user'
          AND read_by_admin = 0
    ");
} else {
    $stmt = $db->prepare("
        UPDATE support_messages
        SET read_by_user = 1
        WHERE user_id = ?
          AND sender_role = 'admin'
          AND read_by_user = 0
    ");
}

$stmt->execute([$threadUserId]);
success(['updated' => $stmt->rowCount()]);
