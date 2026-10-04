const fs = require('fs');
const path = require('path');

const PETS_DIR = path.join(__dirname, 'assets', 'Pets');
const OUTPUT_FILE = path.join(__dirname, 'utils', 'skinAnimations.js');

// Map folder names to display names with zodiac symbols
const ZODIAC_DISPLAY_NAMES = {
  'Aquarius': 'Aquarius ♒',
  'Aries': 'Aries ♈',
  'Cancer': 'Cancer ♋',
  'Capricorn': 'Capricorn ♑',
  'Gemini': 'Gemini ♊',
  'Leo': 'Leo ♌',
  'Libra': 'Libra ♎',
  'Pisces': 'Pisces ♓',
  'Sagittarius': 'Sagittarius ♐',
  'Scorpio': 'Scorpio ♏',
  'Taurus': 'Taurus ♉',
  'Virgo': 'Virgo ♍',
};

// Use 256 resolution for mobile to reduce bundle size
const RESOLUTION = '256';

// Keep the full seven-stage sequence only for the initial Pet set. Every other
// Pet uses its lightweight homescreen animation so all 12 remain visible and
// selectable without putting the entire ~187 MB stage library in the JS bundle.
const FULL_STAGE_PETS = new Set(['Aries', 'Scorpio', 'Taurus']);
const PET_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

function getPetFolders() {
  return fs.readdirSync(PETS_DIR)
    .filter(item => {
      const fullPath = path.join(PETS_DIR, item);
      return fs.statSync(fullPath).isDirectory()
        && !item.startsWith('.')
        && Boolean(ZODIAC_DISPLAY_NAMES[item]);
    })
    .sort((a, b) => PET_ORDER.indexOf(a) - PET_ORDER.indexOf(b));
}

function getStageFiles(petFolder) {
  const stagesDir = path.join(PETS_DIR, petFolder, RESOLUTION, 'stages_1');
  if (!fs.existsSync(stagesDir)) return [];
  return fs.readdirSync(stagesDir)
    .filter(file => file.endsWith('.json'))
    .sort();
}

function hasFile(petFolder, filename) {
  return fs.existsSync(path.join(PETS_DIR, petFolder, RESOLUTION, filename));
}

function generateConfig() {
  const pets = getPetFolders();

  let output = '// This file is auto-generated. Do not edit manually.\n';
  output += '// Run: npm run generate-skins to regenerate\n\n';

  // Shared effects restored from the surviving videos. Per-Pet gacha clips
  // contain a Pet reveal and must not be substituted for the egg shake.
  output += `// Gacha base animations (egg shake, then light only)\n`;
  output += `export const GACHA_BASE = {\n`;
  output += `  rung: require('../assets/animations/egg/D2_Trung_Rung_256x256.json'),\n`;
  output += `  phatSang: require('../assets/animations/egg/D2_Trung_Phat Sang_256x256.json'),\n`;
  output += `};\n\n`;

  // ── STAGE_ANIMATIONS: per-pet stage sequences (A1–A7) ──
  output += 'const STAGE_ANIMATIONS = {\n';

  pets.forEach(pet => {
    const displayName = ZODIAC_DISPLAY_NAMES[pet] || pet;
    const stageFiles = FULL_STAGE_PETS.has(pet) ? getStageFiles(pet) : [];

    if (stageFiles.length === 0 && !hasFile(pet, 'homescreen.json')) {
      console.warn(`⚠️  Warning: No stage files found for "${pet}"`);
      return;
    }

    output += `  '${displayName}': [\n`;
    if (stageFiles.length > 0) {
      stageFiles.forEach(file => {
        output += `    require('../assets/Pets/${pet}/${RESOLUTION}/stages_1/${file}'),\n`;
      });
    } else {
      output += `    require('../assets/Pets/${pet}/${RESOLUTION}/homescreen.json'),\n`;
    }
    output += `  ],\n`;

    console.log(`✓ ${displayName}: ${stageFiles.length || 1} playback animation(s)`);
  });

  output += '};\n\n';

  // ── ROBOT_ANIMATIONS: per-pet homescreen idle animation ──
  output += 'const ROBOT_ANIMATIONS = {\n';

  pets.forEach(pet => {
    const displayName = ZODIAC_DISPLAY_NAMES[pet] || pet;
    if (hasFile(pet, 'homescreen.json')) {
      output += `  '${displayName}': require('../assets/Pets/${pet}/${RESOLUTION}/homescreen.json'),\n`;
    }
  });

  output += '};\n\n';

  // ── PREVIEW_ANIMATIONS: one structurally identical gesture for all skins ──
  // happy_4 is 84 frames / 2.803 seconds for every Pet, so list previews stay
  // visually consistent while only the character artwork changes.
  output += 'const PREVIEW_ANIMATIONS = {\n';

  pets.forEach(pet => {
    const displayName = ZODIAC_DISPLAY_NAMES[pet] || pet;
    if (hasFile(pet, 'states_2/happy_4.json')) {
      output += `  '${displayName}': require('../assets/Pets/${pet}/${RESOLUTION}/states_2/happy_4.json'),\n`;
    }
  });

  output += '};\n\n';

  // ── GACHA_ANIMATIONS: per-pet gacha animation ──
  output += 'const GACHA_ANIMATIONS = {\n';

  pets.filter(pet => FULL_STAGE_PETS.has(pet)).forEach(pet => {
    const displayName = ZODIAC_DISPLAY_NAMES[pet] || pet;
    if (hasFile(pet, 'gacha.json')) {
      output += `  '${displayName}': require('../assets/Pets/${pet}/${RESOLUTION}/gacha.json'),\n`;
    }
  });

  output += '};\n\n';

  // ── PET_CONFIG: per-pet display configuration ──
  output += 'const PET_CONFIG = {\n';
  output += '  default: { scale: 1.0 },\n';
  output += '};\n\n';

  // ── Export functions ──

  output += `export const getStageAnimations = (skinName) => {\n`;
  output += `  return STAGE_ANIMATIONS[skinName] || [];\n`;
  output += `};\n\n`;

  // Legacy alias
  output += `export const getSkinAnimations = getStageAnimations;\n\n`;

  output += `export const getAllSkinNames = () => {\n`;
  output += `  return Object.keys(STAGE_ANIMATIONS);\n`;
  output += `};\n\n`;

  output += `export const getRandomAnimation = (skinName) => {\n`;
  output += `  const animations = getStageAnimations(skinName);\n`;
  output += `  if (animations.length === 0) return null;\n`;
  output += `  return animations[Math.floor(Math.random() * animations.length)];\n`;
  output += `};\n\n`;

  output += `export const getRobotAnimation = (skinName) => {\n`;
  output += `  return ROBOT_ANIMATIONS[skinName] || GACHA_ANIMATIONS[skinName] || null;\n`;
  output += `};\n\n`;

  output += `export const getPetPreviewAnimation = (skinName) => {\n`;
  output += `  return PREVIEW_ANIMATIONS[skinName] || ROBOT_ANIMATIONS[skinName] || null;\n`;
  output += `};\n\n`;

  output += `export const getPetConfig = (skinName) => {\n`;
  output += `  return PET_CONFIG[skinName] || PET_CONFIG.default;\n`;
  output += `};\n`;

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

  console.log(`\n✅ Generated ${OUTPUT_FILE}`);
  console.log(`📦 Total active pets: ${pets.length}`);
}

try {
  console.log('🔍 Scanning assets/Pets directory...\n');
  generateConfig();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
