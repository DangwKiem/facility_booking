<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') methodNotAllowed();

$input = getJsonInput();
$errors = validateRequired($input, ['email', 'password']);
if (!empty($errors)) error('Vui lòng nhập đầy đủ thông tin', 400, $errors);

$email = trim((string) ($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');

if (!validateEmail($email)) error('Email không hợp lệ');

$db = getDB();
$stmt = $db->prepare('
    SELECT id, email, password, full_name, phone, role, user_type, status, blacklist_until, blacklist_reason, violation_reset_at
    FROM users
    WHERE email = ?
');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    error('Email hoặc mật khẩu không đúng', 401);
}

$blacklistUntil = !empty($user['blacklist_until']) ? strtotime((string) $user['blacklist_until']) : null;
if ($user['status'] === 'blocked' && $blacklistUntil && $blacklistUntil <= time()) {
    $resetStmt = $db->prepare("
        UPDATE users
        SET status = 'active',
            blacklist_until = NULL,
            blacklist_reason = NULL,
            violation_reset_at = NOW()
        WHERE id = ?
    ");
    $resetStmt->execute([(int) $user['id']]);

    $user['status'] = 'active';
    $user['blacklist_until'] = null;
    $user['blacklist_reason'] = null;
    $user['violation_reset_at'] = date('Y-m-d H:i:s');
}

if ($user['status'] === 'blocked') {
    error('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.', 403);
}

if (isUserBlacklisted($user)) {
    $until = date('d/m/Y H:i', strtotime((string) $user['blacklist_until']));
    $reason = !empty($user['blacklist_reason']) ? ' Lý do: ' . $user['blacklist_reason'] : '';
    error("Tài khoản đang bị hạn chế đặt lịch đến {$until}.{$reason}", 403);
}

unset($user['password'], $user['violation_reset_at']);
setAuthSession($user);
$user['csrf_token'] = refreshCsrfToken();

success($user, 'Đăng nhập thành công');
