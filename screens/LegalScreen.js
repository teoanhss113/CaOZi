import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LEGAL_SECTION_KEYS, TERMS_VERSION } from '../constants/legal';
import { colors, radii, shadows, typography } from '../constants/theme';
import { useTranslation } from '../utils/LanguageContext';

export default function LegalScreen({ navigation, route }) {
  const { t } = useTranslation();
  const isPrivacy = route.params?.document !== 'terms';
  const title = isPrivacy ? t('legal.privacy') : t('legal.terms');
  const sections = isPrivacy ? LEGAL_SECTION_KEYS.privacy : LEGAL_SECTION_KEYS.terms;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updatedAt}>{t('legal.version', { version: TERMS_VERSION })}</Text>
        {sections.map((section) => (
          <View key={section} style={styles.card}>
            <Text style={styles.sectionTitle}>{t(`legal.${section}.title`)}</Text>
            <Text style={styles.body}>{t(`legal.${section}.body`)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  headerTitle: { ...typography.sectionTitle, flex: 1 },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
  updatedAt: { color: colors.textMuted, fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 23, color: colors.textMuted },
});
