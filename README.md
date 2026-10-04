# RobotPet Manager - Hướng dẫn cài đặt và chạy dự án

## ⚡ Chạy demo nhanh trên điện thoại thật

> Firebase đã được cấu hình sẵn, **không cần** làm Bước 2 bên dưới. Chỉ cần máy tính có Node.js 18+.

```bash
git clone <link-repo>
cd RobotPetManager
npm install
```

### Android (Windows / macOS / Linux)

1. Cài Android Studio (để có Android SDK và JDK).
2. Trên điện thoại: bật **Tùy chọn nhà phát triển** (Cài đặt → Thông tin điện thoại → nhấn 7 lần vào "Số hiệu bản tạo") → bật **Gỡ lỗi USB**.
3. Cắm cáp, chọn **Cho phép** trên điện thoại, rồi chạy:

```bash
npx expo run:android --variant release
```

### iOS (chỉ trên macOS, cần Xcode)

1. Trên iPhone: Cài đặt → Quyền riêng tư & Bảo mật → bật **Chế độ nhà phát triển**, khởi động lại máy.
2. Cài CocoaPods nếu chưa có: `sudo gem install cocoapods`, rồi chạy `cd ios && pod install && cd ..`
3. Mở `ios/CaOZ.xcworkspace` bằng Xcode → chọn target **CaOZ** và **CaOZDynamicIsland** → tab *Signing & Capabilities* → chọn **Team** là Apple ID của bạn (nếu báo trùng Bundle Identifier thì đổi thành tên khác, ví dụ thêm hậu tố `.demo`).
4. Cắm cáp, chọn **Tin cậy máy tính này**, rồi chạy:

```bash
npx expo run:ios --device --configuration Release
```

5. Lần đầu mở app, nếu báo "Nhà phát triển không được tin cậy": Cài đặt → Cài đặt chung → **Quản lý VPN & Thiết bị** → Tin cậy.

**Lưu ý:**
- Bản **Release** đã đóng gói sẵn, rút cáp vẫn chạy bình thường (không cần máy tính khi demo).
- Apple ID miễn phí: app iOS hết hạn sau **7 ngày**, cắm cáp chạy lại lệnh là được.
- Điện thoại cần có Internet (đăng nhập và dữ liệu dùng Firebase).
- Tính năng **Pet nổi ngoài ứng dụng chỉ có trên Android**.
- **Không** chạy `npx expo prebuild --clean` cho iOS: lệnh này xoá phần Dynamic Island viết tay trong thư mục `ios/`.


## 📋 Yêu cầu hệ thống

- Node.js (version 18 trở lên)
- npm hoặc yarn
- Expo CLI
- Tài khoản Firebase (để cấu hình Authentication và Firestore)
- iOS Simulator (cho Mac) hoặc Android Emulator hoặc thiết bị thật

## 🚀 Bước 1: Cài đặt dependencies

```bash
npm install
```

hoặc

```bash
yarn install
```

## 🔥 Bước 2: Cấu hình Firebase

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Tạo project mới hoặc chọn project có sẵn
3. Vào **Project Settings** → **General** → **Your apps** → Chọn **Web app**
4. Copy Firebase configuration
5. Mở file `firebaseConfig.js` và thay thế các giá trị:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

6. Bật **Authentication** trong Firebase Console:
   - Vào **Authentication** → **Sign-in method**
   - Enable **Email/Password**

7. Bật **Firestore Database**:
   - Vào **Firestore Database** → **Create database**
   - Chọn **Start in test mode** (hoặc production mode với rules phù hợp)

## 📁 Bước 3: Thêm Lottie animations

Dự án đã có 2 trang phục mẫu trong `assets/skins/`:
- `Bo Cap/Flirting Dog.json`
- `Kim Nguu/Happy Dog.json`

### Để thêm trang phục mới:

1. Tạo thư mục mới trong `assets/skins/` (ví dụ: `Superhero`)
2. Thêm các file `.json` Lottie vào thư mục đó
3. Cập nhật mapping trong các file:
   - `screens/HomeScreen.js` - function `getSkinAnimations()`
   - `screens/WardrobeScreen.js` - function `getSkinAnimation()`
   - `screens/ShopScreen.js` - constants `ALL_SKINS` và `getSkinAnimation()`

Ví dụ thêm trang phục mới:

