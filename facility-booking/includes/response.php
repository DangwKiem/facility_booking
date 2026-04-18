<?php
/**
 * Standardized JSON API response helpers.
 */

function jsonResponse(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function success($data = null, string $message = 'Thành công'): void {
    jsonResponse(['success' => true, 'message' => $message, 'data' => $data]);
}

function created($data = null, string $message = 'Tạo thành công'): void {
    jsonResponse(['success' => true, 'message' => $message, 'data' => $data], 201);
}

function error(string $message, int $code = 400, array $errors = []): void {
    $response = ['success' => false, 'message' => $message];
    if (!empty($errors)) {
        $response['errors'] = $errors;
    }
    jsonResponse($response, $code);
}

function unauthorized(string $message = 'Vui lòng đăng nhập'): void {
    error($message, 401);
}

function forbidden(string $message = 'Không có quyền truy cập'): void {
    error($message, 403);
}

function notFound(string $message = 'Không tìm thấy'): void {
    error($message, 404);
}

function methodNotAllowed(): void {
    error('Method not allowed', 405);
}
