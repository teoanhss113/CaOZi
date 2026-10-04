import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  PanResponder,
  Animated,
  StatusBar,
  TextInput,
  ImageBackground,
  ScrollView,
  Switch,
  Platform,
  AppState
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import { getUserData, updateUserData } from '../utils/dataManager';
import { getStageAnimations, getPetConfig } from '../utils/skinAnimations';
import FloatingPet from '../utils/floatingPet';
import { auth } from '../firebaseConfig';
import BottomNavBar from '../components/BottomNavBar';
import { playButtonSound } from '../utils/soundManager';
import { GlobalAnimationState } from '../utils/GlobalAnimationState';
import { syncSelectedPetToDynamicIsland } from '../utils/dynamicIsland';
import GradientBadge from '../components/ui/GradientBadge';
import GradientButton from '../components/ui/GradientButton';
import GradientIconButton from '../components/ui/GradientIconButton';
import AppModal from '../components/ui/AppModal';
import AvatarWithFrame from '../components/AvatarWithFrame';
import { useAppAlert } from '../components/ui/AppAlert';
import { colors, gradients, radii, shadows } from '../constants/theme';
import { deleteCurrentAccount } from '../utils/accountManager';
import { validateCommunityText } from '../utils/contentSafety';
import {
  cancelAllNotifications,
  requestNotificationPermissions,
  scheduleDailyCareReminder,
  sendLocalNotification,
} from '../utils/notificationManager';
import { LANGUAGE_OPTIONS } from '../constants/i18n';
import { useTranslation } from '../utils/LanguageContext';
import {
  AVATAR_FRAMES,
  getAvatarFrameProgress,
  getUnlockedAvatarFrameIds,
} from '../constants/avatarFrames';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Kích thước Pet giảm còn 3/4 kích thước ban đầu (150 * 0.75 = 112.5)
const PET_SIZE = 112.5;

