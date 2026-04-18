<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') methodNotAllowed();

verifyCsrfToken();
$auth = requireAuth();
$input = getJsonInput();

$fullName   = sanitizeString($input['full_name'] ?? '');
$phone      = sanitizeString($input['phone'] ?? '');
$studentId  = sanitizeString($input['student_id'] ?? '');
$department = sanitizeString($input['department'] ?? '');
$newPassword = trim((string)($input['new_password'] ?? ''));

if (!validateMinLength($fullName, 2)) error('Họ tên tối thiểu 2 ký tự');

$db = getDB();

// Admin can edit any user by providing user_id
$targetId = $auth['id'];
if ($auth['role'] === 'admin' && !empty($input['user_id'])) {
    $targetId = (int) $input['user_id'];

    // Admin can also update user_type
    $userType = sanitizeString($input['user_type'] ?? '');
    $validTypes = ['student', 'lecturer', 'external'];
    $passwordHash = null;

    if ($newPassword !== '') {
        if (!validateMinLength($newPassword, 6)) {
            error('Mật khẩu mới phải tối thiểu 6 ký tự');
        }
        $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    }

    if ($userType && in_array($userType, $validTypes)) {
        if ($passwordHash) {
            $stmt = $db->prepare('UPDATE users SET full_name = ?, phone = ?, student_id = ?, department = ?, user_type = ?, password = ? WHERE id = ?');
            $stmt->execute([$fullName, $phone, $studentId, $department, $userType, $passwordHash, $targetId]);
        } else {
            $stmt = $db->prepare('UPDATE users SET full_name = ?, phone = ?, student_id = ?, department = ?, user_type = ? WHERE id = ?');
            $stmt->execute([$fullName, $phone, $studentId, $department, $userType, $targetId]);
        }
    } else {
        if ($passwordHash) {
            $stmt = $db->prepare('UPDATE users SET full_name = ?, phone = ?, student_id = ?, department = ?, password = ? WHERE id = ?');
            $stmt->execute([$fullName, $phone, $studentId, $department, $passwordHash, $targetId]);
        } else {
            $stmt = $db->prepare('UPDATE users SET full_name = ?, phone = ?, student_id = ?, department = ? WHERE id = ?');
            $stmt->execute([$fullName, $phone, $studentId, $department, $targetId]);
        }
    }
} else {
    // Regular user updates their own profile
    $stmt = $db->prepare('UPDATE users SET full_name = ?, phone = ?, student_id = ?, department = ? WHERE id = ?');
    $stmt->execute([$fullName, $phone, $studentId, $department, $targetId]);
}

// Update session name only if editing own profile
if ($targetId == $auth['id']) {
    $_SESSION['user_name'] = $fullName;
}

success(null, 'Cập nhật thành công');
