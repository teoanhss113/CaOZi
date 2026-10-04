# PetMotion Developer Studio

Prototype website dành cho nhà phát triển cung cấp Lottie animation cho Robot Pet App.

## Chạy local

Từ thư mục gốc của dự án:

```bash
python3 -m http.server 4173
```

Mở `http://127.0.0.1:4173/developer-web/`.

Website cần được phục vụ từ thư mục gốc để truy cập các animation hiện có trong `assets/Pets`.

## Tính năng trong prototype

- Dashboard thư viện motion và trạng thái phân phối sang App.
- Preview các Lottie JSON đang có trong dự án.
- Tìm kiếm và lọc theo trạng thái đã xuất bản/bản nháp.
- JSON Studio: chỉnh sửa, định dạng, kiểm tra và preview trực tiếp.
- Điều khiển tốc độ, phát/dừng, lặp và timeline.
- Đọc kích thước, FPS và dung lượng JSON.
- Tải file JSON xuống máy.
- Luồng mô phỏng lưu bản nháp và đẩy animation lên App.

## Tích hợp production đề xuất

Nút `Đẩy lên App` hiện là prototype UI. Khi triển khai, nối hành động này với API upload để lưu file vào object storage/CDN và ghi metadata vào collection dùng chung. Robot Pet App đọc collection đã xuất bản để hiển thị animation trong cửa hàng.

```text
Developer Web -> Validation API -> Storage/CDN
                              -> Animation metadata database -> Robot Pet App Store
```

