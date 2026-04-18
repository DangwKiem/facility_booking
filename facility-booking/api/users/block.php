<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') methodNotAllowed();

verifyCsrfToken();
requireAdmin();

$input = getJsonInput();
$id = sanitizeInt($input['id'] ?? 0);
$action = $input['action'] ?? '';

if (!$id) error('ID không hợp lệ');
if (!in_array($action, ['block', 'unblock'], true)) error('Hành động không hợp lệ');

$db = getDB();

if ($action === 'block') {
    $userStmt = $db->prepare("SELECT full_name, email FROM users WHERE id = ? AND role != 'admin' LIMIT 1");
    $userStmt->execute([$id]);
    $targetUser = $userStmt->fetch();

    $stmt = $db->prepare("
        UPDATE users
        SET status = 'blocked', blacklist_until = DATE_ADD(NOW(), INTERVAL 30 DAY),
            blacklist_reason = 'Bị khóa thủ công bởi quản trị viên'
        WHERE id = ? AND role != 'admin'
    ");
    $stmt->execute([$id]);

    createNotification(
        $db,
        $id,
        'Tài khoản bị khóa',
        'Quản trị viên đã khóa tài khoản của bạn và tạm ngừng quyền đặt lịch.',
        'error'
    );

    if ($targetUser) {
        notifyAdmins(
            $db,
            'Người dùng bị block',
            ($targetUser['full_name'] ?: ('User #' . $id)) . ' đã bị quản trị viên khóa tài khoản.',
            'error',
            [
                'user_id' => $id,
                'email' => $targetUser['email'] ?? null,
                'action' => 'manual_block',
            ]
        );
    }

    success(null, 'Đã khóa tài khoản');
}

$stmt = $db->prepare("
    UPDATE users
    SET status = 'active', blacklist_until = NULL, blacklist_reason = NULL, violation_reset_at = NOW()
    WHERE id = ? AND role != 'admin'
");
$stmt->execute([$id]);

createNotification(
    $db,
    $id,
    'Tài khoản được mở khóa',
    'Quyền đặt lịch của bạn đã được khôi phục.',
    'success'
);

success(null, 'Đã mở khóa tài khoản');
