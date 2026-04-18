<?php
/**
 * Utility helpers.
 */

function getPagination(): array {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(MAX_PAGE_SIZE, max(1, (int)($_GET['limit'] ?? DEFAULT_PAGE_SIZE)));
    $offset = ($page - 1) * $limit;
    return compact('page', 'limit', 'offset');
}

function paginatedResponse(array $items, int $total, int $page, int $limit): void {
    success([
        'items'       => $items,
        'total'       => $total,
        'page'        => $page,
        'limit'       => $limit,
        'total_pages' => (int)ceil($total / $limit),
    ]);
}

function formatDatetime(string $datetime): string {
    return date('d/m/Y H:i', strtotime($datetime));
}

function formatDate(string $date): string {
    return date('d/m/Y', strtotime($date));
}

function apiBootstrap(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    require_once __DIR__ . '/../config/constants.php';
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/response.php';
    require_once __DIR__ . '/auth_middleware.php';
    require_once __DIR__ . '/validator.php';
    require_once __DIR__ . '/upload.php';
    require_once __DIR__ . '/feature_services.php';
    startSecureSession();
    ensureFeatureSchema();
}
