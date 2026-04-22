<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

requireAdmin();
$db = getDB();
$pagination = getPagination();

$where = '1=1';
$params = [];

$action = trim((string) ($_GET['action'] ?? ''));
if ($action !== '') {
    $where .= ' AND action = ?';
    $params[] = $action;
}

$targetType = trim((string) ($_GET['target_type'] ?? ''));
if ($targetType !== '') {
    $where .= ' AND target_type = ?';
    $params[] = $targetType;
}

$search = trim((string) ($_GET['search'] ?? ''));
if ($search !== '') {
    $where .= ' AND (admin_name LIKE ? OR title LIKE ? OR description LIKE ?)';
    $term = '%' . $search . '%';
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
}

try {
    if (!tableExists($db, 'admin_activity_logs')) {
        paginatedResponse([], 0, $pagination['page'], $pagination['limit']);
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM admin_activity_logs WHERE $where");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $limit = (int) $pagination['limit'];
    $offset = (int) $pagination['offset'];
    $stmt = $db->prepare("
        SELECT id, admin_id, admin_name, action, target_type, target_id, title, description, meta_json, created_at
        FROM admin_activity_logs
        WHERE $where
        ORDER BY created_at DESC, id DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($params);
    $items = $stmt->fetchAll();

    foreach ($items as &$item) {
        $item['meta'] = !empty($item['meta_json'])
            ? json_decode((string) $item['meta_json'], true)
            : null;
        unset($item['meta_json']);
    }
    unset($item);

    paginatedResponse($items, $total, $pagination['page'], $pagination['limit']);
} catch (Throwable $e) {
    error('Không thể tải nhật ký hoạt động', 500);
}
