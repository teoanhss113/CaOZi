import { Audio } from 'expo-av';

let soundObject = null;

/**
 * Plays the cute_confirm sound effect.
 * Reuses and replays a single Audio.Sound instance for low latency.
 */
export const playButtonSound = async () => {
  try {
    if (!soundObject) {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/cute_confirm.wav'),
        { shouldPlay: false, volume: 1.0 }
      );
      soundObject = sound;
    }
    // Rewind to start then play (so rapid taps all trigger the sound)
    await soundObject.setPositionAsync(0);
    await soundObject.playAsync();
  } catch (e) {
    // Silently ignore – sound is non-critical
    console.warn('playButtonSound error:', e);
  }
};
