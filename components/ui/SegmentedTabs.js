import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radii, shadows } from '../../constants/theme';

const SEGMENTED_TAB_RADIUS = 18;

export default function SegmentedTabs({ items, value, onChange, style, variant }) {
  return (
    <View style={[styles.container, style]}>
      {items.map((item) => {
        const active = item.value === value;
        const content = (
          <>
            {item.icon ? item.icon(active) : null}
            <Text style={[styles.text, active && (variant === 'soft' ? styles.softText : styles.textActive)]}>{item.label}</Text>
          </>
        );

        return (
          <TouchableOpacity
            key={item.value}
            style={[styles.tab, !active && styles.tabInactive, active && variant === 'soft' && styles.softActive]}
            onPress={() => onChange(item.value)}
            activeOpacity={0.82}
          >
            {active && variant !== 'soft' ? (
              <LinearGradient
                colors={gradients.primaryDeep}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.activeFill}
              >
                {content}
              </LinearGradient>
            ) : content}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  softText: { color: '#7B61FF' },
  softActive: { backgroundColor: '#EDE9FF', borderWidth: 1, borderColor: '#E4DCFF' },
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    flex: 1,
    minHeight: 54,
    borderRadius: SEGMENTED_TAB_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
  },
  tabInactive: {
    backgroundColor: colors.surfaceSoft,
  },
  activeFill: {
    width: '100%',
    height: '100%',
    borderRadius: SEGMENTED_TAB_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadows.primary,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.icon,
  },
  textActive: {
    color: colors.white,
  },
});
