import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert as NativeAlert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GradientButton from './GradientButton';
import { colors, gradients, radii, shadows, typography } from '../../constants/theme';
import { useTranslation } from '../../utils/LanguageContext';

const AppAlertContext = createContext(null);

const TYPE_ICON = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
  confirm: 'help-circle',
  prompt: 'create',
};

function inferType(title = '') {
  const normalized = title.toLowerCase();
  if (normalized.includes('lỗi') || normalized.includes('error') || normalized.includes('failed')) return 'error';
  if (normalized.includes('thành công') || normalized.includes('success') || normalized.includes('đã ')) return 'success';
  if (normalized.includes('xác nhận') || normalized.includes('confirm')) return 'confirm';
  if (normalized.includes('không đủ') || normalized.includes('cần ') || normalized.includes('required')) return 'warning';
  return 'info';
}

function normalizeButtons(buttons, close, t) {
  if (!buttons || buttons.length === 0) {
    return [{ text: t('common.ok'), variant: 'primaryDeep', onPress: close }];
  }

  return buttons.map((button) => ({
    text: button.text || t('common.ok'),
    style: button.style,
    role: button.role,
    variant:
      button.variant ||
      (button.style === 'destructive' ? 'danger' : button.style === 'cancel' ? 'soft' : 'primaryDeep'),
    onPress: button.onPress || close,
  }));
}

export function AppAlertProvider({ children }) {
  const { t } = useTranslation();
  const [alertState, setAlertState] = useState(null);
  const [promptValue, setPromptValue] = useState('');

  const close = useCallback(() => {
    setAlertState(null);
    setPromptValue('');
  }, []);

  const show = useCallback((title, message, buttons, options = {}) => {
    setPromptValue(options.defaultValue || '');
    setAlertState({
      title,
      message,
      buttons,
      type: options.type || inferType(title),
      input: options.input,
      placeholder: options.placeholder,
      keyboardType: options.keyboardType,
      secureTextEntry: options.secureTextEntry,
      promptSubmit: options.promptSubmit,
    });
  }, []);

  const api = useMemo(() => ({
    alert: (title, message, buttons, options = {}) => {
      if (Platform.OS === 'ios') {
        NativeAlert.alert(title, message, buttons);
        return;
      }
      show(title, message, buttons, options);
    },
    confirm: (title, message, onConfirm, options = {}) => {
      if (Platform.OS === 'ios') {
        NativeAlert.alert(title, message, [
          { text: options.cancelText || t('common.cancel'), style: 'cancel' },
          { text: options.confirmText || t('common.ok'), style: options.destructive ? 'destructive' : 'default', onPress: onConfirm },
        ]);
        return;
      }
      show(title, message, [
        { text: options.cancelText || t('common.cancel'), style: 'cancel' },
        { text: options.confirmText || t('common.ok'), style: options.destructive ? 'destructive' : 'default', onPress: onConfirm },
      ], { type: options.destructive ? 'warning' : 'confirm' });
    },
    prompt: (title, message, onSubmit, options = {}, defaultValue = '') => {
      const promptOptions = typeof options === 'string'
        ? { defaultValue }
        : options;
      if (Platform.OS === 'ios' && NativeAlert.prompt) {
        NativeAlert.prompt(
          title,
          message,
          [
            { text: promptOptions.cancelText || t('common.cancel'), style: 'cancel' },
            {
              text: promptOptions.submitText || t('common.save'),
              onPress: (value) => onSubmit?.(value || ''),
            },
          ],
          promptOptions.secureTextEntry ? 'secure-text' : 'plain-text',
          promptOptions.defaultValue || defaultValue || '',
          promptOptions.keyboardType || 'default'
        );
        return;
      }
      show(title, message, [
        { text: promptOptions.cancelText || t('common.cancel'), style: 'cancel' },
        {
          text: promptOptions.submitText || t('common.save'),
          role: 'promptSubmit',
        },
      ], {
        type: 'prompt',
        input: true,
        placeholder: promptOptions.placeholder,
        defaultValue: promptOptions.defaultValue,
        keyboardType: promptOptions.keyboardType,
        secureTextEntry: promptOptions.secureTextEntry,
        promptSubmit: onSubmit,
      });
    },
  }), [show, t]);

  const buttons = normalizeButtons(alertState?.buttons, close, t);
  const type = alertState?.type || 'info';
  const isSoftButton = (button) => button.variant === 'soft' || button.style === 'cancel';

  return (
    <AppAlertContext.Provider value={api}>
      {children}
      <Modal
        visible={!!alertState}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <View style={styles.card}>
            <LinearGradient
              colors={gradients.primaryDeep}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconWrap}
            >
              <Ionicons name={TYPE_ICON[type] || TYPE_ICON.info} size={34} color={colors.white} />
            </LinearGradient>
            <Text style={styles.title}>{alertState?.title}</Text>
            {alertState?.message ? <Text style={styles.message}>{alertState.message}</Text> : null}
            {alertState?.input ? (
              <TextInput
                style={styles.input}
                value={promptValue}
                onChangeText={setPromptValue}
                placeholder={alertState.placeholder || ''}
                placeholderTextColor={colors.textSoft}
                keyboardType={alertState.keyboardType || 'default'}
                secureTextEntry={!!alertState.secureTextEntry}
                autoFocus
              />
            ) : null}
            <View style={styles.actions}>
              {buttons.map((button, index) => {
                const handlePress = () => {
                  close();
                  if (button.role === 'promptSubmit') {
                    alertState?.promptSubmit?.(promptValue);
                  } else {
                    button.onPress?.();
                  }
                };

                if (isSoftButton(button)) {
                  return (
                    <TouchableOpacity
                      key={`${button.text}-${index}`}
                      style={styles.softButton}
                      onPress={handlePress}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.softButtonText}>{button.text}</Text>
                    </TouchableOpacity>
                  );
                }

                return (
                  <GradientButton
                    key={`${button.text}-${index}`}
                    title={button.text}
                    variant={button.variant}
                    style={styles.actionButton}
                    contentStyle={styles.actionButtonContent}
                    onPress={handlePress}
                  />
                );
              })}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const context = useContext(AppAlertContext);
  if (!context) {
    throw new Error('useAppAlert must be used inside AppAlertProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...shadows.primary,
  },
  title: {
    ...typography.sectionTitle,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  input: {
    width: '100%',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginTop: 4,
    marginBottom: 18,
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  actionButton: {
    width: '100%',
  },
  actionButtonContent: {
    minHeight: 48,
  },
  softButton: {
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  softButtonText: {
    ...typography.button,
    color: colors.textMuted,
  },
});
