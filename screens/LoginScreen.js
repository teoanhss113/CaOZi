import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ImageBackground
} from 'react-native';
import { auth, db } from '../firebaseConfig';
import { getAllSkinNames } from '../utils/skinAnimations';
import GradientButton from '../components/ui/GradientButton';
import { useAppAlert } from '../components/ui/AppAlert';
import { colors, radii, shadows } from '../constants/theme';
import { TERMS_VERSION } from '../constants/legal';
import { useTranslation } from '../utils/LanguageContext';

export default function LoginScreen({ navigation }) {
  const appAlert = useAppAlert();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  const handleAuth = async () => {
    if (!email || !password) {
      appAlert.alert(t('common.error'), t('auth.inputRequired'));
      return;
    }

    if (!isLogin) {
      if (password.length < 6) {
        appAlert.alert(t('common.error'), t('auth.passwordTooShort'));
        return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        // Đăng nhập
        await auth.signInWithEmailAndPassword(email.trim(), password);
      } else {
        // Đăng ký
        const userCredential = await auth.createUserWithEmailAndPassword(email.trim(), password);
        const user = userCredential.user;

        // Lấy skin mặc định (skin đầu tiên có sẵn)
        const availableSkins = getAllSkinNames();
        const defaultSkin = availableSkins.length > 0 ? availableSkins[0] : 'Default';

        // Tạo dữ liệu người dùng mặc định
        const createdAt = new Date().toISOString();
        await db.collection('users').doc(user.uid).set({
          email: user.email,
          coins: 1000, // Coin khởi tạo
          currentSkin: defaultSkin, // Trang phục mặc định
          ownedSkins: [defaultSkin], // Danh sách trang phục đã sở hữu
          avatarFrame: 'none',
          robotPosition: { x: 131.25, y: 350 }, // Vị trí giữa màn hình (375/2 - 56.25, 812/2 - 56.25 cho iPhone)
          blockedUserIds: [],
          termsVersion: TERMS_VERSION,
          termsAcceptedAt: createdAt,
          createdAt,
        });
        db.collection('publicProfiles').doc(user.uid).set({
          userName: t('profile.defaultName'),
          profilePicture: null,
          avatarFrame: 'none',
          createdAt,
        }).catch((error) => {
          console.warn('Failed to create public profile:', error?.code || error?.message || error);
        });
      }
    } catch (error) {
      console.warn('Auth error:', error?.code || error?.message || error);
      let title = t('common.error');
      let message = t('auth.genericError');
      
      if (error.code === 'auth/invalid-email') {
        title = t('auth.invalidEmailTitle');
        message = t('auth.invalidEmailMessage');
      } else if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        title = t('auth.loginFailedTitle');
        message = t('auth.loginFailedMessage');
      } else if (error.code === 'auth/email-already-in-use') {
        title = t('auth.emailInUseTitle');
        message = t('auth.emailInUseMessage');
      } else if (error.code === 'auth/weak-password') {
        title = t('auth.weakPasswordTitle');
        message = t('auth.passwordTooShort');
      } else if (error.code === 'auth/network-request-failed') {
        title = t('auth.networkTitle');
        message = t('auth.networkMessage');
      }
      
      appAlert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      appAlert.alert(t('auth.resetPromptTitle'), t('auth.resetPromptMessage'));
      return;
    }

    setResettingPassword(true);
    try {
      await auth.sendPasswordResetEmail(normalizedEmail);
      appAlert.alert(
        t('auth.resetSentTitle'),
        t('auth.resetSentMessage')
      );
    } catch (error) {
      console.warn('Password reset error:', error?.code || error?.message || error);
      let title = t('auth.resetFailedTitle');
      let message = t('auth.genericError');

      if (error.code === 'auth/invalid-email') {
        title = t('auth.invalidEmailTitle');
        message = t('auth.invalidEmailMessage');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        title = t('auth.accountNotFoundTitle');
        message = t('auth.accountNotFoundMessage');
      } else if (error.code === 'auth/network-request-failed') {
        title = t('auth.networkTitle');
        message = t('auth.networkMessage');
      }

      appAlert.alert(title, message);
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />
      <ImageBackground
        source={require('../assets/login-background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            <View style={styles.formCard}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textSoft}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  keyboardType="email-address"
                  editable={!loading && !resettingPassword}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t('auth.password')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textSoft}
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  editable={!loading && !resettingPassword}
                />
                {isLogin && (
                  <TouchableOpacity
                    style={styles.forgotPasswordButton}
                    onPress={handlePasswordReset}
                    disabled={loading || resettingPassword}
                  >
                    <Text style={styles.forgotPasswordText}>
                      {resettingPassword ? t('auth.sendingEmail') : t('auth.forgotPassword')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {!isLogin && (
                <>
                  <TouchableOpacity
                    style={styles.termsRow}
                    onPress={() => setAcceptedTerms((value) => !value)}
                    disabled={loading || resettingPassword}
                  >
                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                      {acceptedTerms ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={styles.termsText}>
                      {t('auth.termsPrefix')}
                      <Text style={styles.termsLink} onPress={() => navigation.navigate('Legal', { document: 'terms' })}>
                        {t('auth.terms')}
                      </Text>{' '}
                      {t('auth.and')}
                      <Text style={styles.termsLink} onPress={() => navigation.navigate('Legal', { document: 'privacy' })}>
                        {t('auth.privacy')}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <GradientButton
                title={isLogin ? t('auth.login') : t('auth.register')}
                style={[styles.buttonWrapper, loading && styles.buttonDisabled]}
                onPress={handleAuth}
                loading={loading}
                disabled={loading || resettingPassword}
              />

              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                  setIsLogin(!isLogin);
                  setConfirmPassword('');
                  setAcceptedTerms(false);
                }}
                disabled={loading || resettingPassword}
              >
                <Text style={styles.switchText}>
                  {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
                  <Text style={styles.switchLink}>
                    {isLogin ? t('auth.registerNow') : t('auth.login')}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backgroundImage: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderRadius: radii.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.68)',
    ...shadows.card,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    padding: 16,
    borderRadius: radii.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: 'rgba(236, 232, 245, 0.86)',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  buttonWrapper: {
    marginTop: 8,
    borderRadius: radii.md,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: '900' },
  termsText: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  termsLink: { color: colors.primary, fontWeight: '800' },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  switchLink: {
    color: colors.primary,
  },
});
