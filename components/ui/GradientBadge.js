import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii } from '../../constants/theme';

export default function GradientBadge({
  label,
  children,
  variant = 'primary',
  style,
  contentStyle,
  textStyle,
  size = 'default',
}) {
  const isMuted = variant === 'muted';
  const fill = isMuted ? gradients.soft : gradients[variant] || gradients.primaryDeep;
  const isControl = size === 'control';

  return (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={fill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.content,
          isControl && styles.contentControl,
          isMuted && styles.contentMuted,
          contentStyle,
        ]}
      >
        {children || (
          <Text
            style={[
              styles.text,
              isControl && styles.textControl,
              isMuted && styles.textMuted,
              textStyle,
            ]}
          >
            {label}
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  content: {
    minHeight: 28,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  contentControl: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  contentMuted: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  textControl: {
    fontSize: 14,
  },
  textMuted: {
    color: colors.textMuted,
  },
});
