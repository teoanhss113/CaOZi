import firebase from 'firebase/compat/app';
import { auth, db } from '../firebaseConfig';

const BLOCKED_PATTERNS = [
  /\b(kill yourself|nude|porn|terrorist)\b/i,
  /\b(địt|đụ|lồn|cặc|khiêu dâm)\b/i,
];

export const validateCommunityText = (value, label, maxLength = 160) => {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text) throw new Error(`${label} không được để trống`);
  if (text.length > maxLength) throw new Error(`${label} không được vượt quá ${maxLength} ký tự`);
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new Error(`${label} chứa nội dung không phù hợp`);
  }
  return text;
};

export const submitCommunityReport = async ({ targetType, targetId, targetOwnerId, teamId, reason }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Bạn cần đăng nhập để gửi báo cáo');
  const cleanReason = validateCommunityText(reason, 'Lý do báo cáo', 500);
  await db.collection('reports').add({
    reporterId: user.uid,
    targetType,
    targetId,
    targetOwnerId: targetOwnerId || null,
    teamId: teamId || null,
    reason: cleanReason,
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
};

export const blockCommunityUser = async (blockedUserId) => {
  const user = auth.currentUser;
  if (!user || !blockedUserId || blockedUserId === user.uid) return;
  await db.collection('users').doc(user.uid).update({
    blockedUserIds: firebase.firestore.FieldValue.arrayUnion(blockedUserId),
    updatedAt: new Date().toISOString(),
  });
};
