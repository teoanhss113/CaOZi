import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';

export default function TeamsScreen({ navigation }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        // Get teams where user is member
        const snapshot = await db
          .collection('teams')
          .where('members', 'array-contains', user.uid)
          .get();

        const teamsData = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const teamData = doc.data();
            
            // Count tasks for this team
            const tasksSnapshot = await db
              .collection('tasks')
              .where('teamId', '==', doc.id)
              .where('status', '!=', 'done')
              .get();

            return {
              id: doc.id,
              ...teamData,
              activeTasks: tasksSnapshot.size,
            };
          })
        );

        setTeams(teamsData);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTeamCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const teamCode = generateTeamCode();
        
        await db.collection('teams').add({
          name: newTeamName.trim(),
          code: teamCode,
          ownerId: user.uid,
          members: [user.uid],
          createdAt: new Date().toISOString(),
        });

        setNewTeamName('');
        setShowCreateModal(false);
        loadTeams();
        
        Alert.alert(
          'Thành công',
          `Nhóm đã được tạo!\nMã mời: ${teamCode}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Lỗi', 'Không thể tạo nhóm');
    }
  };

  const joinTeam = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã mời');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const snapshot = await db
          .collection('teams')
          .where('code', '==', joinCode.trim().toUpperCase())
          .get();

        if (snapshot.empty) {
          Alert.alert('Lỗi', 'Mã mời không hợp lệ');
          return;
        }

        const teamDoc = snapshot.docs[0];
        const teamData = teamDoc.data();

        if (teamData.members.includes(user.uid)) {
          Alert.alert('Thông báo', 'Bạn đã là thành viên của nhóm này');
          return;
        }

        await teamDoc.ref.update({
          members: [...teamData.members, user.uid],
        });

        setJoinCode('');
        setShowJoinModal(false);
        loadTeams();
        
        Alert.alert('Thành công', `Đã tham gia nhóm "${teamData.name}"!`);
      }
    } catch (error) {
      console.error('Error joining team:', error);
      Alert.alert('Lỗi', 'Không thể tham gia nhóm');
    }
  };

  const renderTeam = ({ item }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => navigation.navigate('TeamDetail', { teamId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.teamIconContainer}>
        <Ionicons name="people" size={28} color="#3B82F6" />
      </View>
      
      <View style={styles.teamContent}>
        <Text style={styles.teamName}>{item.name}</Text>
        <Text style={styles.teamInfo}>
          {item.members.length} thành viên • {item.activeTasks} nhiệm vụ đang làm
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nhóm của tôi</Text>
        <Text style={styles.subtitle}>{teams.length} nhóm</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={20} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Tạo nhóm</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowJoinModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="enter" size={20} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Tham gia</Text>
        </TouchableOpacity>
      </View>

      {/* Team List */}
      <FlatList
        data={teams}
        renderItem={renderTeam}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhóm nào</Text>
            <Text style={styles.emptySubtext}>
              Tạo nhóm mới hoặc tham gia bằng mã mời
            </Text>
          </View>
        }
      />

      {/* Create Team Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCreateModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tạo nhóm mới</Text>
                  <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Tên nhóm"
                  placeholderTextColor="#9CA3AF"
                  value={newTeamName}
                  onChangeText={setNewTeamName}
                  autoFocus
                />

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={createTeam}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitButtonText}>Tạo nhóm</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Join Team Modal */}
      <Modal
        visible={showJoinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowJoinModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Tham gia nhóm</Text>
                  <TouchableOpacity onPress={() => setShowJoinModal(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Nhập mã mời (6 ký tự)"
                  placeholderTextColor="#9CA3AF"
                  value={joinCode}
                  onChangeText={setJoinCode}
                  autoCapitalize="characters"
                  maxLength={6}
                  autoFocus
                />

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={joinTeam}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitButtonText}>Tham gia</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.navContainer}>
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Home')}
            activeOpacity={0.7}
          >
            <View style={styles.navIconCircle}>
              <Ionicons name="home-outline" size={24} color="#6B7280" />
            </View>
            <Text style={styles.navButtonText}>Nhà</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Wardrobe')}
            activeOpacity={0.7}
          >
            <View style={styles.navIconCircle}>
              <Ionicons name="paw-outline" size={24} color="#6B7280" />
            </View>
            <Text style={styles.navButtonText}>My Pet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('TodoHome')}
            activeOpacity={0.7}
          >
            <View style={styles.navIconCircle}>
              <Ionicons name="checkbox-outline" size={24} color="#6B7280" />
            </View>
            <Text style={styles.navButtonText}>Todo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Teams')}
            activeOpacity={0.7}
          >
            <View style={[styles.navIconCircle, styles.navIconActive]}>
              <Ionicons name="people" size={24} color="#fff" />
            </View>
            <Text style={styles.navButtonTextActive}>Nhóm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('Shop')}
            activeOpacity={0.7}
          >
            <View style={styles.navIconCircle}>
              <Ionicons name="storefront-outline" size={24} color="#6B7280" />
            </View>
            <Text style={styles.navButtonText}>Shop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  teamIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teamContent: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  teamInfo: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#D1D5DB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  input: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  navIconActive: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  navButtonText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  navButtonTextActive: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '700',
  },
});
