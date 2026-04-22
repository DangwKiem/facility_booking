<?php
/**
 * Create facility (admin only).
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') methodNotAllowed();

verifyCsrfToken();
$admin = requireAdmin();

$name = sanitizeString($_POST['name'] ?? '');
$type = $_POST['type'] ?? 'room';
$capacity = sanitizeInt($_POST['capacity'] ?? 0);
$campus = sanitizeString($_POST['campus'] ?? '');
$building = sanitizeString($_POST['building'] ?? '');
$floor = sanitizeString($_POST['floor'] ?? '');
$description = $_POST['description'] ?? '';
$rules = $_POST['rules'] ?? '';
$status = $_POST['status'] ?? 'active';
$equipmentJson = $_POST['equipment_json'] ?? '[]';

if (!$name) error('Tên cơ sở là bắt buộc');
if (!validateIn($type, ['room', 'lab', 'sports_field', 'pool', 'auditorium', 'other'])) error('Loại không hợp lệ');
if (!validateIn($status, ['active', 'maintenance', 'closed'])) error('Trạng thái không hợp lệ');

$equipmentItems = json_decode($equipmentJson, true);
if (!is_array($equipmentItems)) {
    error('Danh sách thiết bị không hợp lệ');
}

$db = getDB();

$stmt = $db->prepare('INSERT INTO facilities (name, type, capacity, campus, building, floor, description, rules, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
$stmt->execute([$name, $type, $capacity, $campus, $building, $floor, $description, $rules, $status]);
$facilityId = (int) $db->lastInsertId();

$equipmentInsert = $db->prepare('INSERT INTO facility_equipment (facility_id, name, quantity, status) VALUES (?, ?, ?, ?)');
foreach ($equipmentItems as $item) {
    $itemName = trim((string) ($item['name'] ?? ''));
    $quantity = max(1, (int) ($item['quantity'] ?? 1));
    $itemStatus = (string) ($item['status'] ?? 'available');
    if ($itemName === '' || !in_array($itemStatus, ['available', 'broken', 'maintenance'], true)) continue;
    $equipmentInsert->execute([$facilityId, $itemName, $quantity, $itemStatus]);
}

if (!empty($_FILES['images'])) {
    $files = $_FILES['images'];
    $count = is_array($files['name']) ? count($files['name']) : 1;

    for ($i = 0; $i < $count; $i++) {
        $file = [
            'name' => is_array($files['name']) ? $files['name'][$i] : $files['name'],
            'tmp_name' => is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'],
            'error' => is_array($files['error']) ? $files['error'][$i] : $files['error'],
            'size' => is_array($files['size']) ? $files['size'][$i] : $files['size'],
        ];

        if ($file['error'] !== UPLOAD_ERR_OK) continue;

        $result = handleUpload($file, FACILITY_IMG_PATH, MAX_FACILITY_IMG_SIZE, ALLOWED_IMAGE_TYPES);
        if (isset($result['error'])) continue;

        $isPrimary = ($i === 0) ? 1 : 0;
        $stmt = $db->prepare('INSERT INTO facility_images (facility_id, image_path, is_primary) VALUES (?, ?, ?)');
        $stmt->execute([$facilityId, $result['filename'], $isPrimary]);
    }
}

logAdminActivity(
    $db,
    $admin,
    'create_facility',
    'facility',
    $facilityId,
    'Thêm cơ sở vật chất',
    'Đã thêm cơ sở vật chất ' . $name . '.',
    ['type' => $type, 'status' => $status]
);

created(['id' => $facilityId], 'Thêm cơ sở vật chất thành công');
