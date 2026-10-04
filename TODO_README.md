# RobotPet Manager - Ứng dụng quản lý thú cưng ảo & TODO Team

## 🎯 Tính năng chính

### 1. Virtual Pet (Thú cưng ảo)
- Nuôi và chăm sóc thú cưng robot
- Kéo thả để di chuyển pet trên màn hình
- Tự động chuyển animation mỗi 5-10 giây
- Thu thập và thay đổi trang phục (skins)
- Kiếm coin để mua trang phục mới

### 2. TODO Cá nhân
- Tạo và quản lý nhiệm vụ cá nhân
- Lọc theo: Hôm nay, Tất cả, Hoàn thành
- Đánh dấu hoàn thành nhanh
- Thêm ghi chú cho từng nhiệm vụ

### 3. TODO Nhóm (Team Management)
- Tạo nhóm làm việc (Team)
- Mời thành viên qua mã 6 ký tự
- Giao nhiệm vụ cho thành viên cụ thể
- Theo dõi tiến độ: Chưa làm / Đang làm / Hoàn thành
- Xem thông tin chi tiết nhóm và thành viên

### 4. Cửa hàng (Shop)
- Mua trang phục bằng coin
- Lucky Draw: Rút ngẫu nhiên trang phục (200 coin)
- Xem trước animation của từng trang phục

## 📱 Cấu trúc màn hình

### Bottom Navigation (5 tabs)
1. **Pet** - Màn hình chính với pet
2. **Tủ đồ** - Quản lý và thay đổi trang phục
3. **Todo** - Quản lý công việc cá nhân
4. **Nhóm** - Quản lý nhóm làm việc
5. **Shop** - Mua sắm trang phục

## 🔧 Cấu trúc kỹ thuật

### Firebase Collections

#### `users`
```javascript
{
  email: string,
  coins: number,
  currentSkin: string,
  ownedSkins: string[],
  robotPosition: { x: number, y: number },
  createdAt: string
}
```

#### `tasks` (TODO)
```javascript
{
  userId: string,          // User sở hữu (cho personal tasks)
  teamId?: string,         // ID nhóm (cho team tasks)
  title: string,
  note?: string,
  isPersonal: boolean,
  assignedTo?: string,     // UID người được giao (cho team tasks)
  createdBy?: string,      // UID người tạo (cho team tasks)
  status: 'todo' | 'doing' | 'done',
  priority: 'low' | 'normal' | 'high',
  createdAt: string,
  completedAt?: string,
  deadline?: string
}
```

#### `teams`
```javascript
{
  name: string,
  code: string,            // Mã mời 6 ký tự
  ownerId: string,
  members: string[],       // Array of UIDs
  createdAt: string
}
```

### Luồng hoạt động TODO

#### Cá nhân (Personal TODO)
1. Người dùng tạo nhiệm vụ trong TodoHomeScreen
2. Nhiệm vụ được lưu với `isPersonal: true`
3. Chỉ người tạo mới thấy và quản lý được

#### Nhóm (Team TODO)
1. Tạo nhóm hoặc tham gia nhóm qua mã mời
2. Người trong nhóm tạo nhiệm vụ và giao cho thành viên
3. Người được giao nhận thấy nhiệm vụ trong TeamDetail
4. Mọi người trong nhóm thấy tiến độ realtime

## 🎨 Thiết kế UI/UX

- **Phong cách**: Tối giản, hiện đại, clean design
- **Màu chủ đạo**: Trắng (#F9FAFB), Xanh (#3B82F6)
- **Typography**: SF Pro (iOS) / Roboto (Android)
- **Navigation**: 5-tab bottom nav với icons rõ ràng
- **Animation**: Fade transition giữa các màn hình

## 🚀 Cài đặt & Chạy

```bash
# Cài đặt dependencies
npm install

# Tạo cấu hình skin animations
npm run generate-skins

# Chạy ứng dụng
npm start

# Scan QR code bằng Expo Go app
```

## 📋 TODO Features (Đã hoàn thành)

✅ Sửa lỗi kéo thả pet (nhảy lên góc trái)
✅ Màn hình TODO cá nhân
✅ Màn hình quản lý nhóm
✅ Màn hình chi tiết nhóm với giao việc
✅ Bottom navigation 5 tabs
✅ Firebase integration cho tasks và teams
✅ Mã mời nhóm (6 ký tự)
✅ Giao nhiệm vụ cho thành viên
✅ Theo dõi trạng thái công việc

## 📝 Các tính năng có thể mở rộng

- [ ] Thông báo push khi có nhiệm vụ mới
- [ ] Lịch (Calendar view) cho TODO
- [ ] Focus Mode - chỉ hiển thị 1 nhiệm vụ đang làm
- [ ] Bình luận trong nhiệm vụ
- [ ] Deadline và reminder
- [ ] Thanh tiến độ dự án
- [ ] Quyền truy cập nhóm (Admin/Member/Viewer)
- [ ] Thống kê và báo cáo
- [ ] Dark mode
- [ ] Sync đa thiết bị (đã có sẵn với Firebase)

## 🐛 Đã sửa

- ✅ Pet nhảy lên góc trái khi kéo thả → Sửa bằng `onPanResponderGrant`
- ✅ Robot không ở giữa màn hình → Cập nhật vị trí mặc định và load logic
- ✅ Biểu tượng ví ở giá trang phục xuống hàng → Sửa layout với flexDirection: row
- ✅ Thiếu field xác nhận mật khẩu → Đã thêm validate
- ✅ Giao diện chưa đồng bộ tiếng Việt → Đã chuyển toàn bộ

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Firebase configuration đúng chưa
2. Expo Go app đã cài đặt chưa
3. Internet connection
4. Node version >= 14

## 📄 License

MIT License - Tự do sử dụng và phát triển
