<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') methodNotAllowed();

verifyCsrfToken();
$auth = requireAuth();

if (!isset($_FILES['avatar'])) error('Không có file nào được upload');

$result = handleUpload($_FILES['avatar'], AVATAR_PATH, MAX_AVATAR_SIZE, ALLOWED_IMAGE_TYPES);
if (isset($result['error'])) error($result['error']);

$db = getDB();

// Delete old avatar
$stmt = $db->prepare('SELECT avatar FROM users WHERE id = ?');
$stmt->execute([$auth['id']]);
$old = $stmt->fetchColumn();
if ($old && file_exists(AVATAR_PATH . '/' . $old)) {
    unlink(AVATAR_PATH . '/' . $old);
}

$stmt = $db->prepare('UPDATE users SET avatar = ? WHERE id = ?');
$stmt->execute([$result['filename'], $auth['id']]);

success(['avatar' => $result['filename']], 'Cập nhật ảnh đại diện thành công');
