<?php
/**
 * Database connection via PDO singleton.
 */

if (defined('APP_TIMEZONE')) {
    date_default_timezone_set(APP_TIMEZONE);
}

define('DB_HOST', 'localhost');
define('DB_NAME', 'facility_booking');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        $pdo->exec("SET time_zone = '+07:00'");
    }
    return $pdo;
}
