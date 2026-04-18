<?php
/**
 * List bookings (user's own or all for admin).
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

$auth = requireAuth();
$db = getDB();
syncBookingAutomation($db);
$pagination = getPagination();

$isMine = getQueryParam('mine') === '1';
$where = '1=1';
$params = [];

if ($isMine || $auth['role'] !== 'admin') {
    $where .= " AND b.user_id = ?";
    $params[] = $auth['id'];
}

$status = getQueryParam('status');
if ($status) {
    $where .= " AND b.status = ?";
    $params[] = $status;
}

$facilityId = getQueryParam('facility_id');
if ($facilityId) {
    $where .= " AND b.facility_id = ?";
    $params[] = (int)$facilityId;
}

$approvedDate = getQueryParam('approved_date');
if ($approvedDate) {
    $where .= " AND DATE(b.approved_at) = ?";
    $params[] = $approvedDate;
}

$countStmt = $db->prepare("SELECT COUNT(*) FROM bookings b WHERE $where");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

$sql = "
    SELECT b.*, f.name AS facility_name, f.type AS facility_type,
           u.full_name AS user_name, u.email AS user_email,
           EXISTS(
                SELECT 1
                FROM reviews r
                WHERE r.booking_id = b.id
                  AND r.user_id = b.user_id
           ) AS has_review
    FROM bookings b
    JOIN facilities f ON b.facility_id = f.id
    JOIN users u ON b.user_id = u.id
    WHERE $where
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
";

$stmt = $db->prepare($sql);
$stmt->execute(array_merge($params, [$pagination['limit'], $pagination['offset']]));
$items = $stmt->fetchAll();

foreach ($items as &$item) {
    $item['has_review'] = (bool)$item['has_review'];
    $startTs = strtotime((string) $item['start_time']);
    $endTs = strtotime((string) $item['end_time']);
    $nowTs = time();
    $checkoutAvailableAt = $startTs + (int) floor(max(0, $endTs - $startTs) * 0.75);

    $item['qr_checkin_url'] = ($item['status'] === 'approved' && empty($item['checked_in_at']) && $nowTs >= $startTs)
        ? getQrPayloadUrl((int) $item['id'], 'checkin')
        : null;
    $item['qr_checkout_url'] = ($item['status'] === 'approved' && !empty($item['checked_in_at']) && empty($item['checked_out_at']) && $nowTs >= $checkoutAvailableAt)
        ? getQrPayloadUrl((int) $item['id'], 'checkout')
        : null;
}
unset($item);

paginatedResponse($items, $total, $pagination['page'], $pagination['limit']);
