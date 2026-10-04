import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  TextInput,
  ScrollView,
  Image,
  Clipboard,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import BottomNavBar from '../components/BottomNavBar';
import AvatarWithFrame from '../components/AvatarWithFrame';
import * as Clipboard2 from 'expo-clipboard';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import SegmentedTabs from '../components/ui/SegmentedTabs';
import GradientChip from '../components/ui/GradientChip';
import GradientButton from '../components/ui/GradientButton';
import GradientBadge from '../components/ui/GradientBadge';
import GradientIconButton from '../components/ui/GradientIconButton';
import MissionStatCard from '../components/ui/MissionStatCard';
import { useAppAlert } from '../components/ui/AppAlert';
import AppModal from '../components/ui/AppModal';
import { colors as baseColors, gradients as baseGradients, radii, shadows as baseShadows, typography } from '../constants/theme';
import { getUnlockedAvatarFrameIds } from '../constants/avatarFrames';
import { useTranslation } from '../utils/LanguageContext';

const colors = { ...baseColors, primary: '#7B61FF', primarySoft: '#EDE9FF', surfaceSoft: '#F6F3FF', text: '#1F2937', textMuted: '#64748B', textSoft: '#94A3B8', icon: '#64748B', border: '#EEF0F5' };
const gradients = { ...baseGradients, primaryDeep: ['#9861FF', '#7B61FF'] };
const shadows = { ...baseShadows, card: { shadowColor: '#1F2937', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 } };
import {
  blockCommunityUser,
  submitCommunityReport,
  validateCommunityText,
} from '../utils/contentSafety';

const db = firebase.firestore();
const auth = firebase.auth();
const SCREEN_WIDTH = Dimensions.get('window').width;
const EMPTY_TASK_IMAGE_WIDTH = Math.min(SCREEN_WIDTH - 44, 360);
const EMPTY_TASK_IMAGE_HEIGHT = EMPTY_TASK_IMAGE_WIDTH * (695 / 1024);
const MISSION_BACKGROUND = '#F8F9FC';
const MISSION_BACKGROUND_DEEP = '#F7F6FC';

