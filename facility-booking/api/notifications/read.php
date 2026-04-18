<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') methodNotAllowed();

verifyCsrfToken();
$auth = requireAuth();
$db = getDB();
$input = getJsonInput();

$id = sanitizeInt($input['id'] ?? 0);
if ($id) {
    $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $auth['id']]);
} else {
    $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0");
    $stmt->execute([$auth['id']]);
}

$db->prepare("UPDATE users SET last_notification_read_at = NOW() WHERE id = ?")->execute([$auth['id']]);

success(null, 'Đã cập nhật trạng thái thông báo');
