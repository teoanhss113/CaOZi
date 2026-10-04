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
import { colors, radii, shadows, typography } from '../constants/theme';

export default function TodoHomeScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [filter, setFilter] = useState('today'); // 'today', 'all', 'completed'

  useEffect(() => {
    loadTasks();
  }, []);

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
        
        // Sort locally instead of in Firestore to avoid index requirement
        tasksData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
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
          status: 'todo', // 'todo', 'doing', 'done'
          priority: 'normal', // 'low', 'normal', 'high'
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

  const filteredTasks = getFilteredTasks();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Hôm nay</Text>
        <Text style={styles.subtitle}>{filteredTasks.length} nhiệm vụ</Text>
      </View>

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

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
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
                  <Text style={styles.modalTitle}>Nhiệm vụ mới</Text>
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

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.7}
        >
          <View style={styles.navIconCircle}>
            <Ionicons name="home-outline" size={24} color="#6B7280" />
          </View>
          <Text style={styles.navButtonText}>Pet</Text>
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
          <View style={[styles.navIconCircle, styles.navIconActive]}>
            <Ionicons name="checkbox" size={24} color="#fff" />
          </View>
          <Text style={styles.navButtonTextActive}>Todo</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.subtitle,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.icon,
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radii.lg,
    marginBottom: 12,
    ...shadows.card,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSoft,
  },
  taskNote: {
    fontSize: 14,
    color: colors.textMuted,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSoft,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
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
    color: colors.text,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    padding: 16,
    borderRadius: radii.md,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: 8,
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
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
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
