<?php
/**
 * Delete facility (admin only).
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') methodNotAllowed();

verifyCsrfToken();
requireAdmin();

$id = sanitizeInt(getQueryParam('id', 0));
if (!$id) error('ID không hợp lệ');

$db = getDB();

// Delete images from disk
$stmt = $db->prepare('SELECT image_path FROM facility_images WHERE facility_id = ?');
$stmt->execute([$id]);
while ($img = $stmt->fetch()) {
    $path = FACILITY_IMG_PATH . '/' . $img['image_path'];
    if (file_exists($path)) unlink($path);
}

// CASCADE deletes images & equipment
$stmt = $db->prepare('DELETE FROM facilities WHERE id = ?');
$stmt->execute([$id]);

if ($stmt->rowCount() === 0) notFound();

success(null, 'Xóa thành công');
