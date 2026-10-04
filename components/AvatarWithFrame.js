import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAvatarFrame } from '../constants/avatarFrames';
import { colors, gradients } from '../constants/theme';

import { getAvatarGeometry } from '../utils/avatarGeometry';

export default function AvatarWithFrame({
  imageUri,
  frameId = 'none',
  size = 72,
  avatarSize,
  iconSize,
  style,
}) {
  const frame = getAvatarFrame(frameId);
  const geometry = getAvatarGeometry(frame, size, avatarSize);
  const resolvedAvatarSize = geometry.diameter;
  const resolvedIconSize = Math.min(iconSize || resolvedAvatarSize * 0.48, resolvedAvatarSize * 0.55);
  const { frameSize } = geometry;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <LinearGradient
        colors={gradients.primaryDeep}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.avatar,
          {
            width: resolvedAvatarSize,
            height: resolvedAvatarSize,
            borderRadius: resolvedAvatarSize / 2,
            left: geometry.avatarLeft,
            top: geometry.avatarTop,
            borderWidth: frame.source ? 0 : 2,
          },
        ]}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{
              width: resolvedAvatarSize,
              height: resolvedAvatarSize,
              borderRadius: resolvedAvatarSize / 2,
            }}
          />
        ) : (
          <Ionicons name="person" size={resolvedIconSize} color={colors.white} />
        )}
      </LinearGradient>

      {frame.sprite ? (
        <View pointerEvents="none" style={{ position: 'absolute', width: frameSize, height: frameSize * 344 / 362, overflow: 'hidden', left: geometry.frameLeft, top: geometry.frameTop }}>
          <Image source={frame.source} resizeMode="stretch" style={{ position: 'absolute',
            width: frameSize * 1086 / 362, height: frameSize * 1448 / 362,
            left: -frame.sprite.x * frameSize / 362, top: -frame.sprite.y * frameSize / 362 }} />
        </View>
      ) : frame.source ? (
        <Image
          pointerEvents="none"
          source={frame.source}
          style={[
            styles.frame,
            {
              width: frameSize,
              height: frameSize,
              left: geometry.frameLeft,
              top: geometry.frameTop,
            },
          ]}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.white,
  },
  frame: {
    position: 'absolute',
  },
});
