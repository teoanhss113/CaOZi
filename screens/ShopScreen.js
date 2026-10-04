import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserData, updateUserData } from '../utils/dataManager';
import { getAllSkinNames, getPetPreviewAnimation } from '../utils/skinAnimations';
import { auth } from '../firebaseConfig';
import LuckyDrawModal from '../components/LuckyDrawModal';
import BottomNavBar from '../components/BottomNavBar';
import { playButtonSound } from '../utils/soundManager';
import PetDetailModal from '../components/PetDetailModal';
import PetPreview from '../components/PetPreview';
import ShopDrawBanner from '../components/ShopDrawBanner';
import ZodiacFrameCollection from '../components/ZodiacFrameCollection';
import GradientBadge from '../components/ui/GradientBadge';
import { useAppAlert } from '../components/ui/AppAlert';
import { colors, gradients, radii, shadows, typography } from '../constants/theme';
import { useTranslation } from '../utils/LanguageContext';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

// Tạo danh sách trang phục tự động
const createAllSkins = () => {
  const skinNames = getAllSkinNames();
  return skinNames.map((name, index) => ({
    name,
    price: index === 0 ? 0 : 129, // Pet đầu miễn phí, các Pet khác 129 coin
  }));
};

const ALL_SKINS = createAllSkins();

