import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, shadows, typography } from '../../constants/theme';

export default function GradientButton({
  title,
  children,
  onPress,
  disabled,
  loading,
  variant = 'primaryDeep',
  style,
  contentStyle,
  textStyle,
  activeOpacity = 0.85,
}) {
  return (
    <TouchableOpacity
      style={[styles.wrapper, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={activeOpacity}
    >
      <LinearGradient
        colors={gradients[variant] || gradients.primaryDeep}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.content, contentStyle]}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : children || (
          <Text style={[styles.text, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radii.md,
    overflow: 'hidden',
    ...shadows.primary,
  },
  content: {
    minHeight: 52,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  text: {
    ...typography.button,
    color: colors.white,
  },
  disabled: {
    opacity: 0.6,
  },
});
