<?php
/**
 * Create review for a completed booking.
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') methodNotAllowed();

verifyCsrfToken();
$auth = requireAuth();
$input = getJsonInput();

$bookingId = sanitizeInt($input['booking_id'] ?? 0);
$rating = sanitizeInt($input['rating'] ?? 0);
$comment = trim((string)($input['comment'] ?? ''));

if (!$bookingId) error('Booking ID không hợp lệ');
if ($rating < 1 || $rating > 5) error('Đánh giá phải từ 1-5 sao');

$db = getDB();
$stmt = $db->prepare("
    SELECT facility_id
    FROM bookings
    WHERE id = ? AND user_id = ? AND status = 'approved' AND end_time <= NOW()
");
$stmt->execute([$bookingId, $auth['id']]);
$booking = $stmt->fetch();

if (!$booking) error('Chỉ có thể đánh giá khi lịch đã kết thúc');

$stmt = $db->prepare('SELECT id FROM reviews WHERE user_id = ? AND booking_id = ?');
$stmt->execute([$auth['id'], $bookingId]);
if ($stmt->fetch()) error('Bạn đã đánh giá booking này rồi');

$stmt = $db->prepare('INSERT INTO reviews (user_id, facility_id, booking_id, rating, comment) VALUES (?, ?, ?, ?, ?)');
$stmt->execute([$auth['id'], $booking['facility_id'], $bookingId, $rating, $comment]);

createNotification(
    $db,
    $auth['id'],
    'Cảm ơn bạn đã đánh giá',
    'Đánh giá cơ sở vật chất của bạn đã được ghi nhận.',
    'success',
    ['booking_id' => $bookingId]
);

created(null, 'Đánh giá thành công');
