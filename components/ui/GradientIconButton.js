import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, shadows } from '../../constants/theme';

export default function GradientIconButton({
  children,
  onPress,
  size = 56,
  variant = 'primaryDeep',
  style,
  contentStyle,
  activeOpacity = 0.85,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.wrapper,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
      onPress={onPress}
      activeOpacity={activeOpacity}
    >
      <LinearGradient
        colors={gradients[variant] || gradients.primaryDeep}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.fill,
          { width: size, height: size, borderRadius: size / 2 },
          contentStyle,
        ]}
      >
        {children}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    ...shadows.primary,
  },
  fill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
