import { DeviceEventEmitter } from 'react-native';

const EVENT_NAME = 'GLOBAL_ANIMATION_INDEX_CHANGED';
let currentIndex = 0;
let lastIncrementTime = 0;

let currentLeaderId = null;

export const GlobalAnimationState = {
  getIndex: () => currentIndex,
  
  // Register as the leader. Only the leader should call incrementIndex 
  // from their onAnimationFinish event.
  registerLeader: (id) => {
    currentLeaderId = id;
    return () => {
      if (currentLeaderId === id) currentLeaderId = null;
    };
  },

  isLeader: (id) => currentLeaderId === id || currentLeaderId === null,

  incrementIndex: (id) => {
    // If someone else is a registered leader, only they can increment
    if (id && currentLeaderId && currentLeaderId !== id) return;

    const now = Date.now();
    // Throttle to prevent multiple rapid fires when skins finish at same time
    if (now - lastIncrementTime < 500) return;
    lastIncrementTime = now;
    
    currentIndex = currentIndex + 1;
    DeviceEventEmitter.emit(EVENT_NAME, currentIndex);
  },

  forceIncrementIndex: () => {
    lastIncrementTime = Date.now();
    currentIndex = currentIndex + 1;
    DeviceEventEmitter.emit(EVENT_NAME, currentIndex);
  },
  
  subscribe: (callback) => {
    return DeviceEventEmitter.addListener(EVENT_NAME, callback);
  }
};
