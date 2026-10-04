import { NativeModules, Platform } from 'react-native';

const { CaOZLiveActivityModule } = NativeModules;

// Paused until Home Screen widgets can reliably blend into the wallpaper.
// Re-enable alongside CAOZ_HOME_WIDGET in both iOS targets (see FLOATING_PET_SETUP.md).
export const IOS_HOME_WIDGET_ENABLED = false;

const SKIN_META = {
  'Aries ♈': { shortName: 'Aries', zodiacSymbol: '♈', elementName: 'Lửa', elementColorHex: '#F97316', petAssetName: 'PetAries', assetPrefix: 'PetAries' },
  'Leo ♌': { shortName: 'Leo', zodiacSymbol: '♌', elementName: 'Lửa', elementColorHex: '#F97316', petAssetName: 'PetLeo', assetPrefix: 'PetLeo' },
  'Sagittarius ♐': { shortName: 'Sagit', zodiacSymbol: '♐', elementName: 'Lửa', elementColorHex: '#F97316', petAssetName: 'PetSagittarius', assetPrefix: 'PetSagittarius' },
  'Taurus ♉': { shortName: 'Taurus', zodiacSymbol: '♉', elementName: 'Đất', elementColorHex: '#A16207', petAssetName: 'PetTaurus', assetPrefix: 'PetTaurus' },
  'Virgo ♍': { shortName: 'Virgo', zodiacSymbol: '♍', elementName: 'Đất', elementColorHex: '#A16207', petAssetName: 'PetVirgo', assetPrefix: 'PetVirgo' },
  'Capricorn ♑': { shortName: 'Capri', zodiacSymbol: '♑', elementName: 'Đất', elementColorHex: '#A16207', petAssetName: 'PetCapricorn', assetPrefix: 'PetCapricorn' },
  'Gemini ♊': { shortName: 'Gemini', zodiacSymbol: '♊', elementName: 'Khí', elementColorHex: '#38BDF8', petAssetName: 'PetGemini', assetPrefix: 'PetGemini' },
  'Libra ♎': { shortName: 'Libra', zodiacSymbol: '♎', elementName: 'Khí', elementColorHex: '#38BDF8', petAssetName: 'PetLibra', assetPrefix: 'PetLibra' },
  'Aquarius ♒': { shortName: 'Aqua', zodiacSymbol: '♒', elementName: 'Khí', elementColorHex: '#38BDF8', petAssetName: 'PetAquarius', assetPrefix: 'PetAquarius' },
  'Cancer ♋': { shortName: 'Cancer', zodiacSymbol: '♋', elementName: 'Nước', elementColorHex: '#3B82F6', petAssetName: 'PetCancer', assetPrefix: 'PetCancer' },
  'Scorpio ♏': { shortName: 'Scorpio', zodiacSymbol: '♏', elementName: 'Nước', elementColorHex: '#3B82F6', petAssetName: 'PetScorpio', assetPrefix: 'PetScorpio' },
  'Pisces ♓': { shortName: 'Pisces', zodiacSymbol: '♓', elementName: 'Nước', elementColorHex: '#3B82F6', petAssetName: 'PetPisces', assetPrefix: 'PetPisces' },
};

const STAGE_LABELS = [
  'Đứng chờ',
  'Bám góc',
  'Chạy quanh',
  'Tạo dáng',
  'Năng lượng',
  'Vui vẻ',
  'Nghỉ nhẹ',
];

const STAGE_POSES = [
  { key: 'A1', label: 'Đứng chờ' },
  { key: 'A2', label: 'Bám góc' },
  { key: 'A3', label: 'Chạy quanh' },
  { key: 'A4', label: 'Tạo dáng' },
  { key: 'A5', label: 'Năng lượng' },
  { key: 'A6', label: 'Vui vẻ' },
  { key: 'A7', label: 'Nghỉ nhẹ' },
  { key: 'State8s', label: '8s' },
  { key: 'StateHappy3', label: 'Happy 3' },
  { key: 'StateHappy4', label: 'Happy 4' },
  { key: 'StateNhay', label: 'Nhảy' },
];

const WIDGET_STAGE_COUNT = 11;

