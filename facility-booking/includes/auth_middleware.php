<?php
/**
 * Authentication & authorization middleware.
 */

require_once __DIR__ . '/response.php';

function startSecureSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params([
            'lifetime' => SESSION_LIFETIME,
            'path'     => '/',
            'httponly'  => true,
            'samesite'  => 'Lax',
        ]);
        session_start();
    }
}

function generateCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function refreshCsrfToken(): string {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(): void {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($token) || !hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        error('Token CSRF không hợp lệ', 403);
    }
}

function requireAuth(): array {
    startSecureSession();
    if (empty($_SESSION['user_id'])) {
        unauthorized();
    }
    return [
        'id'        => $_SESSION['user_id'],
        'email'     => $_SESSION['user_email'],
        'role'      => $_SESSION['user_role'],
        'full_name' => $_SESSION['user_name'],
    ];
}

function requireAdmin(): array {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        forbidden();
    }
    return $user;
}

function optionalAuth(): ?array {
    startSecureSession();
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    return [
        'id'        => $_SESSION['user_id'],
        'email'     => $_SESSION['user_email'],
        'role'      => $_SESSION['user_role'],
        'full_name' => $_SESSION['user_name'],
    ];
}

function setAuthSession(array $user): void {
    $_SESSION['user_id']    = $user['id'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_role']  = $user['role'];
    $_SESSION['user_name']  = $user['full_name'];
    session_regenerate_id(true);
}

function clearAuthSession(): void {
    // Clear all session data but keep the session alive
    $oldParams = session_get_cookie_params();
    $_SESSION = [];
    session_regenerate_id(true);
    // Generate fresh CSRF for the new anonymous session
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
