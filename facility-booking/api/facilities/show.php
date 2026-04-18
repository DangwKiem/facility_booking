<?php
/**
 * Facility detail (PUBLIC).
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') methodNotAllowed();

$id = sanitizeInt(getQueryParam('id', 0));
if (!$id) error('ID không hợp lệ');

$db = getDB();

$stmt = $db->prepare('
    SELECT f.*,
        COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.facility_id = f.id), 0) AS avg_rating,
        (SELECT COUNT(*) FROM reviews r WHERE r.facility_id = f.id) AS review_count
    FROM facilities f WHERE f.id = ?
');
$stmt->execute([$id]);
$facility = $stmt->fetch();

if (!$facility) notFound('Cơ sở vật chất không tồn tại');

// Images
$stmt = $db->prepare('SELECT id, image_path, is_primary FROM facility_images WHERE facility_id = ? ORDER BY is_primary DESC');
$stmt->execute([$id]);
$facility['images'] = $stmt->fetchAll();

// Equipment
$stmt = $db->prepare('SELECT id, name, quantity, status FROM facility_equipment WHERE facility_id = ?');
$stmt->execute([$id]);
$facility['equipment'] = $stmt->fetchAll();

// Recent reviews
$stmt = $db->prepare('
    SELECT r.rating, r.comment, r.created_at, u.full_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.facility_id = ?
    ORDER BY r.created_at DESC
    LIMIT 10
');
$stmt->execute([$id]);
$facility['reviews'] = $stmt->fetchAll();

success($facility);
