<?php
/**
 * Shared services for analytics, notifications, QR attendance,
 * spreadsheet import, and automatic policy enforcement.
 */

function getAutoBlacklistViolationThreshold(): int {
    if (defined('AUTO_BLACKLIST_VIOLATION_THRESHOLD')) {
        return max(1, (int) AUTO_BLACKLIST_VIOLATION_THRESHOLD);
    }
    return 5;
}

function getViolationWarningThreshold(): int {
    return 3;
}

function shouldRunFeatureTask(string $sessionKey, int $intervalSeconds): bool {
    static $requestCache = [];

    if (isset($requestCache[$sessionKey])) {
        return false;
    }

    $requestCache[$sessionKey] = true;
    $now = time();
    $lastRun = isset($_SESSION[$sessionKey]) ? (int) $_SESSION[$sessionKey] : 0;

    if ($lastRun > 0 && ($now - $lastRun) < $intervalSeconds) {
        return false;
    }

    $_SESSION[$sessionKey] = $now;
    return true;
}

function tableExists(PDO $db, string $table): bool {
    $stmt = $db->prepare("
        SELECT COUNT(*)
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
    ");
    $stmt->execute([$table]);
    return (int) $stmt->fetchColumn() > 0;
}

function ensureFeatureSchema(): void {
    $db = getDB();
    $interval = defined('SCHEMA_SYNC_INTERVAL_SECONDS') ? (int) SCHEMA_SYNC_INTERVAL_SECONDS : 43200;
    $mustCreateChatTable = !tableExists($db, 'support_messages');

    if (!$mustCreateChatTable && !shouldRunFeatureTask('__feature_schema_checked_at', max(60, $interval))) {
        return;
    }

    $db->exec("
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            related_booking_id INT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'info',
            channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            meta_json TEXT NULL,
            is_read TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_notifications_user (user_id, is_read, created_at),
            CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $db->exec("
        CREATE TABLE IF NOT EXISTS violations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            booking_id INT NULL,
            type VARCHAR(50) NOT NULL,
            severity VARCHAR(20) NOT NULL DEFAULT 'medium',
            note TEXT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_violations_user (user_id, status, created_at),
            INDEX idx_violations_booking (booking_id),
            CONSTRAINT fk_violations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_violations_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $db->exec("
        CREATE TABLE IF NOT EXISTS support_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            sender_id INT NOT NULL,
            sender_role VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            read_by_user TINYINT(1) NOT NULL DEFAULT 0,
            read_by_admin TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_support_messages_user (user_id, created_at),
            INDEX idx_support_messages_admin_read (read_by_admin, created_at),
            INDEX idx_support_messages_user_read (read_by_user, created_at),
            CONSTRAINT fk_support_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_support_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    addColumnIfMissing($db, 'users', 'blacklist_until', 'DATETIME NULL AFTER status');
    addColumnIfMissing($db, 'users', 'blacklist_reason', 'VARCHAR(255) NULL AFTER blacklist_until');
    addColumnIfMissing($db, 'users', 'last_notification_read_at', 'DATETIME NULL AFTER blacklist_reason');
    addColumnIfMissing($db, 'users', 'violation_reset_at', 'DATETIME NULL AFTER last_notification_read_at');

    addColumnIfMissing($db, 'bookings', 'checked_in_at', 'DATETIME NULL AFTER approved_at');
    addColumnIfMissing($db, 'bookings', 'checked_out_at', 'DATETIME NULL AFTER checked_in_at');
    addColumnIfMissing($db, 'bookings', 'checked_in_by', 'INT NULL AFTER checked_out_at');
    addColumnIfMissing($db, 'bookings', 'checked_out_by', 'INT NULL AFTER checked_in_by');
    addColumnIfMissing($db, 'bookings', 'auto_violation_synced', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER checked_out_by');
    addColumnIfMissing($db, 'bookings', 'inspection_status', 'VARCHAR(20) NULL AFTER auto_violation_synced');
    addColumnIfMissing($db, 'bookings', 'inspection_note', 'TEXT NULL AFTER inspection_status');
    addColumnIfMissing($db, 'bookings', 'inspected_at', 'DATETIME NULL AFTER inspection_note');
    addColumnIfMissing($db, 'bookings', 'inspected_by', 'INT NULL AFTER inspected_at');
}

function addColumnIfMissing(PDO $db, string $table, string $column, string $definition): void {
    $stmt = $db->prepare("
        SELECT COUNT(*)
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
    ");
    $stmt->execute([$table, $column]);
    if ((int) $stmt->fetchColumn() === 0) {
        $db->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
    }
}

function isUserBlacklisted(array $user): bool {
    if (empty($user['blacklist_until'])) return false;
    return strtotime((string) $user['blacklist_until']) > time();
}

function syncBookingAutomation(PDO $db): void {
    $interval = defined('AUTOMATION_SYNC_INTERVAL_SECONDS') ? (int) AUTOMATION_SYNC_INTERVAL_SECONDS : 30;
    if (!shouldRunFeatureTask('__booking_automation_synced_at', max(5, $interval))) {
        return;
    }

    syncUserBlacklistStatuses($db);
    autoCancelExpiredPendingBookings($db);

    $checkinStmt = $db->query("
        SELECT id, user_id
        FROM bookings
        WHERE status = 'approved'
          AND checked_in_at IS NULL
          AND DATE_ADD(start_time, INTERVAL " . CHECKIN_GRACE_MINUTES . " MINUTE) < NOW()
    ");
    foreach ($checkinStmt->fetchAll() as $row) {
        createViolation(
            $db,
            (int) $row['user_id'],
            (int) $row['id'],
            'no_show',
            'Không check-in trong vòng ' . CHECKIN_GRACE_MINUTES . ' phút sau giờ bắt đầu lịch.'
        );
    }

    $checkoutStmt = $db->query("
        SELECT id, user_id
        FROM bookings
        WHERE status = 'approved'
          AND checked_in_at IS NOT NULL
          AND checked_out_at IS NULL
          AND DATE_ADD(end_time, INTERVAL " . CHECKOUT_GRACE_MINUTES . " MINUTE) < NOW()
    ");
    foreach ($checkoutStmt->fetchAll() as $row) {
        createViolation(
            $db,
            (int) $row['user_id'],
            (int) $row['id'],
            'missing_checkout',
            'Không check-out trong vòng ' . CHECKOUT_GRACE_MINUTES . ' phút sau giờ kết thúc lịch.'
        );
    }

    applyViolationPolicy($db);
}

function syncUserBlacklistStatuses(PDO $db): void {
    $db->exec("
        UPDATE users
        SET status = 'blocked'
        WHERE role != 'admin'
          AND blacklist_until IS NOT NULL
          AND blacklist_until > NOW()
          AND status != 'blocked'
    ");

    $db->exec("
        UPDATE users
        SET status = 'active',
            blacklist_until = NULL,
            blacklist_reason = NULL,
            violation_reset_at = NOW()
        WHERE role != 'admin'
          AND status = 'blocked'
          AND blacklist_until IS NOT NULL
          AND blacklist_until <= NOW()
    ");
}

function autoCancelExpiredPendingBookings(PDO $db): void {
    $stmt = $db->query("
        SELECT b.id, b.user_id, f.name AS facility_name
        FROM bookings b
        JOIN facilities f ON f.id = b.facility_id
        WHERE b.status = 'pending'
          AND b.start_time <= NOW()
    ");

    $update = $db->prepare("
        UPDATE bookings
        SET status = 'cancelled',
            admin_note = COALESCE(NULLIF(admin_note, ''), 'Tự động hủy do quản trị viên chưa duyệt trước giờ bắt đầu.')
        WHERE id = ?
          AND status = 'pending'
    ");

    foreach ($stmt->fetchAll() as $booking) {
        $update->execute([(int) $booking['id']]);
        if ($update->rowCount() < 1) {
            continue;
        }

        createNotification(
            $db,
            (int) $booking['user_id'],
            'Yêu cầu đặt lịch đã tự động hủy',
            'Yêu cầu mượn ' . $booking['facility_name'] . ' đã tự động hủy vì chưa được quản trị viên duyệt trước giờ bắt đầu.',
            'warning',
            ['booking_id' => (int) $booking['id'], 'reason' => 'expired_pending'],
            (int) $booking['id']
        );
    }
}

function createViolation(PDO $db, int $userId, ?int $bookingId, string $type, string $note, string $severity = 'medium'): void {
    if ($bookingId) {
        $dup = $db->prepare("SELECT id FROM violations WHERE user_id = ? AND booking_id = ? AND type = ? LIMIT 1");
        $dup->execute([$userId, $bookingId, $type]);
        if ($dup->fetch()) return;
    }

    $stmt = $db->prepare("
        INSERT INTO violations (user_id, booking_id, type, severity, note)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$userId, $bookingId, $type, $severity, $note]);

    createNotification(
        $db,
        $userId,
        'Vi phạm sử dụng cơ sở vật chất',
        $note,
        'warning',
        ['violation_type' => $type, 'booking_id' => $bookingId],
        $bookingId
    );

    notifyAdmins(
        $db,
        'Phát sinh vi phạm người dùng',
        $note,
        'warning',
        ['violation_type' => $type, 'user_id' => $userId, 'booking_id' => $bookingId],
        $bookingId
    );
}

function applyViolationPolicy(PDO $db, ?int $userId = null): void {
    $params = [];
    $where = '';
    if ($userId) {
        $where = 'AND u.id = ?';
        $params[] = $userId;
    }

    $stmt = $db->prepare("
        SELECT u.id, u.full_name, u.blacklist_until, u.violation_reset_at,
               COUNT(v.id) AS active_violation_count
        FROM users u
        LEFT JOIN violations v
            ON v.user_id = u.id
           AND v.status = 'active'
           AND v.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
           AND (u.violation_reset_at IS NULL OR v.created_at >= u.violation_reset_at)
        WHERE u.role != 'admin' $where
        GROUP BY u.id, u.full_name, u.blacklist_until, u.violation_reset_at
    ");
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    $update = $db->prepare("
        UPDATE users
        SET status = ?, blacklist_until = ?, blacklist_reason = ?
        WHERE id = ?
    ");

    $warningThreshold = getViolationWarningThreshold();
    $blockThreshold = getAutoBlacklistViolationThreshold();

    foreach ($users as $user) {
        $violationCount = (int) $user['active_violation_count'];
        $targetUserId = (int) $user['id'];

        if ($violationCount >= $warningThreshold && $violationCount < $blockThreshold) {
            notifyViolationWarning($db, $targetUserId, $violationCount, $warningThreshold, $blockThreshold);
        }

        if ($violationCount < $blockThreshold) {
            continue;
        }
        if (!empty($user['blacklist_until']) && strtotime((string) $user['blacklist_until']) > time()) {
            continue;
        }

        $currentUntil = !empty($user['blacklist_until']) ? strtotime((string) $user['blacklist_until']) : time();
        $base = max(time(), $currentUntil);
        $newUntil = date('Y-m-d H:i:s', strtotime('+7 days', $base));
        $reason = 'Tự động khóa tạm do tích lũy từ ' . $blockThreshold . ' vi phạm trong 90 ngày.';
        $update->execute(['blocked', $newUntil, $reason, $targetUserId]);

        if (!hasRecentThresholdNotification($db, $targetUserId, 'blacklist_threshold_reached', $blockThreshold)) {
            createNotification(
                $db,
                $targetUserId,
                'Tài khoản bị đưa vào blacklist tạm thời',
                "Tài khoản của bạn bị hạn chế đặt lịch đến {$newUntil}. Lý do: {$reason}",
                'error',
                [
                    'blacklist_until' => $newUntil,
                    'notification_key' => 'blacklist_threshold_reached',
                    'threshold' => $blockThreshold,
                ]
            );

            notifyAdmins(
                $db,
                'Người dùng bị block tự động',
                'Người dùng #' . $targetUserId . ' đã bị đưa vào blacklist tạm thời do đạt ' . $violationCount . ' vi phạm trong 90 ngày.',
                'error',
                [
                    'notification_key' => 'user_auto_blocked',
                    'user_id' => $targetUserId,
                    'active_violation_count' => $violationCount,
                    'threshold' => $blockThreshold,
                    'blacklist_until' => $newUntil,
                ]
            );
        }
    }
}

function applyAutomaticBlacklist(PDO $db, ?int $userId = null): void {
    applyViolationPolicy($db, $userId);
}

function notifyViolationWarning(PDO $db, int $userId, int $violationCount, int $warningThreshold, int $blockThreshold): void {
    if ($violationCount < $warningThreshold) return;
    if (hasRecentThresholdNotification($db, $userId, 'violation_warning', $warningThreshold)) return;

    createNotification(
        $db,
        $userId,
        'Cảnh cáo vi phạm',
        'Bạn đã có ' . $violationCount . ' vi phạm trong 90 ngày. Nếu đạt ' . $blockThreshold . ' vi phạm, tài khoản sẽ bị đưa vào blacklist tạm thời.',
        'warning',
        [
            'notification_key' => 'violation_warning',
            'threshold' => $warningThreshold,
            'active_violation_count' => $violationCount,
            'block_threshold' => $blockThreshold,
        ]
    );
}

function hasRecentThresholdNotification(PDO $db, int $userId, string $notificationKey, int $threshold): bool {
    $stmt = $db->prepare("
        SELECT id
        FROM notifications
        WHERE user_id = ?
          AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
          AND meta_json IS NOT NULL
          AND meta_json LIKE ?
          AND meta_json LIKE ?
        LIMIT 1
    ");
    $stmt->execute([
        $userId,
        '%"notification_key":"' . $notificationKey . '"%',
        '%"threshold":' . $threshold . '%',
    ]);
    return (bool) $stmt->fetchColumn();
}

function createNotification(
    PDO $db,
    int $userId,
    string $title,
    string $message,
    string $type = 'info',
    array $meta = [],
    ?int $relatedBookingId = null
): void {
    $stmt = $db->prepare("
        INSERT INTO notifications (user_id, related_booking_id, type, channel, title, message, meta_json)
        VALUES (?, ?, ?, 'in_app', ?, ?, ?)
    ");
    $stmt->execute([
        $userId,
        $relatedBookingId,
        $type,
        $title,
        $message,
        $meta ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null
    ]);
}

function notifyAdmins(
    PDO $db,
    string $title,
    string $message,
    string $type = 'info',
    array $meta = [],
    ?int $relatedBookingId = null
): void {
    $stmt = $db->query("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
    foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $adminId) {
        createNotification($db, (int) $adminId, $title, $message, $type, $meta, $relatedBookingId);
    }
}

function getQrPayloadUrl(int $bookingId, string $action): string {
    $expires = time() + 3600;
    $token = buildQrToken($bookingId, $action, $expires);
    $basePath = rtrim(dirname(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/'))), '/\\');
    return sprintf(
        '%s://%s%s/api/bookings/attendance.php?booking_id=%d&action=%s&expires=%d&token=%s',
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http',
        $_SERVER['HTTP_HOST'] ?? 'localhost',
        $basePath,
        $bookingId,
        rawurlencode($action),
        $expires,
        rawurlencode($token)
    );
}

function buildQrToken(int $bookingId, string $action, int $expires): string {
    $dbName = defined('DB_NAME') ? DB_NAME : 'facility_booking';
    $secret = hash('sha256', APP_NAME . '|' . APP_VERSION . '|' . $dbName);
    return hash_hmac('sha256', $bookingId . '|' . $action . '|' . $expires, $secret);
}

function verifyQrToken(int $bookingId, string $action, int $expires, string $token): bool {
    if ($expires < time()) return false;
    return hash_equals(buildQrToken($bookingId, $action, $expires), $token);
}

function parseSpreadsheetImport(string $filePath, string $originalName): array {
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if ($ext === 'csv') return parseCsvImport($filePath);
    if ($ext === 'xlsx') return parseXlsxImport($filePath);
    error('Chỉ hỗ trợ file CSV hoặc XLSX');
    return [];
}

function parseCsvImport(string $filePath): array {
    $rows = [];
    $handle = fopen($filePath, 'r');
    if (!$handle) error('Không thể đọc file CSV');

    $headers = null;
    while (($data = fgetcsv($handle, 0, ',')) !== false) {
        if (!$headers) {
            $headers = normalizeImportHeaders($data);
            continue;
        }
        if (!array_filter($data, fn($value) => trim((string) $value) !== '')) continue;
        $rows[] = combineImportRow($headers, $data);
    }
    fclose($handle);
    return $rows;
}

function parseXlsxImport(string $filePath): array {
    if (!class_exists('ZipArchive')) {
        error('Máy chủ chưa bật ZipArchive để đọc file XLSX');
    }

    $zip = new ZipArchive();
    if ($zip->open($filePath) !== true) {
        error('Không thể mở file XLSX');
    }

    $sharedStrings = [];
    $sharedXml = $zip->getFromName('xl/sharedStrings.xml');
    if ($sharedXml) {
        $xml = simplexml_load_string($sharedXml);
        if ($xml && isset($xml->si)) {
            foreach ($xml->si as $item) {
                $text = '';
                if (isset($item->t)) {
                    $text = (string) $item->t;
                } elseif (isset($item->r)) {
                    foreach ($item->r as $run) {
                        $text .= (string) $run->t;
                    }
                }
                $sharedStrings[] = $text;
            }
        }
    }

    $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
    $zip->close();
    if (!$sheetXml) error('Không tìm thấy sheet1 trong file XLSX');

    $xml = simplexml_load_string($sheetXml);
    if (!$xml || !isset($xml->sheetData)) error('Dữ liệu XLSX không hợp lệ');

    $headers = null;
    $rows = [];
    foreach ($xml->sheetData->row as $row) {
        $values = [];
        foreach ($row->c as $cell) {
            $value = (string) $cell->v;
            $type = (string) $cell['t'];
            $values[] = $type === 's' ? ($sharedStrings[(int) $value] ?? '') : $value;
        }

        if (!$headers) {
            $headers = normalizeImportHeaders($values);
            continue;
        }
        if (!array_filter($values, fn($value) => trim((string) $value) !== '')) continue;
        $rows[] = combineImportRow($headers, $values);
    }

    return $rows;
}

function normalizeImportHeaders(array $headers): array {
    return array_map(function ($header) {
        $header = trim(mb_strtolower((string) $header));
        return match ($header) {
            'full_name', 'họ tên', 'ho ten', 'name' => 'full_name',
            'email' => 'email',
            'phone', 'số điện thoại', 'so dien thoai' => 'phone',
            'user_type', 'đối tượng', 'doi tuong', 'type' => 'user_type',
            'student_id', 'mã sinh viên', 'ma sinh vien' => 'student_id',
            'department', 'khoa', 'khoa / bộ môn', 'khoa / bo mon' => 'department',
            'password', 'mật khẩu', 'mat khau' => 'password',
            default => $header,
        };
    }, $headers);
}

function combineImportRow(array $headers, array $row): array {
    $result = [];
    foreach ($headers as $index => $header) {
        $result[$header] = trim((string) ($row[$index] ?? ''));
    }
    return $result;
}
