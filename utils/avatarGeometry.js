import apertures from '../constants/avatarApertures.json';

// Align the transparent opening, not the bounding box of the decorative artwork.
export function getAvatarGeometry(frame, size, avatarSize) {
  const aperture = apertures[frame.id];
  const frameSize = size * (aperture ? 0.92 : 1);
  const diameter = aperture ? frameSize * aperture.diameter : (avatarSize || size * 0.68);
  return {
    diameter,
    avatarLeft: (size - diameter) / 2,
    avatarTop: (size - diameter) / 2,
    frameSize,
    frameLeft: aperture ? size / 2 - aperture.x * frameSize : 0,
    frameTop: aperture ? size / 2 - aperture.y * frameSize : 0,
  };
}
