<?php
require_once __DIR__ . '/../../includes/helpers.php';
apiBootstrap();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') methodNotAllowed();

clearAuthSession();

// Return fresh CSRF token for the next login
success(['csrf_token' => $_SESSION['csrf_token']], 'Đã đăng xuất');
