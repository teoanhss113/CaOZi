import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { playButtonSound } from '../utils/soundManager';
import { colors, gradients, radii, shadows } from '../constants/theme';

/**
 * activeTab: 'Home' | 'Wardrobe' | 'TodoTeams' | 'Shop'
 * navigation: react-navigation navigation object
 */
export default function BottomNavBar({
  navigation,
  activeTab,
}) {
  const tabs = [
    {
      name: 'Home',
      icon: (active) =>
        active ? (
          <Ionicons name="home" size={22} color={colors.white} />
        ) : (
          <Ionicons name="home-outline" size={22} color={colors.icon} />
        ),
    },
    {
      name: 'Wardrobe',
      icon: (active) =>
        active ? (
          <Ionicons name="paw" size={24} color={colors.white} />
        ) : (
          <Ionicons name="paw-outline" size={24} color={colors.icon} />
        ),
    },
    {
      name: 'TodoTeams',
      icon: (active) =>
        active ? (
          <MaterialCommunityIcons name="star-four-points" size={24} color={colors.white} />
        ) : (
          <MaterialCommunityIcons name="star-four-points-outline" size={24} color={colors.icon} />
        ),
    },
    {
      name: 'Shop',
      icon: (active) =>
        active ? (
          <Ionicons name="storefront" size={24} color={colors.white} />
        ) : (
          <Ionicons name="storefront-outline" size={24} color={colors.icon} />
        ),
    },
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.navButton}
            onPress={() => {
              if (!isActive) {
                playButtonSound();
                navigation.navigate(tab.name);
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[
              styles.navIconShadowWrapper,
              isActive && styles.navIconShadowWrapperActive
            ]}>
              <LinearGradient
                colors={isActive ? gradients.primaryDeep : gradients.surface}
                start={{ x: 0, y: 0 }}
                end={isActive ? { x: 1, y: 1 } : { x: 0, y: 1 }}
                style={styles.navIconCircle}
              >
                {tab.icon(isActive)}
              </LinearGradient>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  navIconShadowWrapper: {
    ...shadows.soft,
    elevation: 8,
    borderRadius: radii.pill,
  },
  navIconShadowWrapperActive: {
    ...shadows.primary,
    elevation: 10,
  },
  navIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
