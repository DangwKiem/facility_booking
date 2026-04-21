<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

$auth = requireAuth();
$db = getDB();
syncBookingAutomation($db);

$limit = (int) getQueryParam('limit', 0);

$sql = "
    SELECT id, related_booking_id, type, channel, title, message, meta_json, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
";

if ($limit > 0) {
    $limit = min(200, max(1, $limit));
    $sql .= " LIMIT ?";
    $stmt = $db->prepare($sql);
    $stmt->execute([$auth['id'], $limit]);
} else {
    $stmt = $db->prepare($sql);
    $stmt->execute([$auth['id']]);
}

$items = $stmt->fetchAll();

foreach ($items as &$item) {
    $item['is_read'] = (bool)$item['is_read'];
    $item['meta'] = !empty($item['meta_json']) ? json_decode((string)$item['meta_json'], true) : null;
    unset($item['meta_json']);
}
unset($item);

$unreadStmt = $db->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
$unreadStmt->execute([$auth['id']]);
$unread = (int)$unreadStmt->fetchColumn();

success([
    'items' => $items,
    'unread' => $unread,
]);
