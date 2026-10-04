// This file is auto-generated. Do not edit manually.
// Run: npm run generate-skins to regenerate

// Gacha base animations (egg shake, then light only)
export const GACHA_BASE = {
  rung: require('../assets/animations/egg/D2_Trung_Rung_256x256.json'),
  phatSang: require('../assets/animations/egg/D2_Trung_Phat Sang_256x256.json'),
};

const STAGE_ANIMATIONS = {
  'Aries ♈': [
    require('../assets/Pets/Aries/256/stages_1/A1.json'),
    require('../assets/Pets/Aries/256/stages_1/A2.json'),
    require('../assets/Pets/Aries/256/stages_1/A3.json'),
    require('../assets/Pets/Aries/256/stages_1/A4.json'),
    require('../assets/Pets/Aries/256/stages_1/A5.json'),
    require('../assets/Pets/Aries/256/stages_1/A6.json'),
    require('../assets/Pets/Aries/256/stages_1/A7.json'),
  ],
  'Taurus ♉': [
    require('../assets/Pets/Taurus/256/stages_1/A1.json'),
    require('../assets/Pets/Taurus/256/stages_1/A2.json'),
    require('../assets/Pets/Taurus/256/stages_1/A3.json'),
    require('../assets/Pets/Taurus/256/stages_1/A4.json'),
    require('../assets/Pets/Taurus/256/stages_1/A5.json'),
    require('../assets/Pets/Taurus/256/stages_1/A6.json'),
    require('../assets/Pets/Taurus/256/stages_1/A7.json'),
  ],
  'Gemini ♊': [
    require('../assets/Pets/Gemini/256/homescreen.json'),
  ],
  'Cancer ♋': [
    require('../assets/Pets/Cancer/256/homescreen.json'),
  ],
  'Leo ♌': [
    require('../assets/Pets/Leo/256/homescreen.json'),
  ],
  'Virgo ♍': [
    require('../assets/Pets/Virgo/256/homescreen.json'),
  ],
  'Libra ♎': [
    require('../assets/Pets/Libra/256/homescreen.json'),
  ],
  'Scorpio ♏': [
    require('../assets/Pets/Scorpio/256/stages_1/A1_256x256.json'),
    require('../assets/Pets/Scorpio/256/stages_1/A2_256x256.json'),
    require('../assets/Pets/Scorpio/256/stages_1/A3_256x256.json'),
    require('../assets/Pets/Scorpio/256/stages_1/A4_256x256.json'),
    require('../assets/Pets/Scorpio/256/stages_1/A5_256x256.json'),
    require('../assets/Pets/Scorpio/256/stages_1/A6_256x256.json'),
    require('../assets/Pets/Scorpio/256/stages_1/A7_256x256.json'),
  ],
  'Sagittarius ♐': [
    require('../assets/Pets/Sagittarius/256/homescreen.json'),
  ],
  'Capricorn ♑': [
    require('../assets/Pets/Capricorn/256/homescreen.json'),
  ],
  'Aquarius ♒': [
    require('../assets/Pets/Aquarius/256/homescreen.json'),
  ],
  'Pisces ♓': [
    require('../assets/Pets/Pisces/256/homescreen.json'),
  ],
};

const ROBOT_ANIMATIONS = {
  'Aries ♈': require('../assets/Pets/Aries/256/homescreen.json'),
  'Taurus ♉': require('../assets/Pets/Taurus/256/homescreen.json'),
  'Gemini ♊': require('../assets/Pets/Gemini/256/homescreen.json'),
  'Cancer ♋': require('../assets/Pets/Cancer/256/homescreen.json'),
  'Leo ♌': require('../assets/Pets/Leo/256/homescreen.json'),
  'Virgo ♍': require('../assets/Pets/Virgo/256/homescreen.json'),
  'Libra ♎': require('../assets/Pets/Libra/256/homescreen.json'),
  'Scorpio ♏': require('../assets/Pets/Scorpio/256/homescreen.json'),
  'Sagittarius ♐': require('../assets/Pets/Sagittarius/256/homescreen.json'),
  'Capricorn ♑': require('../assets/Pets/Capricorn/256/homescreen.json'),
  'Aquarius ♒': require('../assets/Pets/Aquarius/256/homescreen.json'),
  'Pisces ♓': require('../assets/Pets/Pisces/256/homescreen.json'),
};

const PREVIEW_ANIMATIONS = {
  'Aries ♈': require('../assets/Pets/Aries/256/states_2/happy_4.json'),
  'Taurus ♉': require('../assets/Pets/Taurus/256/states_2/happy_4.json'),
  'Gemini ♊': require('../assets/Pets/Gemini/256/states_2/happy_4.json'),
  'Cancer ♋': require('../assets/Pets/Cancer/256/states_2/happy_4.json'),
  'Leo ♌': require('../assets/Pets/Leo/256/states_2/happy_4.json'),
  'Virgo ♍': require('../assets/Pets/Virgo/256/states_2/happy_4.json'),
  'Libra ♎': require('../assets/Pets/Libra/256/states_2/happy_4.json'),
  'Scorpio ♏': require('../assets/Pets/Scorpio/256/states_2/happy_4.json'),
  'Sagittarius ♐': require('../assets/Pets/Sagittarius/256/states_2/happy_4.json'),
  'Capricorn ♑': require('../assets/Pets/Capricorn/256/states_2/happy_4.json'),
  'Aquarius ♒': require('../assets/Pets/Aquarius/256/states_2/happy_4.json'),
  'Pisces ♓': require('../assets/Pets/Pisces/256/states_2/happy_4.json'),
};

const GACHA_ANIMATIONS = {
  'Aries ♈': require('../assets/Pets/Aries/256/gacha.json'),
  'Taurus ♉': require('../assets/Pets/Taurus/256/gacha.json'),
  'Scorpio ♏': require('../assets/Pets/Scorpio/256/gacha.json'),
};

const PET_CONFIG = {
  default: { scale: 1.0 },
};

export const getStageAnimations = (skinName) => {
  return STAGE_ANIMATIONS[skinName] || [];
};

export const getSkinAnimations = getStageAnimations;

export const getAllSkinNames = () => {
  return Object.keys(STAGE_ANIMATIONS);
};

export const getRandomAnimation = (skinName) => {
  const animations = getStageAnimations(skinName);
  if (animations.length === 0) return null;
  return animations[Math.floor(Math.random() * animations.length)];
};

export const getRobotAnimation = (skinName) => {
  return ROBOT_ANIMATIONS[skinName] || GACHA_ANIMATIONS[skinName] || null;
};

export const getPetPreviewAnimation = (skinName) => {
  return PREVIEW_ANIMATIONS[skinName] || ROBOT_ANIMATIONS[skinName] || null;
};

export const getPetConfig = (skinName) => {
  return PET_CONFIG[skinName] || PET_CONFIG.default;
};
