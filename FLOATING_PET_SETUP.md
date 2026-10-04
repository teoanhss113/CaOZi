# Floating Pet Overlay

Tính năng pet ngoài ứng dụng hiện được triển khai cho Android bằng native overlay service và được gắn vào Expo thông qua config plugin `./plugins/withFloatingPetAndroid`.

## Android

### Cách build

```bash
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleDebug
```

Sau khi cài app lên thiết bị Android thật:

1. Mở app.
2. Vào hồ sơ cá nhân.
3. Bật **Pet ngoài ứng dụng**.
4. Cấp quyền **Display over other apps** khi app yêu cầu.

### Tương tác đã có

- Tap một lần: pet đổi sang animation vui.
- Tap hai lần: pet đổi sang animation vui khác.
- Nhấn giữ: pet đổi sang animation phản ứng.
- Kéo thả: pet di chuyển theo tay.
- Thả tay sau khi kéo: pet tự snap về mép gần nhất.
- Notification foreground service có nút **Tắt pet**.
- Vị trí pet được lưu lại bằng `SharedPreferences`.

### Kiến trúc

```text
HomeScreenSimple.js
  -> utils/floatingPet.js
  -> NativeModules.FloatingPet
  -> FloatingPetModule.java
  -> FloatingPetService.java
  -> WindowManager overlay + LottieAnimationView
```

Config plugin tự động:

- Thêm quyền `SYSTEM_ALERT_WINDOW`.
- Thêm foreground service permissions.
- Khai báo `FloatingPetService` trong Android manifest.
- Copy `assets/Pets` vào Android assets để native Lottie đọc được.
- Đăng ký `FloatingPetPackage()` vào `MainApplication.kt`.

## iOS

iOS không cho app bên thứ ba hiển thị overlay tự do trên Home Screen hoặc trên app khác. Hướng thay thế nên triển khai riêng bằng:

- WidgetKit interactive widget cho thao tác nhanh.
- Live Activities và Dynamic Island cho trạng thái pet/todo đang diễn ra.

App chính vẫn có thể giữ React Native. Riêng WidgetKit, Live Activities và Dynamic Island cần viết bằng Swift/SwiftUI trong iOS extensions.

### Home Screen Widget đang tạm tắt

Widget đã dùng `containerBackground` rỗng nhưng nền thực tế vẫn do WidgetKit và chế độ hiển thị của hệ thống quyết định. Chế độ Clear/Liquid Glass phụ thuộc lựa chọn của người dùng; không bảo đảm Pet trong suốt trên mọi hình nền và phiên bản iOS. Vì vậy Home Screen Widget tạm không được đăng ký trong widget gallery. Mã Swift, assets và intents vẫn giữ nguyên để phát triển tiếp. Live Activities/Dynamic Island vẫn hoạt động.

- JavaScript: `IOS_HOME_WIDGET_ENABLED = false` trong `utils/dynamicIsland.js` ngăn đồng bộ Widget.
- Native: `CAOZ_HOME_WIDGET` mặc định không được định nghĩa. `CaOZDynamicIslandBundle.swift` chỉ đăng ký Home Widget khi bật cờ này; `CaOZLiveActivityModule.swift` cũng không ghi hoặc reload Widget khi cờ tắt.
- Bật lại: đặt cờ JS thành `true` và thêm `CAOZ_HOME_WIDGET` vào **Swift Active Compilation Conditions** của cả app target lẫn extension target cho các cấu hình cần dùng, rồi build lại iOS.
- Cần bản build native mới để thay đổi widget gallery; OTA JavaScript không đủ. Widget người dùng đã ghim có thể cần được gỡ thủ công sau cập nhật.
- Phần lớn thư mục `ios/` hiện bị `.gitignore` loại trừ; đã thêm ngoại lệ cho hai file native điều khiển Widget ở trên để giữ thay đổi trong Git. Phần extension còn lại vẫn cần được sao lưu khi chuyển máy hoặc phát hành; không chạy `expo prebuild --clean` nếu chưa sao lưu/cấu hình tái tạo phần iOS tùy chỉnh.

Tham khảo Apple: https://developer.apple.com/documentation/widgetkit/displaying-the-right-widget-background và https://developer.apple.com/documentation/widgetkit/optimizing-your-widget-for-accented-rendering-mode-and-liquid-glass.
