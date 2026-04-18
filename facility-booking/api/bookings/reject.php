<?php
/**
 * Reject booking (admin only) or list rejection templates.
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    requireAdmin();
    $stmt = $db->query('SELECT id, title, content FROM rejection_templates ORDER BY id');
    success($stmt->fetchAll());
}

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') methodNotAllowed();

verifyCsrfToken();
$admin = requireAdmin();
$input = getJsonInput();

$id = sanitizeInt($input['id'] ?? 0);
$reason = trim((string)($input['reason'] ?? ''));

if (!$id) error('ID không hợp lệ');
if ($reason === '') error('Vui lòng nhập lý do từ chối');

$stmt = $db->prepare("
    SELECT b.id, b.user_id, f.name AS facility_name
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

$update = $db->prepare("
    UPDATE bookings
    SET status = 'rejected', admin_note = ?, approved_by = ?, approved_at = NOW()
    WHERE id = ? AND status = 'pending'
");
$update->execute([$reason, $admin['id'], $id]);

createNotification(
    $db,
    (int)$booking['user_id'],
    'Yêu cầu đặt lịch bị từ chối',
    "Yêu cầu mượn {$booking['facility_name']} của bạn bị từ chối. Lý do: {$reason}",
    'error',
    ['booking_id' => (int)$booking['id'], 'reason' => $reason],
    (int)$booking['id']
);

success(null, 'Đã từ chối yêu cầu');
