<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') methodNotAllowed();

verifyCsrfToken();
requireAdmin();

if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    error('Vui lòng chọn file import hợp lệ');
}

$file = $_FILES['file'];
$rows = parseSpreadsheetImport($file['tmp_name'], $file['name']);
if (!$rows) {
    error('File import không có dữ liệu');
}

$db = getDB();
$insertStmt = $db->prepare("
    INSERT INTO users (email, password, full_name, phone, role, user_type, student_id, department, status)
    VALUES (?, ?, ?, ?, 'user', ?, ?, ?, 'active')
");
$existsStmt = $db->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");

$created = 0;
$skipped = [];

foreach ($rows as $index => $row) {
    $email = trim((string)($row['email'] ?? ''));
    $fullName = trim((string)($row['full_name'] ?? ''));
    $phone = trim((string)($row['phone'] ?? ''));
    $userType = trim((string)($row['user_type'] ?? 'student'));
    $studentId = trim((string)($row['student_id'] ?? ''));
    $department = trim((string)($row['department'] ?? ''));
    $password = (string)($row['password'] ?? 'password123');

    if (!$email || !$fullName || !validateEmail($email)) {
        $skipped[] = ['row' => $index + 2, 'reason' => 'Thiếu email hoặc họ tên hợp lệ'];
        continue;
    }

    if (!in_array($userType, ['student', 'lecturer', 'external'], true)) {
        $userType = 'student';
    }

    $existsStmt->execute([$email]);
    if ($existsStmt->fetch()) {
        $skipped[] = ['row' => $index + 2, 'reason' => 'Email đã tồn tại'];
        continue;
    }

    $insertStmt->execute([
        $email,
        password_hash($password, PASSWORD_DEFAULT),
        $fullName,
        $phone,
        $userType,
        $studentId,
        $department,
    ]);
    $created++;
}

created([
    'created' => $created,
    'skipped' => $skipped,
], "Đã import {$created} người dùng");
