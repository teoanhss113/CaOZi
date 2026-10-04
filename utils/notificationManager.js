import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Cấu hình cách hiển thị notification
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Yêu cầu quyền gửi notification
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Gửi notification local
 */
export const sendLocalNotification = async (title, body) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // Gửi ngay lập tức
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

/**
 * Lên lịch notification
 */
export const scheduleNotification = async (title, body, seconds) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        seconds,
      },
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

/**
 * Hủy tất cả notification đã lên lịch
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
};

/**
 * Lên lịch nhắc chăm Pet mỗi ngày.
 */
export const scheduleDailyCareReminder = async (title, body, hour = 20, minute = 0) => {
  try {
    await cancelAllNotifications();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  } catch (error) {
    console.error('Error scheduling daily care reminder:', error);
    throw error;
  }
};

/**
 * Gửi notification nhắc nhở chăm sóc robot
 */
export const sendCareReminder = async () => {
  await sendLocalNotification(
    '🤖 Robot của bạn đang chờ bạn!',
    'Hãy vào chăm sóc robot nhé!'
  );
};

/**
 * Gửi notification có trang phục mới
 */
export const sendNewSkinNotification = async (skinName) => {
  await sendLocalNotification(
    '🎉 Có trang phục mới!',
    `Trang phục ${skinName} đang chờ bạn trong cửa hàng!`
  );
};
