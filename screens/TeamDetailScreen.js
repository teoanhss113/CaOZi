import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import GradientButton from '../components/ui/GradientButton';
import GradientChip from '../components/ui/GradientChip';
import GradientIconButton from '../components/ui/GradientIconButton';
import MissionStatCard from '../components/ui/MissionStatCard';
import { useAppAlert } from '../components/ui/AppAlert';
import AppModal from '../components/ui/AppModal';
import { colors, gradients, radii, shadows, typography } from '../constants/theme';
import { submitCommunityReport, validateCommunityText } from '../utils/contentSafety';

const db = firebase.firestore();
const auth = firebase.auth();
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TeamDetailScreen({ route, navigation }) {
  const Alert = useAppAlert();
  const { teamId, teamName } = route.params;
  
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortMenuAnchor, setSortMenuAnchor] = useState({ top: 0, left: SCREEN_WIDTH - 220 });
  const sortButtonRef = useRef(null);
  const [filter, setFilter] = useState('all');
  
  // Task Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [taskDeadline, setTaskDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [assignedTo, setAssignedTo] = useState(null);

  useEffect(() => {
    loadTeamData();
    loadTasks();
  }, []);

  const toggleSortMenu = () => {
    if (showSortMenu) {
      setShowSortMenu(false);
      return;
    }

    sortButtonRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = 200;
      const margin = 12;
      const left = Math.max(margin, Math.min(x + width - menuWidth, SCREEN_WIDTH - menuWidth - margin));
      setSortMenuAnchor({ top: y + height + 8, left });
      setShowSortMenu(true);
    });
  };

  const loadTeamData = async () => {
    try {
      const teamDoc = await db.collection('teams').doc(teamId).get();
      if (teamDoc.exists) {
        const teamData = teamDoc.data();
        
        // Load member details
        const currentUserDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        const blockedIds = currentUserDoc.data()?.blockedUserIds || [];
        const memberDetails = await Promise.all(
          teamData.members.filter((memberId) => !blockedIds.includes(memberId)).map(async (memberId) => {
            const userDoc = await db.collection('publicProfiles').doc(memberId).get();
            return {
              id: memberId,
              email: userDoc.exists ? userDoc.data().userName : 'Thành viên',
            };
          })
        );
        
        setTeam({ id: teamDoc.id, ...teamData, memberDetails });
      }
    } catch (error) {
      console.error('Error loading team:', error);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const snapshot = await db
        .collection('tasks')
        .where('teamId', '==', teamId)
        .get();

      const currentUserDoc = await db.collection('users').doc(auth.currentUser.uid).get();
      const blockedIds = currentUserDoc.data()?.blockedUserIds || [];
      const tasksData = await Promise.all(
        snapshot.docs.filter((doc) => !blockedIds.includes(doc.data().createdBy)).map(async (doc) => {
          const taskData = doc.data();
          let creatorEmail = null;
          let assigneeEmail = null;

          if (taskData.createdBy) {
            try {
              const creatorDoc = await db.collection('publicProfiles').doc(taskData.createdBy).get();
              creatorEmail = creatorDoc.data()?.userName || 'Thành viên';
            } catch (e) {
              creatorEmail = 'Unknown';
            }
          }

          if (taskData.assignedTo) {
            try {
              const assigneeDoc = await db.collection('publicProfiles').doc(taskData.assignedTo).get();
              assigneeEmail = assigneeDoc.data()?.userName || 'Thành viên';
            } catch (e) {
              assigneeEmail = 'Unknown';
            }
          }

          return {
            id: doc.id,
            ...taskData,
            creatorEmail,
            assigneeEmail,
          };
        })
      );

      setTasks(tasksData);
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
        const cleanTitle = validateCommunityText(newTaskTitle, 'Tên nhiệm vụ', 120);
        const cleanNote = newTaskNote.trim()
          ? validateCommunityText(newTaskNote, 'Ghi chú', 1000)
          : '';
        await db.collection('tasks').add({
          teamId: teamId,
          title: cleanTitle,
          note: cleanNote,
          isPersonal: false,
          status: 'todo',
          priority: 'normal',
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
          assignedTo: assignedTo || null,
          deadline: taskDeadline ? taskDeadline.toISOString() : null,
          order: Date.now(),
        });

        resetTaskForm();
        setShowAddModal(false);
        loadTasks();
      }
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo nhiệm vụ');
    }
  };

  const updateTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhiệm vụ');
      return;
    }

    try {
      const cleanTitle = validateCommunityText(newTaskTitle, 'Tên nhiệm vụ', 120);
      const cleanNote = newTaskNote.trim()
        ? validateCommunityText(newTaskNote, 'Ghi chú', 1000)
        : '';
      await db.collection('tasks').doc(editingTask.id).update({
        title: cleanTitle,
        note: cleanNote,
        deadline: taskDeadline ? taskDeadline.toISOString() : null,
        assignedTo: assignedTo || null,
      });

      resetTaskForm();
      setShowEditModal(false);
      loadTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật nhiệm vụ');
    }
  };

  const deleteTask = async (taskId) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa nhiệm vụ này?', [
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
    ]);
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

  const openEditTask = (task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskNote(task.note || '');
    setTaskDeadline(task.deadline ? new Date(task.deadline) : null);
    setAssignedTo(task.assignedTo || null);
    setShowEditModal(true);
  };

  const resetTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskNote('');
    setTaskDeadline(null);
    setAssignedTo(null);
    setEditingTask(null);
  };

  const reportTask = (task) => {
    Alert.prompt(
      'Báo cáo nhiệm vụ',
      'Mô tả lý do nội dung này không phù hợp.',
      async (reason) => {
        try {
          await submitCommunityReport({
            targetType: 'task',
            targetId: task.id,
            targetOwnerId: task.createdBy,
            teamId,
            reason,
          });
          Alert.alert('Đã gửi báo cáo', 'Cảm ơn bạn. Báo cáo sẽ được xem xét.');
        } catch (error) {
          Alert.alert('Không thể gửi báo cáo', error.message || 'Vui lòng thử lại');
        }
      },
      { placeholder: 'Lý do báo cáo', submitText: 'Gửi báo cáo' }
    );
  };

  const getFilteredAndSortedTasks = () => {
    let filtered = tasks;

    // Filter by status
    const today = new Date().toDateString();
    switch (filter) {
      case 'today':
        filtered = filtered.filter(task => {
          const taskDate = new Date(task.createdAt).toDateString();
          return taskDate === today && task.status !== 'done';
        });
        break;
      case 'completed':
        filtered = filtered.filter(task => task.status === 'done');
        break;
    }

    // Search
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        task =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'deadline':
          if (!a.deadline && !b.deadline) comparison = 0;
          else if (!a.deadline) comparison = 1;
          else if (!b.deadline) comparison = -1;
          else comparison = new Date(a.deadline) - new Date(b.deadline);
          break;
        case 'created':
        default:
          comparison = new Date(b.createdAt) - new Date(a.createdAt);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const renderTask = ({ item }) => {
    const isOverdue =
      item.deadline &&
      new Date(item.deadline) < new Date() &&
      item.status !== 'done';

    return (
      <View style={styles.taskCard}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => toggleTaskStatus(item.id, item.status)}
          activeOpacity={0.7}
        >
          {item.status === 'done' ? (
            <LinearGradient
              colors={gradients.primaryDeep}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.checkbox, styles.checkboxDone]}
            >
              <Ionicons name="checkmark" size={18} color={colors.white} />
            </LinearGradient>
          ) : (
            <View style={styles.checkbox} />
          )}
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
          {item.deadline && (
            <View style={styles.deadlineContainer}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={isOverdue ? colors.danger : colors.textMuted}
              />
              <Text style={[styles.deadlineText, isOverdue && styles.deadlineOverdue]}>
                {new Date(item.deadline).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          )}
          <View style={styles.taskMetaContainer}>
            {item.creatorEmail && (
              <Text style={styles.taskMeta}>
                <Ionicons name="person-outline" size={12} color={colors.textMuted} /> Giao bởi: {item.creatorEmail}
              </Text>
            )}
            {item.assigneeEmail && (
              <Text style={styles.taskMeta}>
                <Ionicons name="person" size={12} color={colors.primary} /> Thực hiện: {item.assigneeEmail}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.taskActions}>
          {item.createdBy !== auth.currentUser?.uid ? (
            <TouchableOpacity style={styles.actionButton} onPress={() => reportTask(item)}>
              <Ionicons name="flag-outline" size={20} color={colors.warning} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditTask(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteTask(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filteredTasks = getFilteredAndSortedTasks();
  const completedCount = tasks.filter(t => t.status === 'done').length;
  const activeCount = tasks.filter(t => t.status !== 'done').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={1}>{teamName}</Text>
          <Text style={styles.subtitle}>
            {team?.members?.length || 0} thành viên • {tasks.length} nhiệm vụ
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.icon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm nhiệm vụ..."
          placeholderTextColor={colors.textSoft}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSoft} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.searchSortDivider} />
        <TouchableOpacity
          style={styles.searchSortButton}
          ref={sortButtonRef}
          onPress={toggleSortMenu}
          activeOpacity={0.82}
        >
          <Ionicons name="funnel" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Progress Overview */}
      <View style={styles.progressContainer}>
        <MissionStatCard value={activeCount} label="Đang làm" icon="sparkles" />
        <MissionStatCard value={completedCount} label="Hoàn thành" icon="checkmark" />
      </View>

      {/* Filters and Sort */}
      <View style={styles.filtersRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          <GradientChip size="compact" label="Tất cả" active={filter === 'all'} onPress={() => setFilter('all')} />
          <GradientChip size="compact" label="Hôm nay" active={filter === 'today'} onPress={() => setFilter('today')} />
          <GradientChip size="compact" label="Hoàn thành" active={filter === 'completed'} onPress={() => setFilter('completed')} />
        </ScrollView>
      </View>

      {/* Floating Sort Menu */}
      {showSortMenu && (
        <View style={[styles.sortMenu, sortMenuAnchor]}>
          <TouchableOpacity
            style={[styles.sortMenuItem, sortBy === 'created' && styles.sortMenuItemActive]}
            onPress={() => {
              if (sortBy === 'created') {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('created');
                setSortOrder('desc');
              }
              setShowSortMenu(false);
            }}
          >
            <Ionicons
              name="calendar"
              size={18}
              color={sortBy === 'created' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.sortMenuText, sortBy === 'created' && styles.sortMenuTextActive]}>
              Ngày tạo
            </Text>
            {sortBy === 'created' && (
              <Ionicons 
                name={sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'} 
                size={18} 
                color={colors.primary} 
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortMenuItem, sortBy === 'deadline' && styles.sortMenuItemActive]}
            onPress={() => {
              if (sortBy === 'deadline') {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('deadline');
                setSortOrder('desc');
              }
              setShowSortMenu(false);
            }}
          >
            <Ionicons
              name="time"
              size={18}
              color={sortBy === 'deadline' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.sortMenuText, sortBy === 'deadline' && styles.sortMenuTextActive]}>
              Hạn chót
            </Text>
            {sortBy === 'deadline' && (
              <Ionicons 
                name={sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'} 
                size={18} 
                color={colors.primary} 
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortMenuItem, sortBy === 'title' && styles.sortMenuItemActive]}
            onPress={() => {
              if (sortBy === 'title') {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('title');
                setSortOrder('asc');
              }
              setShowSortMenu(false);
            }}
          >
            <Ionicons
              name="text"
              size={18}
              color={sortBy === 'title' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.sortMenuText, sortBy === 'title' && styles.sortMenuTextActive]}>
              Tên A-Z
            </Text>
            {sortBy === 'title' && (
              <Ionicons 
                name={sortOrder === 'asc' ? 'chevron-down' : 'chevron-up'} 
                size={18} 
                color={colors.primary} 
              />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Task List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={colors.textSoft} />
            <Text style={styles.emptyText}>Không có nhiệm vụ nào</Text>
          </View>
        }
      />

      {/* Add Task Button */}
      <GradientIconButton
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
        size={56}
      >
        <Ionicons name="add" size={32} color={colors.white} />
      </GradientIconButton>

      {/* Add/Edit Task Modal */}
      <AppModal
        visible={showAddModal || showEditModal}
        title={showEditModal ? 'Sửa nhiệm vụ' : 'Thêm nhiệm vụ mới'}
        presentation="sheet"
        contentStyle={styles.taskModalContent}
        bodyStyle={styles.taskModalBody}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          resetTaskForm();
        }}
        footer={(
          <GradientButton
            title={showEditModal ? 'Cập nhật' : 'Tạo nhiệm vụ'}
            style={styles.submitButton}
            onPress={showEditModal ? updateTask : addTask}
          />
        )}
      >
        <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.input}
            placeholder="Tên nhiệm vụ"
            placeholderTextColor={colors.textSoft}
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            autoFocus
          />

          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Ghi chú (không bắt buộc)"
            placeholderTextColor={colors.textSoft}
            value={newTaskNote}
            onChangeText={setNewTaskNote}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
            <Text style={styles.datePickerText}>
              {taskDeadline
                ? `Hạn: ${taskDeadline.toLocaleDateString('vi-VN')}`
                : 'Chọn hạn chót (không bắt buộc)'}
            </Text>
            {taskDeadline && (
              <TouchableOpacity onPress={() => setTaskDeadline(null)}>
                <Ionicons name="close-circle" size={20} color={colors.textSoft} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={taskDeadline || new Date()}
              mode="date"
              display="inline"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setTaskDeadline(selectedDate);
                }
              }}
            />
          )}
        </ScrollView>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...typography.title,
    fontSize: 28,
    marginBottom: 4,
  },
  subtitle: {
    ...typography.subtitle,
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    shadowColor: '#7F6FB2',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  searchSortDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  searchSortButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingTop: 7,
    paddingBottom: 8,
    gap: 10,
  },
  filtersContainer: {
    flex: 1,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  sortMenu: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 8,
    ...shadows.card,
    zIndex: 1000,
    width: 200,
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  sortMenuItemActive: {
    backgroundColor: colors.primarySoft,
  },
  sortMenuText: {
    flex: 1,
    fontSize: 15,
    color: colors.textMuted,
  },
  sortMenuTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    padding: 20,
    paddingBottom: 140,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radii.lg,
    marginBottom: 12,
    ...shadows.card,
  },
  checkboxContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    borderColor: colors.primary,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
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
    marginBottom: 8,
  },
  taskMetaContainer: {
    marginTop: 8,
    gap: 4,
  },
  taskMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  deadlineText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  deadlineOverdue: {
    color: colors.danger,
    fontWeight: '600',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSoft,
    marginTop: 12,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 40,
  },
  input: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 12,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 8,
  },
  datePickerText: {
    flex: 1,
    fontSize: 16,
    color: colors.textMuted,
  },
  submitButton: {
    marginTop: 8,
  },
  modalScrollView: {
    flex: 1,
  },
  taskModalContent: {
    height: Dimensions.get('window').height * 0.58,
    maxHeight: Dimensions.get('window').height * 0.58,
  },
  taskModalBody: {
    flex: 1,
  },
});
