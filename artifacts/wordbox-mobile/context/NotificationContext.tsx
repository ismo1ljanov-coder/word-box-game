import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

type PermResult = { granted: boolean; canAskAgain: boolean };

const NOTIF_PREFS_KEY = "notification_prefs";
const LAST_STUDIED_KEY = "last_studied_date";

interface NotificationPrefs {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  hour: 8,
  minute: 0,
};

interface NotificationContextValue {
  prefs: NotificationPrefs;
  permissionStatus: string | null;
  requestPermission: () => Promise<boolean>;
  setEnabled: (enabled: boolean) => Promise<void>;
  setTime: (hour: number, minute: number) => Promise<void>;
  markPracticedToday: () => Promise<void>;
  ensureScheduled: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

let _lastStudiedDate: string | null = null;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function reminderDateFor(hour: number, minute: number, daysOffset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const NOTIF_CONTENT = {
  title: "Bugun mashq qilingmi? 📚",
  body: "Yangi so'zlarni o'rganish vaqti keldi!",
  data: { navigateTo: "quiz" },
};

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function scheduleForDate(date: Date) {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: NOTIF_CONTENT,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
    },
  });
}

async function cancelAll() {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (raw) {
          setPrefs(JSON.parse(raw) as NotificationPrefs);
        }
      } catch {}

      try {
        const studied = await AsyncStorage.getItem(LAST_STUDIED_KEY);
        _lastStudiedDate = studied;
      } catch {}

      if (Platform.OS !== "web") {
        const result = (await Notifications.getPermissionsAsync()) as unknown as PermResult;
        setPermissionStatus(result.granted ? "granted" : "denied");
      }
    };
    load();
  }, []);

  const savePrefs = useCallback(async (next: NotificationPrefs) => {
    setPrefs(next);
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(next));
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    const result = (await Notifications.requestPermissionsAsync()) as unknown as PermResult;
    const granted = result.granted;
    setPermissionStatus(granted ? "granted" : "denied");
    return granted;
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      const next = { ...prefs, enabled };
      await savePrefs(next);
      if (enabled) {
        const granted = await requestPermission();
        if (granted) {
          const studiedToday = _lastStudiedDate === todayString();
          const todayDate = reminderDateFor(next.hour, next.minute, 0);
          const now = new Date();
          const targetDate =
            !studiedToday && todayDate > now
              ? todayDate
              : reminderDateFor(next.hour, next.minute, 1);
          await scheduleForDate(targetDate);
        } else {
          await savePrefs({ ...next, enabled: false });
        }
      } else {
        await cancelAll();
      }
    },
    [prefs, savePrefs, requestPermission]
  );

  const setTime = useCallback(
    async (hour: number, minute: number) => {
      const next = { ...prefs, hour, minute };
      await savePrefs(next);
      if (next.enabled && permissionStatus === "granted") {
        const studiedToday = _lastStudiedDate === todayString();
        const todayDate = reminderDateFor(hour, minute, 0);
        const now = new Date();
        const targetDate =
          !studiedToday && todayDate > now
            ? todayDate
            : reminderDateFor(hour, minute, 1);
        await scheduleForDate(targetDate);
      }
    },
    [prefs, permissionStatus, savePrefs]
  );

  const markPracticedToday = useCallback(async () => {
    const today = todayString();
    _lastStudiedDate = today;
    try {
      await AsyncStorage.setItem(LAST_STUDIED_KEY, today);
    } catch {}
    if (prefs.enabled && permissionStatus === "granted" && Platform.OS !== "web") {
      await scheduleForDate(reminderDateFor(prefs.hour, prefs.minute, 1));
    }
  }, [prefs, permissionStatus]);

  const ensureScheduled = useCallback(async () => {
    if (!prefs.enabled || permissionStatus !== "granted" || Platform.OS === "web") return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    if (scheduled.length === 0) {
      const studiedToday = _lastStudiedDate === todayString();
      const todayDate = reminderDateFor(prefs.hour, prefs.minute, 0);
      const now = new Date();
      const targetDate =
        !studiedToday && todayDate > now
          ? todayDate
          : reminderDateFor(prefs.hour, prefs.minute, 1);
      await scheduleForDate(targetDate);
    }
  }, [prefs, permissionStatus]);

  return (
    <NotificationContext.Provider
      value={{
        prefs,
        permissionStatus,
        requestPermission,
        setEnabled,
        setTime,
        markPracticedToday,
        ensureScheduled,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
  return ctx;
}
