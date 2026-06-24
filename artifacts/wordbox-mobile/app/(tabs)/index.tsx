import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/lib/api";

interface StatsSummary {
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
  totalWordsLearned: number;
  totalWordsMastered: number;
  totalWordsInProgress: number;
  todayXp: number;
  dailyGoal: number;
}

interface ChallengeProgress {
  id: string;
  type: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  xpReward: number;
  coinsReward: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

function StatPill({
  icon,
  value,
  label,
  color,
  colors,
}: {
  icon: string;
  value: string | number;
  label: string;
  color: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[pillStyles.wrap, { backgroundColor: colors.muted }]}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={[pillStyles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[pillStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", borderRadius: 14, paddingVertical: 12, gap: 2 },
  value: { fontSize: 18, fontWeight: "800" as const, fontFamily: "Nunito_800ExtraBold" },
  label: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
});

function QuickAction({
  icon,
  label,
  color,
  onPress,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  color: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        qaStyles.wrap,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[qaStyles.iconBox, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[qaStyles.label, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const qaStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", borderRadius: 16, paddingVertical: 16, gap: 8, borderWidth: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: "700" as const, fontFamily: "Nunito_700Bold", textAlign: "center" },
});

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<StatsSummary>({
    queryKey: ["stats-summary"],
    queryFn: () => apiGet<StatsSummary>("/stats/summary"),
    staleTime: 60000,
  });

  const { data: daily } = useQuery<ChallengeProgress>({
    queryKey: ["daily-challenge"],
    queryFn: () => apiGet<ChallengeProgress>("/challenges/daily"),
    staleTime: 60000,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchStats(), refreshUser()]);
  }, [refetchStats, refreshUser]);

  const displayName = user?.displayName || user?.phone || "Foydalanuvchi";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Xayrli tong" : hour < 17 ? "Xayrli kun" : "Xayrli kech";

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const dailyProgress = stats
    ? Math.min((stats.todayXp / Math.max(stats.dailyGoal, 1)) * 100, 100)
    : 0;

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    greetRow: { gap: 2 },
    greeting: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Nunito_600SemiBold" },
    name: { fontSize: 22, color: colors.foreground, fontWeight: "800" as const, fontFamily: "Nunito_800ExtraBold" },
    xpBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.accent + "25", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    xpText: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground, fontFamily: "Nunito_700Bold" },
    sectionTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground, fontFamily: "Nunito_700Bold", marginBottom: 12 },
    statRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
    dailyCard: {
      borderRadius: 20, padding: 18, marginBottom: 24,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    dailyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    dailyTitle: { fontSize: 17, fontWeight: "800" as const, color: "#fff", fontFamily: "Nunito_800ExtraBold" },
    dailySub: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "Nunito_400Regular", marginTop: 2 },
    progressTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4, overflow: "hidden" },
    progressFill: { height: 8, borderRadius: 4, backgroundColor: "#fff" },
    progressLabel: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 6, fontFamily: "Nunito_600SemiBold" },
    challengeCard: {
      borderRadius: 20, padding: 18, marginBottom: 24,
      backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
    },
    challengeTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground, fontFamily: "Nunito_700Bold", marginBottom: 4 },
    challengeDesc: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Nunito_400Regular", marginBottom: 12 },
    challengeTrack: { height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
    challengeFill: { height: 6, borderRadius: 3, backgroundColor: colors.secondary },
    challengeFooter: { flexDirection: "row", justifyContent: "space-between" },
    challengeCount: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Nunito_600SemiBold" },
    qaRow: { flexDirection: "row", gap: 10 },
    loadingBox: { height: 100, alignItems: "center", justifyContent: "center" },
  });

  return (
    <View style={s.root}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={statsLoading} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        <View style={s.header}>
          <View style={s.greetRow}>
            <Text style={s.greeting}>{greeting},</Text>
            <Text style={s.name}>{displayName.split(" ")[0]}</Text>
          </View>
          <Pressable style={s.xpBadge}>
            <Ionicons name="flash" size={16} color={colors.accent} />
            <Text style={s.xpText}>{user?.xp ?? 0} XP</Text>
          </Pressable>
        </View>

        {statsLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={s.statRow}>
              <StatPill icon="🔥" value={stats?.currentStreak ?? 0} label="Kun ketma-ket" color={colors.destructive} colors={colors} />
              <StatPill icon="📚" value={stats?.totalWordsLearned ?? 0} label="O'rganildi" color={colors.primary} colors={colors} />
              <StatPill icon="⭐" value={stats?.totalWordsMastered ?? 0} label="Mukammal" color={colors.accent} colors={colors} />
            </View>

            <View style={s.dailyCard}>
              <View style={s.dailyTop}>
                <View>
                  <Text style={s.dailyTitle}>Kunlik maqsad</Text>
                  <Text style={s.dailySub}>{stats?.todayXp ?? 0} / {stats?.dailyGoal ?? 50} XP</Text>
                </View>
                <Ionicons name="trophy" size={28} color="rgba(255,255,255,0.9)" />
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${dailyProgress}%` }]} />
              </View>
              <Text style={s.progressLabel}>
                {dailyProgress >= 100 ? "Bajarildi! Ajoyib!" : `${Math.round(dailyProgress)}% bajarildi`}
              </Text>
            </View>
          </>
        )}

        {daily && (
          <>
            <Text style={s.sectionTitle}>Bugungi vazifa</Text>
            <View style={s.challengeCard}>
              <Text style={s.challengeTitle}>{daily.title}</Text>
              <Text style={s.challengeDesc}>{daily.description}</Text>
              <View style={s.challengeTrack}>
                <View
                  style={[
                    s.challengeFill,
                    { width: `${Math.min((daily.currentValue / Math.max(daily.targetValue, 1)) * 100, 100)}%` },
                  ]}
                />
              </View>
              <View style={s.challengeFooter}>
                <Text style={s.challengeCount}>
                  {daily.currentValue} / {daily.targetValue}
                </Text>
                <Text style={[s.challengeCount, { color: colors.accent }]}>
                  +{daily.xpReward} XP
                </Text>
              </View>
            </View>
          </>
        )}

        <Text style={s.sectionTitle}>Tezkor harakatlar</Text>
        <View style={s.qaRow}>
          <QuickAction
            icon="book-outline"
            label="Lug'at"
            color={colors.primary}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/words");
            }}
            colors={colors}
          />
          <QuickAction
            icon="game-controller-outline"
            label="Viktorina"
            color={colors.secondary}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/quiz");
            }}
            colors={colors}
          />
          <QuickAction
            icon="repeat-outline"
            label="Takrorlash"
            color={colors.accent}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(tabs)/quiz");
            }}
            colors={colors}
          />
        </View>
      </ScrollView>
    </View>
  );
}
