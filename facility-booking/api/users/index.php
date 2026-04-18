<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

requireAdmin();
$db = getDB();
syncBookingAutomation($db);
$pagination = getPagination();

$where = "WHERE u.role != 'admin'";
$params = [];

$search = getQueryParam('search');
if ($search) {
    $where .= " AND (u.full_name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)";
    $searchTerm = "%{$search}%";
    $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm]);
}

$countStmt = $db->prepare("SELECT COUNT(*) FROM users u $where");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

$stmt = $db->prepare("
    SELECT u.id, u.email, u.full_name, u.phone, u.role, u.user_type, u.student_id, u.department,
           u.avatar, u.status, u.blacklist_until, u.blacklist_reason, u.violation_reset_at, u.created_at,
           (
                SELECT COUNT(*)
                FROM violations v
                WHERE v.user_id = u.id
                  AND v.status = 'active'
           ) AS active_violation_count
    FROM users u
    $where
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
");
$stmt->execute(array_merge($params, [$pagination['limit'], $pagination['offset']]));
$items = $stmt->fetchAll();

foreach ($items as &$item) {
    $item['active_violation_count'] = (int)$item['active_violation_count'];
    if (!empty($item['blacklist_until']) && strtotime((string) $item['blacklist_until']) > time()) {
        $item['status'] = 'blocked';
    }
}
unset($item);

paginatedResponse($items, $total, $pagination['page'], $pagination['limit']);
