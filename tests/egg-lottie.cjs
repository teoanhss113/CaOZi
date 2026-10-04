const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '../assets/animations/egg');
const report = require('../assets/animations/egg/conversion.json');

for (const info of report.results) {
  test(`${info.file}: complete embedded sequence with correct timing`, () => {
    const animation = JSON.parse(fs.readFileSync(path.join(root, info.file)));
    assert.equal(animation.w, 256);
    assert.equal(animation.h, 256);
    assert.equal(animation.ip, 0);
    assert.equal(animation.op, info.frames);
    assert.equal(animation.fr, 30000 / 1001);
    assert.equal(animation.layers.length, info.frames);
    const ids = new Set(animation.assets.map(asset => asset.id));
    assert.equal(ids.size, animation.assets.length);
    for (let i = 0; i < info.frames; i++) {
      const layer = animation.layers[i];
      assert.equal(layer.ty, 2);
      assert(ids.has(layer.refId));
      assert.equal(layer.ip, i);
      assert.equal(layer.op, i + 1); // No blank gap or overlapping video frames.
    }
    for (const asset of animation.assets) {
      assert.equal(asset.e, 1);
      assert.equal(asset.u, '');
      assert(asset.p.startsWith('data:image/png;base64,'));
      const png = PNG.sync.read(Buffer.from(asset.p.split(',')[1], 'base64'));
      assert.equal(png.width, 256);
      assert.equal(png.height, 256);
      if (info.file.includes('Rung')) {
        assert.equal(png.data[3], 0, 'Egg background is transparent');
      } else {
        assert(png.data[3] < 255, 'Light has alpha instead of an opaque black background');
      }
      if (info.file.includes('Phat Sang')) {
        for (let pixel = 0; pixel < png.data.length; pixel += 4) {
          assert.equal(png.data[pixel], png.data[pixel + 1]);
          assert.equal(png.data[pixel + 1], png.data[pixel + 2]);
        }
      }
    }
  });
}

test('glow ends immediately before the recorded Pet appears', () => {
  assert.equal(report.firstExcludedPetFrame, 38);
  assert.equal(report.results[1].frames, 38);
  assert.equal(report.results[0].frames, 132);
});

test('generated application config uses both restored effects', () => {
  const config = fs.readFileSync(path.resolve(__dirname, '../utils/skinAnimations.js'), 'utf8');
  for (const info of report.results) assert(config.includes(`../assets/animations/egg/${info.file}`));
});
