import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, shadows } from '../../constants/theme';

const STAT_CARD_RADIUS = 16;
const STAT_CARD_HEIGHT = 104;

export default function MissionStatCard({ value, label, icon, variant = 'default', gradientColors }) {
  const isGradient = variant === 'gradient';
  const iconColor = isGradient ? colors.white : colors.primary;
  const iconNode = React.isValidElement(icon)
    ? icon
    : typeof icon === 'string'
      ? <Ionicons name={icon} size={24} color={iconColor} />
      : null;

  const content = (
    <>
      <View style={styles.row}>
        <Text style={[styles.value, isGradient && styles.gradientText]}>{value}</Text>
        {iconNode}
      </View>
      <Text style={[styles.label, isGradient && styles.gradientText]}>{label}</Text>
    </>
  );

  if (isGradient) {
    return (
      <View style={styles.gradientOuter}>
        <LinearGradient
          colors={gradientColors || gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, styles.gradientCard]}
        >
          <View pointerEvents="none" style={styles.shineLayer}>
            <LinearGradient
              colors={[
                'rgba(248, 232, 255, 0.13)',
                'rgba(235, 207, 255, 0.045)',
                'rgba(230, 198, 255, 0)',
              ]}
              locations={[0, 0.24, 0.56]}
              start={{ x: 1, y: 0 }}
              end={{ x: 0.28, y: 0.78 }}
              style={styles.effectFill}
            />
            <LinearGradient
              colors={[
                'rgba(75, 31, 204, 0.24)',
                'rgba(75, 31, 204, 0.065)',
                'rgba(83, 38, 214, 0)',
              ]}
              locations={[0, 0.3, 0.68]}
              start={{ x: 0, y: 1 }}
              end={{ x: 0.72, y: 0.34 }}
              style={styles.effectFill}
            />
            <LinearGradient
              colors={[
                'rgba(75, 31, 204, 0.075)',
                'rgba(75, 31, 204, 0.018)',
                'rgba(75, 31, 204, 0)',
              ]}
              locations={[0, 0.42, 0.74]}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={styles.effectFill}
            />
            <View style={styles.highlightRim} />
          </View>
          <View style={styles.content}>{content}</View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.content}>{content}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: STAT_CARD_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: STAT_CARD_RADIUS,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 17,
    ...shadows.card,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  gradientOuter: {
    flex: 1,
    minHeight: STAT_CARD_HEIGHT,
    borderRadius: STAT_CARD_RADIUS,
    shadowColor: '#7A3DFF',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 9,
  },
  value: {
    fontSize: 31,
    lineHeight: 37,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  gradientCard: {
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: STAT_CARD_RADIUS,
    overflow: 'hidden',
  },
  gradientText: {
    color: colors.white,
  },
  shineLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  effectFill: {
    ...StyleSheet.absoluteFillObject,
  },
  highlightRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: STAT_CARD_RADIUS,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderTopColor: 'rgba(255, 244, 255, 0.2)',
    borderRightColor: 'rgba(255, 244, 255, 0.1)',
  },
});
