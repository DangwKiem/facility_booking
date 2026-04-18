<?php
/**
 * Approve booking (admin only).
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') methodNotAllowed();

verifyCsrfToken();
$admin = requireAdmin();
$input = getJsonInput();

$id = sanitizeInt($input['id'] ?? 0);
if (!$id) error('ID không hợp lệ');

$db = getDB();
syncBookingAutomation($db);

$stmt = $db->prepare("
    SELECT b.id, b.user_id, b.start_time, f.name AS facility_name
    FROM bookings b
    JOIN facilities f ON f.id = b.facility_id
    WHERE b.id = ? AND b.status = 'pending'
    LIMIT 1
");
$stmt->execute([$id]);
$booking = $stmt->fetch();

if (!$booking) {
    error('Yêu cầu không tồn tại hoặc đã được xử lý');
}

if (strtotime((string) $booking['start_time']) <= time()) {
    error('Yêu cầu này đã quá giờ bắt đầu và không thể duyệt.');
}

$update = $db->prepare("
    UPDATE bookings
    SET status = 'approved', approved_by = ?, approved_at = NOW()
    WHERE id = ? AND status = 'pending' AND start_time > NOW()
");
$update->execute([$admin['id'], $id]);

if ($update->rowCount() !== 1) {
    error('Yêu cầu không còn ở trạng thái chờ duyệt hoặc đã quá giờ bắt đầu.');
}

createNotification(
    $db,
    (int) $booking['user_id'],
    'Yêu cầu đặt lịch đã được duyệt',
    "Yêu cầu mượn {$booking['facility_name']} của bạn đã được phê duyệt.",
    'success',
    ['booking_id' => (int) $booking['id']],
    (int) $booking['id']
);

success(null, 'Đã duyệt yêu cầu');
