<?php
/**
 * QR check-in / check-out endpoint.
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

$db = getDB();
syncBookingAutomation($db);

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    methodNotAllowed();
}

$input = $_SERVER['REQUEST_METHOD'] === 'PUT' ? getJsonInput() : [];
$bookingId = sanitizeInt(getQueryParam('booking_id', 0) ?: ($input['booking_id'] ?? 0));
$action = getQueryParam('action', '') ?: ($input['action'] ?? '');
$expires = (int) (getQueryParam('expires', 0) ?: ($input['expires'] ?? 0));
$token = getQueryParam('token', '') ?: ($input['token'] ?? '');

if (!$bookingId || !in_array($action, ['checkin', 'checkout'], true) || !$expires || !$token) {
    error('Thông tin QR không hợp lệ');
}

if (!verifyQrToken($bookingId, $action, $expires, $token)) {
    error('QR không hợp lệ hoặc đã hết hạn', 403);
}

$auth = requireAuth();

$stmt = $db->prepare("
    SELECT b.id, b.user_id, b.start_time, b.end_time, b.status, b.checked_in_at, b.checked_out_at,
           f.name AS facility_name
    FROM bookings b
    JOIN facilities f ON f.id = b.facility_id
    WHERE b.id = ?
    LIMIT 1
");
$stmt->execute([$bookingId]);
$booking = $stmt->fetch();
if (!$booking) notFound('Không tìm thấy lịch đặt');

if ($auth['role'] !== 'admin' && (int) $booking['user_id'] !== (int) $auth['id']) {
    forbidden('Bạn không có quyền thao tác QR này');
}

if ($booking['status'] !== 'approved') {
    error('Chỉ lịch đã duyệt mới được check-in/check-out');
}

$startTs = strtotime((string) $booking['start_time']);
$endTs = strtotime((string) $booking['end_time']);
$nowTs = time();
$checkoutAvailableAt = $startTs + (int) floor(max(0, $endTs - $startTs) * 0.75);

if ($action === 'checkin') {
    if ($nowTs < $startTs) {
        error('Chỉ có thể check-in từ thời điểm bắt đầu lịch.');
    }

    if (!empty($booking['checked_in_at'])) {
        success(['checked_in_at' => $booking['checked_in_at']], 'Lịch này đã check-in');
    }

    $update = $db->prepare("UPDATE bookings SET checked_in_at = NOW(), checked_in_by = ? WHERE id = ?");
    $update->execute([$auth['id'], $bookingId]);

    createNotification(
        $db,
        (int) $booking['user_id'],
        'Check-in thành công',
        "Bạn đã check-in lịch sử dụng {$booking['facility_name']}.",
        'success',
        ['booking_id' => $bookingId],
        $bookingId
    );

    success(['checked_in_at' => date('Y-m-d H:i:s')], 'Check-in thành công');
}

if (empty($booking['checked_in_at'])) {
    error('Cần check-in trước khi check-out');
}
if (!empty($booking['checked_out_at'])) {
    success(['checked_out_at' => $booking['checked_out_at']], 'Lịch này đã check-out');
}
if ($nowTs < $checkoutAvailableAt) {
    error('Chỉ có thể check-out sau khi đã qua 3/4 thời gian mượn.');
}

$update = $db->prepare("UPDATE bookings SET checked_out_at = NOW(), checked_out_by = ? WHERE id = ?");
$update->execute([$auth['id'], $bookingId]);

createNotification(
    $db,
    (int) $booking['user_id'],
    'Check-out thành công',
    "Bạn đã check-out lịch sử dụng {$booking['facility_name']}.",
    'info',
    ['booking_id' => $bookingId],
    $bookingId
);

notifyAdmins(
    $db,
    'Cần kiểm tra cơ sở vật chất sau check-out',
    'Lịch sử dụng ' . $booking['facility_name'] . ' vừa check-out và đang chờ quản trị viên xác nhận tình trạng cơ sở vật chất.',
    'info',
    ['booking_id' => $bookingId, 'action' => 'inspection_required'],
    $bookingId
);

success(['checked_out_at' => date('Y-m-d H:i:s')], 'Check-out thành công');
