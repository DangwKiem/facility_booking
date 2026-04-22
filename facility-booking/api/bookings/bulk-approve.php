<?php
/**
 * Bulk approve bookings (admin only).
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') methodNotAllowed();

verifyCsrfToken();
$admin = requireAdmin();
$input = getJsonInput();

$ids = $input['ids'] ?? [];
if (!is_array($ids) || empty($ids)) error('Không có yêu cầu nào được chọn');

$db = getDB();
syncBookingAutomation($db);

$ids = array_values(array_filter(array_map('intval', $ids)));
if (empty($ids)) error('Không có yêu cầu nào hợp lệ');

$placeholders = implode(',', array_fill(0, count($ids), '?'));
$stmt = $db->prepare("
    UPDATE bookings
    SET status = 'approved', approved_by = ?, approved_at = NOW()
    WHERE id IN ($placeholders)
      AND status = 'pending'
      AND start_time > NOW()
");
$params = array_merge([$admin['id']], $ids);
$stmt->execute($params);

logAdminActivity(
    $db,
    $admin,
    'bulk_approve_bookings',
    'booking',
    null,
    'Duyệt hàng loạt yêu cầu đặt lịch',
    'Đã thực hiện duyệt hàng loạt ' . $stmt->rowCount() . ' yêu cầu đặt lịch.',
    ['ids' => $ids, 'approved_count' => $stmt->rowCount()]
);

$count = $stmt->rowCount();
success(['approved_count' => $count], "Đã duyệt $count yêu cầu");
