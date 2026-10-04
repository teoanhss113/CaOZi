const ELEMENT_SKINS = {
  air: ['Gemini ♊', 'Libra ♎', 'Aquarius ♒'],
  water: ['Cancer ♋', 'Scorpio ♏', 'Pisces ♓'],
  fire: ['Aries ♈', 'Leo ♌', 'Sagittarius ♐'],
  earth: ['Taurus ♉', 'Virgo ♍', 'Capricorn ♑'],
};

const ALL_ZODIAC_SKINS = Object.values(ELEMENT_SKINS).flat();
export const DEFAULT_AVATAR_FRAME_ID = 'none';

const ZODIAC_FRAMES = [
  { id: 'aries', name: 'Aries ♈', requiredSkins: ['Aries ♈'], sprite: { x: 0, y: 0 } },
  { id: 'taurus', name: 'Taurus ♉', requiredSkins: ['Taurus ♉'], sprite: { x: 362, y: 0 } },
  { id: 'gemini', name: 'Gemini ♊', requiredSkins: ['Gemini ♊'], sprite: { x: 724, y: 0 } },
  { id: 'cancer', name: 'Cancer ♋', requiredSkins: ['Cancer ♋'], sprite: { x: 0, y: 344 } },
  { id: 'leo', name: 'Leo ♌', requiredSkins: ['Leo ♌'], sprite: { x: 362, y: 344 } },
  { id: 'virgo', name: 'Virgo ♍', requiredSkins: ['Virgo ♍'], sprite: { x: 724, y: 344 } },
  { id: 'libra', name: 'Libra ♎', requiredSkins: ['Libra ♎'], sprite: { x: 0, y: 687 } },
  { id: 'scorpio', name: 'Scorpio ♏', requiredSkins: ['Scorpio ♏'], sprite: { x: 362, y: 687 } },
  { id: 'sagittarius', name: 'Sagittarius ♐', requiredSkins: ['Sagittarius ♐'], sprite: { x: 724, y: 687 } },
  { id: 'capricorn', name: 'Capricorn ♑', requiredSkins: ['Capricorn ♑'], sprite: { x: 0, y: 1028 } },
  { id: 'aquarius', name: 'Aquarius ♒', requiredSkins: ['Aquarius ♒'], sprite: { x: 362, y: 1028 } },
  { id: 'pisces', name: 'Pisces ♓', requiredSkins: ['Pisces ♓'], sprite: { x: 724, y: 1028 } },
].map(frame => ({
  ...frame,
  description: frame.requiredSkins[0],
  source: require('../assets/avatar-frames/zodiac-sheet.png'),
}));

export const AVATAR_FRAMES = [
  {
    id: 'king',
    name: 'Khung King',
    description: 'Sưu tập đủ 12 cung hoàng đạo',
    source: require('../assets/avatar-frames/king-v2.png'),
    requiredSkins: ALL_ZODIAC_SKINS,
  },
  ...ZODIAC_FRAMES,
  {
    id: 'air',
    name: 'Khung Khí',
    description: 'Song Tử, Thiên Bình, Bảo Bình',
    source: require('../assets/avatar-frames/air.png'),
    requiredSkins: ELEMENT_SKINS.air,
  },
  {
    id: 'water',
    name: 'Khung Nước',
    description: 'Cự Giải, Bọ Cạp, Song Ngư',
    source: require('../assets/avatar-frames/water.png'),
    requiredSkins: ELEMENT_SKINS.water,
  },
  {
    id: 'fire',
    name: 'Khung Lửa',
    description: 'Bạch Dương, Sư Tử, Nhân Mã',
    source: require('../assets/avatar-frames/fire.png'),
    requiredSkins: ELEMENT_SKINS.fire,
  },
  {
    id: 'earth',
    name: 'Khung Đất',
    description: 'Kim Ngưu, Xử Nữ, Ma Kết',
    source: require('../assets/avatar-frames/earth.png'),
    requiredSkins: ELEMENT_SKINS.earth,
  },
  {
    id: 'none',
    name: 'Không dùng',
    description: 'Khung mặc định',
    source: null,
    requiredSkins: [],
  },
];

export const AVATAR_FRAME_IDS = AVATAR_FRAMES.map(frame => frame.id);

const DEFAULT_AVATAR_FRAME = AVATAR_FRAMES.find(frame => frame.id === DEFAULT_AVATAR_FRAME_ID);

export const getAvatarFrame = (frameId) => (
  AVATAR_FRAMES.find(frame => frame.id === frameId) || DEFAULT_AVATAR_FRAME
);

export const getAvatarFrameProgress = (frame, ownedSkins = []) => {
  const owned = new Set(ownedSkins);
  const current = frame.requiredSkins.filter(skin => owned.has(skin)).length;

  return {
    current,
    required: frame.requiredSkins.length,
    unlocked: frame.requiredSkins.length === 0 || current === frame.requiredSkins.length,
  };
};

export const getUnlockedAvatarFrameIds = (ownedSkins = []) => (
  new Set(
    AVATAR_FRAMES
      .filter(frame => getAvatarFrameProgress(frame, ownedSkins).unlocked)
      .map(frame => frame.id)
  )
);
