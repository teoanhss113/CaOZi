const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const PETS_DIR = path.join(__dirname, 'assets', 'Pets');
const OUTPUT_DIR = path.join(
  __dirname,
  'ios',
  'CaOZDynamicIsland',
  'PetAssets.xcassets'
);

const DATA_URI_PREFIX = 'data:image/png;base64,';
const ANIMATION_FRAME_COUNT = 8;
const SOURCE_PET_SIZE = '512';
const OUTPUT_IMAGE_MAX_SIZE = 512;

function toAssetPart(value) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toStageKey(fileName) {
  const match = path.basename(fileName, '.json').match(/^A(\d+)/i);
  return match ? `A${match[1]}` : toAssetPart(path.basename(fileName, '.json'));
}

function toStateKey(fileName) {
  return `State${toAssetPart(path.basename(fileName, '.json'))}`;
}

function sortStageFiles(left, right) {
  const leftMatch = left.match(/^A(\d+)/i);
  const rightMatch = right.match(/^A(\d+)/i);

  if (leftMatch && rightMatch) {
    return Number(leftMatch[1]) - Number(rightMatch[1]);
  }

  return left.localeCompare(right);
}

function getAlphaScore(buffer) {
  const png = PNG.sync.read(buffer);
  let score = 0;

  for (let index = 3; index < png.data.length; index += 4) {
    score += png.data[index];
  }

  return score;
}

function resizePngBuffer(buffer) {
  const source = PNG.sync.read(buffer);
  const maxDimension = Math.max(source.width, source.height);

  if (maxDimension <= OUTPUT_IMAGE_MAX_SIZE) {
    return buffer;
  }

  const scale = OUTPUT_IMAGE_MAX_SIZE / maxDimension;
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const output = new PNG({ width, height });

  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor(y / scale));

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor(x / scale));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const outputIndex = (y * width + x) * 4;

      output.data[outputIndex] = source.data[sourceIndex];
      output.data[outputIndex + 1] = source.data[sourceIndex + 1];
      output.data[outputIndex + 2] = source.data[sourceIndex + 2];
      output.data[outputIndex + 3] = source.data[sourceIndex + 3];
    }
  }

  return PNG.sync.write(output);
}

function getEmbeddedFrameCandidates(animationPath) {
  const animation = JSON.parse(
    fs.readFileSync(animationPath, 'utf8')
  );

  const candidates = (animation.assets || [])
    .map((asset) => asset.p)
    .filter((source) => source?.startsWith(DATA_URI_PREFIX))
    .map((source) => {
      const buffer = Buffer.from(source.slice(DATA_URI_PREFIX.length), 'base64');
      return { buffer, score: getAlphaScore(buffer) };
    })
    .filter((candidate) => candidate.score > 0);

  if (candidates.length === 0) {
    throw new Error(`No embedded PNG frames found in ${animationPath}`);
  }

  return candidates;
}

function getRepresentativeFrameFromAnimation(animationPath) {
  const candidates = getEmbeddedFrameCandidates(animationPath);

  return candidates.reduce((best, candidate) => (
    candidate.score > best.score ? candidate : best
  )).buffer;
}

function getSampledFramesFromAnimation(animationPath) {
  const candidates = getEmbeddedFrameCandidates(animationPath);
  const frames = [];

  for (let index = 0; index < ANIMATION_FRAME_COUNT; index += 1) {
    const candidateIndex = Math.min(
      candidates.length - 1,
      Math.floor((index * candidates.length) / ANIMATION_FRAME_COUNT)
    );
    frames.push(candidates[candidateIndex].buffer);
  }

  return frames;
}

function writeImageSet(assetName, buffer) {
  const imageSetDir = path.join(OUTPUT_DIR, `${assetName}.imageset`);
  const imageFileName = `${assetName}.png`;
  const outputBuffer = resizePngBuffer(buffer);

  fs.mkdirSync(imageSetDir, { recursive: true });
  fs.writeFileSync(path.join(imageSetDir, imageFileName), outputBuffer);
  writeJSON(path.join(imageSetDir, 'Contents.json'), {
    images: [
      {
        filename: imageFileName,
        idiom: 'universal',
        scale: '1x',
      },
      {
        idiom: 'universal',
        scale: '2x',
      },
      {
        idiom: 'universal',
        scale: '3x',
      },
    ],
    info: {
      author: 'xcode',
      version: 1,
    },
    properties: {
      'preserves-vector-representation': false,
    },
  });
}

function writeAnimatedImageSet(assetName, animationPath) {
  const representativeFrame = getRepresentativeFrameFromAnimation(animationPath);
  const sampledFrames = getSampledFramesFromAnimation(animationPath);

  writeImageSet(assetName, representativeFrame);
  sampledFrames.forEach((frame, frameIndex) => {
    writeImageSet(`${assetName}Frame${frameIndex}`, frame);
  });

  return sampledFrames.length + 1;
}

function writeJSON(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function generateAssets() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  writeJSON(path.join(OUTPUT_DIR, 'Contents.json'), {
    info: {
      author: 'xcode',
      version: 1,
    },
  });

  const petNames = fs.readdirSync(PETS_DIR)
    .filter((petName) => {
      const petPath = path.join(PETS_DIR, petName);
      return !petName.startsWith('.') && fs.statSync(petPath).isDirectory();
    })
    .sort();

  let generatedCount = 0;

  petNames.forEach((petName) => {
    const assetPrefix = `Pet${toAssetPart(petName)}`;
    const stagesDir = path.join(PETS_DIR, petName, SOURCE_PET_SIZE, 'stages_1');
    const statesDir = path.join(PETS_DIR, petName, SOURCE_PET_SIZE, 'states_2');
    const stageFiles = fs.readdirSync(stagesDir)
      .filter((fileName) => fileName.endsWith('.json'))
      .sort(sortStageFiles);

    if (stageFiles.length === 0) {
      throw new Error(`No stage animation found for ${petName}`);
    }

    let defaultAnimationPath = null;
    stageFiles.forEach((stageFile) => {
      const animationPath = path.join(stagesDir, stageFile);
      const assetName = `${assetPrefix}${toStageKey(stageFile)}`;

      if (!defaultAnimationPath) {
        defaultAnimationPath = animationPath;
        generatedCount += writeAnimatedImageSet(assetPrefix, animationPath);
      }

      generatedCount += writeAnimatedImageSet(assetName, animationPath);
      console.log(`✓ ${petName} ${toStageKey(stageFile)} → ${assetName}`);
    });

    if (fs.existsSync(statesDir)) {
      fs.readdirSync(statesDir)
        .filter((fileName) => fileName.endsWith('.json'))
        .sort()
        .forEach((stateFile) => {
          const assetName = `${assetPrefix}${toStateKey(stateFile)}`;
          const animationPath = path.join(statesDir, stateFile);

          generatedCount += writeAnimatedImageSet(assetName, animationPath);
          console.log(`✓ ${petName} ${toStateKey(stateFile)} → ${assetName}`);
        });
    }
  });

  console.log(`\n✅ Generated ${generatedCount} Dynamic Island pet assets`);
}

try {
  generateAssets();
} catch (error) {
  console.error('❌ Failed to generate Dynamic Island assets:', error.message);
  process.exit(1);
}
