import { db } from '../firebaseConfig';
import { AVATAR_FRAME_IDS } from '../constants/avatarFrames';

const ZODIAC_NAME_MAP = {
  // Vietnamese names → English names (main migration for existing users)
  'Bạch Dương': 'Aries ♈',
  'Bảo Bình': 'Aquarius ♒',
  'Bọ Cạp': 'Scorpio ♏',
  'Cự Giải': 'Cancer ♋',
  'Kim Ngưu': 'Taurus ♉',
  'Ma Kết': 'Capricorn ♑',
  'Nhân Mã': 'Sagittarius ♐',
  'Song Ngư': 'Pisces ♓',
  'Song Tử': 'Gemini ♊',
  'Sư Tử': 'Leo ♌',
  'Thiên Bình': 'Libra ♎',
  'Xử Nữ': 'Virgo ♍',

  // English without symbol → with symbol
  'Aries': 'Aries ♈',
  'Aquarius': 'Aquarius ♒',
  'Scorpio': 'Scorpio ♏',
  'Cancer': 'Cancer ♋',
  'Taurus': 'Taurus ♉',
  'Capricorn': 'Capricorn ♑',
  'Sagittarius': 'Sagittarius ♐',
  'Pisces': 'Pisces ♓',
  'Gemini': 'Gemini ♊',
  'Leo': 'Leo ♌',
  'Libra': 'Libra ♎',
  'Virgo': 'Virgo ♍',

  // Old folder-name based strings
  'Bach Duong': 'Aries ♈',
  'Bao Binh': 'Aquarius ♒',
  'Bo Cap': 'Scorpio ♏',
  'Cu Giai': 'Cancer ♋',
  'Kim Nguu': 'Taurus ♉',
  'Ma Ket': 'Capricorn ♑',
  'Nhan Ma': 'Sagittarius ♐',
  'Song Ngu': 'Pisces ♓',
  'Song Tu': 'Gemini ♊',
  'Su Tu': 'Leo ♌',
  'Thien Binh': 'Libra ♎',
  'Xu Nu': 'Virgo ♍',

  // Old test names fallback
  'Angry Dog': 'Scorpio ♏',
  'Happy Dog': 'Aries ♈',
  'Flirting Dog': 'Gemini ♊',
  'Smiling Dog': 'Cancer ♋',
  'Happy Unicorn Dog': 'Leo ♌',
};

const VALID_SKINS = [
  'Aries ♈', 'Aquarius ♒', 'Scorpio ♏', 'Cancer ♋',
  'Taurus ♉', 'Capricorn ♑', 'Sagittarius ♐', 'Pisces ♓',
  'Gemini ♊', 'Leo ♌', 'Libra ♎', 'Virgo ♍',
];

const DEFAULT_SKIN = 'Aries ♈';
const VALID_AVATAR_FRAMES = AVATAR_FRAME_IDS;
const PUBLIC_PROFILE_KEYS = ['userName', 'profilePicture', 'avatarFrame'];

const logBackgroundSyncWarning = (message, error) => {
  console.warn(message, error?.code || error?.message || error);
};

const updatePublicProfile = async (userId, data) => {
  const profile = {};
  PUBLIC_PROFILE_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) profile[key] = data[key];
  });
  if (Object.keys(profile).length === 0) return;
  await db.collection('publicProfiles').doc(userId).set({
    ...profile,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

/**
 * Lấy dữ liệu người dùng từ Firestore
 */
export const getUserData = async (userId) => {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      let data = userDoc.data();
      let needsUpdate = false;
      
      // Migrate currentSkin
      if (data.currentSkin && ZODIAC_NAME_MAP[data.currentSkin]) {
        data.currentSkin = ZODIAC_NAME_MAP[data.currentSkin];
        needsUpdate = true;
      }
      // Ensure currentSkin is valid, otherwise fallback
      if (!VALID_SKINS.includes(data.currentSkin)) {
        data.currentSkin = DEFAULT_SKIN;
        needsUpdate = true;
      }
      
      // Migrate and clean ownedSkins
      if (data.ownedSkins && Array.isArray(data.ownedSkins)) {
        let migratedSkins = data.ownedSkins.map(skin => ZODIAC_NAME_MAP[skin] || skin);
        // Deduplicate and remove any unknown skins
        migratedSkins = [...new Set(migratedSkins)].filter(skin => VALID_SKINS.includes(skin));
        
        // At least give them fallback if empty
        if (migratedSkins.length === 0) {
          migratedSkins.push(DEFAULT_SKIN);
        }

        if (JSON.stringify(data.ownedSkins) !== JSON.stringify(migratedSkins)) {
          data.ownedSkins = migratedSkins;
          needsUpdate = true;
        }
      } else {
        // Fallback for new accounts missing ownedSkins entirely
        data.ownedSkins = [DEFAULT_SKIN];
        needsUpdate = true;
      }

      if (!VALID_AVATAR_FRAMES.includes(data.avatarFrame)) {
        data.avatarFrame = 'none';
        needsUpdate = true;
      }
      
      // Auto-update DB if migration was needed
      if (needsUpdate) {
        // Run update asynchronously without blocking getting data
        db.collection('users').doc(userId).update({
          currentSkin: data.currentSkin,
          ownedSkins: data.ownedSkins,
          avatarFrame: data.avatarFrame,
          updatedAt: new Date().toISOString()
        }).catch(err => logBackgroundSyncWarning('Failed to migrate user data:', err));
      }

      updatePublicProfile(userId, data).catch(err => logBackgroundSyncWarning('Failed to sync public profile:', err));

      return data;
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

/**
 * Cập nhật dữ liệu người dùng trong Firestore
 */
export const updateUserData = async (userId, data) => {
  try {
    await db.collection('users').doc(userId).update({
      ...data,
      updatedAt: new Date().toISOString()
    });
    await updatePublicProfile(userId, data).catch(err => {
      logBackgroundSyncWarning('Failed to sync public profile:', err);
    });
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
};

/**
 * Tạo dữ liệu người dùng mới
 */
export const createUserData = async (userId, data) => {
  try {
    await db.collection('users').doc(userId).set({
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await updatePublicProfile(userId, data).catch(err => {
      logBackgroundSyncWarning('Failed to sync public profile:', err);
    });
  } catch (error) {
    console.error('Error creating user data:', error);
    throw error;
  }
};

/**
 * Lấy danh sách tất cả trang phục có sẵn từ thư mục assets/skins
 */
export const getAvailableSkins = () => {
  return ['Scorpio ♏', 'Taurus ♉'];
};

/**
 * Kiểm tra xem người dùng có sở hữu trang phục không
 */
export const hasSkin = (userData, skinName) => {
  return userData?.ownedSkins?.includes(skinName) || false;
};

/**
 * Thêm coin cho người dùng
 */
export const addCoins = async (userId, amount) => {
  try {
    const userData = await getUserData(userId);
    const newCoins = (userData?.coins || 0) + amount;
    await updateUserData(userId, { coins: newCoins });
    return newCoins;
  } catch (error) {
    console.error('Error adding coins:', error);
    throw error;
  }
};

/**
 * Trừ coin của người dùng
 */
export const deductCoins = async (userId, amount) => {
  try {
    const userData = await getUserData(userId);
    const currentCoins = userData?.coins || 0;
    
    if (currentCoins < amount) {
      throw new Error('Không đủ coin');
    }
    
    const newCoins = currentCoins - amount;
    await updateUserData(userId, { coins: newCoins });
    return newCoins;
  } catch (error) {
    console.error('Error deducting coins:', error);
    throw error;
  }
};
