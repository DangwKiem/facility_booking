<?php
/**
 * Input validation helpers.
 */

function getJsonInput(): array {
    $input = json_decode(file_get_contents('php://input'), true);
    return is_array($input) ? $input : [];
}

function validateRequired(array $data, array $fields): array {
    $errors = [];
    foreach ($fields as $field) {
        if (!isset($data[$field]) || trim((string)$data[$field]) === '') {
            $errors[$field] = "Trường $field là bắt buộc";
        }
    }
    return $errors;
}

function validateEmail(string $email): bool {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

function validateMinLength(string $value, int $min): bool {
    return mb_strlen($value) >= $min;
}

function validateMaxLength(string $value, int $max): bool {
    return mb_strlen($value) <= $max;
}

function validateIn(string $value, array $allowed): bool {
    return in_array($value, $allowed, true);
}

function validateInt($value, int $min = 0, int $max = PHP_INT_MAX): bool {
    $val = filter_var($value, FILTER_VALIDATE_INT);
    return $val !== false && $val >= $min && $val <= $max;
}

function validateDatetime(string $value): bool {
    $dt = DateTime::createFromFormat('Y-m-d H:i:s', $value);
    if (!$dt) {
        $dt = DateTime::createFromFormat('Y-m-d\TH:i', $value);
    }
    return $dt !== false;
}

function sanitizeString(string $value): string {
    return htmlspecialchars(trim($value), ENT_QUOTES, 'UTF-8');
}

function sanitizeInt($value): int {
    return (int) filter_var($value, FILTER_SANITIZE_NUMBER_INT);
}

function getQueryParam(string $key, $default = null) {
    return isset($_GET[$key]) ? trim($_GET[$key]) : $default;
}
