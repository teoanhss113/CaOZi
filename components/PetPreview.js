import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

export default function PetPreview({
  source,
  onAnimationFinish,
  size,
  scale = 0.92,
  loop = false,
  speed = 1,
  style,
}) {
  if (!source) return null;

  return (
    <View style={[styles.frame, { width: size, height: size }, style]}>
      <LottieView
        source={source}
        autoPlay
        loop={loop}
        speed={speed}
        resizeMode="contain"
        onAnimationFinish={onAnimationFinish}
        style={[
          styles.lottie,
          {
            width: size,
            height: size,
            transform: [{ scale }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  lottie: {
    overflow: 'visible',
  },
});
