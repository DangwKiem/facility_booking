<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') methodNotAllowed();

// No CSRF check on register: session may not exist yet
$input = getJsonInput();

$errors = validateRequired($input, ['full_name', 'email', 'password']);
if (!empty($errors)) error('Vui lòng nhập đầy đủ thông tin', 400, $errors);

$fullName  = sanitizeString($input['full_name']);
$email     = trim($input['email']);
$phone     = sanitizeString($input['phone'] ?? '');
$userType  = validateIn($input['user_type'] ?? 'student', ['student', 'lecturer', 'external']) ? $input['user_type'] : 'student';
$studentId = sanitizeString($input['student_id'] ?? '');
$department = sanitizeString($input['department'] ?? '');
$password  = $input['password'];

if (!validateEmail($email)) error('Email không hợp lệ');
if (!validateMinLength($password, 6)) error('Mật khẩu tối thiểu 6 ký tự');
if (!validateMinLength($fullName, 2)) error('Họ tên tối thiểu 2 ký tự');

$db = getDB();

$stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) error('Email đã được sử dụng', 409);

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

$stmt = $db->prepare('INSERT INTO users (full_name, email, phone, user_type, student_id, department, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, "user")');
$stmt->execute([$fullName, $email, $phone, $userType, $studentId, $department, $hashedPassword]);

$userId = (int)$db->lastInsertId();

$user = [
    'id'        => $userId,
    'email'     => $email,
    'full_name' => $fullName,
    'role'      => 'user',
    'user_type' => $userType,
];

setAuthSession($user);
$user['csrf_token'] = refreshCsrfToken();

created($user, 'Đăng ký thành công');