const ShopSkinItem = React.memo(({ item, isOwned, onPress, t }) => {
  const animation = getPetPreviewAnimation(item.name);

  return (
    <TouchableOpacity 
      style={styles.skinCard}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.animationContainer}>
        {animation && (
          <PetPreview
            source={animation}
            size={ITEM_WIDTH - 18}
            scale={0.66}
            loop
          />
        )}
      </View>
      <View style={styles.skinInfo}>
        <Text style={styles.skinName} numberOfLines={2}>{item.name}</Text>
        {isOwned ? (
          <GradientBadge
            label={`✓ ${t('pet.owned')}`}
            size="control"
            style={styles.shopStateControl}
            contentStyle={styles.shopStateContent}
          />
        ) : (
          <View style={[styles.shopStateControl, styles.unownedBadge]}>
            <Ionicons name="lock-closed" size={14} color={colors.textSoft} />
            <Text style={styles.unownedText}>{t('pet.unavailable')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

export default function ShopScreen({ navigation }) {
  const appAlert = useAppAlert();
  const { t, language } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLuckyModal, setShowLuckyModal] = useState(false);
  const [luckyDrawResult, setLuckyDrawResult] = useState(null); // { skinName, robotAnim }
  const [selectedDetailSkin, setSelectedDetailSkin] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const data = await getUserData(user.uid);
        setUserData(data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      appAlert.alert(t('common.error'), t('shop.loadFailed'));
    } finally {
      setLoading(false);
    }
  };


  const handleLuckyEgg = async () => {
    if (!userData) return;

    const hasUsedFirstDraw = userData.hasUsedFreeDraw || false;
    const LUCKY_EGG_PRICE = hasUsedFirstDraw ? 39 : 0;

    if (LUCKY_EGG_PRICE > 0 && (userData.coins || 0) < LUCKY_EGG_PRICE) {
      appAlert.alert(t('shop.notEnoughMoney'), t('shop.needCoins', { coins: LUCKY_EGG_PRICE }));
      return;
    }

    // Lấy danh sách Pet chưa sở hữu
    const unownedSkins = ALL_SKINS.filter(
      skin => !userData.ownedSkins?.includes(skin.name) && skin.price > 0
    );

    if (unownedSkins.length === 0) {
      appAlert.alert(t('shop.allOwnedTitle'), t('shop.allOwned'));
      return;
    }

    const message = !hasUsedFirstDraw
      ? (t('shop.firstDrawConfirmFree') || t('shop.firstDrawConfirm'))
      : t('shop.drawConfirm', { coins: LUCKY_EGG_PRICE });

    appAlert.confirm(
      t('shop.luckyEgg'),
      message,
      async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                // Tỷ lệ đều cho tất cả skin
                const randomSkin = unownedSkins[Math.floor(Math.random() * unownedSkins.length)];

                const newOwnedSkins = [...(userData.ownedSkins || []), randomSkin.name];
                const newCoins = Math.max(0, (userData.coins || 0) - LUCKY_EGG_PRICE);

                await updateUserData(user.uid, {
                  ownedSkins: newOwnedSkins,
                  coins: newCoins,
                  hasUsedFreeDraw: true
                });

                setUserData({
                  ...userData,
                  ownedSkins: newOwnedSkins,
                  coins: newCoins,
                  hasUsedFreeDraw: true
                });

                // Show lucky draw animation modal
                setLuckyDrawResult({
                  skinName: randomSkin.name,
                  robotAnim: getPetPreviewAnimation(randomSkin.name),
                });
                setShowLuckyModal(true);
              }
            } catch (error) {
              console.error('Error opening lucky egg:', error);
              appAlert.alert(t('common.error'), t('shop.openFailed'));
            }
          },
      { confirmText: t('shop.open') }
    );
  };

  const renderSkinItem = ({ item }) => {
    const isOwned = userData?.ownedSkins?.includes(item.name);
    return (
      <ShopSkinItem 
        item={item} 
        isOwned={isOwned}
        onPress={() => { playButtonSound(); setSelectedDetailSkin(item.name); }}
        t={t}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>{t('screen.shop')}</Text>
        <View style={styles.coinContainer}>
          <Text style={styles.coinText}>{userData?.coins || 0}</Text>
          <Image source={require('../assets/money.png')} style={styles.moneyIcon} />
        </View>
      </View>

      <ShopDrawBanner
        hasUsedFreeDraw={!!userData?.hasUsedFreeDraw}
        onPress={() => { playButtonSound(); handleLuckyEgg(); }}
        disabled={showLuckyModal}
      />

      <FlatList
        ListHeaderComponent={(
          <ZodiacFrameCollection ownedSkins={userData?.ownedSkins || []} onSelect={(frame, progress) => {
            if (progress.unlocked) navigation.navigate('Home', { openProfile: 'profile' });
            else appAlert.alert(frame.name, language === 'en'
              ? `Collect ${frame.requiredSkins.join(', ')} to unlock this frame (${progress.current}/${progress.required}).`
              : `Sưu tập ${frame.requiredSkins.join(', ')} để mở khung (${progress.current}/${progress.required}).`);
          }} />
        )}
        data={ALL_SKINS}
        renderItem={renderSkinItem}
        keyExtractor={(item) => item.name}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews={false}
      />

      <BottomNavBar navigation={navigation} activeTab="Shop" />

      <LuckyDrawModal
        visible={showLuckyModal}
        skinName={luckyDrawResult?.skinName || ''}
        robotAnim={luckyDrawResult?.robotAnim}
        onClose={() => setShowLuckyModal(false)}
        t={t}
      />

      <PetDetailModal
        visible={selectedDetailSkin !== null}
        skinName={selectedDetailSkin}
        isOwned={userData?.ownedSkins?.includes(selectedDetailSkin)}
        isEquipped={userData?.currentSkin === selectedDetailSkin}
        onClose={() => setSelectedDetailSkin(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingCard: {
    marginTop: 100,
    marginHorizontal: 32,
    padding: 32,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    alignItems: 'center',
    ...shadows.card,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    ...typography.title,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.md,
    ...shadows.soft,
  },
  coinIcon: {
    marginRight: 6,
  },
  moneyIcon: {
    width: 28,
    height: 28,
    marginLeft: 6,
    resizeMode: 'contain',
  },
  moneyIconSmall: {
    width: 18,
    height: 18,
    marginLeft: 4,
    resizeMode: 'contain',
  },
  coinText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  luckyEggCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.primary,
  },
  luckyEggGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  luckyIconContainer: {
    position: 'relative',
  },
  sparkle1: {
    position: 'absolute',
    top: -4,
    right: -6,
  },
  sparkle2: {
    position: 'absolute',
    bottom: -2,
    left: -4,
  },
  luckyEggInfo: {
    flex: 1,
    gap: 4,
  },
  luckyEggTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 4,
  },
  luckyEggDesc: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.9,
  },
  luckyEggPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceGlass,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.md,
    gap: 4,
  },
  luckyEggPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  list: {
    padding: 16,
    paddingBottom: 120,
  },
  row: {
    justifyContent: 'space-between',
  },
  skinCard: {
    width: ITEM_WIDTH,
    marginBottom: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
    overflow: 'hidden',
  },
  animationContainer: {
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_WIDTH,
    overflow: 'visible',
  },
  skinPreview: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
  },
  skinInfo: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  skinName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10,
  },
  shopStateControl: {
    width: '100%',
    marginTop: 4,
  },
  shopStateContent: {
    minHeight: 38,
    borderRadius: radii.md,
  },
  unownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    gap: 6,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  unownedText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
});
