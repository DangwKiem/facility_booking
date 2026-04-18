<?php
/**
 * List reviews for a facility.
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

$facilityId = sanitizeInt(getQueryParam('facility_id', 0));
if (!$facilityId) error('Facility ID không hợp lệ');

$db = getDB();
$pagination = getPagination();

$countStmt = $db->prepare('SELECT COUNT(*) FROM reviews WHERE facility_id = ?');
$countStmt->execute([$facilityId]);
$total = (int)$countStmt->fetchColumn();

$stmt = $db->prepare('
    SELECT r.id, r.rating, r.comment, r.created_at, u.full_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.facility_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
');
$stmt->execute([$facilityId, $pagination['limit'], $pagination['offset']]);

paginatedResponse($stmt->fetchAll(), $total, $pagination['page'], $pagination['limit']);
