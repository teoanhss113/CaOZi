# 🎨 Hướng dẫn quản lý Skins (Trang phục)

## Cấu trúc thư mục

```
assets/
  skins/
    Bo Cap/
      A1.json
      A2.json
      ...
    Kim Nguu/
      A1.json
      A2.json
      ...
```

## Thêm/Sửa/Xóa trang phục

### Bước 1: Cập nhật file trong `assets/skins/`

- **Thêm trang phục mới:** Tạo thư mục mới trong `assets/skins/` và thêm file `.json`
- **Thêm animation:** Thêm file `.json` vào thư mục trang phục có sẵn
- **Xóa animation:** Xóa file `.json` không cần thiết
- **Xóa trang phục:** Xóa cả thư mục

### Bước 2: Generate lại config

Chạy lệnh:

```bash
npm run generate-skins
```

Hoặc khi bạn chạy `npm start`, script sẽ tự động chạy.

### Bước 3: Restart app

```bash
npm start
```

## Lưu ý

- **Chỉ chứa file `.json`:** Các file không phải `.json` sẽ bị bỏ qua
- **Tên thư mục = Tên trang phục:** Tên thư mục sẽ được dùng làm tên hiển thị
- **Tự động phát hiện:** Script sẽ tự động phát hiện tất cả file `.json` trong mỗi thư mục
- **File auto-generated:** File `utils/skinAnimations.js` được tự động tạo, **KHÔNG** chỉnh sửa trực tiếp

## Ví dụ thêm trang phục mới

```bash
# 1. Tạo thư mục mới
mkdir "assets/skins/Superhero"

# 2. Copy các file .json vào
cp animation1.json "assets/skins/Superhero/Flying.json"
cp animation2.json "assets/skins/Superhero/Landing.json"

# 3. Generate config
npm run generate-skins

# 4. Khởi động app
npm start
```

## Troubleshooting

### Lỗi: "Unable to resolve module"
- Chạy lại: `npm run generate-skins`
- Clear cache: `npx expo start --clear`

### Trang phục không xuất hiện
- Kiểm tra file `.json` có trong thư mục không
- Chạy lại: `npm run generate-skins`
- Kiểm tra console logs

### Animation không load
- Đảm bảo file `.json` là Lottie animation hợp lệ
- Kiểm tra kích thước file (không quá lớn)
