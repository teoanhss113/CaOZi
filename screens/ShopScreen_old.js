import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { getUserData, updateUserData } from '../utils/dataManager';
import { getRandomAnimation, getAllSkinNames } from '../utils/skinAnimations';
import { auth } from '../firebaseConfig';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 48) / 2;

// Tạo danh sách trang phục tự động
const createAllSkins = () => {
  const skinNames = getAllSkinNames();
  return skinNames.map((name, index) => ({
    name,
    price: index === 0 ? 0 : 500, // Trang phục đầu miễn phí, các trang phục khác 500 coin
  }));
};

const ALL_SKINS = createAllSkins();

export default function ShopScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      Alert.alert('Lỗi', 'Không thể tải dữ liệu người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleBuySkin = async (skin) => {
    if (!userData) return;

    if (userData.ownedSkins?.includes(skin.name)) {
      Alert.alert('Thông báo', 'Bạn đã sở hữu trang phục này rồi!');
      return;
    }

    if (userData.coins < skin.price) {
      Alert.alert('Không đủ tiền', 'Bạn không có đủ coin để mua trang phục này!');
      return;
    }

    Alert.alert(
      'Xác nhận mua',
      `Mua trang phục ${skin.name} với giá ${skin.price} coin?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Mua',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                const newOwnedSkins = [...(userData.ownedSkins || []), skin.name];
                const newCoins = userData.coins - skin.price;
                
                await updateUserData(user.uid, {
                  ownedSkins: newOwnedSkins,
                  coins: newCoins
                });

                setUserData({
                  ...userData,
                  ownedSkins: newOwnedSkins,
                  coins: newCoins
                });

                Alert.alert('Thành công', `Đã mua trang phục ${skin.name}!`);
              }
            } catch (error) {
              console.error('Error buying skin:', error);
              Alert.alert('Lỗi', 'Không thể mua trang phục');
            }
          }
        }
      ]
    );
  };

  const handleLuckyEgg = async () => {
    if (!userData) return;

    const LUCKY_EGG_PRICE = 200;

    if (userData.coins < LUCKY_EGG_PRICE) {
      Alert.alert('Không đủ tiền', 'Bạn cần 200 coin để mở trứng may mắn!');
      return;
    }

    // Lấy danh sách trang phục chưa sở hữu
    const unownedSkins = ALL_SKINS.filter(
      skin => !userData.ownedSkins?.includes(skin.name) && skin.price > 0
    );

    if (unownedSkins.length === 0) {
      Alert.alert('Thông báo', 'Bạn đã sở hữu tất cả trang phục rồi!');
      return;
    }

    Alert.alert(
      'Trứng may mắn',
      `Mở trứng may mắn với giá ${LUCKY_EGG_PRICE} coin?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Mở',
          onPress: async () => {
            try {
              const user = auth.currentUser;
              if (user) {
                // Random một trang phục chưa có
                const randomSkin = unownedSkins[Math.floor(Math.random() * unownedSkins.length)];
                const newOwnedSkins = [...(userData.ownedSkins || []), randomSkin.name];
                const newCoins = userData.coins - LUCKY_EGG_PRICE;
                
                await updateUserData(user.uid, {
                  ownedSkins: newOwnedSkins,
                  coins: newCoins
                });

                setUserData({
                  ...userData,
                  ownedSkins: newOwnedSkins,
                  coins: newCoins
                });

                Alert.alert(
                  '🎉 Chúc mừng!',
                  `Bạn đã nhận được trang phục ${randomSkin.name}!`
                );
              }
            } catch (error) {
              console.error('Error opening lucky egg:', error);
              Alert.alert('Lỗi', 'Không thể mở trứng may mắn');
            }
          }
        }
      ]
    );
  };

  const getSkinAnimation = (skinName) => {
    return getRandomAnimation(skinName);
  };

  const renderSkinItem = ({ item }) => {
    const isOwned = userData?.ownedSkins?.includes(item.name);
    const animation = getSkinAnimation(item.name);

    return (
      <View style={styles.skinCard}>
        <View style={styles.cardInner}>
          <View style={styles.animationContainer}>
            {animation && (
              <LottieView
                source={animation}
                autoPlay
                loop
                style={styles.skinPreview}
              />
            )}
          </View>
          <View style={styles.skinInfo}>
            <Text style={styles.skinName} numberOfLines={2}>{item.name}</Text>
            {isOwned ? (
              <View style={styles.ownedBadge}>
                <Text style={styles.ownedText}>✓ Đã có</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.buyButton}
                onPress={() => handleBuySkin(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.buyButtonText}>
                  {item.price === 0 ? '🎁 Miễn phí' : `💰 ${item.price}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>✨ Đang tải...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#f093fb']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.title}>🛒 Cửa hàng</Text>
        <View style={styles.coinContainer}>
          <Text style={styles.coinIcon}>💰</Text>
          <Text style={styles.coinText}>{userData?.coins || 0}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.luckyEggCard}
        onPress={handleLuckyEgg}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#FFD700', '#FFA500']}
          style={styles.luckyEggGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.luckyEggIcon}>🥚</Text>
          <View style={styles.luckyEggInfo}>
            <Text style={styles.luckyEggTitle}>Trứng may mắn</Text>
            <Text style={styles.luckyEggDesc}>
              Nhận ngẫu nhiên 1 skin mới
            </Text>
          </View>
          <View style={styles.luckyEggPriceContainer}>
            <Text style={styles.luckyEggPrice}>200</Text>
            <Text style={styles.luckyEggCoin}>💰</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <FlatList
        data={ALL_SKINS}
        renderItem={renderSkinItem}
        keyExtractor={(item) => item.name}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
      />

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Home')}
        >
          <View style={styles.navIconContainer}>
            <Text style={styles.navIcon}>🏠</Text>
          </View>
          <Text style={styles.navButtonText}>Nhà</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Wardrobe')}
        >
          <View style={styles.navIconContainer}>
            <Text style={styles.navIcon}>👔</Text>
          </View>
          <Text style={styles.navButtonText}>Tủ đồ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Shop')}
        >
          <View style={styles.navIconActive}>
            <Text style={styles.navIcon}>🛒</Text>
          </View>
          <Text style={styles.navButtonTextActive}>Cửa hàng</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCard: {
    marginTop: 100,
    marginHorizontal: 32,
    padding: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  loadingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#764ba2',
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
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  coinIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  coinText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F59E0B',
  },
  luckyEggCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  luckyEggGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  luckyEggIcon: {
    fontSize: 52,
    marginRight: 16,
  },
  luckyEggInfo: {
    flex: 1,
  },
  luckyEggTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  luckyEggDesc: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    opacity: 0.95,
  },
  luckyEggPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  luckyEggPrice: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    marginRight: 4,
  },
  luckyEggCoin: {
    fontSize: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  skinCard: {
    width: ITEM_WIDTH,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  cardInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  animationContainer: {
    backgroundColor: '#F9FAFB',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skinPreview: {
    width: ITEM_WIDTH - 32,
    height: ITEM_WIDTH - 32,
  },
  skinInfo: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  skinName: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: 10,
  },
  ownedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ownedText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  buyButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  buyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  navIconActive: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  navIcon: {
    fontSize: 22,
  },
  navButtonText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  navButtonTextActive: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '700',
  },
});

