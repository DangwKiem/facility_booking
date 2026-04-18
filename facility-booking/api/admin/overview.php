<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

requireAdmin();
$db = getDB();
syncBookingAutomation($db);

$today = date('Y-m-d');

$stats = [
    'facilities' => (int) $db->query("SELECT COUNT(*) FROM facilities")->fetchColumn(),
    'pending_bookings' => (int) $db->query("SELECT COUNT(*) FROM bookings WHERE status = 'pending'")->fetchColumn(),
    'users' => (int) $db->query("SELECT COUNT(*) FROM users")->fetchColumn(),
];

$approvedTodayStmt = $db->prepare("
    SELECT COUNT(*)
    FROM bookings
    WHERE status = 'approved'
      AND DATE(approved_at) = ?
");
$approvedTodayStmt->execute([$today]);
$stats['approved_today'] = (int) $approvedTodayStmt->fetchColumn();

$pendingPreview = $db->query("
    SELECT b.id, b.status, b.start_time, u.full_name AS user_name, f.name AS facility_name
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    JOIN facilities f ON f.id = b.facility_id
    WHERE b.status = 'pending'
    ORDER BY b.created_at DESC
    LIMIT 5
")->fetchAll();

$statusRows = $db->query("
    SELECT status, COUNT(*) AS total
    FROM bookings
    GROUP BY status
")->fetchAll();

$monthlyRows = $db->query("
    SELECT DATE_FORMAT(start_time, '%Y-%m') AS month_key, COUNT(*) AS total
    FROM bookings
    WHERE start_time >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
    GROUP BY month_key
    ORDER BY month_key ASC
")->fetchAll();

$topFacilities = $db->query("
    SELECT f.name, COUNT(b.id) AS total
    FROM facilities f
    LEFT JOIN bookings b ON b.facility_id = f.id
    GROUP BY f.id, f.name
    ORDER BY total DESC, f.name ASC
    LIMIT 5
")->fetchAll();

$violationSummary = $db->query("
    SELECT type, COUNT(*) AS total
    FROM violations
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    GROUP BY type
    ORDER BY total DESC
")->fetchAll();

$violationTotal = (int) $db->query("
    SELECT COUNT(*)
    FROM violations
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
")->fetchColumn();

$violationDetails = $db->query("
    SELECT u.id AS user_id, u.full_name, u.email, v.type,
           COUNT(v.id) AS total_count,
           MAX(v.created_at) AS last_violation_at
    FROM violations v
    JOIN users u ON u.id = v.user_id
    WHERE v.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      AND v.status = 'active'
    GROUP BY u.id, u.full_name, u.email, v.type
    ORDER BY total_count DESC, last_violation_at DESC, u.full_name ASC
    LIMIT 50
")->fetchAll();

$blacklistedUsers = $db->query("
    SELECT id, full_name, email, blacklist_until
    FROM users
    WHERE blacklist_until IS NOT NULL
      AND blacklist_until > NOW()
    ORDER BY blacklist_until DESC
    LIMIT 5
")->fetchAll();

$utilization = $db->query("
    SELECT f.name,
           ROUND(COALESCE(SUM(TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time)), 0) / 60, 1) AS booked_hours
    FROM facilities f
    LEFT JOIN bookings b
      ON b.facility_id = f.id
     AND b.status = 'approved'
     AND b.start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY f.id, f.name
    ORDER BY booked_hours DESC, f.name ASC
    LIMIT 5
")->fetchAll();

success([
    'stats' => $stats,
    'pending_preview' => $pendingPreview,
    'analytics' => [
        'status_breakdown' => $statusRows,
        'monthly_trend' => $monthlyRows,
        'top_facilities' => $topFacilities,
        'violation_total_90d' => $violationTotal,
        'violation_summary' => $violationSummary,
        'violation_details' => $violationDetails,
        'blacklisted_users' => $blacklistedUsers,
        'utilization' => $utilization,
    ],
]);
