# Avatar frame assets — 2026-10-04

The supplied zodiac sheet and King artwork were processed with the built-in imagegen tool to create transparent overlays. Original inputs remain unchanged in Downloads.

Outputs: `zodiac-sheet.png` (1086 × 1448), `king-v2.png` (1254 × 1254).
The zodiac sheet is displayed using clipped image views; its measured cell coordinates are in `constants/avatarFrames.js`. Existing elemental frame IDs remain supported.

## Zodiac extraction prompt

Background extraction edit of provided zodiac avatar frame sprite sheet. Preserve all twelve ornate frames and their exact zodiac symbols/colors/designs/order. Remove ALL starfield background both outside AND inside each ring to actual transparent alpha. Remove labels and date text beneath frames. Layout a precise 3 column x 4 row grid of equal square cells on a 1536x2048 transparent canvas: Aries Taurus Gemini / Cancer Leo Virgo / Libra Scorpio Sagittarius / Capricorn Aquarius Pisces. Each ring centered within its cell with 5% margin. No new artwork, no replacement designs. Transparent holes for user avatar photos. Save output file.

## King extraction prompt

Background extraction edit. Preserve exactly the blue and gold King avatar ring from the input. Remove black background and ALL starfield and center star INSIDE ring, leaving actual transparent alpha both outside and inside so a user photo shows through. Crop composition to square canvas tightly around full ring and its small base with 5% padding. Do not redesign or change ornamentation, colors or shape. No text. Save PNG file.

## Aperture calibration

`constants/avatarApertures.json` records the normalized center and diameter of each transparent opening. `scripts/measure-avatar-apertures.cjs` reads alpha pixels to regenerate these measurements; it does not edit artwork. `utils/avatarGeometry.js` centers the opening over the avatar and fits its backing circle consistently across profile, header, and collection thumbnails. Re-run calibration whenever frame images change.
