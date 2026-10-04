import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import LottieView from 'lottie-react-native';
import GradientButton from './ui/GradientButton';
import { colors, radii, shadows } from '../constants/theme';
import { GACHA_BASE } from '../utils/skinAnimations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Kích thước Robot thu nhỏ còn 3/4 kích thước ban đầu (256 * 0.75 = 192)
const ROBOT_SIZE = Math.min(Math.round(SCREEN_WIDTH * 0.52), 192);

// Pre-load animation sources centralized from skinAnimations.js
const ANIM_RUNG = GACHA_BASE.rung;
const ANIM_PHAT_SANG = GACHA_BASE.phatSang;

/**
 * LuckyDrawModal
 *
 * Luồng:
 *  1. Rung  – animation quả trứng rung, loop=false, hết → chuyển Phat Sang
 *  2. Phat Sang  – fullscreen glow (absoluteFill, resizeMode=cover)
 *                  Hết đoạn sáng đã cắt → Robot layer xuất hiện đè lên
 *  3. Robot layer – Chúc mừng + Robot zoom spring, đè trên nền Phat Sang
 *                   Người dùng nhấn "Tuyệt vời!" để đóng
 *
 * Props:
 *  visible      {boolean}  – show/hide modal
 *  skinName     {string}   – tên robot trúng thưởng
 *  robotAnim    {object}   – require()'d Lottie JSON
 *  onClose      {function} – gọi khi đóng modal
 */
export default function LuckyDrawModal(props) {
    // Each opening gets fresh animation state, including consecutive draws.
    return props.visible ? <RewardReveal {...props} /> : null;
}

function RewardReveal({ visible, skinName, robotAnim, onClose, t }) {
    // 'rung' | 'phat_sang'
    const [phase, setPhase] = useState(ANIM_RUNG ? 'rung' : 'phat_sang');
    // Robot layer xuất hiện đè lên trong khi Phat Sang vẫn còn đang phát
    const [showRobot, setShowRobot] = useState(false);

    // Start just above 0: lottie-ios clips layers measured at scale 0.
    const scaleAnim = useRef(new Animated.Value(0.01)).current;
    const phatSangOpacity = useRef(new Animated.Value(1)).current;
    const robotRevealed = useRef(false);
    // Use playback completion, not a wall-clock delay: loading the image
    // sequence must not shorten the flash or reveal the Pet prematurely.
    const revealRobot = useCallback(() => {
        if (robotRevealed.current) return;
        robotRevealed.current = true;
        setShowRobot(true);
        Animated.spring(scaleAnim, {
            toValue: 1, friction: 5, tension: 80, useNativeDriver: true,
        }).start();
        Animated.timing(phatSangOpacity, {
            toValue: 0.4, duration: 600, useNativeDriver: true,
        }).start();
    }, [scaleAnim, phatSangOpacity]);

    useEffect(() => {
        if (phase === 'phat_sang' && !ANIM_PHAT_SANG) revealRobot();
    }, [phase, revealRobot]);

    useEffect(() => () => {
        scaleAnim.stopAnimation();
        phatSangOpacity.stopAnimation();
    }, [scaleAnim, phatSangOpacity]);

    const handleRungFinish = (isCancelled) => {
        if (!isCancelled) setPhase('phat_sang');
    };

    if (!visible) return null;

    const phatSangLayerStyle = [styles.phatSangLayer, { opacity: phatSangOpacity }];
    const robotContainerStyle = [
        styles.robotContainer,
        showRobot ? styles.robotContainerVisible : styles.robotContainerHidden,
    ];
    const robotScaleStyle = [styles.robotScaleLayer, { transform: [{ scale: scaleAnim }] }];

    return (
        <Modal
            transparent
            animationType="fade"
            visible={visible}
            statusBarTranslucent
            onRequestClose={() => { }}
        >
            <View style={styles.overlay}>

                {/* ── Phase 1: Rung (egg shaking) ── */}
                {phase === 'rung' && ANIM_RUNG && (
                    <LottieView
                        source={ANIM_RUNG}
                        autoPlay
                        loop={false}
                        style={styles.rungAnimation}
                        onAnimationFinish={handleRungFinish}
                        onAnimationFailure={() => setPhase('phat_sang')}
                    />
                )}

                {/* ── Phase 2+3: Phat Sang fullscreen (nền) ── */}
                {phase === 'phat_sang' && ANIM_PHAT_SANG && (
                    <Animated.View style={phatSangLayerStyle}>
                        <LottieView
                            source={ANIM_PHAT_SANG}
                            autoPlay
                            loop={false}
                            resizeMode="cover"
                            style={styles.phatSangAnimation}
                            onAnimationFinish={(cancelled) => { if (!cancelled) revealRobot(); }}
                            onAnimationFailure={revealRobot}
                        />
                    </Animated.View>
                )}

                {/* ── Robot layer: pre-render ngay từ đầu (scale=0 → vô hình)
                     để Lottie JSON được parse sẵn, tránh độ trễ load khi cần hiện ── */}
                <View
                    style={robotContainerStyle}
                    pointerEvents={showRobot ? 'auto' : 'none'}
                >
                    <Text style={styles.congratsText}>{t ? t('shop.congrats') : 'Chúc mừng!'}</Text>
                    <Text style={styles.skinNameText}>{skinName}</Text>

                    <Animated.View style={robotScaleStyle}>
                        {robotAnim && showRobot ? (
                            <LottieView
                                source={robotAnim}
                                autoPlay
                                loop
                                resizeMode="contain"
                                style={styles.robotAnimation}
                            />
                        ) : null}
                    </Animated.View>

                    <GradientButton
                        title={t ? t('shop.awesome') : 'Tuyệt vời!'}
                        variant="warning"
                        style={styles.closeButton}
                        contentStyle={styles.closeButtonContent}
                        textStyle={styles.closeButtonText}
                        onPress={onClose}
                    />
                </View>

            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlayStrong,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rungAnimation: {
        width: ROBOT_SIZE,
        height: ROBOT_SIZE,
    },
    phatSangLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    phatSangAnimation: {
        ...StyleSheet.absoluteFillObject,
    },
    // Robot layer căn giữa tuyệt đối, đè lên Phat Sang
    robotContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    robotContainerVisible: {
        opacity: 1,
    },
    robotContainerHidden: {
        opacity: 0,
    },
    robotScaleLayer: {},
    robotAnimation: {
        width: ROBOT_SIZE,
        height: ROBOT_SIZE,
    },
    congratsText: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.warningSoft,
        marginBottom: 6,
        textShadowColor: colors.overlayStrong,
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    skinNameText: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.white,
        marginBottom: 20,
        textAlign: 'center',
        textShadowColor: colors.overlayStrong,
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    closeButton: {
        marginTop: 28,
        borderRadius: radii.pill,
        ...shadows.primary,
    },
    closeButtonContent: {
        paddingHorizontal: 36,
        minHeight: 52,
        borderRadius: radii.pill,
    },
    closeButtonText: {
        color: colors.white,
        fontSize: 18,
        fontWeight: '700',
    },
});
