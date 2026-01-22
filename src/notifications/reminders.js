import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * repeat: "none" | "daily" | "weekly"
 * dateMs: timestamp (ms)
 */
export async function scheduleReminder({ title, body, dateMs, repeat = "none" }) {
  const ok = await ensureNotificationPermission();
  if (!ok) throw new Error("Bạn chưa cho phép thông báo (Notification permission).");

  const d = new Date(dateMs);
  const hour = d.getHours();
  const minute = d.getMinutes();

  // JS: Sunday=0..Saturday=6
  // Expo weekly trigger uses weekday: 1..7 (Mon..Sun)
  const jsDay = d.getDay(); // 0..6
  const expoWeekday = jsDay === 0 ? 7 : jsDay; // Sun->7, Mon->1,...Sat->6

  let trigger;

  if (repeat === "daily") {
    trigger = {
      hour,
      minute,
      repeats: true,
      channelId: Platform.OS === "android" ? "reminders" : undefined,
    };
  } else if (repeat === "weekly") {
    trigger = {
      weekday: expoWeekday,
      hour,
      minute,
      repeats: true,
      channelId: Platform.OS === "android" ? "reminders" : undefined,
    };
  } else {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: d,
      channelId: Platform.OS === "android" ? "reminders" : undefined,
    };
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: title || "Nhắc nhở ghi chú",
      body: body || "Đến giờ xem lại ghi chú",
      sound: "default",
    },
    trigger,
  });

  return id;
}

export async function cancelReminder(reminderId) {
  if (!reminderId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(reminderId);
  } catch {
    // ignore
  }
}
