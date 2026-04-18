<?php
/**
 * Calendar events for FullCalendar.
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

$facilityId = sanitizeInt(getQueryParam('facility_id', 0));
$start = getQueryParam('start', '');
$end = getQueryParam('end', '');

$db = getDB();
syncBookingAutomation($db);

$where = "b.status = 'approved'";
$params = [];

if ($facilityId) {
    $where .= " AND b.facility_id = ?";
    $params[] = $facilityId;
}

if ($start) {
    $where .= " AND b.end_time >= ?";
    $params[] = date('Y-m-d H:i:s', strtotime($start));
}

if ($end) {
    $where .= " AND b.start_time <= ?";
    $params[] = date('Y-m-d H:i:s', strtotime($end));
}

$stmt = $db->prepare("
    SELECT b.id, b.title, b.start_time AS start, b.end_time AS end, b.status,
        u.full_name AS user_name, f.name AS facility_name
    FROM bookings b
    JOIN users u ON b.user_id = u.id
    JOIN facilities f ON b.facility_id = f.id
    WHERE $where
    ORDER BY b.start_time
");
$stmt->execute($params);
$events = $stmt->fetchAll();

$calendarEvents = array_map(function ($e) {
    $colorMap = [
        'approved' => '#0d9488',
    ];
    return [
        'id' => $e['id'],
        'title' => $e['title'] . ' - ' . $e['user_name'],
        'start' => $e['start'],
        'end' => $e['end'],
        'backgroundColor' => $colorMap[$e['status']] ?? '#64748b',
        'borderColor' => $colorMap[$e['status']] ?? '#64748b',
        'className' => 'fc-event-' . $e['status'],
        'extendedProps' => [
            'status' => $e['status'],
            'facility_name' => $e['facility_name'],
            'user_name' => $e['user_name'],
        ],
    ];
}, $events);

header('Content-Type: application/json');
echo json_encode($calendarEvents, JSON_UNESCAPED_UNICODE);
