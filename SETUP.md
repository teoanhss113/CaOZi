# 🤖 RobotPet Manager - Hướng dẫn Setup nhanh

## ⚡ Các bước cài đặt (5 phút)

### 1. Cài packages
```bash
npm install
```

**Packages quan trọng đã được thêm:**
- `firebase` - Authentication và Firestore
- `lottie-react-native` - Hiển thị animation
- `react-native-reanimated` - Animation kéo thả mượt mà
- `react-native-gesture-handler` - Xử lý gesture
- `@react-navigation/native` - Navigation
- `expo-notifications` - Push notifications
- `@react-native-async-storage/async-storage` - Lưu dữ liệu local

### 2. Cấu hình Firebase

**Bước 2.1: Tạo Firebase Project**
1. Vào https://console.firebase.google.com/
2. Nhấn "Add project"
3. Đặt tên project (vd: robotpet-manager)
4. Tắt Google Analytics nếu không cần
5. Nhấn "Create project"

**Bước 2.2: Thêm Web App**
1. Trong Firebase Console, nhấn biểu tượng Web `</>`
2. Đặt tên app (vd: RobotPet Manager)
3. Copy đoạn config JavaScript
4. Mở file `firebaseConfig.js` và paste vào

Ví dụ config:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB...",
  authDomain: "robotpet-xxx.firebaseapp.com",
  projectId: "robotpet-xxx",
  storageBucket: "robotpet-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

**Bước 2.3: Bật Authentication**
1. Trong Firebase Console, vào **Build** → **Authentication**
2. Nhấn "Get started"
3. Tab "Sign-in method" → Nhấn "Email/Password"
4. Enable cả 2 toggles
5. Nhấn "Save"

**Bước 2.4: Tạo Firestore Database**
1. Trong Firebase Console, vào **Build** → **Firestore Database**
2. Nhấn "Create database"
3. Chọn location gần bạn nhất (vd: asia-southeast1)
4. Chọn "Start in **test mode**" (để dev dễ dàng)
5. Nhấn "Create"

**⚠️ Quan trọng**: Test mode sẽ cho phép truy cập trong 30 ngày. Sau đó cần setup Security Rules.

### 3. Chạy app

```bash
npm start
```

Sau đó:
- Nhấn `i` để mở iOS simulator
- Nhấn `a` để mở Android emulator
- Hoặc quét QR code bằng Expo Go trên điện thoại

### 4. Test app

1. **Đăng ký tài khoản mới**
   - Email: test@example.com
   - Password: 123456

2. **Màn hình Home**
   - Thấy robot animation
   - Thử kéo robot sang các vị trí khác
   - Đợi 5-10s thấy robot tự đổi animation

3. **Tủ đồ**
   - Thấy 1 trang phục "Bo Cap"
   - Thử chuyển qua "Kim Nguu" (nếu đã thêm)

4. **Cửa hàng**
   - Thấy số coin (1000 coin khởi tạo)
   - Thử mua trang phục
   - Thử mở trứng may mắn

## 🎨 Thêm trang phục mới

### Bước 1: Thêm file Lottie
1. Tạo thư mục mới: `assets/skins/TenTrangPhuc/`
2. Thêm file `.json`: `assets/skins/TenTrangPhuc/Animation1.json`

### Bước 2: Cập nhật code (3 file)

**File 1: `screens/HomeScreen.js`**
```javascript
const getSkinAnimations = (skinName) => {
  const skinAnimations = {
    'Bo Cap': [
      require('../assets/skins/Bo Cap/Flirting Dog.json'),
    ],
    'Kim Nguu': [
      require('../assets/skins/Kim Nguu/Happy Dog.json'),
    ],
    'TenTrangPhuc': [  // THÊM DÒNG NÀY
      require('../assets/skins/TenTrangPhuc/Animation1.json'),
    ],
  };
  return skinAnimations[skinName] || [];
};
```

**File 2: `screens/WardrobeScreen.js`**
```javascript
const getSkinAnimation = (skinName) => {
  const skinAnimations = {
    'Bo Cap': require('../assets/skins/Bo Cap/Flirting Dog.json'),
    'Kim Nguu': require('../assets/skins/Kim Nguu/Happy Dog.json'),
    'TenTrangPhuc': require('../assets/skins/TenTrangPhuc/Animation1.json'), // THÊM
  };
  return skinAnimations[skinName] || null;
};
```

**File 3: `screens/ShopScreen.js`**
```javascript
// Thêm vào ALL_SKINS
const ALL_SKINS = [
  { name: 'Bo Cap', price: 0 },
  { name: 'Kim Nguu', price: 500 },
  { name: 'TenTrangPhuc', price: 800 }, // THÊM DÒNG NÀY
];

// Thêm vào getSkinAnimation
const getSkinAnimation = (skinName) => {
  const skinAnimations = {
    'Bo Cap': require('../assets/skins/Bo Cap/Flirting Dog.json'),
    'Kim Nguu': require('../assets/skins/Kim Nguu/Happy Dog.json'),
    'TenTrangPhuc': require('../assets/skins/TenTrangPhuc/Animation1.json'), // THÊM
  };
  return skinAnimations[skinName] || null;
};
```

## 🔥 Lệnh quan trọng

```bash
# Cài packages
npm install

# Chạy app
npm start

# Clear cache khi gặp lỗi
npx expo start --clear

# Cài thêm package
npm install package-name

# Update Expo
npm install expo@latest

# Check version
npx expo --version
```

## ❗ Xử lý lỗi thường gặp

### Lỗi: "Firebase: Error (auth/invalid-email)"
→ Email không đúng format

### Lỗi: "Firebase: Error (auth/weak-password)"
→ Password phải ít nhất 6 ký tự

### Lỗi: Animation không hiển thị
→ Kiểm tra:
1. File .json có tồn tại không?
2. Đã require đúng đường dẫn chưa?
3. Thử clear cache: `npx expo start --clear`

### Lỗi: "Reanimated 2 failed to create a worklet"
→ Giải pháp:
```bash
npx expo start --clear
```

### Lỗi: Metro bundler crash
→ Giải pháp:
```bash
# Xóa node_modules và cài lại
rm -rf node_modules
npm install
npx expo start --clear
```

## 📱 Test trên thiết bị thật

1. Cài **Expo Go** từ App Store / Google Play
2. Chạy `npm start`
3. Quét QR code

**iOS**: Dùng Camera app quét QR
**Android**: Dùng Expo Go app quét QR

## ✅ Checklist hoàn thành

- [ ] Đã cài `npm install`
- [ ] Đã tạo Firebase project
- [ ] Đã copy config vào `firebaseConfig.js`
- [ ] Đã bật Authentication Email/Password
- [ ] Đã tạo Firestore Database
- [ ] Chạy `npm start` thành công
- [ ] Đăng ký tài khoản được
- [ ] Thấy robot trên home screen
- [ ] Kéo thả robot được
- [ ] Vào tủ đồ được
- [ ] Vào cửa hàng được

## 🎉 Xong!

Giờ bạn có thể:
- Chỉnh UI trong các file `screens/*.js`
- Thêm trang phục mới vào `assets/skins/`
- Thêm tính năng mới
- Deploy lên App Store / Google Play

**Chúc code vui vẻ! 🚀**
