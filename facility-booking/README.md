# Facility Booking

`facility-booking` là ứng dụng đặt cơ sở vật chất cho trường học, được xây dựng bằng PHP thuần, MySQL và giao diện HTML/CSS/JavaScript.

## Yêu cầu

- PHP 8.0 trở lên.
- MySQL hoặc MariaDB.
- Apache hỗ trợ `.htaccess` và `mod_rewrite` nếu chạy bằng XAMPP/WAMP/Laragon.
- Các PHP extension cần bật:
  - `pdo_mysql` để kết nối MySQL.
  - `mbstring` để kiểm tra chuỗi Unicode.
  - `fileinfo` để kiểm tra MIME type khi upload file.

Dự án không cần `composer install` hay `npm install`.

## Cấu trúc chính

```text
facility-booking/
|-- api/                 # Các endpoint PHP
|-- assets/              # CSS và JavaScript
|-- config/              # Cấu hình ứng dụng và database
|-- includes/            # Helper, middleware và service dùng chung
|-- uploads/             # Avatar, ảnh cơ sở vật chất và tệp đính kèm
|-- database.sql         # Schema và dữ liệu mẫu
|-- setup.php            # Script khởi tạo database
`-- index.php            # Màn hình ứng dụng
```

## Cài đặt nhanh với XAMPP

1. Cài XAMPP và bật hai service `Apache`, `MySQL`.
2. Đặt thư mục dự án vào document root của Apache. Với XAMPP mặc định, đường dẫn nên có dạng:

   ```text
   C:\xampp\htdocs\facility-booking
   ```

   Nếu dự án nằm ở nơi khác, hãy cấu hình `VirtualHost`, `Alias` hoặc document root để Apache truy cập được thư mục này.
3. Kiểm tra thông tin kết nối trong `config/database.php`:

   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'facility_booking');
   define('DB_USER', 'root');
   define('DB_PASS', '');
   ```

   Cấu hình mặc định phù hợp với MySQL của XAMPP khi tài khoản `root` chưa đặt mật khẩu. Nếu máy bạn dùng tài khoản khác, sửa các giá trị trên trước khi khởi tạo database.
4. Khởi tạo database bằng một trong hai cách sau.

   Chạy từ trình duyệt:

   ```text
   http://localhost/facility-booking/setup.php
   ```

   Hoặc chạy trong terminal tại thư mục dự án:

   ```powershell
   php setup.php
   ```

   `setup.php` sẽ tạo database `facility_booking`, đọc `database.sql`, nạp dữ liệu mẫu và cập nhật password hash cho các tài khoản demo.
5. Mở ứng dụng:

   ```text
   http://localhost/facility-booking/
   ```

## Tài khoản mẫu

Sau khi chạy `setup.php`, có thể đăng nhập bằng các tài khoản sau:

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| Admin | `admin@university.edu.vn` | `admin123` |
| Người dùng | `sv001@student.edu.vn` | `password123` |
| Người dùng | `sv002@student.edu.vn` | `password123` |
| Giảng viên | `gv001@university.edu.vn` | `password123` |

Chỉ dùng các tài khoản và mật khẩu mẫu cho môi trường học tập/phát triển.

## Import database thủ công

Nếu không dùng `setup.php`, có thể import `database.sql` bằng phpMyAdmin hoặc MySQL CLI.

Ví dụ với Command Prompt hoặc shell hỗ trợ input redirection:

```cmd
mysql -u root -p < database.sql
```

Sau khi import thủ công, nên chạy `setup.php` một lần nếu cần đảm bảo password hash của tài khoản mẫu được tạo bởi PHP trên máy hiện tại.

## Upload file

Ứng dụng lưu file vào các thư mục:

```text
uploads/avatars
uploads/facilities
uploads/attachments
```

Tài khoản chạy Apache/PHP cần có quyền ghi vào `uploads/`. Kích thước giới hạn trong `config/constants.php`:

- Avatar: tối đa 2 MB.
- Ảnh cơ sở vật chất: tối đa 5 MB.
- Tệp đính kèm booking: tối đa 5 MB.

## Lỗi thường gặp

### Không kết nối được database

- Kiểm tra MySQL đang chạy.
- Kiểm tra `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` trong `config/database.php`.
- Kiểm tra PHP đã bật extension `pdo_mysql`.

### Trang con hoặc API trả về 404

- Kiểm tra Apache đã bật `mod_rewrite`.
- Kiểm tra cấu hình Apache cho phép `.htaccess`, vì repo dùng `.htaccess` để route request về `index.php`.
- Nếu dùng URL khác `http://localhost/facility-booking/`, đảm bảo document root hoặc alias trỏ đúng vào thư mục dự án.

### Upload thất bại

- Kiểm tra quyền ghi của `uploads/`.
- Kiểm tra extension `fileinfo`.
- Kiểm tra giới hạn `upload_max_filesize` và `post_max_size` trong `php.ini` lớn hơn kích thước file cần upload.

## Ghi chú cấu hình

- Timezone ứng dụng được đặt là `Asia/Ho_Chi_Minh` trong `config/constants.php`.
- Kết nối database đặt MySQL session timezone là `+07:00` trong `config/database.php`.
- `setup.php` có thể chạy lại để kiểm tra/nạp thêm schema dữ liệu mẫu, nhưng dữ liệu seed trùng lặp có thể tạo warning từ database.
- Sau khi cài đặt môi trường thật, nên chặn truy cập công khai vào `setup.php` để tránh khởi tạo database ngoài ý muốn.
