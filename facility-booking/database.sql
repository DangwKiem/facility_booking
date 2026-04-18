-- =============================================
-- University Facility Booking System
-- Database Schema + Seed Data
-- =============================================

CREATE DATABASE IF NOT EXISTS facility_booking
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE facility_booking;

-- -----------------------------------------
-- 1. Users
-- -----------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('user','admin') DEFAULT 'user',
    user_type ENUM('student','lecturer','external') DEFAULT 'student',
    student_id VARCHAR(20),
    department VARCHAR(100),
    avatar VARCHAR(255),
    status ENUM('active','blocked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- -----------------------------------------
-- 2. Facilities
-- -----------------------------------------
CREATE TABLE facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    type ENUM('room','lab','sports_field','pool','auditorium','other') NOT NULL,
    capacity INT DEFAULT 0,
    campus VARCHAR(50),
    building VARCHAR(100),
    floor VARCHAR(20),
    description TEXT,
    rules TEXT,
    operating_hours JSON,
    status ENUM('active','maintenance','closed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_campus (campus),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- -----------------------------------------
-- 3. Facility Images
-- -----------------------------------------
CREATE TABLE facility_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    facility_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_primary TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------
-- 4. Facility Equipment
-- -----------------------------------------
CREATE TABLE facility_equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    facility_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 1,
    status ENUM('available','broken','maintenance') DEFAULT 'available',
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------
-- 5. Bookings
-- -----------------------------------------
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    facility_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    reason TEXT NOT NULL,
    repeat_type ENUM('none','weekly','monthly') DEFAULT 'none',
    repeat_until DATE,
    status ENUM('pending','approved','rejected','cancelled') DEFAULT 'pending',
    admin_note TEXT,
    approved_by INT,
    approved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (facility_id) REFERENCES facilities(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    INDEX idx_facility_time (facility_id, start_time, end_time),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- -----------------------------------------
-- 6. Booking Attachments
-- -----------------------------------------
CREATE TABLE booking_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    file_size INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------
-- 7. Reviews
-- -----------------------------------------
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    facility_id INT NOT NULL,
    booking_id INT NOT NULL,
    rating TINYINT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (facility_id) REFERENCES facilities(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    UNIQUE KEY unique_review (user_id, booking_id)
) ENGINE=InnoDB;

-- -----------------------------------------
-- 8. Rejection Templates
-- -----------------------------------------
CREATE TABLE rejection_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL
) ENGINE=InnoDB;

-- -----------------------------------------
-- 9. Notifications
-- -----------------------------------------
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    related_booking_id INT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    meta_json TEXT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user (user_id, is_read, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------
-- 10. Violations / Blacklist
-- -----------------------------------------
CREATE TABLE violations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    booking_id INT NULL,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    note TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_violations_user (user_id, status, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE users
    ADD COLUMN blacklist_until DATETIME NULL,
    ADD COLUMN blacklist_reason VARCHAR(255) NULL,
    ADD COLUMN last_notification_read_at DATETIME NULL;

ALTER TABLE bookings
    ADD COLUMN checked_in_at DATETIME NULL,
    ADD COLUMN checked_out_at DATETIME NULL,
    ADD COLUMN checked_in_by INT NULL,
    ADD COLUMN checked_out_by INT NULL,
    ADD COLUMN auto_violation_synced TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN inspection_status VARCHAR(20) NULL,
    ADD COLUMN inspection_note TEXT NULL,
    ADD COLUMN inspected_at DATETIME NULL,
    ADD COLUMN inspected_by INT NULL;

-- =============================================
-- SEED DATA
-- =============================================

-- Admin account (password: admin123)
INSERT INTO users (email, password, full_name, phone, role, user_type, department) VALUES
('admin@university.edu.vn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Quản Trị Viên', '0123456789', 'admin', 'lecturer', 'Phòng Quản trị thiết bị');

-- Sample users (password: password123 = $2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm)
INSERT INTO users (email, password, full_name, phone, role, user_type, student_id, department) VALUES
('sv001@student.edu.vn', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'Nguyễn Văn An', '0987654321', 'user', 'student', 'B21DCCN001', 'Công nghệ thông tin'),
('sv002@student.edu.vn', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'Trần Thị Bình', '0976543210', 'user', 'student', 'B21DCCN002', 'Điện tử viễn thông'),
('gv001@university.edu.vn', '$2y$10$TKh8H1.PfQx37YgCzwiKb.KjNyWgaHb9cbcoQgdIVFlYg7B77UdFm', 'PGS.TS Lê Văn Cường', '0912345678', 'user', 'lecturer', NULL, 'Công nghệ thông tin');

-- Sample facilities
INSERT INTO facilities (name, type, capacity, campus, building, floor, description, rules, operating_hours, status) VALUES
('Phòng thực hành CNTT - A301', 'lab', 40, 'Cơ sở A', 'Tòa A', 'Tầng 3', 
 'Phòng thực hành máy tính hiện đại với 40 máy trạm, phù hợp cho các lớp thực hành lập trình, mạng máy tính và cơ sở dữ liệu.',
 'Không ăn uống trong phòng. Tắt máy sau khi sử dụng. Báo ngay khi thiết bị hỏng.',
 '{"mon":"07:00-21:00","tue":"07:00-21:00","wed":"07:00-21:00","thu":"07:00-21:00","fri":"07:00-21:00","sat":"07:00-17:00","sun":"closed"}',
 'active'),

('Sân bóng đá mini', 'sports_field', 20, 'Cơ sở A', NULL, NULL,
 'Sân bóng đá mini cỏ nhân tạo tiêu chuẩn 5 người. Có đèn chiếu sáng ban đêm.',
 'Mang giày sân cỏ nhân tạo. Không sử dụng khi trời mưa to. Dọn dẹp sau khi sử dụng.',
 '{"mon":"06:00-22:00","tue":"06:00-22:00","wed":"06:00-22:00","thu":"06:00-22:00","fri":"06:00-22:00","sat":"06:00-22:00","sun":"06:00-22:00"}',
 'active'),

('Hội trường lớn - B101', 'auditorium', 500, 'Cơ sở B', 'Tòa B', 'Tầng 1',
 'Hội trường lớn sức chứa 500 người, có sân khấu, hệ thống âm thanh ánh sáng chuyên nghiệp.',
 'Đăng ký trước ít nhất 7 ngày. Cần nộp kế hoạch tổ chức sự kiện. Không di chuyển thiết bị cố định.',
 '{"mon":"07:00-22:00","tue":"07:00-22:00","wed":"07:00-22:00","thu":"07:00-22:00","fri":"07:00-22:00","sat":"07:00-22:00","sun":"08:00-20:00"}',
 'active'),

('Bể bơi', 'pool', 30, 'Cơ sở A', NULL, NULL,
 'Bể bơi tiêu chuẩn 25m x 12.5m, 6 làn bơi. Có phòng thay đồ và tủ khóa.',
 'Bắt buộc đội mũ bơi. Tắm trước khi xuống bể. Trẻ em dưới 12 tuổi phải có người lớn đi kèm.',
 '{"mon":"06:00-20:00","tue":"06:00-20:00","wed":"06:00-20:00","thu":"06:00-20:00","fri":"06:00-20:00","sat":"06:00-18:00","sun":"06:00-18:00"}',
 'active'),

('Phòng họp nhỏ - C205', 'room', 15, 'Cơ sở C', 'Tòa C', 'Tầng 2',
 'Phòng họp nhỏ phù hợp cho seminar, họp nhóm, bảo vệ đề tài.',
 'Giữ gìn vệ sinh. Sắp xếp lại bàn ghế sau khi sử dụng.',
 '{"mon":"07:00-21:00","tue":"07:00-21:00","wed":"07:00-21:00","thu":"07:00-21:00","fri":"07:00-21:00","sat":"07:00-17:00","sun":"closed"}',
 'active');

-- Equipment for facilities
INSERT INTO facility_equipment (facility_id, name, quantity, status) VALUES
(1, 'Máy tính để bàn', 40, 'available'),
(1, 'Máy chiếu', 1, 'available'),
(1, 'Điều hòa', 2, 'available'),
(1, 'Bảng trắng', 2, 'available'),
(3, 'Micro không dây', 4, 'available'),
(3, 'Máy chiếu', 2, 'available'),
(3, 'Hệ thống âm thanh', 1, 'available'),
(3, 'Điều hòa trung tâm', 1, 'available'),
(5, 'Máy chiếu', 1, 'available'),
(5, 'Bảng trắng', 1, 'available'),
(5, 'Điều hòa', 1, 'available'),
(5, 'Webcam hội nghị', 1, 'available');

-- Rejection templates
INSERT INTO rejection_templates (title, content) VALUES
('Trùng lịch', 'Cơ sở vật chất đã được đặt trong khung giờ này. Vui lòng chọn thời gian khác.'),
('Thiếu hồ sơ', 'Yêu cầu bị từ chối do thiếu hồ sơ đính kèm. Vui lòng bổ sung đầy đủ và gửi lại.'),
('Bảo trì', 'Cơ sở vật chất đang trong thời gian bảo trì. Vui lòng chọn thời gian khác.'),
('Không đủ điều kiện', 'Yêu cầu không đáp ứng điều kiện sử dụng của cơ sở vật chất này.'),
('Sự kiện trường', 'Cơ sở vật chất đã được dành cho sự kiện của trường trong thời gian này.');
