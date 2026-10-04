import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

const db = firebase.firestore();
const auth = firebase.auth();

export default function TodoTeamsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'teams'
  
  // Personal Tasks State
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNote, setNewTaskNote] = useState('');

  // Teams State
  const [teams, setTeams] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');

  useEffect(() => {
    if (activeTab === 'personal') {
      loadTasks();
    } else {
      loadTeams();
    }
  }, [activeTab]);

  const loadTasks = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const snapshot = await db
          .collection('tasks')
          .where('userId', '==', user.uid)
          .where('isPersonal', '==', true)
          .get();

        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        tasksData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadTeams = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const snapshot = await db
          .collection('teams')
          .where('members', 'array-contains', user.uid)
          .get();

        const teamsData = await Promise.all(
          snapshot.docs.map(async doc => {
            const teamData = doc.data();
            const tasksSnapshot = await db
              .collection('tasks')
              .where('teamId', '==', doc.id)
              .get();

            const totalTasks = tasksSnapshot.size;
            const completedTasks = tasksSnapshot.docs.filter(
              taskDoc => taskDoc.data().status === 'done'
            ).length;

            return {
              id: doc.id,
              ...teamData,
              totalTasks,
              completedTasks,
            };
          })
        );

        setTeams(teamsData);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhiệm vụ');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        await db.collection('tasks').add({
          userId: user.uid,
          title: newTaskTitle.trim(),
          note: newTaskNote.trim(),
          isPersonal: true,
          status: 'todo',
          priority: 'normal',
          createdAt: new Date().toISOString(),
          deadline: null,
        });

        setNewTaskTitle('');
        setNewTaskNote('');
        setShowAddModal(false);
        loadTasks();
      }
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Lỗi', 'Không thể tạo nhiệm vụ');
    }
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'done' ? 'todo' : 'done';
      await db.collection('tasks').doc(taskId).update({
        status: newStatus,
        completedAt: newStatus === 'done' ? new Date().toISOString() : null,
      });
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật nhiệm vụ');
    }
  };

  const deleteTask = async (taskId) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn xóa nhiệm vụ này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.collection('tasks').doc(taskId).delete();
              loadTasks();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Lỗi', 'Không thể xóa nhiệm vụ');
            }
          },
        },
      ]
    );
  };

  const generateTeamCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const code = generateTeamCode();
        await db.collection('teams').add({
          name: newTeamName.trim(),
          code: code,
          createdBy: user.uid,
          members: [user.uid],
          createdAt: new Date().toISOString(),
        });

        setNewTeamName('');
        setShowCreateModal(false);
        loadTeams();
        Alert.alert('Thành công', `Mã mời nhóm: ${code}`);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Lỗi', 'Không thể tạo nhóm');
    }
  };

  const joinTeam = async () => {
    if (!teamCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã nhóm');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const snapshot = await db
          .collection('teams')
          .where('code', '==', teamCode.trim().toUpperCase())
          .get();

        if (snapshot.empty) {
          Alert.alert('Lỗi', 'Không tìm thấy nhóm với mã này');
          return;
        }

        const teamDoc = snapshot.docs[0];
        const teamData = teamDoc.data();

        if (teamData.members.includes(user.uid)) {
          Alert.alert('Thông báo', 'Bạn đã là thành viên của nhóm này');
          setTeamCode('');
          setShowJoinModal(false);
          return;
        }

        await db.collection('teams').doc(teamDoc.id).update({
          members: firebase.firestore.FieldValue.arrayUnion(user.uid),
        });

        setTeamCode('');
        setShowJoinModal(false);
        loadTeams();
        Alert.alert('Thành công', 'Đã tham gia nhóm');
      }
    } catch (error) {
      console.error('Error joining team:', error);
      Alert.alert('Lỗi', 'Không thể tham gia nhóm');
    }
  };

  const getFilteredTasks = () => {
    const today = new Date().toDateString();
    
    switch (filter) {
      case 'today':
        return tasks.filter(task => {
          const taskDate = new Date(task.createdAt).toDateString();
          return taskDate === today && task.status !== 'done';
        });
      case 'completed':
        return tasks.filter(task => task.status === 'done');
      default:
        return tasks;
    }
  };

  const renderTask = ({ item }) => (
    <View style={styles.taskCard}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => toggleTaskStatus(item.id, item.status)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, item.status === 'done' && styles.checkboxDone]}>
          {item.status === 'done' && <Ionicons name="checkmark" size={18} color="#fff" />}
        </View>
      </TouchableOpacity>

      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, item.status === 'done' && styles.taskTitleDone]}>
          {item.title}
        </Text>
        {item.note ? (
          <Text style={styles.taskNote} numberOfLines={2}>
            {item.note}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteTask(item.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  const renderTeam = ({ item }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => navigation.navigate('TeamDetail', { teamId: item.id, teamName: item.name })}
      activeOpacity={0.8}
    >
      <View style={styles.teamHeader}>
        <View style={styles.teamIconContainer}>
          <Ionicons name="people" size={24} color="#fff" />
        </View>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{item.name}</Text>
          <Text style={styles.teamMembers}>{item.members.length} thành viên</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
      </View>
      <View style={styles.teamProgress}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: item.totalTasks > 0
                  ? `${(item.completedTasks / item.totalTasks) * 100}%`
                  : '0%',
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {item.completedTasks}/{item.totalTasks} nhiệm vụ
        </Text>
      </View>
    </TouchableOpacity>
  );

  const filteredTasks = activeTab === 'personal' ? getFilteredTasks() : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header with Tab Switcher */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {activeTab === 'personal' ? 'Hôm nay' : 'Nhóm của tôi'}
        </Text>
        <Text style={styles.subtitle}>
          {activeTab === 'personal'
            ? `${filteredTasks.length} nhiệm vụ`
            : `${teams.length} nhóm`}
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabSwitcher}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'personal' && styles.tabActive]}
          onPress={() => setActiveTab('personal')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="checkbox"
            size={20}
            color={activeTab === 'personal' ? '#fff' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'personal' && styles.tabTextActive]}>
            Cá nhân
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'teams' && styles.tabActive]}
          onPress={() => setActiveTab('teams')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'teams' ? '#fff' : '#6B7280'}
          />
          <Text style={[styles.tabText, activeTab === 'teams' && styles.tabTextActive]}>
            Nhóm
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'personal' ? (
        <>
          {/* Filter Tabs */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'today' && styles.filterTabActive]}
              onPress={() => setFilter('today')}
            >
              <Text style={[styles.filterText, filter === 'today' && styles.filterTextActive]}>
                Hôm nay
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                Tất cả
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
                Hoàn thành
              </Text>
            </TouchableOpacity>
          </View>

          {/* Task List */}
          <FlatList
            data={filteredTasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Không có nhiệm vụ nào</Text>
              </View>
            }
          />

          {/* Add Task Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Teams List */}
          <FlatList
            data={teams}
            renderItem={renderTeam}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có nhóm nào</Text>
              </View>
            }
          />

          {/* Team Actions */}
          <View style={styles.teamActions}>
            <TouchableOpacity
              style={[styles.teamActionButton, styles.createButton]}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Tạo nhóm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.teamActionButton, styles.joinButton]}
              onPress={() => setShowJoinModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Tham gia</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Add Task Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Thêm nhiệm vụ mới</Text>
                  <TouchableOpacity onPress={() => setShowAddModal(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Tên nhiệm vụ"
                  placeholderTextColor="#9CA3AF"
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  autoFocus
                />

                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  placeholder="Ghi chú (không bắt buộc)"
                  placeholderTextColor="#9CA3AF"
                  value={newTaskNote}
                  onChangeText={setNewTaskNote}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={addTask}
                  activeOpacity={0.8}
                >
                  <Text style={styles.submitButtonText}>Tạo nhiệm vụ</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Team Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
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
        animationType="fade"
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
                  placeholder="Nhập mã nhóm"
                  placeholderTextColor="#9CA3AF"
                  value={teamCode}
                  onChangeText={setTeamCode}
                  autoCapitalize="characters"
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
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconCircle}>
            <Ionicons name="happy-outline" size={28} color="#6B7280" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Wardrobe')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconCircle}>
            <Ionicons name="shirt-outline" size={28} color="#6B7280" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <View style={[styles.navIconCircle, styles.navIconActive]}>
            <Ionicons name="checkbox" size={28} color="#fff" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Shop')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconCircle}>
            <Ionicons name="storefront-outline" size={28} color="#6B7280" />
          </View>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 8,
  },
  tabActive: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  taskNote: {
    fontSize: 14,
    color: '#6B7280',
  },
  deleteButton: {
    padding: 8,
  },
  teamCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  teamMembers: {
    fontSize: 14,
    color: '#6B7280',
  },
  teamProgress: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  teamActions: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    gap: 12,
  },
  teamActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButton: {
    backgroundColor: '#3B82F6',
  },
  joinButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    backgroundColor: '#3B82F6',
  },
});
