import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii } from '../../constants/theme';

export default function GradientChip({ label, active, onPress, style, textStyle, size = 'default' }) {
  const isCompact = size === 'compact';
  const content = (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.9}
      style={[styles.text, isCompact && styles.textCompact, active && styles.textActive, textStyle]}
    >
      {label}
    </Text>
  );

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        isCompact && styles.chipCompact,
        !active && styles.inactive,
        !active && isCompact && styles.inactiveCompact,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {active ? (
        <LinearGradient
          colors={gradients.primaryDeep}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, isCompact && styles.fillCompact]}
        >
          {content}
        </LinearGradient>
      ) : content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 40,
    minWidth: 88,
    borderRadius: radii.pill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCompact: {
    height: 34,
    minWidth: 78,
  },
  inactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(236, 232, 245, 0.78)',
    paddingHorizontal: 16,
  },
  inactiveCompact: {
    paddingHorizontal: 13,
  },
  fill: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  fillCompact: {
    height: 34,
    paddingHorizontal: 13,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.icon,
  },
  textCompact: {
    fontSize: 13,
  },
  textActive: {
    color: colors.white,
  },
});