```javascript
// Trong HomeScreen.js
const getSkinAnimations = (skinName) => {
  const skinAnimations = {
    'Bo Cap': [
      require('../assets/skins/Bo Cap/Flirting Dog.json'),
    ],
    'Kim Nguu': [
      require('../assets/skins/Kim Nguu/Happy Dog.json'),
    ],
    'Superhero': [  // Trang phục mới
      require('../assets/skins/Superhero/Flying.json'),
      require('../assets/skins/Superhero/Landing.json'),
    ],
  };
  return skinAnimations[skinName] || [];
};
```

## ▶️ Bước 4: Chạy ứng dụng

### Development mode:

```bash
npm start
```

hoặc

```bash
npx expo start
```

### Chạy trên iOS Simulator:

```bash
npm run ios
```

### Chạy trên Android Emulator:

```bash
npm run android
```

### Chạy trên thiết bị thật:

1. Cài đặt **Expo Go** từ App Store (iOS) hoặc Google Play (Android)
2. Quét QR code xuất hiện sau khi chạy `npm start`

## 📱 Tính năng chính

✅ **Đăng nhập / Đăng ký** - Email và mật khẩu
✅ **Màn hình Home** - Robot có thể kéo thả, tự động đổi animation
✅ **Tủ đồ** - Quản lý và thay đổi trang phục
✅ **Cửa hàng** - Mua trang phục mới và mở trứng may mắn
✅ **Thông báo đẩy** - Nhắc nhở chăm sóc robot
✅ **Đồng bộ dữ liệu** - Realtime với Firebase Firestore

## 🔧 Cấu trúc dự án

```
RobotPetManager/
├── assets/
│   └── skins/              # Thư mục chứa trang phục
│       ├── Bo Cap/
│       │   └── Flirting Dog.json
│       └── Kim Nguu/
│           └── Happy Dog.json
├── screens/                # Các màn hình
│   ├── LoginScreen.js
│   ├── HomeScreen.js
│   ├── WardrobeScreen.js
│   └── ShopScreen.js
├── utils/                  # Utilities
│   ├── dataManager.js      # Quản lý dữ liệu Firebase
│   └── notificationManager.js  # Quản lý thông báo
├── App.js                  # Main app với navigation
├── firebaseConfig.js       # Cấu hình Firebase
├── package.json
├── app.json
└── babel.config.js
```

## 🐛 Xử lý lỗi thường gặp

### Lỗi: "Couldn't find a 'firebase.json' file"
- Không cần lo, dự án không yêu cầu file này

### Lỗi: "Firebase: Error (auth/...)"
- Kiểm tra lại cấu hình trong `firebaseConfig.js`
- Đảm bảo đã bật Authentication trong Firebase Console

### Lỗi: Animation không hiển thị
- Đảm bảo file `.json` tồn tại trong `assets/skins/`
- Kiểm tra mapping trong function `getSkinAnimations()`

### Lỗi: "Reanimated 2 failed to create a worklet"
- Đảm bảo `react-native-reanimated/plugin` có trong `babel.config.js`
- Xóa cache: `npx expo start --clear`

## 🎨 Tùy chỉnh

### Thêm coin cho người dùng mới:
Sửa trong `screens/LoginScreen.js`, hàm `handleAuth()`:
```javascript
coins: 1000, // Thay đổi số coin khởi tạo
```

### Thay đổi thời gian chuyển animation:
Trong `screens/HomeScreen.js`:
```javascript
Math.random() * 5000 + 5000 // 5-10 giây, có thể thay đổi
```

### Thay đổi giá trang phục:
Trong `screens/ShopScreen.js`, constant `ALL_SKINS`:
```javascript
{ name: 'Kim Nguu', price: 500 }, // Thay đổi giá
```

## 📦 Build cho production

### iOS:
```bash
npx expo build:ios
```

### Android:
```bash
npx expo build:android
```

hoặc sử dụng EAS Build:
```bash
npm install -g eas-cli
eas build --platform ios
eas build --platform android
```

## 🔐 Bảo mật

**LƯU Ý**: Trước khi deploy production:
1. Cập nhật Firestore Security Rules
2. Không commit `firebaseConfig.js` với thông tin thật lên GitHub
3. Sử dụng Environment Variables cho sensitive data

## 📞 Hỗ trợ

Nếu gặp vấn đề, hãy kiểm tra:
1. Version Node.js và npm
2. Cấu hình Firebase
3. Log trong terminal và trong Expo Go

## 🎉 Hoàn thành!

Bây giờ bạn có thể:
1. Đăng ký tài khoản mới
2. Xem robot trên màn hình home
3. Kéo thả robot
4. Thay đổi trang phục trong tủ đồ
5. Mua trang phục mới trong cửa hàng

Happy coding! 🚀🤖
