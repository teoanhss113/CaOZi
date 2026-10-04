import { NativeModules, Platform } from 'react-native';

const { FloatingPet } = NativeModules;

const isAvailable = Platform.OS === 'android' && !!FloatingPet;

export default {
  isSupported() {
    return isAvailable;
  },

  async checkPermission() {
    if (!isAvailable) {
      return false;
    }
    try {
      return await FloatingPet.checkOverlayPermission();
    } catch (error) {
      console.error('Error checking overlay permission:', error);
      return false;
    }
  },

  requestPermission() {
    if (!isAvailable) {
      return;
    }
    try {
      FloatingPet.requestOverlayPermission();
    } catch (error) {
      console.error('Error requesting overlay permission:', error);
    }
  },

  async start(skinName, options = {}) {
    if (!isAvailable) {
      console.warn('Floating pet only supported on Android');
      return false;
    }
    try {
      return await FloatingPet.startFloatingPet(
        skinName || 'Aries ♈',
        Number(options.size || 336)
      );
    } catch (error) {
      console.error('Error starting floating pet:', error);
      return false;
    }
  },

  async stop() {
    if (!isAvailable) {
      return false;
    }
    try {
      return await FloatingPet.stopFloatingPet();
    } catch (error) {
      console.error('Error stopping floating pet:', error);
      return false;
    }
  },

  async isActive() {
    if (!isAvailable || !FloatingPet.isFloatingPetActive) {
      return false;
    }
    try {
      return await FloatingPet.isFloatingPetActive();
    } catch (error) {
      console.error('Error checking floating pet state:', error);
      return false;
    }
  },

  setVisible(visible) {
    if (!isAvailable || !FloatingPet.setFloatingPetVisible) {
      return;
    }
    try {
      FloatingPet.setFloatingPetVisible(Boolean(visible));
    } catch (error) {
      console.error('Error setting floating pet visibility:', error);
    }
  },
};
