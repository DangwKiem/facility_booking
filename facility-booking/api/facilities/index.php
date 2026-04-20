<?php
/**
 * Facilities listing with search, filter, pagination (PUBLIC).
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

$db = getDB();
$pagination = getPagination();

$where = '1=1';
$params = [];

$search = getQueryParam('search');
if ($search) {
    $where .= " AND (f.name LIKE ? OR f.description LIKE ?)";
    $term = "%{$search}%";
    $params[] = $term;
    $params[] = $term;
}

$type = getQueryParam('type');
if ($type) {
    $where .= " AND f.type = ?";
    $params[] = $type;
}

$campus = getQueryParam('campus');
if ($campus) {
    $where .= " AND f.campus = ?";
    $params[] = $campus;
}

$status = getQueryParam('status');
if ($status) {
    $where .= " AND f.status = ?";
    $params[] = $status;
}

$capacity = getQueryParam('capacity');
if ($capacity) {
    $where .= " AND f.capacity >= ?";
    $params[] = (int)$capacity;
}

$sort = getQueryParam('sort', 'latest');
$orderBy = 'f.created_at DESC';
if ($sort === 'featured') {
    $orderBy = 'booking_request_count DESC, avg_rating DESC, review_count DESC, f.created_at DESC';
}

// Count
$countStmt = $db->prepare("SELECT COUNT(*) FROM facilities f WHERE $where");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

// Query with rating + primary image
$sql = "
    SELECT f.*,
        (SELECT fi.image_path FROM facility_images fi WHERE fi.facility_id = f.id AND fi.is_primary = 1 LIMIT 1) AS primary_image,
        (SELECT COUNT(*) FROM bookings b WHERE b.facility_id = f.id) AS booking_request_count,
        COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.facility_id = f.id), 0) AS avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.facility_id = f.id) AS review_count
    FROM facilities f
    WHERE $where
    ORDER BY $orderBy
    LIMIT ? OFFSET ?
";

$allParams = array_merge($params, [$pagination['limit'], $pagination['offset']]);
$stmt = $db->prepare($sql);
$stmt->execute($allParams);
$items = $stmt->fetchAll();

paginatedResponse($items, $total, $pagination['page'], $pagination['limit']);
