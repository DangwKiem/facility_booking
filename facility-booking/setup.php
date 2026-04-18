<?php
/**
 * Database setup script. Run once to create tables and seed data.
 * Usage: php setup.php
 * Or access via browser: http://localhost/facility-booking/setup.php
 */

echo "<h2>UniBooking - Database Setup</h2>";
echo "<pre>";

$host = 'localhost';
$user = 'root';
$pass = '';
$dbname = 'facility_booking';

try {
    // Connect without database
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);

    // Create database
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "✅ Database '$dbname' created/verified.\n";

    $pdo->exec("USE `$dbname`");

    // Read and execute SQL file
    $sql = file_get_contents(__DIR__ . '/database.sql');

    // Remove CREATE DATABASE and USE statements (already done above)
    $sql = preg_replace('/CREATE DATABASE.*?;/s', '', $sql);
    $sql = preg_replace('/USE\s+\w+;/', '', $sql);

    // Split by semicolon (simple split)
    $statements = array_filter(array_map('trim', explode(';', $sql)));

    $count = 0;
    foreach ($statements as $stmt) {
        if (empty($stmt) || strpos($stmt, '--') === 0) continue;
        try {
            $pdo->exec($stmt);
            $count++;
        } catch (PDOException $e) {
            // Skip "table already exists" errors
            if ($e->getCode() != '42S01') {
                echo "⚠️ Warning: " . $e->getMessage() . "\n";
            }
        }
    }

    echo "✅ Executed $count SQL statements.\n\n";

    // Generate proper password hashes
    $adminPass = password_hash('admin123', PASSWORD_DEFAULT);
    $userPass  = password_hash('password123', PASSWORD_DEFAULT);

    // Update passwords with correct hashes
    $pdo->prepare("UPDATE users SET password = ? WHERE email = 'admin@university.edu.vn'")->execute([$adminPass]);
    $pdo->prepare("UPDATE users SET password = ? WHERE email LIKE '%@student.edu.vn' OR email LIKE 'gv%'")->execute([$userPass]);

    echo "✅ Passwords updated with secure hashes.\n";

    // Verify
    $count = $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    echo "✅ Users: $count\n";
    $count = $pdo->query("SELECT COUNT(*) FROM facilities")->fetchColumn();
    echo "✅ Facilities: $count\n";
    $count = $pdo->query("SELECT COUNT(*) FROM facility_equipment")->fetchColumn();
    echo "✅ Equipment: $count\n";
    $count = $pdo->query("SELECT COUNT(*) FROM rejection_templates")->fetchColumn();
    echo "✅ Rejection Templates: $count\n";

    echo "\n🎉 Setup complete!\n";
    echo "\n📋 Test Accounts:\n";
    echo "   Admin: admin@university.edu.vn / admin123\n";
    echo "   User:  sv001@student.edu.vn / password123\n";
    echo "   User:  sv002@student.edu.vn / password123\n";
    echo "   User:  gv001@university.edu.vn / password123\n";

    echo "\n🌐 Open http://localhost/facility-booking/ to start!\n";

} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "\nMake sure:\n";
    echo "1. XAMPP MySQL is running\n";
    echo "2. MySQL user 'root' has no password\n";
}

echo "</pre>";
