<?php
/**
 * Cancel pending booking (own only).
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') methodNotAllowed();

verifyCsrfToken();
$auth = requireAuth();
$input = getJsonInput();

$id = sanitizeInt($input['id'] ?? 0);
if (!$id) error('ID không hợp lệ');

$db = getDB();
syncBookingAutomation($db);

$stmt = $db->prepare("
    SELECT id, user_id, facility_id, start_time, status
    FROM bookings
    WHERE id = ? AND user_id = ?
    LIMIT 1
");
$stmt->execute([$id, $auth['id']]);
$booking = $stmt->fetch();

if (!$booking || $booking['status'] !== 'pending') {
    error('Chỉ yêu cầu đang chờ duyệt mới có thể hủy');
}

$update = $db->prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ? AND user_id = ?");
$update->execute([$id, $auth['id']]);

createNotification(
    $db,
    (int) $auth['id'],
    'Đã hủy yêu cầu đặt lịch',
    'Yêu cầu đặt lịch của bạn đã được hủy thành công.',
    'info',
    ['booking_id' => (int) $booking['id']],
    (int) $booking['id']
);

success(null, 'Đã hủy yêu cầu');
