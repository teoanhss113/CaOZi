const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const babel = require('@babel/core');
const fs = require('node:fs');
const { PNG } = require('pngjs');

function loadModule(file, mocks = {}) {
  const exports = {};
  const filename = path.resolve(__dirname, '..', file);
  const code = babel.transformFileSync(filename, { presets: ['babel-preset-expo'] }).code;
  vm.runInNewContext(code, {
    exports, console,
    require: id => mocks[id] || (id.endsWith('.png') ? id : require(id.startsWith('.') ? path.resolve(path.dirname(filename), id) : id)),
  });
  return exports;
}

const frames = loadModule('constants/avatarFrames.js');

test('asymmetric frames center the opening, regardless of caller avatar size', () => {
  const { getAvatarGeometry } = loadModule('utils/avatarGeometry.js');
  // Measured opening centers in the 362px sprite cells, not artwork centers.
  for (const [id, x, y] of [['aries', 194, 172], ['gemini', 168.5, 170.5]]) {
    for (const size of [50, 88, 176]) {
      const frame = frames.getAvatarFrame(id);
      const g = getAvatarGeometry(frame, size);
      assert(Math.abs(g.frameLeft + x / 362 * g.frameSize - size / 2) < 0.001);
      assert(Math.abs(g.frameTop + y / 362 * g.frameSize - size / 2) < 0.001);
      assert.deepEqual(getAvatarGeometry(frame, size, size * 0.9), g);
    }
  }
});

test('every draw banner has transparent surroundings and opaque card artwork', () => {
  for (const language of ['vi', 'en']) {
    for (const variant of ['free', 'paid']) {
      const png = PNG.sync.read(fs.readFileSync(path.resolve(__dirname, `../assets/shop/draw-${variant}-${language}.png`)));
      const alpha = (x, y) => png.data[(Math.floor(y * (png.height - 1)) * png.width + Math.floor(x * (png.width - 1))) * 4 + 3];
      for (const point of [[0,0],[1,0],[0,1],[1,1],[0.5,0.02],[0.5,0.95]]) {
        assert.equal(alpha(...point), 0, `${language}/${variant} exterior ${point}`);
      }
      assert(alpha(0.5, 0.5) >= 250, `${language}/${variant} card interior`);
      assert(alpha(0.83, 0.48) >= 250, `${language}/${variant} button interior`);
    }
  }
});

test('banner selects the supplied free/paid image for both languages', () => {
  const banners = loadModule('components/ShopDrawBanner.js', {
    'react-native': { StyleSheet: { create: styles => styles } },
    '../utils/LanguageContext': {},
  });
  for (const language of ['vi', 'en']) {
    for (const paid of [false, true]) {
      assert.equal(banners.getDrawBanner(language, paid), `../assets/shop/draw-${paid ? 'paid' : 'free'}-${language}.png`);
    }
  }
});

test('zodiac ownership unlocks its matching frame; King requires 12 distinct Pets', () => {
  const zodiac = frames.AVATAR_FRAMES.filter(frame => frame.sprite);
  assert.equal(zodiac.length, 12);
  assert.equal(new Set(frames.AVATAR_FRAME_IDS).size, frames.AVATAR_FRAME_IDS.length);
  assert.equal([...frames.getUnlockedAvatarFrameIds([])].join(','), 'none');
  for (const frame of zodiac) {
    const unlocked = frames.getUnlockedAvatarFrameIds(frame.requiredSkins);
    assert(unlocked.has(frame.id));
    assert(!unlocked.has('king'));
    assert.equal(zodiac.filter(other => unlocked.has(other.id)).length, 1);
  }
  const skins = zodiac.flatMap(frame => frame.requiredSkins);
  assert(frames.getUnlockedAvatarFrameIds(skins).has('king'));
  assert(!frames.getUnlockedAvatarFrameIds([...skins.slice(1), skins[1]]).has('king'));
});

test('loading a saved profile preserves each new frame ID', async () => {
  for (const frame of frames.AVATAR_FRAMES.filter(frame => frame.sprite || frame.id === 'king')) {
    const data = { avatarFrame: frame.id, currentSkin: 'Aries ♈', ownedSkins: ['Aries ♈', ...frame.requiredSkins] };
    const updates = [];
    const db = { collection: () => ({ doc: () => ({
      get: async () => ({ exists: true, data: () => data }),
      update: async update => updates.push(update),
      set: async () => {},
    }) }) };
    const manager = loadModule('utils/dataManager.js', {
      '../firebaseConfig': { db }, '../constants/avatarFrames': frames,
    });
    assert.equal((await manager.getUserData('demo')).avatarFrame, frame.id);
    assert(updates.every(update => update.avatarFrame === frame.id));
  }
});
