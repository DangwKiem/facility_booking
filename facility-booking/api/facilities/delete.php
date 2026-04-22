<?php
/**
 * Delete facility (admin only).
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') methodNotAllowed();

verifyCsrfToken();
$admin = requireAdmin();

$id = sanitizeInt(getQueryParam('id', 0));
if (!$id) error('ID không hợp lệ');

$db = getDB();

$nameStmt = $db->prepare('SELECT name FROM facilities WHERE id = ? LIMIT 1');
$nameStmt->execute([$id]);
$facilityName = (string) ($nameStmt->fetchColumn() ?: ('Cơ sở #' . $id));

$stmt = $db->prepare('SELECT image_path FROM facility_images WHERE facility_id = ?');
$stmt->execute([$id]);
while ($img = $stmt->fetch()) {
    $path = FACILITY_IMG_PATH . '/' . $img['image_path'];
    if (file_exists($path)) unlink($path);
}

$stmt = $db->prepare('DELETE FROM facilities WHERE id = ?');
$stmt->execute([$id]);

if ($stmt->rowCount() === 0) notFound();

logAdminActivity(
    $db,
    $admin,
    'delete_facility',
    'facility',
    $id,
    'Xóa cơ sở vật chất',
    'Đã xóa cơ sở vật chất ' . $facilityName . '.'
);

success(null, 'Xóa thành công');
