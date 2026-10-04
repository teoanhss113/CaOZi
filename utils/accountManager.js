import firebase from 'firebase/compat/app';
import { auth, db } from '../firebaseConfig';

const deleteRefs = async (refs) => {
  const uniqueRefs = [...new Map(refs.map((ref) => [ref.path, ref])).values()];
  for (let index = 0; index < uniqueRefs.length; index += 400) {
    const batch = db.batch();
    uniqueRefs.slice(index, index + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

export const deleteCurrentAccount = async (password) => {
  const user = auth.currentUser;
  if (!user?.email) throw new Error('Không tìm thấy tài khoản đang đăng nhập');

  const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
  await user.reauthenticateWithCredential(credential);

  const [personalTasks, createdTasks, ownedTeams, memberTeams, reports] = await Promise.all([
    db.collection('tasks').where('userId', '==', user.uid).get(),
    db.collection('tasks').where('createdBy', '==', user.uid).get(),
    db.collection('teams').where('createdBy', '==', user.uid).get(),
    db.collection('teams').where('members', 'array-contains', user.uid).get(),
    db.collection('reports').where('reporterId', '==', user.uid).get(),
  ]);

  const refsToDelete = [
    ...personalTasks.docs.map((doc) => doc.ref),
    ...createdTasks.docs.map((doc) => doc.ref),
    ...reports.docs.map((doc) => doc.ref),
  ];

  for (const teamDoc of ownedTeams.docs) {
    const teamTasks = await db.collection('tasks').where('teamId', '==', teamDoc.id).get();
    const inviteCode = teamDoc.data().code;
    if (inviteCode) refsToDelete.push(db.collection('inviteCodes').doc(inviteCode));
    refsToDelete.push(...teamTasks.docs.map((doc) => doc.ref), teamDoc.ref);
  }

  await deleteRefs(refsToDelete);

  const ownedTeamIds = new Set(ownedTeams.docs.map((doc) => doc.id));
  await Promise.all(memberTeams.docs
    .filter((doc) => !ownedTeamIds.has(doc.id))
    .map((doc) => doc.ref.update({
      members: firebase.firestore.FieldValue.arrayRemove(user.uid),
    })));

  await db.collection('users').doc(user.uid).delete();
  await db.collection('publicProfiles').doc(user.uid).delete();
  await user.delete();
};
