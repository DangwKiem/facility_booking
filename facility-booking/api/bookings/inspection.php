<?php
/**
 * Admin booking inspection after check-out.
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') methodNotAllowed();

verifyCsrfToken();
$auth = requireAdmin();
$input = getJsonInput();

$bookingId = sanitizeInt($input['booking_id'] ?? 0);
$inspectionStatus = sanitizeString($input['inspection_status'] ?? '');
$inspectionNote = trim((string) ($input['inspection_note'] ?? ''));

if (!$bookingId) error('ID lịch đặt không hợp lệ');
if (!in_array($inspectionStatus, ['ok', 'damaged'], true)) {
    error('Trạng thái kiểm tra không hợp lệ');
}
if ($inspectionStatus === 'damaged' && $inspectionNote === '') {
    error('Vui lòng nhập mô tả hư hỏng hoặc vi phạm');
}

$db = getDB();
syncBookingAutomation($db);

$stmt = $db->prepare("
    SELECT b.id, b.user_id, b.status, b.checked_out_at, b.inspection_status, f.name AS facility_name
    FROM bookings b
    JOIN facilities f ON f.id = b.facility_id
    WHERE b.id = ?
    LIMIT 1
");
$stmt->execute([$bookingId]);
$booking = $stmt->fetch();

if (!$booking) notFound('Không tìm thấy lịch đặt');
if ($booking['status'] !== 'approved') {
    error('Chỉ lịch đã duyệt mới được kiểm tra sau sử dụng');
}
if (empty($booking['checked_out_at'])) {
    error('Chỉ kiểm tra được sau khi người dùng đã check-out');
}

$update = $db->prepare("
    UPDATE bookings
    SET inspection_status = ?, inspection_note = ?, inspected_at = NOW(), inspected_by = ?
    WHERE id = ?
");
$update->execute([$inspectionStatus, $inspectionNote ?: null, $auth['id'], $bookingId]);

if ($inspectionStatus === 'damaged') {
    $note = 'Quản trị viên ghi nhận hư hỏng/vi phạm sau khi sử dụng ' . $booking['facility_name'] . ': ' . $inspectionNote;
    createViolation($db, (int) $booking['user_id'], (int) $bookingId, 'facility_damage', $note, 'high');
    applyAutomaticBlacklist($db, (int) $booking['user_id']);
}

createNotification(
    $db,
    (int) $booking['user_id'],
    $inspectionStatus === 'ok' ? 'Đã xác nhận tình trạng cơ sở vật chất' : 'Đã ghi nhận hư hỏng sau sử dụng',
    $inspectionStatus === 'ok'
        ? 'Quản trị viên đã xác nhận cơ sở vật chất bình thường sau lịch sử dụng của bạn.'
        : 'Quản trị viên đã ghi nhận hư hỏng/vi phạm sau lịch sử dụng của bạn. Vui lòng xem chi tiết trong thông báo vi phạm.',
    $inspectionStatus === 'ok' ? 'success' : 'warning',
    ['booking_id' => (int) $bookingId, 'inspection_status' => $inspectionStatus],
    (int) $bookingId
);

success([
    'inspection_status' => $inspectionStatus,
    'inspected_at' => date('Y-m-d H:i:s'),
], $inspectionStatus === 'ok' ? 'Đã xác nhận cơ sở vật chất bình thường' : 'Đã ghi nhận hư hỏng và tạo vi phạm');
