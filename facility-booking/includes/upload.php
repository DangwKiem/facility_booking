<?php
/**
 * File upload handler.
 */

function handleUpload(array $file, string $destDir, int $maxSize, array $allowedTypes): array {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $messages = [
            UPLOAD_ERR_INI_SIZE   => 'File vượt quá kích thước cho phép của server',
            UPLOAD_ERR_FORM_SIZE  => 'File vượt quá kích thước cho phép',
            UPLOAD_ERR_PARTIAL    => 'File chỉ được upload một phần',
            UPLOAD_ERR_NO_FILE    => 'Không có file nào được upload',
            UPLOAD_ERR_NO_TMP_DIR => 'Thiếu thư mục tạm',
            UPLOAD_ERR_CANT_WRITE => 'Không thể ghi file',
        ];
        return ['error' => $messages[$file['error']] ?? 'Lỗi upload không xác định'];
    }

    if ($file['size'] > $maxSize) {
        $maxMB = round($maxSize / 1024 / 1024, 1);
        return ['error' => "File không được vượt quá {$maxMB}MB"];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes, true)) {
        return ['error' => 'Loại file không được phép'];
    }

    if (!is_dir($destDir)) {
        mkdir($destDir, 0755, true);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('', true) . '.' . strtolower($ext);
    $destPath = $destDir . '/' . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        return ['error' => 'Không thể lưu file'];
    }

    return [
        'filename'  => $filename,
        'original'  => $file['name'],
        'size'      => $file['size'],
        'mime_type' => $mimeType,
    ];
}

function deleteFile(string $path): bool {
    $fullPath = BASE_PATH . '/' . ltrim($path, '/');
    return file_exists($fullPath) && unlink($fullPath);
}
