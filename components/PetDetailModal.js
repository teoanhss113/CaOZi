import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { getStageAnimations } from '../utils/skinAnimations';
import { GlobalAnimationState } from '../utils/GlobalAnimationState';
import { playButtonSound } from '../utils/soundManager';
import GradientBadge from './ui/GradientBadge';
import GradientButton from './ui/GradientButton';
import AppModal from './ui/AppModal';
import { colors, radii } from '../constants/theme';
import { useTranslation } from '../utils/LanguageContext';

const { width } = Dimensions.get('window');

export default function PetDetailModal({ 
  visible, 
  onClose, 
  skinName, 
  isOwned, 
  isEquipped, 
  onEquip 
}) {
  const { t } = useTranslation();
  const [globalAnimIndex, setGlobalAnimIndex] = useState(GlobalAnimationState.getIndex());
  const animations = skinName ? getStageAnimations(skinName) : [];

  useEffect(() => {
    let subscription;
    let unregister;
    if (visible && animations.length > 0) {
      // Register as timing leader while viewing details
      unregister = GlobalAnimationState.registerLeader('modal-leader');
      
      // Keep up to date with global animation index while modal is open
      subscription = GlobalAnimationState.subscribe((newIndex) => {
        setGlobalAnimIndex(newIndex);
      });
    }
    return () => {
      if (subscription) subscription.remove();
      if (unregister) unregister();
    };
  }, [visible, animations.length]);

  if (!visible || !skinName) return null;

  const animation = animations.length > 0 ? animations[globalAnimIndex % animations.length] : null;
  const badge = isOwned ? (
    isEquipped ? (
      <GradientBadge label={t('pet.active')} size="control" />
    ) : (
      <GradientBadge label={t('pet.owned')} size="control" />
    )
  ) : (
    <GradientBadge label={t('pet.unavailable')} variant="muted" size="control" />
  );
  const footer = (
    <View style={styles.footer}>
      {isOwned && !isEquipped && onEquip && (
        <GradientButton
          style={styles.actionButton}
          onPress={() => {
            playButtonSound();
            onEquip(skinName);
          }}
        >
          <View style={styles.gradientButtonContent}>
            <Ionicons name="paw-outline" size={24} color={colors.white} />
            <Text style={styles.actionButtonText}>{t('pet.select')}</Text>
          </View>
        </GradientButton>
      )}
      
      {(!isOwned || isEquipped || !onEquip) && (
        <TouchableOpacity
          style={[styles.actionButton, styles.neutralButton]}
          activeOpacity={0.8}
          onPress={() => { playButtonSound(); onClose(); }}
        >
          <Text style={styles.neutralButtonText}>{t('common.close')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <AppModal
      visible={visible}
      title={skinName}
      onClose={onClose}
      footer={footer}
      bodyStyle={styles.body}
    >
      <View style={styles.header}>
        {badge}
      </View>

      <View style={styles.animationWrapper}>
        {animation && (
          <LottieView
            key={`modal-${skinName}-${globalAnimIndex}`}
            source={animation}
            autoPlay
            loop={animations.length === 1}
            onAnimationFinish={() => {
              if (animations.length > 1) {
                GlobalAnimationState.incrementIndex('modal-leader');
              }
            }}
            style={styles.lottie}
          />
        )}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  animationWrapper: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 1000, // Circular background
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 4,
    borderColor: colors.border,
  },
  lottie: {
    width: '82.5%',
    height: '82.5%',
  },
  footer: {
    width: '100%',
  },
  actionButton: {
    width: '100%',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  gradientButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  neutralButton: {
    backgroundColor: colors.surfaceSoft,
    paddingVertical: 16,
    alignItems: 'center',
  },
  neutralButtonText: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '700',
  },
});
