import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from '../utils/LanguageContext';

export const DRAW_BANNERS = {
  vi: {
    free: require('../assets/shop/draw-free-vi.png'),
    paid: require('../assets/shop/draw-paid-vi.png'),
  },
  en: {
    free: require('../assets/shop/draw-free-en.png'),
    paid: require('../assets/shop/draw-paid-en.png'),
  },
};

export const getDrawBanner = (language, hasUsedFreeDraw) => (
  DRAW_BANNERS[language === 'en' ? 'en' : 'vi'][hasUsedFreeDraw ? 'paid' : 'free']
);

export default function ShopDrawBanner({ hasUsedFreeDraw, onPress, disabled }) {
  const { language, t } = useTranslation();
  const source = getDrawBanner(language, hasUsedFreeDraw);
  const { width, height } = Image.resolveAssetSource(source);
  return (
    <View style={[styles.banner, { aspectRatio: width / height }]}>
      <Image source={source} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessible={false} />
      {/* Button artwork occupies this normalized rectangle in all four originals. */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${t('shop.luckyDrawTitle')}, ${hasUsedFreeDraw ? '39 coin' : t('shop.free')}`}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        activeOpacity={0.65}
        hitSlop={8}
        style={styles.drawButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { width: '100%', position: 'relative' },
  drawButton: {
    position: 'absolute', left: '72.3%', top: '36.3%',
    width: '23%', height: '24%', borderRadius: 100,
  },
});
