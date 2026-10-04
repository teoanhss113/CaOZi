import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar
} from 'react-native';
import { getUserData, updateUserData } from '../utils/dataManager';
import { getPetPreviewAnimation } from '../utils/skinAnimations';
import { auth } from '../firebaseConfig';
import BottomNavBar from '../components/BottomNavBar';
import { playButtonSound } from '../utils/soundManager';
import { syncSelectedPetToDynamicIsland } from '../utils/dynamicIsland';
import PetDetailModal from '../components/PetDetailModal';
import GradientBadge from '../components/ui/GradientBadge';
import GradientButton from '../components/ui/GradientButton';
import { useAppAlert } from '../components/ui/AppAlert';
import PetPreview from '../components/PetPreview';
import { colors, radii, shadows, typography } from '../constants/theme';
import { useTranslation } from '../utils/LanguageContext';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

const WardrobeSkinItem = React.memo(({
  item,
  isSelected,
  onPress,
  onEquip,
  t,
}) => {
  const animation = getPetPreviewAnimation(item);

  return (
    <TouchableOpacity
      style={[styles.skinCard, isSelected && styles.skinCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardInner}>
        {animation && (
          <View style={styles.animationContainer}>
            <PetPreview
              source={animation}
              size={ITEM_WIDTH - 18}
              scale={0.66}
              loop
            />
          </View>
        )}
        <View style={styles.skinInfo}>
          <Text style={styles.skinName} numberOfLines={2}>{item}</Text>
          {isSelected && (
            <GradientBadge
              label={`✓ ${t('pet.active')}`}
              size="control"
              style={styles.petStateControl}
              contentStyle={styles.petStateContent}
            />
          )}
          {!isSelected && (
            <GradientButton
              title={t('pet.select')}
              style={styles.petStateControl}
              contentStyle={styles.petActionContent}
              textStyle={styles.petActionText}
              onPress={(event) => {
                event?.stopPropagation?.();
                onEquip(item);
              }}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function WardrobeScreen({ navigation }) {
  const appAlert = useAppAlert();
  const { t } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
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
      appAlert.alert(t('common.error'), t('wardrobe.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSkin = async (skinName) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateUserData(user.uid, { currentSkin: skinName });
        syncSelectedPetToDynamicIsland(skinName).catch((error) => {
          console.log('Dynamic Island sync skipped:', error?.message || error);
        });
        setUserData({ ...userData, currentSkin: skinName });
        setSelectedDetailSkin(null); // Close modal when equipped
        appAlert.alert(t('common.success'), t('wardrobe.equipped', { skinName }));
      }
    } catch (error) {
      console.error('Error updating skin:', error);
      appAlert.alert(t('common.error'), t('wardrobe.equipFailed'));
    }
  };

  const renderSkinItem = ({ item }) => {
    const isSelected = userData?.currentSkin === item;
    return (
      <WardrobeSkinItem 
        item={item} 
        isSelected={isSelected}
        onPress={() => { playButtonSound(); setSelectedDetailSkin(item); }}
        onEquip={(skinName) => {
          playButtonSound();
          handleSelectSkin(skinName);
        }}
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
        <Text style={styles.title}>{t('screen.myPets')}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{userData?.ownedSkins?.length || 0} Pet</Text>
        </View>
      </View>

      <FlatList
        data={userData?.ownedSkins || []}
        renderItem={renderSkinItem}
        keyExtractor={(item) => item}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
      />

      <BottomNavBar navigation={navigation} activeTab="Wardrobe" />

      <PetDetailModal
        visible={selectedDetailSkin !== null}
        skinName={selectedDetailSkin}
        isOwned={true} // In Wardrobe, all listed are owned
        isEquipped={userData?.currentSkin === selectedDetailSkin}
        onClose={() => setSelectedDetailSkin(null)}
        onEquip={handleSelectSkin}
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    ...typography.title,
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.md,
    alignSelf: 'flex-start',
    ...shadows.soft,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
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
  },
  cardInner: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  skinCardSelected: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  animationContainer: {
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    height: ITEM_WIDTH,
    overflow: 'visible',
  },
  skinPreview: {
    width: ITEM_WIDTH - 32,
    height: ITEM_WIDTH - 32,
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
    marginBottom: 6,
  },
  petStateControl: {
    width: '100%',
    marginTop: 4,
  },
  petStateContent: {
    minHeight: 38,
    borderRadius: radii.md,
  },
  petActionContent: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: radii.md,
  },
  petActionText: {
    fontSize: 14,
  },
});
