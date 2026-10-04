// Rebuild self-contained raster Lotties from the two surviving video recordings.
// Usage: node scripts/restore-egg-lottie.cjs <shake.mp4> <glow-and-pet.mp4>
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const [shakePath, glowPath] = process.argv.slice(2);
if (!shakePath || !glowPath) throw new Error('Provide shake video, then glow video.');
const outputDir = path.resolve(__dirname, '../assets/animations/egg');
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'egg-lottie-'));
const size = 256;
const run = (command, args) => execFileSync(command, args, { maxBuffer: 200 * 1024 * 1024 });
const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

function probe(file) {
  const data = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height,r_frame_rate,nb_frames', '-of', 'json', file]));
  const stream = data.streams[0];
  const [num, den] = stream.r_frame_rate.split('/').map(Number);
  return { width: stream.width, height: stream.height, fps: num / den, frames: Number(stream.nb_frames) };
}

// The glow is monochrome. Stop before the first colored Pet pixels, including
// its initial small/faint appearance rather than waiting until it is full size.
function firstPetFrame(file, info) {
  const pixels = run('ffmpeg', ['-v', 'error', '-i', file, '-an', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
  const stride = info.width * info.height * 3;
  for (let frame = 0; frame < info.frames; frame++) {
    let colored = 0;
    for (let i = frame * stride; i < (frame + 1) * stride; i += 3) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 25) colored++;
    }
    if (colored > 64) return frame;
  }
  throw new Error('No Pet boundary found; inspect the glow video before converting.');
}

function convert(file, basename, kind, count, info) {
  const framesDir = path.join(workDir, kind);
  fs.mkdirSync(framesDir);
  // Recover transparency from the recordings' black background. The egg is
  // white light uses its original brightness as alpha. The egg gets a soft
  // luminance mask, eroded 1px so the black-blended rim does not leave a halo.
  const alpha = kind === 'glow'
    ? "format=rgba,geq=r=255:g=255:b=255:a='max(r(X,Y),max(g(X,Y),b(X,Y)))'"
    : "format=rgb24,split[c][m];[m]format=gray,lut=c0='clip((val-10)*255/14\\,0\\,255)',erosion,gblur=sigma=0.8[a];[c][a]alphamerge,format=rgba";
  run('ffmpeg', ['-v', 'error', '-i', file, '-an', '-filter_complex', `${alpha},scale=${size}:${size}:flags=lanczos`,
    '-frames:v', String(count), '-fps_mode', 'passthrough', '-compression_level', '9',
    path.join(framesDir, '%04d.png')]);
  const files = fs.readdirSync(framesDir).sort();
  if (files.length !== count) throw new Error(`Expected ${count} frames, got ${files.length}`);
  const animation = { v: '5.7.4', fr: info.fps, ip: 0, op: count, w: size, h: size,
    nm: basename, ddd: 0, assets: [], layers: [], markers: [] };
  const assetsByHash = new Map();
  files.forEach((fileName, index) => {
    const png = fs.readFileSync(path.join(framesDir, fileName));
    const hash = sha256(png);
    let id = assetsByHash.get(hash);
    if (!id) {
      id = `${kind}_${animation.assets.length}`;
      assetsByHash.set(hash, id);
      animation.assets.push({ id, w: size, h: size, u: '', p: `data:image/png;base64,${png.toString('base64')}`, e: 1 });
    }
    animation.layers.push({ ddd: 0, ind: index + 1, ty: 2, nm: `Frame ${index}`, refId: id, sr: 1,
      ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [0, 0, 0] },
        a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } },
      ao: 0, ip: index, op: index + 1, st: 0, bm: 0 });
  });
  const destination = path.join(outputDir, `${basename}.json`);
  fs.writeFileSync(destination, JSON.stringify(animation));
  return { source: path.basename(file), sourceSha256: sha256(fs.readFileSync(file)),
    file: path.basename(destination), sourceFrames: info.frames, frames: count,
    fps: info.fps, durationSeconds: count / info.fps, width: size, height: size,
    bytes: fs.statSync(destination).size, embeddedImages: animation.assets.length };
}

try {
  fs.mkdirSync(outputDir, { recursive: true });
  const shake = probe(shakePath), glow = probe(glowPath);
  const cut = firstPetFrame(glowPath, glow);
  const results = [
    convert(shakePath, 'D2_Trung_Rung_256x256', 'shake', shake.frames, shake),
    convert(glowPath, 'D2_Trung_Phat Sang_256x256', 'glow', cut, glow),
  ];
  fs.writeFileSync(path.join(outputDir, 'conversion.json'), JSON.stringify({
    format: 'Lottie with embedded PNG sequence; not recovered vector layers',
    firstExcludedPetFrame: cut, results,
  }, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