export default function TodoTeamsScreen({ navigation }) {
  const Alert = useAppAlert();
  const { language, t } = useTranslation();
  const [missionUser, setMissionUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const selectedFrame = getUnlockedAvatarFrameIds(missionUser?.ownedSkins || []).has(missionUser?.avatarFrame)
    ? missionUser.avatarFrame : 'none';
  const [activeView, setActiveView] = useState('all'); // 'all', 'personal', or 'teams'
  const [teamsSubView, setTeamsSubView] = useState('tasks'); // 'tasks' or 'list'
  
  // Tasks State
  const [allTasks, setAllTasks] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'today', 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('created'); // 'created', 'deadline', 'title'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [sortMenuAnchor, setSortMenuAnchor] = useState({ top: 0, left: SCREEN_WIDTH - 220 });
  const taskSortButtonRef = useRef(null);
  
  // Task Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [taskDeadline, setTaskDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPersonalTask, setIsPersonalTask] = useState(true);

  // Teams State
  const [teams, setTeams] = useState([]);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [teamSortBy, setTeamSortBy] = useState('created'); // 'created', 'name', 'members'
  const [teamSortOrder, setTeamSortOrder] = useState('desc');
  const [showTeamSortMenu, setShowTeamSortMenu] = useState(false);
  const [teamSortMenuAnchor, setTeamSortMenuAnchor] = useState({ top: 0, left: SCREEN_WIDTH - 220 });
  const teamSortButtonRef = useRef(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showTeamSettingsModal, setShowTeamSettingsModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [blockedUserIds, setBlockedUserIds] = useState([]);


  const toggleAnchoredSortMenu = useCallback((buttonRef, isOpen, setIsOpen, setAnchor, closeOtherMenu) => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    closeOtherMenu?.();

    buttonRef.current?.measureInWindow((x, y, width, height) => {
      const menuWidth = 200;
      const margin = 12;
      const left = Math.max(margin, Math.min(x + width - menuWidth, SCREEN_WIDTH - menuWidth - margin));
      setAnchor({ top: y + height + 8, left });
      setIsOpen(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  const loadAllData = async () => {
    const user = auth.currentUser;
    let blockedIds = blockedUserIds;
    if (user) {
      const userDoc = await db.collection('users').doc(user.uid).get();
      setMissionUser(userDoc.data() || null);
      blockedIds = userDoc.data()?.blockedUserIds || [];
      setBlockedUserIds(blockedIds);
    }
    await Promise.all([loadTasks(blockedIds), loadTeams(blockedIds)]);
  };

  const loadTasks = async (blockedIds = blockedUserIds) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Load personal tasks
      const personalSnapshot = await db
        .collection('tasks')
        .where('userId', '==', user.uid)
        .where('isPersonal', '==', true)
        .get();

      const personalTasks = personalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        taskType: 'personal',
      }));

      // Load team tasks
      const teamsSnapshot = await db
        .collection('teams')
        .where('members', 'array-contains', user.uid)
        .get();

      const teamIds = teamsSnapshot.docs.map(doc => doc.id);
      let teamTasks = [];

      if (teamIds.length > 0) {
        for (const teamId of teamIds) {
          const teamTasksSnapshot = await db
            .collection('tasks')
            .where('teamId', '==', teamId)
            .get();

          const visibleDocs = teamTasksSnapshot.docs.filter(
            (doc) => !blockedIds.includes(doc.data().createdBy)
          );
          const tasks = await Promise.all(visibleDocs.map(async doc => {
            const taskData = doc.data();
            let creatorEmail = null;
            let assigneeEmail = null;

            // Load creator info
            if (taskData.createdBy) {
              try {
                const creatorDoc = await db.collection('publicProfiles').doc(taskData.createdBy).get();
                creatorEmail = creatorDoc.data()?.userName || 'Thành viên';
              } catch (e) {
                creatorEmail = 'Unknown';
              }
            }

            // Load assignee info
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
              taskType: 'team',
              creatorEmail,
              assigneeEmail,
            };
          }));

          teamTasks = [...teamTasks, ...tasks];
        }
      }

      setAllTasks([...personalTasks, ...teamTasks]);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadTeams = async (blockedIds = blockedUserIds) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

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

          // Get member details
          const memberDetails = await Promise.all(
            teamData.members.filter((memberId) => !blockedIds.includes(memberId)).map(async memberId => {
              const userDoc = await db.collection('publicProfiles').doc(memberId).get();
              const userData = userDoc.exists ? userDoc.data() : {};

              return {
                id: memberId,
                name: userData.userName || 'Thành viên',
                profilePicture: userData.profilePicture || null,
                avatarFrame: userData.avatarFrame || 'none',
              };
            })
          );

          return {
            id: doc.id,
            ...teamData,
            totalTasks,
            completedTasks,
            memberDetails,
          };
        })
      );

      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên ưu tiên');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const cleanTitle = validateCommunityText(newTaskTitle, 'Tên ưu tiên', 120);
        const cleanNote = newTaskNote.trim()
          ? validateCommunityText(newTaskNote, 'Ghi chú', 1000)
          : '';
        await db.collection('tasks').add({
          userId: user.uid,
          createdBy: user.uid,
          title: cleanTitle,
          note: cleanNote,
          isPersonal: isPersonalTask,
          status: 'todo',
          priority: 'normal',
          createdAt: new Date().toISOString(),
          deadline: taskDeadline ? taskDeadline.toISOString() : null,
          order: Date.now(),
        });

        resetTaskForm();
        setShowAddModal(false);
        loadAllData();
      }
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo ưu tiên');
    }
  };

  const updateTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên ưu tiên');
      return;
    }

    try {
      const cleanTitle = validateCommunityText(newTaskTitle, 'Tên ưu tiên', 120);
      const cleanNote = newTaskNote.trim()
        ? validateCommunityText(newTaskNote, 'Ghi chú', 1000)
        : '';
      await db.collection('tasks').doc(editingTask.id).update({
        title: cleanTitle,
        note: cleanNote,
        deadline: taskDeadline ? taskDeadline.toISOString() : null,
      });

      resetTaskForm();
      setShowEditModal(false);
      loadAllData();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật ưu tiên');
    }
  };

  const deleteTask = async (taskId) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa ưu tiên này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.collection('tasks').doc(taskId).delete();
            loadAllData();
          } catch (error) {
            console.error('Error deleting task:', error);
            Alert.alert('Lỗi', 'Không thể xóa ưu tiên');
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
      loadAllData();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật ưu tiên');
    }
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskNote(task.note || '');
    setTaskDeadline(task.deadline ? new Date(task.deadline) : null);
    setShowEditModal(true);
  };

  const resetTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskNote('');
    setTaskDeadline(null);
    setEditingTask(null);
  };

  const generateTeamCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Avatar upload disabled - requires Firebase Storage upgrade
  // const pickImage = async () => { ... }
  // const uploadTeamAvatar = async (teamId, imageUri) => { ... }

  const createTeam = async () => {
    if (!newTeamName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const code = generateTeamCode();
        const cleanName = validateCommunityText(newTeamName, 'Tên nhóm', 80);
        const teamRef = db.collection('teams').doc();
        const inviteRef = db.collection('inviteCodes').doc(code);
        const createdAt = new Date().toISOString();
        await db.runTransaction(async (transaction) => {
          const existingInvite = await transaction.get(inviteRef);
          if (existingInvite.exists) throw new Error('Mã nhóm bị trùng, vui lòng thử lại');
          transaction.set(teamRef, {
            name: cleanName,
            code,
            createdBy: user.uid,
            members: [user.uid],
            createdAt,
            avatar: null,
          });
          transaction.set(inviteRef, {
            teamId: teamRef.id,
            createdBy: user.uid,
            createdAt,
          });
        });

        setNewTeamName('');
        setShowCreateModal(false);
        loadTeams();
        Alert.alert('Thành công', `Mã mời nhóm: ${code}`);
      }
    } catch (error) {
      console.error('Error creating team:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tạo nhóm');
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
        const inviteDoc = await db
          .collection('inviteCodes')
          .doc(teamCode.trim().toUpperCase())
          .get();

        if (!inviteDoc.exists) {
          Alert.alert('Lỗi', 'Không tìm thấy nhóm với mã này');
          return;
        }

        const teamId = inviteDoc.data().teamId;

        if (teams.some((team) => team.id === teamId)) {
          Alert.alert('Thông báo', 'Bạn đã là thành viên của nhóm này');
          setTeamCode('');
          setShowJoinModal(false);
          return;
        }

        await db
          .collection('teams')
          .doc(teamId)
          .update({
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

  const leaveTeam = async (team) => {
    const user = auth.currentUser;
    if (!user) return;

    Alert.alert('Xác nhận', 'Bạn có chắc muốn rời khỏi nhóm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: async () => {
          try {
            await db
              .collection('teams')
              .doc(team.id)
              .update({
                members: firebase.firestore.FieldValue.arrayRemove(user.uid),
              });
            loadTeams();
            Alert.alert('Thành công', 'Đã rời khỏi nhóm');
          } catch (error) {
            console.error('Error leaving team:', error);
            Alert.alert('Lỗi', 'Không thể rời nhóm');
          }
        },
      },
    ]);
  };

  const deleteTeam = async (team) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa nhóm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete all tasks in team
            const tasksSnapshot = await db
              .collection('tasks')
              .where('teamId', '==', team.id)
              .get();
            const batch = db.batch();
            tasksSnapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            batch.delete(db.collection('inviteCodes').doc(team.code));
            await batch.commit();

            // Delete team
            await db.collection('teams').doc(team.id).delete();
            loadTeams();
            Alert.alert('Thành công', 'Đã xóa nhóm');
          } catch (error) {
            console.error('Error deleting team:', error);
            Alert.alert('Lỗi', 'Không thể xóa nhóm');
          }
        },
      },
    ]);
  };

  const removeMemberFromTeam = async (teamId, memberId) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa thành viên này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await db
              .collection('teams')
              .doc(teamId)
              .update({
                members: firebase.firestore.FieldValue.arrayRemove(memberId),
              });
            loadTeams();
            Alert.alert('Thành công', 'Đã xóa thành viên');
          } catch (error) {
            console.error('Error removing member:', error);
            Alert.alert('Lỗi', 'Không thể xóa thành viên');
          }
        },
      },
    ]);
  };

  const updateTeamName = async (teamId, newName) => {
    if (!newName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    try {
      const cleanName = validateCommunityText(newName, 'Tên nhóm', 80);
      await db.collection('teams').doc(teamId).update({
        name: cleanName,
      });
      loadTeams();
      Alert.alert('Thành công', 'Đã cập nhật tên nhóm');
    } catch (error) {
      console.error('Error updating team name:', error);
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật tên nhóm');
    }
  };

  const openTeamSettings = (team) => {
    setSelectedTeam(team);
    setShowTeamSettingsModal(true);
  };

  const reportTarget = (target) => {
    Alert.prompt(
      'Báo cáo nội dung',
      'Mô tả ngắn lý do bạn cho rằng nội dung hoặc người dùng này vi phạm.',
      async (reason) => {
        try {
          await submitCommunityReport({ ...target, reason });
          Alert.alert('Đã gửi báo cáo', 'Cảm ơn bạn. Báo cáo sẽ được xem xét.');
        } catch (error) {
          Alert.alert('Không thể gửi báo cáo', error.message || 'Vui lòng thử lại');
        }
      },
      { placeholder: 'Lý do báo cáo', submitText: 'Gửi báo cáo' }
    );
  };

  const blockMember = (member) => {
    Alert.confirm(
      'Chặn người dùng',
      `Bạn sẽ không còn thấy nội dung do ${member.name} tạo.`,
      async () => {
        try {
          await blockCommunityUser(member.id);
          const nextBlockedIds = [...new Set([...blockedUserIds, member.id])];
          setBlockedUserIds(nextBlockedIds);
          await Promise.all([loadTasks(nextBlockedIds), loadTeams(nextBlockedIds)]);
          Alert.alert('Đã chặn', 'Nội dung của người dùng này đã được ẩn.');
        } catch (error) {
          Alert.alert('Lỗi', 'Không thể chặn người dùng');
        }
      },
      { confirmText: 'Chặn', destructive: true }
    );
  };

  const getFilteredAndSortedTasks = () => {
    const user = auth.currentUser;
    if (!user) return [];

    let filtered = allTasks;

    // Filter by view
    if (activeView === 'personal') {
      filtered = filtered.filter(task => task.isPersonal === true);
    } else if (activeView === 'teams') {
      filtered = filtered.filter(task => task.taskType === 'team');
    }

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

  const getFilteredAndSortedTeams = () => {
    let filtered = teams;

    // Search
    if (teamSearchQuery.trim()) {
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(teamSearchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (teamSortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'members':
          comparison = a.members.length - b.members.length;
          break;
        case 'created':
        default:
          comparison = new Date(b.createdAt) - new Date(a.createdAt);
      }
      return teamSortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const renderTask = ({ item }) => {
    const user = auth.currentUser;
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
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleRow}>
              <Text style={[styles.taskTitle, item.status === 'done' && styles.taskTitleDone]}>
                {item.title}
              </Text>
              {activeView === 'all' && (
                <View style={styles.taskTypeIcon}>
                  {item.taskType === 'team' ? (
                    <Ionicons name="people" size={16} color={colors.primary} />
                  ) : (
                    <Ionicons name="person" size={16} color={colors.primary} />
                  )}
                </View>
              )}
            </View>
          </View>
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
          {item.taskType === 'team' && (activeView === 'all' || activeView === 'teams') && (
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
          )}
        </View>

        <View style={styles.taskActions}>
          {item.taskType === 'team' && item.createdBy !== auth.currentUser?.uid ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => reportTarget({
                targetType: 'task',
                targetId: item.id,
                targetOwnerId: item.createdBy,
                teamId: item.teamId,
              })}
              activeOpacity={0.7}
            >
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

  const renderTeam = ({ item }) => {
    const user = auth.currentUser;
    const isCreator = item.createdBy === user?.uid;
    const progressFillStyle = [
      styles.progressFill,
      {
        width:
          item.totalTasks > 0
            ? `${(item.completedTasks / item.totalTasks) * 100}%`
            : '0%',
      },
    ];

    return (
      <TouchableOpacity
        style={styles.teamCard}
        onPress={() => navigation.navigate('TeamDetail', { teamId: item.id, teamName: item.name })}
        activeOpacity={0.8}
      >
        <View style={styles.teamHeader}>
          <View style={styles.teamIconContainer}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.teamAvatarImage} />
            ) : (
              <LinearGradient
                colors={gradients.primaryDeep}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.teamIconGradient}
              >
                <Ionicons name="people" size={24} color={colors.white} />
              </LinearGradient>
            )}
          </View>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{item.name}</Text>
            <Text style={styles.teamMembers}>{item.members.length} thành viên</Text>
          </View>
          <TouchableOpacity onPress={() => openTeamSettings(item)} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.teamProgress}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={gradients.primaryDeep}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={progressFillStyle}
            />
          </View>
          <Text style={styles.progressText}>
            {item.completedTasks}/{item.totalTasks} ưu tiên
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredTasks = getFilteredAndSortedTasks();
  const reminders = allTasks.filter(task => task.status !== 'done' && task.deadline
    && new Date(task.deadline).getTime() <= Date.now() + 24 * 60 * 60 * 1000)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const renderTaskListHeader = (searchPlaceholder = 'Tìm kiếm...') => (
    <View style={styles.listHeaderControls}>
      <View style={[styles.searchContainer, styles.listHeaderSearch]}>
        <Ionicons name="search" size={20} color={colors.textSoft} />
        <TextInput
          style={styles.searchInput}
          placeholder={searchPlaceholder}
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
          ref={taskSortButtonRef}
          onPress={() => toggleAnchoredSortMenu(
            taskSortButtonRef,
            showSortMenu,
            setShowSortMenu,
            setSortMenuAnchor,
            () => setShowTeamSortMenu(false)
          )}
          activeOpacity={0.82}
        >
          <Ionicons name="funnel" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.progressContainer, styles.listHeaderProgress]}>
        <MissionStatCard
          variant="default"
          value={allTasks.filter(t => {
            if (activeView === 'personal') return t.isPersonal && t.status !== 'done';
            if (activeView === 'teams') return t.taskType === 'team' && t.status !== 'done';
            return t.status !== 'done';
          }).length}
          label="Nhiệm vụ ưu tiên"
          icon={<Ionicons name="sparkles" size={24} color={colors.primary} />}
        />
        <MissionStatCard
          variant="default"
          value={allTasks.filter(t => {
            if (activeView === 'personal') return t.isPersonal && t.status === 'done';
            if (activeView === 'teams') return t.taskType === 'team' && t.status === 'done';
            return t.status === 'done';
          }).length}
          label="Nhiệm vụ hoàn thành"
          icon={<Ionicons name="checkmark" size={24} color={colors.primary} />}
        />
      </View>

      <View style={[styles.filtersRow, styles.listHeaderFilters]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={[styles.filtersContent, styles.listHeaderFiltersContent]}
        >
          <GradientChip
            size="compact"
            label="Tất cả"
            active={filter === 'all'}
            onPress={() => setFilter('all')}
            style={styles.filterChipAll}
          />
          <GradientChip
            size="compact"
            label="Hôm nay"
            active={filter === 'today'}
            onPress={() => setFilter('today')}
            style={styles.filterChipToday}
          />
          <GradientChip
            size="compact"
            label="Hoàn thành"
            active={filter === 'completed'}
            onPress={() => setFilter('completed')}
            style={styles.filterChipCompleted}
          />
        </ScrollView>
      </View>
    </View>
  );


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mission</Text>
          <Text style={styles.subtitle}>{language === 'en' ? 'Plan your work' : 'Xây kế hoạch công việc'}</Text>
        </View>
        <TouchableOpacity style={styles.headerAction} accessibilityRole="button"
          accessibilityLabel={t('settings.notifications')} onPress={() => setShowNotifications(true)}>
          <Ionicons name="notifications-outline" size={24} color={colors.textMuted} />
          {reminders.length > 0 && <View style={styles.notificationDot} />}
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={language === 'en' ? 'Profile and avatar frame' : 'Hồ sơ và khung avatar'}
          onPress={() => navigation.navigate('Home', { openProfile: 'profile' })}>
          <AvatarWithFrame imageUri={missionUser?.profilePicture} frameId={selectedFrame} size={50} />
        </TouchableOpacity>
      </View>

      {/* View Switcher */}
      <SegmentedTabs
        variant="soft"
        style={styles.viewSwitcher}
        value={activeView}
        onChange={setActiveView}
        items={[
          {
            value: 'all',
            label: 'Tất cả',
            icon: (active) => (
              <Ionicons name="list" size={20} color={active ? colors.primary : colors.icon} />
            ),
          },
          {
            value: 'personal',
            label: 'Cá nhân',
            icon: (active) => (
              <Ionicons name="person" size={20} color={active ? colors.primary : colors.icon} />
            ),
          },
          {
            value: 'teams',
            label: 'Nhóm',
            icon: (active) => (
              <Ionicons name="people" size={20} color={active ? colors.primary : colors.icon} />
            ),
          },
        ]}
      />

      {activeView !== 'teams' ? (
        <>
          {/* Sort Dropdown Menu */}
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
            ListHeaderComponent={renderTaskListHeader()}
            contentContainerStyle={[
              styles.list,
              filteredTasks.length === 0 && styles.emptyList,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Image
                  source={require('../assets/empty-tasks.png')}
                  style={styles.emptyImage}
                  resizeMode="contain"
                />
                <Text style={styles.emptyTitle}>Chưa có nhiệm vụ nào</Text>
                <Text style={styles.emptySubtitle}>
                  Tạo nhiệm vụ mới để bắt đầu{'\n'}kế hoạch của bạn nhé!
                </Text>
              </View>
            }
          />

          {/* Add Task Button */}
          <GradientIconButton
            style={styles.addButton}
            onPress={() => {
              setIsPersonalTask(activeView !== 'teams');
              setShowAddModal(true);
            }}
            size={60}
          >
            <Ionicons name="add" size={33} color={colors.white} />
          </GradientIconButton>
        </>
      ) : (
        <>
          {/* Team Sub-View Switcher */}
          <SegmentedTabs
        variant="soft"
            style={styles.teamSubViewSwitcher}
            value={teamsSubView}
            onChange={setTeamsSubView}
            items={[
              {
                value: 'tasks',
                label: 'Ưu tiên',
                icon: (active) => (
                  <Ionicons name="checkbox-outline" size={18} color={active ? colors.primary : colors.icon} />
                ),
              },
              {
                value: 'list',
                label: 'Danh sách',
                icon: (active) => (
                  <Ionicons name="list-outline" size={18} color={active ? colors.primary : colors.icon} />
                ),
              },
            ]}
          />

          {teamsSubView === 'tasks' ? (
            <>
              {/* Sort Menu for Team Tasks (reuse existing) */}
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
                    <Text
                      style={[styles.sortMenuText, sortBy === 'created' && styles.sortMenuTextActive]}
                    >
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
                    style={[
                      styles.sortMenuItem,
                      sortBy === 'deadline' && styles.sortMenuItemActive,
                    ]}
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
                    <Text
                      style={[
                        styles.sortMenuText,
                        sortBy === 'deadline' && styles.sortMenuTextActive,
                      ]}
                    >
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
                    <Text
                      style={[styles.sortMenuText, sortBy === 'title' && styles.sortMenuTextActive]}
                    >
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

              {/* Team Tasks List */}
              <FlatList
                data={filteredTasks}
                renderItem={renderTask}
                keyExtractor={item => item.id}
                ListHeaderComponent={renderTaskListHeader('Tìm kiếm ưu tiên...')}
                contentContainerStyle={[
                  styles.list,
                  filteredTasks.length === 0 && styles.emptyList,
                ]}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Image
                      source={require('../assets/empty-tasks.png')}
                      style={styles.emptyImage}
                      resizeMode="contain"
                    />
                    <Text style={styles.emptyTitle}>Chưa có nhiệm vụ nào</Text>
                    <Text style={styles.emptySubtitle}>
                      Tạo nhiệm vụ mới để bắt đầu{'\n'}kế hoạch của bạn nhé!
                    </Text>
                  </View>
                }
              />

              {/* Add Task Button for Teams */}
              <GradientIconButton
                style={styles.addButton}
                onPress={() => {
                  setIsPersonalTask(false);
                  setShowAddModal(true);
                }}
                size={60}
              >
                <Ionicons name="add" size={33} color={colors.white} />
              </GradientIconButton>
            </>
          ) : (
            <>
              {/* Search Bar for Teams */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={colors.textSoft} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm nhóm..."
                  placeholderTextColor={colors.textSoft}
                  value={teamSearchQuery}
                  onChangeText={setTeamSearchQuery}
                />
                {teamSearchQuery ? (
                  <TouchableOpacity onPress={() => setTeamSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textSoft} />
                  </TouchableOpacity>
                ) : null}
                <View style={styles.searchSortDivider} />
                <TouchableOpacity
                  style={styles.searchSortButton}
                  ref={teamSortButtonRef}
                  onPress={() => toggleAnchoredSortMenu(
                    teamSortButtonRef,
                    showTeamSortMenu,
                    setShowTeamSortMenu,
                    setTeamSortMenuAnchor,
                    () => setShowSortMenu(false)
                  )}
                  activeOpacity={0.82}
                >
                  <Ionicons name="funnel" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {/* Team Sort Menu */}
              {showTeamSortMenu && (
                <View style={[styles.sortMenu, teamSortMenuAnchor]}>
                  <TouchableOpacity
                    style={[
                      styles.sortMenuItem,
                      teamSortBy === 'created' && styles.sortMenuItemActive,
                    ]}
                    onPress={() => {
                      if (teamSortBy === 'created') {
                        setTeamSortOrder(teamSortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setTeamSortBy('created');
                        setTeamSortOrder('desc');
                      }
                      setShowTeamSortMenu(false);
                    }}
                  >
                    <Ionicons
                      name="calendar"
                      size={18}
                      color={teamSortBy === 'created' ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.sortMenuText,
                        teamSortBy === 'created' && styles.sortMenuTextActive,
                      ]}
                    >
                      Ngày tạo
                    </Text>
                    {teamSortBy === 'created' && (
                      <Ionicons
                        name={teamSortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sortMenuItem, teamSortBy === 'name' && styles.sortMenuItemActive]}
                    onPress={() => {
                      if (teamSortBy === 'name') {
                        setTeamSortOrder(teamSortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setTeamSortBy('name');
                        setTeamSortOrder('asc');
                      }
                      setShowTeamSortMenu(false);
                    }}
                  >
                    <Ionicons
                      name="text"
                      size={18}
                      color={teamSortBy === 'name' ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[styles.sortMenuText, teamSortBy === 'name' && styles.sortMenuTextActive]}
                    >
                      Tên A-Z
                    </Text>
                    {teamSortBy === 'name' && (
                      <Ionicons
                        name={teamSortOrder === 'asc' ? 'chevron-down' : 'chevron-up'}
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortMenuItem,
                      teamSortBy === 'members' && styles.sortMenuItemActive,
                    ]}
                    onPress={() => {
                      if (teamSortBy === 'members') {
                        setTeamSortOrder(teamSortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setTeamSortBy('members');
                        setTeamSortOrder('desc');
                      }
                      setShowTeamSortMenu(false);
                    }}
                  >
                    <Ionicons
                      name="people"
                      size={18}
                      color={teamSortBy === 'members' ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.sortMenuText,
                        teamSortBy === 'members' && styles.sortMenuTextActive,
                      ]}
                    >
                      Số thành viên
                    </Text>
                    {teamSortBy === 'members' && (
                      <Ionicons
                        name={teamSortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
                        size={18}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Teams List */}
              <FlatList
                data={getFilteredAndSortedTeams()}
                renderItem={renderTeam}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color={colors.border} />
                    <Text style={styles.emptyText}>Chưa có nhóm nào</Text>
                  </View>
                }
              />

              {/* Team Actions */}
              <View style={styles.teamActions}>
                <GradientButton
                  variant="mission"
                  style={styles.teamActionButton}
                  contentStyle={styles.teamActionButtonContent}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Ionicons name="add-circle" size={24} color={colors.white} />
                  <Text style={styles.actionButtonText}>Tạo nhóm</Text>
                </GradientButton>
                <TouchableOpacity
                  style={[styles.teamActionButton, styles.joinOutlineButton]}
                  onPress={() => setShowJoinModal(true)}
                >
                  <Ionicons name="arrow-forward" size={20} color={colors.primary} />
                  <Text style={styles.joinOutlineText}>Tham gia</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </>
      )}

      <AppModal visible={showNotifications} title={t('settings.notifications')}
        presentation="sheet" onClose={() => setShowNotifications(false)}>
        <ScrollView style={{ maxHeight: 340 }}>
          <Text style={styles.reminderIntro}>{language === 'en' ? 'Overdue and upcoming tasks in the next 24 hours' : 'Ưu tiên quá hạn và đến hạn trong 24 giờ tới'}</Text>
          {reminders.length === 0 ? <Text style={styles.reminderIntro}>{language === 'en' ? 'You are all caught up.' : 'Bạn chưa có ưu tiên nào cần nhắc.'}</Text> : reminders.map(task => (
            <View key={task.id} style={styles.reminderRow}>
              <Ionicons name="time-outline" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.reminderTitle}>{task.title}</Text>
                <Text style={styles.reminderIntro}>{new Date(task.deadline).toLocaleString(language === 'en' ? 'en-US' : 'vi-VN')}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </AppModal>

      {/* Add/Edit Task Modal */}
      <AppModal
        visible={showAddModal || showEditModal}
        title={showEditModal ? 'Sửa ưu tiên' : 'Ưu tiên mới'}
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
                  variant="mission"
            style={styles.modalSubmitButton}
            onPress={showEditModal ? updateTask : addTask}
            title={showEditModal ? 'Cập nhật' : 'Tạo ưu tiên'}
          />
        )}
      >
        <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
          <TextInput
            style={styles.input}
            placeholder="Tên ưu tiên"
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

      {/* Create Team Modal */}
      <AppModal
        visible={showCreateModal}
        title="Tạo nhóm mới"
        onClose={() => setShowCreateModal(false)}
        footer={(
          <GradientButton
                  variant="mission"
            style={styles.modalSubmitButton}
            onPress={createTeam}
            title="Tạo nhóm"
          />
        )}
      >
        <TextInput
          style={styles.input}
          placeholder="Tên nhóm"
          placeholderTextColor={colors.textSoft}
          value={newTeamName}
          onChangeText={setNewTeamName}
          autoFocus
        />
      </AppModal>

      {/* Join Team Modal */}
      <AppModal
        visible={showJoinModal}
        presentation="sheet"
        footerStyle={{ borderTopWidth: 0 }}
        title="Tham gia nhóm"
        onClose={() => setShowJoinModal(false)}
        footer={(
          <GradientButton
                  variant="mission"
            style={styles.modalSubmitButton}
            onPress={joinTeam}
            title="Tham gia"
          />
        )}
      >
        <TextInput
          style={styles.input}
          placeholder="Nhập mã nhóm"
          placeholderTextColor={colors.textSoft}
          value={teamCode}
          onChangeText={setTeamCode}
          autoCapitalize="characters"
          autoFocus
        />
      </AppModal>

      {/* Team Settings Modal */}
      <AppModal
        visible={showTeamSettingsModal}
        title="Cài đặt nhóm"
        presentation="sheet"
        onClose={() => setShowTeamSettingsModal(false)}
        bodyStyle={styles.settingsModalBody}
      >
                {selectedTeam && (
                  <ScrollView 
                    style={styles.settingsContent}
                    contentContainerStyle={styles.settingsContentContainer}
                    showsVerticalScrollIndicator={true}
                    scrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    removeClippedSubviews={false}
                  >
                    {/* Team Avatar */}
                    <View style={styles.teamAvatarSection}>
                      <View
                        style={styles.teamAvatarButton}
                      >
                        {selectedTeam.avatar ? (
                          <Image source={{ uri: selectedTeam.avatar }} style={styles.teamAvatarLarge} />
                        ) : (
                          <View style={styles.teamAvatarPlaceholder}>
                            <Ionicons name="camera" size={32} color={colors.textSoft} />
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Team Name with Edit Icon */}
                    {auth.currentUser?.uid === selectedTeam.createdBy ? (
                      <TouchableOpacity
                        style={styles.teamNameContainer}
                        onPress={() => {
                          Alert.prompt(
                            'Sửa tên nhóm',
                            'Nhập tên mới cho nhóm',
                            text => {
                              if (text) {
                                updateTeamName(selectedTeam.id, text);
                              }
                            },
                            'plain-text',
                            selectedTeam.name
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.teamNameDisplay}>{selectedTeam.name}</Text>
                        <Ionicons name="create-outline" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.teamNameContainer}>
                        <Text style={styles.teamNameDisplay}>{selectedTeam.name}</Text>
                      </View>
                    )}

                    {/* Invite Code with Copy Icon */}
                    <View style={styles.inviteCodeContainerNew}>
                      <View style={styles.inviteCodeContent}>
                        <Text style={styles.settingsLabel}>Mã mời</Text>
                        <Text style={styles.inviteCode}>{selectedTeam.code}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={async () => {
                          await Clipboard2.setStringAsync(selectedTeam.code);
                          Alert.alert('Đã sao chép', 'Mã mời đã được sao chép');
                        }}
                      >
                        <Ionicons name="copy-outline" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={styles.reportTeamButton}
                      onPress={() => reportTarget({
                        targetType: 'team',
                        targetId: selectedTeam.id,
                        targetOwnerId: selectedTeam.createdBy,
                        teamId: selectedTeam.id,
                      })}
                    >
                      <Ionicons name="flag-outline" size={18} color={colors.warning} />
                      <Text style={styles.reportTeamText}>Báo cáo nhóm</Text>
                    </TouchableOpacity>

                    <Text style={styles.settingsLabel}>Thành viên ({selectedTeam.members.length})</Text>
                    {!selectedTeam.memberDetails ? (
                      <View style={styles.loadingMembersContainer}>
                        <Text style={styles.loadingMembersText}>Đang tải thành viên...</Text>
                      </View>
                    ) : (
                      selectedTeam.memberDetails.map(member => (
                        <View key={member.id} style={styles.memberItem}>
                          <View style={styles.memberInfo}>
                            <View style={styles.memberIdentity}>
                              <AvatarWithFrame
                                imageUri={member.profilePicture}
                                frameId={member.avatarFrame}
                                size={58}
                                avatarSize={42}
                                iconSize={22}
                              />
                              <Text style={styles.memberName} numberOfLines={1}>
                                {member.name}
                              </Text>
                            </View>
                            {selectedTeam.createdBy === member.id && (
                              <GradientBadge label="Admin" variant="warning" />
                            )}
                          </View>
                          {member.id !== auth.currentUser?.uid ? (
                            <View style={styles.memberActions}>
                              <TouchableOpacity onPress={() => reportTarget({
                                targetType: 'user',
                                targetId: member.id,
                                targetOwnerId: member.id,
                                teamId: selectedTeam.id,
                              })}>
                                <Ionicons name="flag-outline" size={22} color={colors.warning} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => blockMember(member)}>
                                <Ionicons name="ban-outline" size={22} color={colors.danger} />
                              </TouchableOpacity>
                              {auth.currentUser?.uid === selectedTeam.createdBy && member.id !== selectedTeam.createdBy ? (
                              <TouchableOpacity
                                onPress={() => removeMemberFromTeam(selectedTeam.id, member.id)}
                              >
                                <Ionicons name="remove-circle" size={24} color={colors.danger} />
                              </TouchableOpacity>
                              ) : null}
                            </View>
                          ) : null}
                        </View>
                      ))
                    )}

                    {auth.currentUser?.uid === selectedTeam.createdBy ? (
                      <GradientButton
                  variant="mission"
                        variant="danger"
                        style={styles.settingsButton}
                        contentStyle={styles.settingsButtonContent}
                        onPress={() => {
                          setShowTeamSettingsModal(false);
                          setTimeout(() => deleteTeam(selectedTeam), 300);
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.white} />
                        <Text style={styles.settingsButtonText}>Xóa nhóm</Text>
                      </GradientButton>
                    ) : (
                      <GradientButton
                  variant="mission"
                        variant="warning"
                        style={styles.settingsButton}
                        contentStyle={styles.settingsButtonContent}
                        onPress={() => {
                          setShowTeamSettingsModal(false);
                          setTimeout(() => leaveTeam(selectedTeam), 300);
                        }}
                      >
                        <Ionicons name="exit-outline" size={20} color={colors.white} />
                        <Text style={styles.settingsButtonText}>Rời nhóm</Text>
                      </GradientButton>
                    )}
                  </ScrollView>
                )}
      </AppModal>

      {/* Bottom Navigation */}
      <BottomNavBar navigation={navigation} activeTab="TodoTeams" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MISSION_BACKGROUND,
  },
  headerAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', right: 9, top: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  joinOutlineButton: { borderWidth: 1, borderColor: colors.primary, borderRadius: 14, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  joinOutlineText: { color: colors.primary, fontWeight: '700' },
  reminderIntro: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },
  reminderRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  reminderTitle: { color: colors.text, fontWeight: '600', marginBottom: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 58,
    paddingBottom: 16,
    backgroundColor: MISSION_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(236, 232, 245, 0.9)',
  },
  title: {
    ...typography.title,
    color: colors.text,
    fontSize: 32,
    lineHeight: 38,
    marginBottom: 3,
  },
  subtitle: {
    ...typography.subtitle,
    fontSize: 14,
    color: colors.textMuted,
  },
  viewSwitcher: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: MISSION_BACKGROUND,
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
    fontWeight: '500',
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
  listHeaderControls: {
    marginBottom: 2,
  },
  listHeaderSearch: {
    marginHorizontal: 0,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
    gap: 12,
  },
  listHeaderProgress: {
    paddingHorizontal: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MISSION_BACKGROUND_DEEP,
    paddingTop: 7,
    paddingBottom: 8,
    paddingRight: 0,
    gap: 10,
  },
  listHeaderFilters: {
    marginHorizontal: -20,
  },
  filtersContainer: {
    flex: 1,
  },
  filtersContent: {
    paddingLeft: 20,
    paddingRight: 0,
    gap: 10,
  },
  listHeaderFiltersContent: {
    paddingLeft: 20,
  },
  filterChipAll: {
    width: 78,
    minWidth: 78,
  },
  filterChipToday: {
    width: 94,
    minWidth: 94,
  },
  filterChipCompleted: {
    width: 116,
    minWidth: 116,
  },
  sortMenu: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: 8,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 140,
  },
  emptyList: {
    paddingTop: 0,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radii.lg,
    marginBottom: 12,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  taskHeader: {
    marginBottom: 4,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textSoft,
  },
  taskTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBadges: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  badgePersonal: {
    backgroundColor: colors.primarySoft,
  },
  badgeTextPersonal: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
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
  teamCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radii.lg,
    marginBottom: 12,
    shadowColor: colors.text,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  teamIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  teamMembers: {
    fontSize: 14,
    color: colors.textMuted,
  },
  teamProgress: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  emptyImage: {
    width: EMPTY_TASK_IMAGE_WIDTH,
    height: EMPTY_TASK_IMAGE_HEIGHT,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSoft,
    marginTop: 12,
  },
  addButton: {
    position: 'absolute',
    right: 28,
    bottom: 124,
    elevation: 10,
  },
  teamActions: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 16,
    paddingBottom: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  teamActionButton: {
    flex: 1,
  },
  teamActionButtonContent: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: radii.md,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
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
  modalSubmitButton: {
    marginTop: 8,
  },
  settingsContent: {
    height: Dimensions.get('window').height * 0.6,
  },
  settingsModalBody: {
    paddingBottom: 0,
  },
  settingsContentContainer: {
    paddingBottom: 20,
  },
  teamAvatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  teamNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  teamNameDisplay: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  inviteCodeContainerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSoft,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteCodeContent: {
    flex: 1,
  },
  reportTeamButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  reportTeamText: { color: colors.warning, fontSize: 14, fontWeight: '700' },
  teamAvatarButton: {
    position: 'relative',
    marginTop: 12,
  },
  teamAvatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  teamAvatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  changeAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  changeAvatarOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    minHeight: 34,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    gap: 4,
  },
  changeAvatarText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  inviteCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSoft,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 12,
    marginTop: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSoft,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  memberActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  memberName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  settingsButton: {
    marginTop: 12,
  },
  settingsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radii.md,
    gap: 8,
  },
  settingsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },

  teamSubViewSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 4,
  },
  avatarPicker: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  avatarPreview: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  avatarPlaceholderText: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingMembersContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMembersText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
