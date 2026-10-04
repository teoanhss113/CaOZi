import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AvatarWithFrame from './AvatarWithFrame';
import { AVATAR_FRAMES, getAvatarFrameProgress } from '../constants/avatarFrames';
import { useTranslation } from '../utils/LanguageContext';

export default function ZodiacFrameCollection({ ownedSkins, onSelect }) {
  const { language } = useTranslation();
  const en = language === 'en';
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{en ? 'Zodiac frame collection' : 'Bộ sưu tập khung hoàng đạo'}</Text>
      <Text style={styles.subtitle}>{en ? 'Each Pet unlocks its frame. Collect all 12 for King.' : 'Mỗi Pet mở một khung. Đủ 12 cung nhận khung King.'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frames}>
        {AVATAR_FRAMES.filter(frame => frame.sprite || frame.id === 'king').map(frame => {
          const progress = getAvatarFrameProgress(frame, ownedSkins);
          return (
            <TouchableOpacity key={frame.id} style={styles.card} onPress={() => onSelect(frame, progress)}
              accessibilityRole="button" accessibilityLabel={`${frame.name}, ${progress.current}/${progress.required}`}>
              <AvatarWithFrame frameId={frame.id} size={76} />
              <Text style={styles.name} numberOfLines={1}>{frame.id === 'king' ? 'King' : frame.name}</Text>
              <View style={styles.status}>
                <Ionicons name={progress.unlocked ? 'checkmark-circle' : 'lock-closed-outline'} size={12} color="#7B61FF" />
                <Text style={styles.progress}>{progress.current}/{progress.required}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  title: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 12, lineHeight: 18, color: '#64748B', marginTop: 5 },
  frames: { gap: 10, paddingTop: 14 },
  card: { width: 96, alignItems: 'center', padding: 8, borderRadius: 16, backgroundColor: '#F6F3FF' },
  name: { fontSize: 11, fontWeight: '600', color: '#1F2937', marginTop: 4 },
  status: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 4 },
  progress: { fontSize: 11, color: '#64748B' },
});
