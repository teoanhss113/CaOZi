# RobotPetManager - Mô tả dự án

Ứng dụng nuôi thú cưng robot ảo, xây dựng bằng Expo + React Native, chạy trên iOS và Android.

## Yêu cầu chính

1. **Đăng nhập / Đăng ký**

   - Email + mật khẩu
   - Đăng nhập thành công chuyển ngay sang giao diện chính

2. **Màn hình Home (trong ứng dụng)**

   - Nền trắng sạch sẽ
   - Robot hiển thị lớn bằng animation Lottie
   - Robot tự động chuyển ngẫu nhiên giữa tất cả các file Lottie JSON trong thư mục của trang phục hiện tại mỗi 5–10 giây
   - Có thể kéo thả robot tự do đến bất kỳ vị trí nào trên màn hình

3. **Quản lý trang phục**

   - Mỗi trang phục là một thư mục riêng bên trong assets/skins/
   - Ví dụ cấu trúc:
     assets/skins/default/A1.json, A2.json, A3.json...
     assets/skins/hat1/A1.json, A2.json, A4.json...
     assets/skins/superhero/A1.json, A5.json...
   - Tên file trong mỗi thư mục không cố định, không cần biết trước là idle/happy/dance… gì cả
   - Khi thay trang phục → robot load tất cả file .json trong thư mục trang phục mới
   - Tự động chuyển ngẫu nhiên giữa các file đó mỗi 5–10 giây

4. **Robot hiển thị ngoài màn hình chính điện thoại**

   - Robot xuất hiện trên màn hình chính thiết bị (widget iOS + widget Android)
   - Vẫn tự động chuyển ngẫu nhiên giữa các file Lottie trong thư mục trang phục hiện tại (animation nhẹ)
   - Chạm widget mở ứng dụng ngay
   - Đồng bộ trang phục hiện tại (tên thư mục) và vị trí robot

5. **Màn hình Tủ đồ**

   - Danh sách các trang phục đã sở hữu (tương ứng với các thư mục trong assets/skins/)
   - Mỗi trang phục hiển thị preview (load ngẫu nhiên 1 file Lottie bất kỳ từ thư mục đó)
   - Chạm vào trang phục → thay sang thư mục trang phục đó (cập nhật tức thì trong ứng dụng và widget)

6. **Màn hình Cửa hàng**

   - Hiển thị các trang phục mới (các thư mục mới)
   - Mục “Trứng may mắn” → mở random thêm một thư mục trang phục mới vào danh sách sở hữu
   - Hiển thị số coin hiện tại

7. **Thông báo đẩy**

   - Gửi thông báo dễ thương khi cần (nhắc thay đồ, có trang phục mới, robot đang chờ)

8. **Dữ liệu**
   - Đồng bộ thời gian thực giữa các thiết bị và widget
   - Lưu thông tin người dùng, danh sách trang phục đã sở hữu (danh sách tên thư mục), trang phục đang mặc (tên thư mục hiện tại), coin, vị trí robot
   - Sau này hỗ trợ upload thư mục trang phục (nhiều file Lottie JSON) từ web cộng đồng

## Phong cách giao diện

- Sạch sẽ, sáng sủa, nền trắng chủ đạo
- Card bo tròn, khoảng trắng nhiều, dễ nhìn

## Lưu ý quan trọng khi sinh code

- Trang phục được tổ chức theo thư mục: assets/skins/[tên-trang-phục]/
- Mỗi thư mục chứa nhiều file .json (tên file tùy ý, có thể là A1.json, A2.json… hoặc bất kỳ tên gì)
- Code phải tự động đọc tất cả file .json trong thư mục trang phục hiện tại (không hardcode tên file)
- Robot load và chuyển ngẫu nhiên giữa các file đó
- Khi thay trang phục → chuyển sang đọc thư mục mới
- Dùng file mẫu trong assets/skins/default/ và vài thư mục mẫu khác để test
- Người dùng sẽ thêm/sửa/xóa thư mục và file sau
- Tự chọn thư viện phù hợp (có thể cần metro config để load JSON động từ assets)
- Code sạch sẽ, dễ mở rộng khi thêm thư mục mới

Sinh toàn bộ code dự án dựa trên mô tả này, đảm bảo chạy được đầy đủ tất cả tính năng yêu cầu.
