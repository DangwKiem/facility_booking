<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

$auth = requireAuth();
$db = getDB();

$stmt = $db->prepare('
    SELECT id, email, full_name, phone, role, user_type, student_id, department, avatar, status,
           blacklist_until, blacklist_reason, created_at
    FROM users
    WHERE id = ?
');
$stmt->execute([$auth['id']]);
$user = $stmt->fetch();

if (!$user) unauthorized();

if (!empty($user['blacklist_until']) && strtotime((string) $user['blacklist_until']) > time()) {
    $user['status'] = 'blocked';
}

success($user);