export default function HomeScreen({ navigation, route }) {
  const appAlert = useAppAlert();
  const { preference, setPreference, t, language } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [animations, setAnimations] = useState([]);
  const [globalAnimIndex, setGlobalAnimIndex] = useState(GlobalAnimationState.getIndex());
  const [showUserModal, setShowUserModal] = useState(false);
  const [profilePanel, setProfilePanel] = useState(null);
  useEffect(() => {
    if (route?.params?.openProfile) {
      setShowUserModal(true);
      setProfilePanel(route.params.openProfile === 'notifications' ? 'notifications' : null);
      navigation.setParams({ openProfile: undefined });
    }
  }, [route?.params?.openProfile, navigation]);

  const [outsidePetSyncStatus, setOutsidePetSyncStatus] = useState(null);
  const [profileFeedback, setProfileFeedback] = useState(null);
  const [userName, setUserName] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [isFloatingPetActive, setIsFloatingPetActive] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [savedPosition, setSavedPosition] = useState({ x: (SCREEN_WIDTH - PET_SIZE) / 2, y: (SCREEN_HEIGHT - PET_SIZE) / 2 });
  const [isAnimatingStage, setIsAnimatingStage] = useState(false);
  const unlockedAvatarFrameIds = useMemo(
    () => getUnlockedAvatarFrameIds(userData?.ownedSkins || []),
    [userData?.ownedSkins]
  );
  const selectedAvatarFrameId = unlockedAvatarFrameIds.has(userData?.avatarFrame)
    ? userData.avatarFrame
    : 'none';

  // Transition states
  const [currentAnimIndex, setCurrentAnimIndex] = useState(globalAnimIndex);
  const [prevAnimIndex, setPrevAnimIndex] = useState(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animationRef = useRef(null);
  const touchStartTime = useRef(0);

  const pan = useRef(new Animated.ValueXY({ x: (SCREEN_WIDTH - PET_SIZE) / 2, y: (SCREEN_HEIGHT - PET_SIZE) / 2 })).current;

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Track start time for tap detection
        touchStartTime.current = Date.now();
        
        // If the user starts dragging, stop any automatic stage animations
        setIsAnimatingStage(false);
        setIsFlipped(false);
        
        // Khi bắt đầu kéo, set offset = giá trị hiện tại, reset value về 0
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();
        
        const touchDuration = Date.now() - (touchStartTime.current || 0);
        const touchDistance = Math.sqrt(Math.pow(gestureState.dx, 2) + Math.pow(gestureState.dy, 2));

        // Detect a tap
        if (touchDuration < 250 && touchDistance < 10) {
          console.log('Tap detected! Changing stage...');
          playButtonSound();
          if (animations.length > 0) {
            GlobalAnimationState.forceIncrementIndex();
          }
        }
        
        const user = auth.currentUser;
        if (user && touchDistance > 15) { // Only save position if actually dragged
          const position = { x: pan.x._value, y: pan.y._value };
          console.log('Saving new robot position after drag:', position);
          setSavedPosition(position);
          updateUserData(user.uid, { robotPosition: position });
        }
      },
    }),
    [animations.length] // Re-create if animations change, though not strictly necessary
  );

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('Auth state changed, user:', user.uid);
        loadUserData();
      }
    });

    // Also try loading immediately
    loadUserData();
    refreshFloatingPetState();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!FloatingPet.isSupported()) {
      return undefined;
    }

    FloatingPet.setVisible(AppState.currentState !== 'active');
    const subscription = AppState.addEventListener('change', (nextState) => {
      FloatingPet.setVisible(nextState !== 'active');
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (userData && userData.currentSkin) {
      loadAnimations(userData.currentSkin);
      syncSelectedPetToDynamicIsland(userData.currentSkin).catch((error) => {
        console.log('Dynamic Island sync skipped:', error?.message || error);
      });

      if (userData.robotPosition && userData.robotPosition.x !== undefined && userData.robotPosition.y !== undefined) {
        console.log('Loading robot position:', userData.robotPosition);
        setSavedPosition(userData.robotPosition);
        pan.setOffset({ x: 0, y: 0 });
        pan.setValue({ x: userData.robotPosition.x, y: userData.robotPosition.y });
      } else {
        // Nếu không có vị trí, đặt ở giữa màn hình
        const centerX = (SCREEN_WIDTH - PET_SIZE) / 2;
        const centerY = (SCREEN_HEIGHT - PET_SIZE) / 2;
        console.log('Centering robot at:', centerX, centerY);
        pan.setOffset({ x: 0, y: 0 });
        pan.setValue({ x: centerX, y: centerY });
      }
    }
  }, [userData?.currentSkin]);

  useEffect(() => {
    // Stage-specific behavior logic
    const stageIndex = globalAnimIndex % animations.length;
    
    // Stop any existing translations to prevent conflicts
    pan.stopAnimation();

    // Trigger cross-fade transition
    if (globalAnimIndex !== currentAnimIndex) {
      setPrevAnimIndex(currentAnimIndex);
      setCurrentAnimIndex(globalAnimIndex);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setPrevAnimIndex(null);
      });
    }

    if (stageIndex === 1) { // A2: Corner animation
      setIsAnimatingStage(true);
      const flip = Math.random() > 0.5;
      setIsFlipped(flip);
      
      // Position at corner exactly
      const targetX = flip ? 0 : SCREEN_WIDTH - PET_SIZE; 
      Animated.spring(pan, {
        toValue: { x: targetX, y: pan.y._value },
        useNativeDriver: false,
      }).start();

    } else if (stageIndex === 2) { // A3: Run animation (Full Screen)
      setIsAnimatingStage(true);
      const flip = Math.random() > 0.5;
      setIsFlipped(flip);

      // Reset X to 0 so the full-screen container aligns with the left edge
      pan.setValue({ x: 0, y: pan.y._value });

    } else {
      // Normal stages: Return to saved position center-y if we were just animating a special stage
      if (isAnimatingStage) {
        setIsAnimatingStage(false);
        setIsFlipped(false);
        Animated.spring(pan, {
          toValue: savedPosition,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [globalAnimIndex, animations.length]);

  useEffect(() => {
    if (!userData?.currentSkin || animations.length === 0) {
      return;
    }

    const stageIndex = globalAnimIndex % animations.length;

    syncSelectedPetToDynamicIsland(userData.currentSkin, {
      stageIndex,
      stageCount: animations.length,
    }).catch((error) => {
      console.log('Dynamic Island stage sync skipped:', error?.message || error);
    });
  }, [userData?.currentSkin, globalAnimIndex, animations.length]);

  useEffect(() => {
    if (!userData?.currentSkin || animations.length === 0) {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        return;
      }

      const stageIndex = globalAnimIndex % animations.length;

      syncSelectedPetToDynamicIsland(userData.currentSkin, {
        stageIndex,
        stageCount: animations.length,
      }).catch((error) => {
        console.log('Dynamic Island foreground resume skipped:', error?.message || error);
      });
    });

    return () => subscription.remove();
  }, [userData?.currentSkin, globalAnimIndex, animations.length]);

  useEffect(() => {
    // Register as the leader for animation timing
    const unregister = GlobalAnimationState.registerLeader('home');
    const subscription = GlobalAnimationState.subscribe((newIndex) => {
      setGlobalAnimIndex(newIndex);
    });
    return () => {
      unregister();
      subscription.remove();
    };
  }, [animations.length]);



  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      console.log('Current user:', user?.uid);
      if (user) {
        const data = await getUserData(user.uid);
        console.log('User data:', data);
        setUserData(data);
        setUserName(data.userName || user.email?.split('@')[0] || t('profile.defaultName'));
        setProfilePicture(data.profilePicture || null);
      } else {
        console.log('No user logged in');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      appAlert.alert(t('common.error'), t('wardrobe.loadFailed'));
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadAnimations = async (skinName) => {
    try {
      let animationFiles = getStageAnimations(skinName);
      
      // Fallback for missing/invalid skins (e.g. from data migration)
      if (!animationFiles || animationFiles.length === 0) {
        console.log(`Skin ${skinName} not found, falling back to Aries ♈`);
        animationFiles = getStageAnimations('Aries ♈');
        const user = auth.currentUser;
        if (user) {
          updateUserData(user.uid, { currentSkin: 'Aries ♈' });
        }
      }
      
      console.log(`Loaded ${animationFiles.length} animations`);
      setAnimations(animationFiles);
    } catch (error) {
      console.error('Error loading animations:', error);
      appAlert.alert(t('common.error'), t('auth.genericError'));
    }
  };

  const handleSaveUserName = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const cleanUserName = validateCommunityText(userName, t('profile.displayName'), 40);
        await updateUserData(user.uid, { userName: cleanUserName });
        setUserName(cleanUserName);
        setProfileFeedback({ type: 'success', message: t('profile.nameSaved') });
      }
    } catch (error) {
      console.error('Error saving user name:', error);
      setProfileFeedback({ type: 'error', message: error.message || t('profile.nameSaveFailed') });
    }
  };

  const handleSelectProfilePicture = () => {
    setProfileFeedback({ type: 'info', message: t('profile.pickPhotoMessage') });
  };

  const handleSelectAvatarFrame = async (frame) => {
    const progress = getAvatarFrameProgress(frame, userData?.ownedSkins || []);

    if (!progress.unlocked) {
      setProfileFeedback({
        type: 'info',
        action: 'shop',
        message: frame.id === 'king'
          ? t('avatar.kingRequirement', { current: progress.current, required: progress.required })
          : frame.sprite
            ? (language === 'en' ? `Collect ${frame.name} to unlock this frame.` : `Sở hữu Pet ${frame.name} để mở khung này.`)
            : t('avatar.groupRequirement', { current: progress.current, required: progress.required }),
      });
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateUserData(user.uid, { avatarFrame: frame.id });
      setUserData(current => ({ ...current, avatarFrame: frame.id }));
      setProfileFeedback({ type: 'success', message: t('avatar.updated') });
    } catch (error) {
      console.error('Error updating avatar frame:', error);
      setProfileFeedback({ type: 'error', message: t('avatar.updateFailed') });
    }
  };

  const handleLogout = () => {
    appAlert.confirm(
      t('profile.logout'),
      t('profile.logoutConfirm'),
      () => {
        setShowUserModal(false);
        auth.signOut();
      },
      { confirmText: t('profile.logout'), destructive: true }
    );
  };

  const beginLogout = () => {
    closeProfileModal();
    setTimeout(handleLogout, 250);
  };

  const handleDeleteAccount = () => {
    appAlert.confirm(
      t('profile.deleteAccount'),
      t('profile.deleteWarning'),
      () => {
        setTimeout(() => {
          appAlert.prompt(
            t('profile.passwordConfirmTitle'),
            t('profile.passwordConfirmMessage'),
            async (password) => {
              if (!password) {
                appAlert.alert(t('common.error'), t('profile.passwordRequired'));
                return;
              }
              setDeletingAccount(true);
              try {
                if (isFloatingPetActive) await FloatingPet.stop();
                await deleteCurrentAccount(password);
                setShowUserModal(false);
              } catch (error) {
                console.error('Error deleting account:', error);
                const message = error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
                  ? t('profile.wrongPassword')
                  : t('profile.deleteFailedMessage');
                appAlert.alert(t('profile.deleteFailedTitle'), message);
              } finally {
                setDeletingAccount(false);
              }
            },
            { placeholder: t('profile.passwordPlaceholder'), submitText: t('profile.deleteForever'), secureTextEntry: true }
          );
        }, 250);
      },
      { confirmText: t('profile.continue'), destructive: true }
    );
  };

  const beginDeleteAccount = () => {
    closeProfileModal();
    setTimeout(handleDeleteAccount, 250);
  };

  const refreshFloatingPetState = async () => {
    if (FloatingPet.isSupported()) {
      setIsFloatingPetActive(await FloatingPet.isActive());
    }
  };

  const toggleFloatingPet = async () => {
    if (!FloatingPet.isSupported()) {
      setProfileFeedback({
        type: 'info',
        message: Platform.OS === 'ios'
          ? t('settings.iosFloatingUnavailable')
          : t('settings.nativeModuleUnavailable'),
      });
      return;
    }

    if (isFloatingPetActive) {
      const success = await FloatingPet.stop();
      if (success) {
        setIsFloatingPetActive(false);
        setProfileFeedback({ type: 'success', message: t('settings.floatingStopped') });
      }
    } else {
      const hasPermission = await FloatingPet.checkPermission();
      if (!hasPermission) {
        setProfileFeedback({ type: 'error', message: t('settings.permissionMessage') });
        FloatingPet.requestPermission();
        return;
      }
      
      const success = await FloatingPet.start(userData.currentSkin || 'Aries ♈', { size: 336 });
      if (success) {
        FloatingPet.setVisible(false);
        setIsFloatingPetActive(true);
        setProfileFeedback({ type: 'success', message: t('settings.floatingStarted') });
      } else {
        setProfileFeedback({ type: 'error', message: t('settings.floatingStartFailed') });
      }
    }
  };

  const updateNotificationPreference = async (enabled) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      if (enabled) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          setProfileFeedback({ type: 'error', message: t('settings.notificationPermissionDenied') });
          return;
        }
        await scheduleDailyCareReminder(t('settings.careReminderTitle'), t('settings.careReminderBody'));
      } else {
        await cancelAllNotifications();
      }

      await updateUserData(user.uid, { notificationsEnabled: enabled });
      setUserData(current => ({ ...current, notificationsEnabled: enabled }));
      setProfileFeedback({
        type: 'success',
        message: enabled ? t('settings.notificationsEnabled') : t('settings.notificationsDisabled'),
      });
    } catch (error) {
      console.error('Error updating notifications:', error);
      setProfileFeedback({ type: 'error', message: t('settings.notificationsUpdateFailed') });
    }
  };

  const sendTestNotification = async () => {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      setProfileFeedback({ type: 'error', message: t('settings.notificationPermissionDenied') });
      return;
    }
    await sendLocalNotification(t('settings.testNotificationTitle'), t('settings.testNotificationBody'));
    setProfileFeedback({ type: 'success', message: t('settings.testNotificationSent') });
  };

  const centerPet = async () => {
    const position = { x: (SCREEN_WIDTH - PET_SIZE) / 2, y: (SCREEN_HEIGHT - PET_SIZE) / 2 };
    setSavedPosition(position);
    pan.setOffset({ x: 0, y: 0 });
    pan.setValue(position);

    const user = auth.currentUser;
    if (user) {
      await updateUserData(user.uid, { robotPosition: position });
    }
    setProfileFeedback({ type: 'success', message: t('settings.petCentered') });
  };

  const syncOutsidePet = async () => {
    try {
      const result = await syncSelectedPetToDynamicIsland(userData?.currentSkin || 'Aries ♈', {
        stageIndex: globalAnimIndex % Math.max(1, animations.length),
        stageCount: animations.length || 1,
      });
      setOutsidePetSyncStatus(['started', 'updated'].includes(result.status) ? 'success' : 'error');
    } catch (error) {
      console.error('Error syncing outside pet:', error);
      setOutsidePetSyncStatus('error');
    }
  };

  const closeProfileModal = () => {
    setShowUserModal(false);
    setProfilePanel(null);
    setOutsidePetSyncStatus(null);
    setProfileFeedback(null);
  };

  const openFloatingPetPanel = () => {
    if (!FloatingPet.isSupported()) {
      setProfilePanel('floatingPet');
      setOutsidePetSyncStatus(null);
      setProfileFeedback(null);
      return;
    }
    toggleFloatingPet();
  };

  const openProfilePanel = (panel) => {
    setProfileFeedback(null);
    setOutsidePetSyncStatus(null);
    setProfilePanel(panel);
  };

  if (!userData || animations.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
          <TouchableOpacity onPress={loadUserData}>
            <LinearGradient
            colors={gradients.primaryDeep}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const activeStageIsWide = globalAnimIndex % animations.length === 2;
  const currentStageIsWide = currentAnimIndex % animations.length === 2;
  const previousStageIsWide = prevAnimIndex !== null && prevAnimIndex % animations.length === 2;
  const backgroundImageStyle = [styles.backgroundImageInner, styles.backgroundImageOffset];
  const robotAnimatedStyle = [
    styles.robotContainer,
    {
      width: activeStageIsWide ? SCREEN_WIDTH : PET_SIZE,
      transform: [
        { translateX: pan.x },
        { translateY: pan.y },
        { scaleX: isFlipped ? -1 : 1 },
        { scale: getPetConfig(userData?.currentSkin).scale },
      ],
    },
  ];
  const previousStageAnimatedStyle = [
    styles.previousStageLayer,
    { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
  ];
  const currentStageAnimatedStyle = [styles.currentStageLayer, { opacity: fadeAnim }];
  const previousRobotStyle = previousStageIsWide ? styles.robotWide : styles.robot;
  const currentRobotStyle = currentStageIsWide ? styles.robotWide : styles.robot;
  const previousRobotResizeMode = previousStageIsWide ? 'cover' : 'contain';
  const currentRobotResizeMode = currentStageIsWide ? 'cover' : 'contain';
  const profileModalTitle = profilePanel === 'notifications'
    ? t('settings.notifications')
    : profilePanel === 'customize'
      ? t('settings.customizePet')
      : profilePanel === 'account'
        ? t('profile.accountManagement')
        : profilePanel === 'floatingPet'
          ? t('settings.floatingPet')
          : t('profile.title');

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../assets/background-full.png')} 
        style={styles.backgroundImage}
        imageStyle={backgroundImageStyle}
        resizeMode="cover"
      >
        <StatusBar barStyle="dark-content" />
        
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity
          style={styles.userButtonWrapper}
          onPress={() => { playButtonSound(); setShowUserModal(true); }}
        >
          <AvatarWithFrame
            imageUri={profilePicture}
            frameId={selectedAvatarFrameId}
            size={76}
            iconSize={28}
          />
        </TouchableOpacity>
      </View>

      {/* Robot Container */}
      <Animated.View
        style={robotAnimatedStyle}
        {...panResponder.panHandlers}
      >
        {/* Previous Stage (Fading Out) */}
        {prevAnimIndex !== null && (
          <Animated.View style={previousStageAnimatedStyle}>
            <LottieView
              source={animations[prevAnimIndex % animations.length]}
              autoPlay
              loop={animations.length === 1}
              style={previousRobotStyle}
              resizeMode={previousRobotResizeMode}
            />
          </Animated.View>
        )}

        {/* Current Stage (Fading In) */}
        <Animated.View style={currentStageAnimatedStyle}>
          <LottieView
            key={currentAnimIndex}
            ref={animationRef}
            source={animations.length > 0 ? animations[currentAnimIndex % animations.length] : null}
            autoPlay
            loop={animations.length === 1}
            onAnimationFinish={() => {
              if (animations.length > 1) {
                GlobalAnimationState.incrementIndex('home');
              }
            }}
            style={currentRobotStyle}
            resizeMode={currentRobotResizeMode}
          />
        </Animated.View>
      </Animated.View>

      <BottomNavBar
        navigation={navigation}
        activeTab="Home"
      />
      </ImageBackground>

      {/* User Profile Modal */}
      <AppModal
        visible={showUserModal}
        title={profileModalTitle}
        presentation="sheet"
        onClose={closeProfileModal}
        contentStyle={styles.profileModalContent}
        bodyStyle={styles.profileModalBody}
      >
        {profilePanel ? (
          <ScrollView
            style={styles.profileScroll}
            contentContainerStyle={styles.profileScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.profilePanelBackButton}
              onPress={() => {
                playButtonSound();
                setProfilePanel(null);
                setProfileFeedback(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color={colors.primary} />
              <Text style={styles.profilePanelBackText}>{t('common.back')}</Text>
            </TouchableOpacity>

            {profileFeedback ? (
              <View
                style={[
                  styles.profileFeedbackCard,
                  profileFeedback.type === 'success'
                    ? styles.profileFeedbackSuccess
                    : profileFeedback.type === 'error'
                      ? styles.profileFeedbackError
                      : styles.profileFeedbackInfo,
                ]}
              >
                <Ionicons
                  name={profileFeedback.type === 'success' ? 'checkmark-circle' : profileFeedback.type === 'error' ? 'alert-circle' : 'information-circle'}
                  size={18}
                  color={profileFeedback.type === 'success' ? colors.success : profileFeedback.type === 'error' ? colors.danger : colors.primary}
                />
                <Text
                  style={[
                    styles.profileFeedbackText,
                    profileFeedback.type === 'success'
                      ? styles.profileFeedbackTextSuccess
                      : profileFeedback.type === 'error'
                        ? styles.profileFeedbackTextError
                        : styles.profileFeedbackTextInfo,
                  ]}
                >
                  {profileFeedback.message}
                </Text>
              </View>
            ) : null}

            {profilePanel === 'notifications' ? (
              <>
                <View style={styles.preferenceRow}>
                  <View style={styles.preferenceTextBlock}>
                    <Text style={styles.preferenceTitle}>{t('settings.careReminders')}</Text>
                    <Text style={styles.preferenceDescription}>{t('settings.careRemindersDesc')}</Text>
                  </View>
                  <Switch
                    value={!!userData?.notificationsEnabled}
                    onValueChange={updateNotificationPreference}
                    trackColor={{ false: colors.border, true: colors.primarySoft }}
                    thumbColor={userData?.notificationsEnabled ? colors.primary : colors.textSoft}
                  />
                </View>
                <GradientButton
                  style={styles.modalActionButton}
                  onPress={() => {
                    playButtonSound();
                    sendTestNotification();
                  }}
                  title={t('settings.sendTestNotification')}
                />
              </>
            ) : profilePanel === 'customize' ? (
              <>
                <Text style={styles.modalDescription}>{t('settings.customizePetDesc')}</Text>
                <View style={styles.modalActionList}>
                  <TouchableOpacity
                    style={styles.secondaryActionButton}
                    onPress={() => {
                      playButtonSound();
                      centerPet();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="locate-outline" size={20} color={colors.primary} />
                    <Text style={styles.secondaryActionText}>{t('settings.centerPet')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : profilePanel === 'account' ? (
              <>
                <Text style={styles.modalDescription}>{t('profile.accountManagementDesc')}</Text>
                <TouchableOpacity
                  style={styles.deleteAccountButton}
                  onPress={beginDeleteAccount}
                  disabled={deletingAccount}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  <Text style={styles.deleteAccountText}>
                    {deletingAccount ? t('profile.deletingAccount') : t('profile.deleteAccount')}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalDescription}>
                  {Platform.OS === 'ios'
                    ? t('settings.iosFloatingUnavailable')
                    : t('settings.nativeModuleUnavailable')}
                </Text>
                {Platform.OS === 'ios' ? (
                  <>
                    <GradientButton
                      style={styles.modalActionButton}
                      onPress={() => {
                        playButtonSound();
                        syncOutsidePet();
                      }}
                      title={t('settings.widgetSync')}
                    />
                    {outsidePetSyncStatus ? (
                      <Text
                        style={[
                          styles.inlineStatusText,
                          outsidePetSyncStatus === 'success'
                            ? styles.inlineStatusSuccess
                            : styles.inlineStatusError,
                        ]}
                      >
                        {outsidePetSyncStatus === 'success'
                          ? t('settings.widgetSynced')
                          : t('settings.widgetSyncFailed')}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </ScrollView>
        ) : (
            <ScrollView
              style={styles.profileScroll}
              contentContainerStyle={styles.profileScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {profileFeedback ? (
                <View
                  style={[
                    styles.profileFeedbackCard,
                    profileFeedback.type === 'success'
                      ? styles.profileFeedbackSuccess
                      : profileFeedback.type === 'error'
                        ? styles.profileFeedbackError
                        : styles.profileFeedbackInfo,
                  ]}
                >
                  <Ionicons
                    name={profileFeedback.type === 'success' ? 'checkmark-circle' : profileFeedback.type === 'error' ? 'alert-circle' : 'information-circle'}
                    size={18}
                    color={profileFeedback.type === 'success' ? colors.success : profileFeedback.type === 'error' ? colors.danger : colors.primary}
                  />
                  <Text
                    style={[
                      styles.profileFeedbackText,
                      profileFeedback.type === 'success'
                        ? styles.profileFeedbackTextSuccess
                        : profileFeedback.type === 'error'
                          ? styles.profileFeedbackTextError
                          : styles.profileFeedbackTextInfo,
                    ]}
                  >
                    {profileFeedback.message}
                  </Text>
                </View>
              ) : null}

              {profileFeedback?.action === 'shop' && (
                <GradientButton title={language === 'en' ? 'Go to Shop' : 'Đến Shop'}
                  style={{ marginBottom: 20 }}
                  onPress={() => {
                    setShowUserModal(false);
                    setProfileFeedback(null);
                    navigation.navigate('Shop');
                  }} />
              )}

              {/* Profile Picture Section */}
              <View style={styles.profileSection}>
                <TouchableOpacity 
                  style={styles.profilePictureContainer}
                  onPress={() => { playButtonSound(); handleSelectProfilePicture(); }}
                >
                  <AvatarWithFrame
                    imageUri={profilePicture}
                    frameId={selectedAvatarFrameId}
                    size={176}
                    iconSize={54}
                  />
                  <GradientIconButton
                    size={38}
                    style={styles.cameraIconContainer}
                    contentStyle={styles.cameraIconFill}
                  >
                    <Ionicons name="camera" size={20} color={colors.white} />
                  </GradientIconButton>
                </TouchableOpacity>
                <Text style={styles.profileHint}>{t('profile.changePhoto')}</Text>
              </View>

              <View style={styles.avatarFramesSection}>
                <View style={styles.avatarFramesHeader}>
                  <View>
                    <Text style={[styles.sectionTitle, styles.avatarFramesTitle]}>{t('avatar.title')}</Text>
                    <Text style={styles.avatarFramesSubtitle}>
                      {t('avatar.subtitle')}
                    </Text>
                  </View>
                  <GradientBadge
                    variant="muted"
                    label={`${Math.max(0, unlockedAvatarFrameIds.size - 1)}/${AVATAR_FRAMES.length - 1}`}
                  />
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.avatarFramesList}
                >
                  {AVATAR_FRAMES.map(frame => {
                    const progress = getAvatarFrameProgress(frame, userData?.ownedSkins || []);
                    const isSelected = selectedAvatarFrameId === frame.id;

                    return (
                      <TouchableOpacity
                        key={frame.id}
                        style={[
                          styles.avatarFrameOption,
                          isSelected && styles.avatarFrameOptionSelected,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          playButtonSound();
                          handleSelectAvatarFrame(frame);
                        }}
                      >
                        <View style={styles.avatarFramePreview}>
                          <AvatarWithFrame
                            imageUri={profilePicture}
                            frameId={frame.id}
                            size={88}
                            iconSize={24}
                          />
                          {!progress.unlocked ? (
                            <View style={styles.avatarFrameLocked}>
                              <Ionicons name="lock-closed" size={20} color={colors.white} />
                            </View>
                          ) : null}
                          {isSelected ? (
                            <View style={styles.avatarFrameSelectedBadge}>
                              <Ionicons name="checkmark" size={14} color={colors.white} />
                            </View>
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.avatarFrameName,
                            !progress.unlocked && styles.avatarFrameNameLocked,
                          ]}
                          numberOfLines={1}
                        >
                          {frame.name}
                        </Text>
                        <Text style={styles.avatarFrameProgress}>
                          {frame.id === 'none'
                            ? t('avatar.alwaysAvailable')
                            : `${progress.current}/${progress.required} Pet`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Name Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>{t('profile.displayName')}</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={userName}
                    onChangeText={setUserName}
                    placeholder={t('profile.displayNamePlaceholder')}
                    placeholderTextColor={colors.textSoft}
                  />
                  <GradientButton
                    style={styles.saveButton}
                    onPress={() => { playButtonSound(); handleSaveUserName(); }}
                    title={t('common.save')}
                  />
                </View>
              </View>

              <View style={styles.legalLinks}>
                <TouchableOpacity onPress={() => {
                  closeProfileModal();
                  navigation.navigate('Legal', { document: 'privacy' });
                }}>
                  <Text style={styles.legalLinkText}>{t('profile.privacy')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  closeProfileModal();
                  navigation.navigate('Legal', { document: 'terms' });
                }}>
                  <Text style={styles.legalLinkText}>{t('profile.terms')}</Text>
                </TouchableOpacity>
              </View>

              {/* Settings Section */}
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>{t('profile.settings')}</Text>

                <View style={styles.languageCard}>
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="language-outline" size={24} color={colors.icon} />
                    <Text style={styles.settingItemText}>{t('language.title')}</Text>
                  </View>
                  <View style={styles.languageOptions}>
                    {LANGUAGE_OPTIONS.map((option) => {
                      const isSelected = preference === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[styles.languageOption, isSelected && styles.languageOptionSelected]}
                          onPress={() => {
                            playButtonSound();
                            setPreference(option.value);
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.languageOptionText, isSelected && styles.languageOptionTextSelected]}>
                            {t(option.labelKey)}
                          </Text>
                          {isSelected ? (
                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={() => { playButtonSound(); openFloatingPetPanel(); }}
                  activeOpacity={0.75}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons 
                      name={isFloatingPetActive ? "rocket" : "rocket-outline"} 
                      size={24} 
                      color={isFloatingPetActive ? colors.primary : colors.icon} 
                    />
                    <Text style={[
                      styles.settingItemText,
                      isFloatingPetActive && styles.settingItemTextActive
                    ]}>
                      {t('settings.floatingPet')}
                    </Text>
                  </View>
                  <View style={styles.settingItemRight}>
                    <GradientBadge
                      variant={isFloatingPetActive ? 'primary' : 'muted'}
                      label={isFloatingPetActive ? t('settings.enabled') : t('settings.disabled')}
                    />
                    <Ionicons
                      name={isFloatingPetActive ? 'toggle' : 'toggle-outline'}
                      size={26}
                      color={isFloatingPetActive ? colors.primary : colors.textSoft}
                    />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => {
                    playButtonSound();
                    openProfilePanel('notifications');
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons
                      name={userData?.notificationsEnabled ? 'notifications' : 'notifications-outline'}
                      size={24}
                      color={userData?.notificationsEnabled ? colors.primary : colors.icon}
                    />
                    <Text style={styles.settingItemText}>{t('settings.notifications')}</Text>
                  </View>
                  <View style={styles.settingItemRight}>
                    <GradientBadge
                      variant={userData?.notificationsEnabled ? 'primary' : 'muted'}
                      label={userData?.notificationsEnabled ? t('settings.enabled') : t('settings.disabled')}
                    />
                    <Ionicons name="chevron-forward" size={20} color={colors.textSoft} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => {
                    playButtonSound();
                    openProfilePanel('customize');
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="options-outline" size={24} color={colors.icon} />
                    <Text style={styles.settingItemText}>{t('settings.customize')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSoft} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingItem, styles.settingItemLast]}
                  onPress={() => {
                    playButtonSound();
                    openProfilePanel('account');
                  }}
                  activeOpacity={0.75}
                >
                  <View style={styles.settingItemLeft}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={colors.icon} />
                    <Text style={styles.settingItemText}>{t('profile.accountManagement')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSoft} />
                </TouchableOpacity>
              </View>

              <View style={styles.profileFooterActions}>
                <GradientButton
                  variant="danger"
                  style={styles.logoutButtonLarge}
                  contentStyle={styles.logoutButtonContent}
                  onPress={() => { playButtonSound(); beginLogout(); }}
                  disabled={deletingAccount}
                >
                  <Ionicons name="log-out-outline" size={24} color={colors.white} />
                  <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
                </GradientButton>
              </View>
            </ScrollView>
        )}
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  backgroundImageInner: {
    width: SCREEN_WIDTH + 40,
  },
  backgroundImageOffset: {
    left: -25.5,
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
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: radii.md,
    marginTop: 10,
  },
  retryText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  coinIcon: {
    marginLeft: 6,
  },
  moneyIcon: {
    width: 28,
    height: 28,
    marginLeft: 6,
    resizeMode: 'contain',
  },
  coinText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  userButtonWrapper: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
  robotContainer: {
    position: 'absolute',
    width: PET_SIZE,
    height: PET_SIZE,
  },
  robot: {
    width: PET_SIZE,
    height: PET_SIZE,
  },
  robotWide: {
    width: '100%',
    height: PET_SIZE,
  },
  previousStageLayer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  currentStageLayer: {
    width: '100%',
    height: '100%',
  },

  profileModalBody: {
    padding: 0,
    flex: 1,
  },
  profileModalContent: {
    height: SCREEN_HEIGHT * 0.78,
    maxHeight: SCREEN_HEIGHT * 0.78,
  },
  profileScroll: {
    flex: 1,
  },
  profileScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 10,
  },
  profileFeedbackCard: {
    minHeight: 42,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileFeedbackSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
  },
  profileFeedbackError: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#FECACA',
  },
  profileFeedbackInfo: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
  },
  profileFeedbackText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  profileFeedbackTextSuccess: {
    color: colors.success,
  },
  profileFeedbackTextError: {
    color: colors.danger,
  },
  profileFeedbackTextInfo: {
    color: colors.primary,
  },
  profilePanelBackButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 12,
    marginBottom: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  profilePanelBackText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profilePictureContainer: {
    position: 'relative',
    width: 176,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  cameraIconFill: {
    borderWidth: 3,
    borderColor: colors.white,
  },
  profileHint: {
    fontSize: 14,
    color: colors.textSoft,
  },
  avatarFramesSection: {
    marginBottom: 28,
  },
  avatarFramesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  avatarFramesTitle: {
    marginBottom: 4,
  },
  avatarFramesSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  avatarFramesList: {
    gap: 10,
    paddingRight: 4,
  },
  avatarFrameOption: {
    width: 112,
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarFrameOptionSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  avatarFramePreview: {
    width: 88,
    height: 88,
    marginBottom: 6,
  },
  avatarFrameLocked: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlayStrong,
  },
  avatarFrameSelectedBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatarFrameName: {
    maxWidth: '100%',
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  avatarFrameNameLocked: {
    color: colors.textMuted,
  },
  avatarFrameProgress: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSoft,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    minWidth: 76,
  },
  legalLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 24,
  },
  legalLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  settingsSection: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingItemDisabled: {
    opacity: 0.72,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  languageCard: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  languageOptions: {
    gap: 8,
  },
  languageOption: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  languageOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  languageOptionTextSelected: {
    color: colors.primary,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingItemText: {
    fontSize: 16,
    color: colors.text,
  },
  settingItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  logoutButtonLarge: {
    marginHorizontal: 0,
  },
  profileFooterActions: { gap: 10 },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  preferenceTextBlock: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  preferenceDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: 18,
  },
  modalActionButton: {
    marginTop: 20,
  },
  inlineStatusText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  inlineStatusSuccess: {
    color: colors.success,
  },
  inlineStatusError: {
    color: colors.danger,
  },
  modalActionList: {
    gap: 10,
  },
  secondaryActionButton: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  deleteAccountButton: {
    minHeight: 46,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteAccountText: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  logoutButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
