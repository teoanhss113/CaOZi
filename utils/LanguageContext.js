import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../constants/i18n';

const STORAGE_KEY = 'caozi.languagePreference';
const SUPPORTED_LANGUAGES = ['vi', 'en'];

const LanguageContext = createContext(null);

const getDeviceLanguage = () => {
  const locale =
    Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier;

  const languageCode = String(locale || 'vi').split(/[-_]/)[0].toLowerCase();
  return SUPPORTED_LANGUAGES.includes(languageCode) ? languageCode : 'vi';
};

const interpolate = (text, params) => {
  if (!params) return text;
  return Object.keys(params).reduce(
    (result, key) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(params[key])),
    text
  );
};

export function LanguageProvider({ children }) {
  const [preference, setPreferenceState] = useState('auto');
  const [deviceLanguage, setDeviceLanguage] = useState(getDeviceLanguage);
  const resolvedLanguage = preference === 'auto' ? deviceLanguage : preference;

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY).then((savedPreference) => {
      if (mounted && (savedPreference === 'auto' || SUPPORTED_LANGUAGES.includes(savedPreference))) {
        setPreferenceState(savedPreference);
      }
    });
    setDeviceLanguage(getDeviceLanguage());
    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = useCallback(async (nextPreference) => {
    const safePreference =
      nextPreference === 'auto' || SUPPORTED_LANGUAGES.includes(nextPreference)
        ? nextPreference
        : 'auto';
    setPreferenceState(safePreference);
    await AsyncStorage.setItem(STORAGE_KEY, safePreference);
  }, []);

  const t = useCallback(
    (key, params) => {
      const dictionary = translations[resolvedLanguage] || translations.vi;
      const fallback = translations.vi[key] || key;
      return interpolate(dictionary[key] || fallback, params);
    },
    [resolvedLanguage]
  );

  const value = useMemo(
    () => ({
      language: resolvedLanguage,
      preference,
      setPreference,
      t,
    }),
    [preference, resolvedLanguage, setPreference, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used inside LanguageProvider');
  }
  return context;
}
