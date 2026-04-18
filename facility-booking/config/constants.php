<?php
/**
 * Application constants.
 */

define('APP_NAME', 'UniBooking');
define('APP_VERSION', '1.0.0');
define('APP_TIMEZONE', 'Asia/Ho_Chi_Minh');

// Paths
define('BASE_PATH', dirname(__DIR__));
define('UPLOAD_PATH', BASE_PATH . '/uploads');
define('AVATAR_PATH', UPLOAD_PATH . '/avatars');
define('FACILITY_IMG_PATH', UPLOAD_PATH . '/facilities');
define('ATTACHMENT_PATH', UPLOAD_PATH . '/attachments');

// Upload limits
define('MAX_AVATAR_SIZE', 2 * 1024 * 1024);       // 2MB
define('MAX_ATTACHMENT_SIZE', 5 * 1024 * 1024);    // 5MB
define('MAX_FACILITY_IMG_SIZE', 5 * 1024 * 1024);  // 5MB

// Allowed file types
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
define('ALLOWED_ATTACHMENT_TYPES', ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

// Pagination
define('DEFAULT_PAGE_SIZE', 12);
define('MAX_PAGE_SIZE', 50);

// Booking
define('MIN_BOOKING_DURATION', 30);   // minutes
define('MAX_BOOKING_DURATION', 480);  // minutes (8 hours)
define('CHECKIN_GRACE_MINUTES', 30);  // minutes after start time
define('CHECKOUT_GRACE_MINUTES', 30); // minutes after end time
define('AUTO_BLACKLIST_VIOLATION_THRESHOLD', 5); // active violations in 90 days
define('SCHEMA_SYNC_INTERVAL_SECONDS', 43200); // 12 hours
define('AUTOMATION_SYNC_INTERVAL_SECONDS', 30); // 30 seconds

// Session
define('SESSION_LIFETIME', 86400);    // 24 hours