const toAssetPart = (value) => (
  String(value || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
);

const normalizeStageIndex = (stageIndex, stageCount = 7) => {
  const count = Math.max(1, Number(stageCount) || 7);
  const numericIndex = Number(stageIndex);

  if (!Number.isFinite(numericIndex)) {
    return 0;
  }

  return ((Math.trunc(numericIndex) % count) + count) % count;
};

const getPoseMeta = (meta, options = {}) => {
  const stageCount = Number(options.stageCount) || 7;
  const normalizedStageIndex = normalizeStageIndex(options.stageIndex, stageCount);

  if (meta.assetPrefix && options.stateName) {
    const stateKey = `State${toAssetPart(options.stateName)}`;

    return {
      assetName: `${meta.assetPrefix}${stateKey}`,
      poseKey: stateKey,
      poseLabel: options.poseLabel || String(options.stateName),
      stageIndex: normalizedStageIndex,
    };
  }

  const pose = STAGE_POSES[normalizedStageIndex];
  const stageNumber = normalizedStageIndex + 1;
  const poseKey = pose?.key || `A${stageNumber}`;

  return {
    assetName: meta.assetPrefix ? `${meta.assetPrefix}${poseKey}` : meta.petAssetName,
    poseKey,
    poseLabel: options.poseLabel || pose?.label || STAGE_LABELS[normalizedStageIndex] || `Pose ${stageNumber}`,
    stageIndex: normalizedStageIndex,
  };
};

const getFallbackMeta = (skinName) => {
  const zodiacSymbol = skinName?.match(/[♈♉♊♋♌♍♎♏♐♑♒♓]/)?.[0] || '✦';
  const shortName = (skinName || 'Pet').replace(/[♈♉♊♋♌♍♎♏♐♑♒♓]/g, '').trim();

  return {
    shortName: shortName.slice(0, 6) || 'Pet',
    zodiacSymbol,
    elementName: 'CaO-Z',
    elementColorHex: '#8B5CF6',
    petAssetName: null,
    assetPrefix: null,
  };
};

export const getPetDynamicIslandPayload = (skinName, options = {}) => {
  const meta = SKIN_META[skinName] || getFallbackMeta(skinName);
  const stageCount = Number(options.stageCount) || WIDGET_STAGE_COUNT;
  const pose = getPoseMeta(meta, { ...options, stageCount });

  return {
    skinName: skinName || 'Pet',
    ...meta,
    petBaseAssetName: meta.petAssetName,
    petAssetName: pose.assetName || meta.petAssetName,
    petPoseKey: pose.poseKey,
    petPoseLabel: pose.poseLabel,
    stageIndex: pose.stageIndex,
    stageCount,
    animationFrameIndex: Number(options.animationFrameIndex) || 0,
    updatedAt: Date.now() / 1000,
  };
};

export const syncSelectedPetToWidget = async (skinName, options = {}) => {
  if (!IOS_HOME_WIDGET_ENABLED || Platform.OS !== 'ios' || !CaOZLiveActivityModule?.syncWidgetState || !skinName) {
    return { status: 'skipped' };
  }

  return CaOZLiveActivityModule.syncWidgetState(getPetDynamicIslandPayload(skinName, options));
};

export const syncSelectedPetToDynamicIsland = async (skinName, options = {}) => {
  if (Platform.OS !== 'ios' || !skinName) {
    return { status: 'skipped' };
  }

  const payload = getPetDynamicIslandPayload(skinName, options);
  let widgetResult = { status: 'skipped' };

  if (IOS_HOME_WIDGET_ENABLED && CaOZLiveActivityModule?.syncWidgetState) {
    widgetResult = await CaOZLiveActivityModule.syncWidgetState(payload);
  }

  if (!CaOZLiveActivityModule?.startOrUpdate) {
    return { status: widgetResult.status === 'synced' ? 'widget_synced' : 'skipped', widget: widgetResult };
  }

  const liveActivityResult = await CaOZLiveActivityModule.startOrUpdate(payload);

  return {
    ...liveActivityResult,
    widget: widgetResult,
  };
};

export const endPetDynamicIsland = async () => {
  if (Platform.OS !== 'ios' || !CaOZLiveActivityModule?.end) {
    return { status: 'skipped' };
  }

  return CaOZLiveActivityModule.end();
};
