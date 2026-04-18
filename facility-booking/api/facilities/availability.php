<?php
/**
 * Check facility availability / conflicts.
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

$facilityId = sanitizeInt(getQueryParam('facility_id', 0));
$start = getQueryParam('start', '');
$end = getQueryParam('end', '');

if (!$facilityId || !$start || !$end) error('Thiếu thông tin');

// Normalize datetime
$start = date('Y-m-d H:i:s', strtotime($start));
$end = date('Y-m-d H:i:s', strtotime($end));

$db = getDB();

$stmt = $db->prepare("
    SELECT b.id, b.title, b.start_time, b.end_time, b.status, u.full_name AS user_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    WHERE b.facility_id = ?
      AND b.status IN ('pending', 'approved')
      AND b.start_time < ?
      AND b.end_time > ?
    ORDER BY b.start_time
");
$stmt->execute([$facilityId, $end, $start]);
$conflicts = $stmt->fetchAll();

success(['conflicts' => $conflicts, 'available' => empty($conflicts)]);
