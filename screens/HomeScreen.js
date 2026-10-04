import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Alert
} from 'react-native';
import LottieView from 'lottie-react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
} from 'react-native-reanimated';
import { getUserData, updateUserData } from '../utils/dataManager';
import { getSkinAnimations } from '../utils/skinAnimations';
import { auth } from '../firebaseConfig';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [animations, setAnimations] = useState([]);
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0);
  const animationRef = useRef(null);

  const translateX = useSharedValue(150);
  const translateY = useSharedValue(200);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (userData && userData.currentSkin) {
      loadAnimations(userData.currentSkin);
      if (userData.robotPosition) {
        translateX.value = userData.robotPosition.x;
        translateY.value = userData.robotPosition.y;
      }
    }
  }, [userData?.currentSkin]);

  useEffect(() => {
    if (animations.length > 0) {
      const interval = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * animations.length);
        setCurrentAnimationIndex(randomIndex);
        animationRef.current?.play();
      }, Math.random() * 5000 + 5000); // 5-10 giây

      return () => clearInterval(interval);
    }
  }, [animations]);

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
    }
  };

  const loadAnimations = async (skinName) => {
    try {
      const animationFiles = getSkinAnimations(skinName);
      console.log(`Loaded ${animationFiles.length} animations for ${skinName}`);
      setAnimations(animationFiles);
      setCurrentAnimationIndex(0);
    } catch (error) {
      console.error('Error loading animations:', error);
      Alert.alert('Lỗi', 'Không thể tải animation');
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: () => {
      // Lưu vị trí mới
      const newPosition = {
        x: translateX.value,
        y: translateY.value
      };
      
      // Update vào Firebase
      const user = auth.currentUser;
      if (user) {
        updateUserData(user.uid, { robotPosition: newPosition });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  if (!userData || animations.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.coinText}>💰 {userData.coins}</Text>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => auth.signOut()}
        >
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.robotContainer, animatedStyle]}>
          <LottieView
            ref={animationRef}
            source={animations[currentAnimationIndex]}
            autoPlay
            loop
            style={styles.robot}
          />
        </Animated.View>
      </PanGestureHandler>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.7}
        >
          <View style={[styles.navIconCircle, styles.navIconActive]}>
            <Ionicons name="home" size={28} color="#fff" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Wardrobe')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconCircle}>
            <Ionicons name="paw-outline" size={28} color="#6B7280" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('TodoTeams')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconCircle}>
            <Ionicons name="checkbox-outline" size={28} color="#6B7280" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Shop')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconCircle}>
            <Ionicons name="storefront-outline" size={28} color="#6B7280" />
          </View>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
  },
  coinText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 16,
  },
  robotContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
  },
  robot: {
    width: 200,
    height: 200,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
    color: '#666',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 20,
  },
  navButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 16,
  },
});
