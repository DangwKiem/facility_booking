<?php
/**
 * Serve booking attachment for admin or booking owner.
 */
require_once __DIR__ . '/../../includes/helpers.php';

require_once __DIR__ . '/../../config/constants.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/response.php';
require_once __DIR__ . '/../../includes/auth_middleware.php';

startSecureSession();
$auth = requireAuth();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    methodNotAllowed();
}

$attachmentId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($attachmentId <= 0) {
    error('ID file không hợp lệ');
}

$db = getDB();
$stmt = $db->prepare("
    SELECT ba.id, ba.file_name, ba.file_path,
           b.id AS booking_id, b.user_id
    FROM booking_attachments ba
    JOIN bookings b ON b.id = ba.booking_id
    WHERE ba.id = ?
    LIMIT 1
");
$stmt->execute([$attachmentId]);
$attachment = $stmt->fetch();

if (!$attachment) {
    notFound('Không tìm thấy file đính kèm');
}

if ($auth['role'] !== 'admin' && (int) $attachment['user_id'] !== (int) $auth['id']) {
    forbidden('Bạn không có quyền xem file này');
}

$filePath = ATTACHMENT_PATH . DIRECTORY_SEPARATOR . $attachment['file_path'];
if (!is_file($filePath)) {
    notFound('File đính kèm không còn tồn tại');
}

$mimeType = mime_content_type($filePath) ?: 'application/octet-stream';
$disposition = (strpos($mimeType, 'image/') === 0 || $mimeType === 'application/pdf') ? 'inline' : 'attachment';

header('Content-Type: ' . $mimeType);
header('Content-Length: ' . filesize($filePath));
header("Content-Disposition: {$disposition}; filename=\"" . rawurlencode($attachment['file_name']) . "\"");
header('X-Content-Type-Options: nosniff');
readfile($filePath);
exit;
