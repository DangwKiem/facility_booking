<?php
/**
 * Create booking.
 */
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') methodNotAllowed();

verifyCsrfToken();
$auth = requireAuth();

$facilityId  = sanitizeInt($_POST['facility_id'] ?? 0);
$title       = sanitizeString($_POST['title'] ?? '');
$startTime   = $_POST['start_time'] ?? '';
$endTime     = $_POST['end_time'] ?? '';
$reason      = $_POST['reason'] ?? '';
$repeatType  = $_POST['repeat_type'] ?? 'none';
$repeatUntil = $_POST['repeat_until'] ?? null;

if (!$facilityId || !$title || !$startTime || !$endTime || !$reason) {
    error('Vui lòng nhập đầy đủ thông tin');
}

$startTime = date('Y-m-d H:i:s', strtotime($startTime));
$endTime = date('Y-m-d H:i:s', strtotime($endTime));

if (strtotime($startTime) < time()) {
    error('Chỉ được đặt lịch từ thời điểm hiện tại trở đi');
}

if (strtotime($endTime) <= strtotime($startTime)) {
    error('Thời gian kết thúc phải sau thời gian bắt đầu');
}

$durationMinutes = (int) round((strtotime($endTime) - strtotime($startTime)) / 60);
if ($durationMinutes < MIN_BOOKING_DURATION) {
    error('Thời lượng mượn tối thiểu là ' . MIN_BOOKING_DURATION . ' phút');
}
if ($durationMinutes > MAX_BOOKING_DURATION) {
    error('Thời lượng mượn tối đa là ' . round(MAX_BOOKING_DURATION / 60, 1) . ' giờ');
}

$db = getDB();
syncBookingAutomation($db);

$userStmt = $db->prepare('SELECT id, full_name, blacklist_until, blacklist_reason, status FROM users WHERE id = ?');
$userStmt->execute([$auth['id']]);
$user = $userStmt->fetch();
if (!$user) unauthorized();
if ($user['status'] === 'blocked') {
    error('Tài khoản của bạn hiện đang bị khóa', 403);
}
if (isUserBlacklisted($user)) {
    $until = date('d/m/Y H:i', strtotime((string) $user['blacklist_until']));
    $reasonText = !empty($user['blacklist_reason']) ? ' Lý do: ' . $user['blacklist_reason'] : '';
    error("Bạn đang bị hạn chế đặt lịch đến {$until}.{$reasonText}", 403);
}

$stmt = $db->prepare('SELECT id, name, status FROM facilities WHERE id = ?');
$stmt->execute([$facilityId]);
$facility = $stmt->fetch();
if (!$facility) notFound('Cơ sở vật chất không tồn tại');
if ($facility['status'] !== 'active') error('Cơ sở vật chất hiện không hoạt động');

$stmt = $db->prepare("
    SELECT COUNT(*) FROM bookings
    WHERE facility_id = ? AND status IN ('pending','approved')
      AND start_time < ? AND end_time > ?
");
$stmt->execute([$facilityId, $endTime, $startTime]);
if ((int) $stmt->fetchColumn() > 0) {
    error('Đã có lịch trùng trong khung giờ này');
}

$bookingIds = [];
$dates = [['start' => $startTime, 'end' => $endTime]];

if ($repeatType !== 'none' && $repeatUntil) {
    $interval = $repeatType === 'weekly' ? '+1 week' : '+1 month';
    $currentStart = strtotime($startTime);
    $currentEnd = strtotime($endTime);
    $untilTs = strtotime($repeatUntil);
    $diff = $currentEnd - $currentStart;

    $maxRecurrences = 52;
    $count = 0;
    while ($count < $maxRecurrences) {
        $currentStart = strtotime($interval, $currentStart);
        if ($currentStart > $untilTs) break;
        $dates[] = [
            'start' => date('Y-m-d H:i:s', $currentStart),
            'end' => date('Y-m-d H:i:s', $currentStart + $diff),
        ];
        $count++;
    }
}

$stmt = $db->prepare('
    INSERT INTO bookings (user_id, facility_id, title, start_time, end_time, reason, repeat_type, repeat_until, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, "pending")
');

foreach ($dates as $date) {
    $stmt->execute([
        $auth['id'],
        $facilityId,
        $title,
        $date['start'],
        $date['end'],
        $reason,
        $repeatType,
        $repeatUntil ?: null,
    ]);
    $bookingIds[] = (int) $db->lastInsertId();
}

$mainBookingId = $bookingIds[0];
if (!empty($_FILES['attachments'])) {
    $files = $_FILES['attachments'];
    $count = is_array($files['name']) ? count($files['name']) : 1;

    for ($i = 0; $i < $count; $i++) {
        $file = [
            'name' => is_array($files['name']) ? $files['name'][$i] : $files['name'],
            'tmp_name' => is_array($files['tmp_name']) ? $files['tmp_name'][$i] : $files['tmp_name'],
            'error' => is_array($files['error']) ? $files['error'][$i] : $files['error'],
            'size' => is_array($files['size']) ? $files['size'][$i] : $files['size'],
        ];

        if ($file['error'] !== UPLOAD_ERR_OK) continue;

        $result = handleUpload($file, ATTACHMENT_PATH, MAX_ATTACHMENT_SIZE, ALLOWED_ATTACHMENT_TYPES);
        if (isset($result['error'])) continue;

        $attachmentStmt = $db->prepare('
            INSERT INTO booking_attachments (booking_id, file_name, file_path, file_size)
            VALUES (?, ?, ?, ?)
        ');
        $attachmentStmt->execute([$mainBookingId, $result['original'], $result['filename'], $file['size']]);
    }
}

createNotification(
    $db,
    $auth['id'],
    'Đã gửi yêu cầu đặt lịch',
    "Yêu cầu mượn {$facility['name']} của bạn đã được tạo và đang chờ duyệt.",
    'info',
    ['booking_ids' => $bookingIds, 'facility_id' => $facilityId],
    $mainBookingId
);

notifyAdmins(
    $db,
    'Có yêu cầu đặt lịch mới',
    $auth['full_name'] . ' vừa gửi yêu cầu đặt ' . $facility['name'] . ' bắt đầu lúc ' . date('d/m/Y H:i', strtotime($startTime)) . '.',
    'info',
    ['booking_ids' => $bookingIds, 'user_id' => (int) $auth['id'], 'facility_id' => $facilityId],
    $mainBookingId
);

created(
    [
        'ids' => $bookingIds,
        'count' => count($bookingIds),
        'max_duration_minutes' => MAX_BOOKING_DURATION,
    ],
    count($bookingIds) > 1
        ? 'Đã tạo ' . count($bookingIds) . ' lịch đặt'
        : 'Đã gửi yêu cầu đặt lịch'
);
