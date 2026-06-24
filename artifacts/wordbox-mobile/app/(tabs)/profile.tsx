import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

interface StatsSummary {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  totalWordsLearned: number;
  totalWordsMastered: number;
  todayXp: number;
  dailyGoal: number;
}

interface AchievementFull {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt: string | null;
}

interface LevelStat {
  level: string;
  total: number;
  learned: number;
  mastered: number;
}

const LEVEL_COLORS: Record<string, string> = {
  A1: "#10b981",
  A2: "#3b82f6",
  B1: "#8b5cf6",
  B2: "#f97316",
  C1: "#ec4899",
  C2: "#eab308",
};

function StatBox({
  value,
  label,
  icon,
  colors,
}: {
  value: string | number;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[sbStyles.box, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[sbStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[sbStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const sbStyles = StyleSheet.create({
  box: { flex: 1, alignItems: "center", borderRadius: 14, padding: 14, gap: 4, borderWidth: 1 },
  value: { fontSize: 20, fontWeight: "800" as const, fontFamily: "Nunito_800ExtraBold" },
  label: { fontSize: 11, fontFamily: "Nunito_600SemiBold", textAlign: "center" },
});

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { prefs, setEnabled, setTime } = useNotifications();
  const [showTimePicker, setShowTimePicker] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<StatsSummary>({
    queryKey: ["profile-stats"],
    queryFn: () => apiGet<StatsSummary>("/stats/summary"),
    staleTime: 60000,
  });

  const { data: achievements } = useQuery<AchievementFull[]>({
    queryKey: ["achievements-all"],
    queryFn: () => apiGet<AchievementFull[]>("/achievements/all"),
    staleTime: 300000,
  });

  const { data: levelStats } = useQuery<LevelStat[]>({
    queryKey: ["level-stats"],
    queryFn: () => apiGet<LevelStat[]>("/stats/levels"),
    staleTime: 60000,
  });

  const handleLogout = useCallback(() => {
    Alert.alert("Chiqish", "Hisobdan chiqmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Chiqish",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
        },
      },
    ]);
  }, [logout]);

  const displayName = user?.displayName || user?.phone || "Foydalanuvchi";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const unlockedCount = achievements?.filter((a) => a.isUnlocked).length ?? 0;
  const totalCount = achievements?.length ?? 0;

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
    header: { alignItems: "center", marginBottom: 28, gap: 10 },
    avatarCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: colors.primary, alignItems: "center", justifyContent: "center",
    },
    avatarText: { fontSize: 28, fontWeight: "800" as const, color: "#fff", fontFamily: "Nunito_800ExtraBold" },
    name: { fontSize: 22, fontWeight: "800" as const, color: colors.foreground, fontFamily: "Nunito_800ExtraBold" },
    tierBadge: {
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
      backgroundColor: colors.accent + "25",
    },
    tierText: { fontSize: 12, fontWeight: "700" as const, color: colors.foreground, fontFamily: "Nunito_700Bold" },
    statRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground, fontFamily: "Nunito_700Bold", marginBottom: 12 },
    levelCard: { marginBottom: 10, gap: 6 },
    levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    levelLabel: { fontSize: 13, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
    levelCount: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Nunito_600SemiBold" },
    levelTrack: { height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" },
    levelFill: { height: 6, borderRadius: 3 },
    achievementGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
    achievementItem: {
      width: "47%", borderRadius: 14, borderWidth: 1, padding: 14, gap: 4,
    },
    achievementTitle: { fontSize: 13, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
    achievementDesc: { fontSize: 11, fontFamily: "Nunito_400Regular", lineHeight: 14 },
    achievementXp: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
    notifCard: {
      borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 24, gap: 12,
    },
    notifRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    notifLabel: { fontSize: 15, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
    notifSub: { fontSize: 12, fontFamily: "Nunito_400Regular", marginTop: 2 },
    timeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    timeBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    },
    timeBtnText: { fontSize: 14, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
    timePicker: { gap: 12 },
    timePickerLabel: { fontSize: 13, fontFamily: "Nunito_600SemiBold", textAlign: "center" },
    timeUnit: { alignItems: "center", gap: 4 },
    timeUnitLabel: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
    timeValue: { fontSize: 28, fontWeight: "800" as const, fontFamily: "Nunito_800ExtraBold" },
    stepBtn: {
      width: 36, height: 36, borderRadius: 10, borderWidth: 1,
      alignItems: "center", justifyContent: "center",
    },
    logoutBtn: {
      height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center",
      flexDirection: "row", gap: 10, borderWidth: 1.5, marginTop: 8,
    },
    logoutText: { fontSize: 15, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
  });

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarText}>{initials || "W"}</Text>
        </View>
        <Text style={s.name}>{displayName}</Text>
        <View style={s.tierBadge}>
          <Text style={s.tierText}>
            {user?.subscriptionTier === "premium" ? "⭐ Premium" : "Bepul"}
          </Text>
        </View>
      </View>

      {statsLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginBottom: 24 }} />
      ) : (
        <View style={s.statRow}>
          <StatBox value={stats?.currentStreak ?? 0} label="Kun ketma-ket" icon="flame-outline" colors={colors} />
          <StatBox value={stats?.totalWordsLearned ?? 0} label="O'rganildi" icon="book-outline" colors={colors} />
          <StatBox value={stats?.totalXp ?? 0} label="Jami XP" icon="flash-outline" colors={colors} />
        </View>
      )}

      {levelStats && levelStats.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Daraja bo'yicha progress</Text>
          {levelStats.map((ls) => {
            const pct = ls.total > 0 ? Math.min((ls.learned / ls.total) * 100, 100) : 0;
            const lc = LEVEL_COLORS[ls.level] ?? colors.primary;
            return (
              <View key={ls.level} style={s.levelCard}>
                <View style={s.levelRow}>
                  <Text style={[s.levelLabel, { color: lc }]}>{ls.level}</Text>
                  <Text style={s.levelCount}>{ls.learned}/{ls.total}</Text>
                </View>
                <View style={s.levelTrack}>
                  <View style={[s.levelFill, { width: `${pct}%`, backgroundColor: lc }]} />
                </View>
              </View>
            );
          })}
          <View style={{ marginBottom: 24 }} />
        </>
      )}

      {achievements && achievements.length > 0 && (
        <>
          <Text style={s.sectionTitle}>
            Yutuqlar ({unlockedCount}/{totalCount})
          </Text>
          <View style={s.achievementGrid}>
            {achievements.slice(0, 8).map((a) => (
              <View
                key={a.id}
                style={[
                  s.achievementItem,
                  {
                    backgroundColor: a.isUnlocked ? colors.card : colors.muted,
                    borderColor: a.isUnlocked ? colors.primary + "50" : colors.border,
                    opacity: a.isUnlocked ? 1 : 0.6,
                  },
                ]}
              >
                <Ionicons
                  name={a.isUnlocked ? "ribbon" : "ribbon-outline"}
                  size={20}
                  color={a.isUnlocked ? colors.primary : colors.mutedForeground}
                />
                <Text style={[s.achievementTitle, { color: a.isUnlocked ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                  {a.title}
                </Text>
                <Text style={[s.achievementDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {a.description}
                </Text>
                {a.isUnlocked && (
                  <Text style={[s.achievementXp, { color: colors.primary }]}>+{a.xpReward} XP</Text>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={s.sectionTitle}>Sozlamalar</Text>
      <View style={[s.notifCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.notifRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.notifLabel, { color: colors.foreground }]}>Kunlik eslatma</Text>
            <Text style={[s.notifSub, { color: colors.mutedForeground }]}>
              {prefs.enabled
                ? `Har kuni ${String(prefs.hour).padStart(2, "0")}:${String(prefs.minute).padStart(2, "0")} da eslatma keladi`
                : "Mashq qilishni unutmaslik uchun yoqing"}
            </Text>
          </View>
          <Switch
            value={prefs.enabled}
            onValueChange={async (val) => {
              await Haptics.selectionAsync();
              await setEnabled(val);
              if (!val) setShowTimePicker(false);
            }}
            trackColor={{ false: colors.muted, true: colors.primary + "80" }}
            thumbColor={prefs.enabled ? colors.primary : colors.mutedForeground}
            testID="notification-toggle"
          />
        </View>

        {prefs.enabled && (
          <>
            <View style={s.timeRow}>
              <Ionicons name="time-outline" size={16} color={colors.mutedForeground} />
              <Pressable
                style={[s.timeBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
                onPress={() => setShowTimePicker((v) => !v)}
              >
                <Text style={[s.timeBtnText, { color: colors.foreground }]}>
                  {String(prefs.hour).padStart(2, "0")}:{String(prefs.minute).padStart(2, "0")}
                </Text>
                <Ionicons
                  name={showTimePicker ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>

            {showTimePicker && (
              <View style={s.timePicker}>
                <Text style={[s.timePickerLabel, { color: colors.mutedForeground }]}>
                  Eslatma vaqtini tanlang
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 32 }}>
                  <View style={s.timeUnit}>
                    <Text style={[s.timeUnitLabel, { color: colors.mutedForeground }]}>Soat</Text>
                    <Pressable
                      style={[s.stepBtn, { borderColor: colors.border }]}
                      onPress={async () => {
                        const next = (prefs.hour + 1) % 24;
                        await setTime(next, prefs.minute);
                      }}
                    >
                      <Ionicons name="chevron-up" size={18} color={colors.foreground} />
                    </Pressable>
                    <Text style={[s.timeValue, { color: colors.foreground }]}>
                      {String(prefs.hour).padStart(2, "0")}
                    </Text>
                    <Pressable
                      style={[s.stepBtn, { borderColor: colors.border }]}
                      onPress={async () => {
                        const next = (prefs.hour + 23) % 24;
                        await setTime(next, prefs.minute);
                      }}
                    >
                      <Ionicons name="chevron-down" size={18} color={colors.foreground} />
                    </Pressable>
                  </View>

                  <View style={s.timeUnit}>
                    <Text style={[s.timeUnitLabel, { color: colors.mutedForeground }]}>Daqiqa</Text>
                    <Pressable
                      style={[s.stepBtn, { borderColor: colors.border }]}
                      onPress={async () => {
                        const next = (prefs.minute + 5) % 60;
                        await setTime(prefs.hour, next);
                      }}
                    >
                      <Ionicons name="chevron-up" size={18} color={colors.foreground} />
                    </Pressable>
                    <Text style={[s.timeValue, { color: colors.foreground }]}>
                      {String(prefs.minute).padStart(2, "0")}
                    </Text>
                    <Pressable
                      style={[s.stepBtn, { borderColor: colors.border }]}
                      onPress={async () => {
                        const next = (prefs.minute + 55) % 60;
                        await setTime(prefs.hour, next);
                      }}
                    >
                      <Ionicons name="chevron-down" size={18} color={colors.foreground} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          s.logoutBtn,
          { borderColor: colors.destructive, opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={handleLogout}
        testID="logout-button"
      >
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[s.logoutText, { color: colors.destructive }]}>Chiqish</Text>
      </Pressable>
    </ScrollView>
  );
}
