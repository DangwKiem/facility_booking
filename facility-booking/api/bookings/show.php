<?php
/**
 * Booking detail for admin or booking owner.
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

$auth = requireAuth();
$id = sanitizeInt(getQueryParam('id', 0));
if (!$id) error('ID không hợp lệ');

$db = getDB();
syncBookingAutomation($db);

$where = 'b.id = ?';
$params = [$id];

if ($auth['role'] !== 'admin') {
    $where .= ' AND b.user_id = ?';
    $params[] = $auth['id'];
}

$stmt = $db->prepare("
    SELECT b.*, f.name AS facility_name, f.type AS facility_type, f.campus, f.building, f.floor,
           u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone,
           approver.full_name AS approved_by_name,
           inspector.full_name AS inspected_by_name
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.id
    JOIN users u ON b.user_id = u.id
    LEFT JOIN users approver ON b.approved_by = approver.id
    LEFT JOIN users inspector ON b.inspected_by = inspector.id
    WHERE $where
    LIMIT 1
");
$stmt->execute($params);
$booking = $stmt->fetch();

if (!$booking) notFound('Không tìm thấy yêu cầu');

$attachStmt = $db->prepare('SELECT id, file_name, file_path, file_size, created_at FROM booking_attachments WHERE booking_id = ? ORDER BY created_at DESC');
$attachStmt->execute([$id]);
$booking['attachments'] = $attachStmt->fetchAll();

success($booking);
