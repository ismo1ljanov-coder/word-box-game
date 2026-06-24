import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";
import { apiPost, apiGet } from "@/lib/api";

const LEVELS = ["", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Level = (typeof LEVELS)[number];

const LEVEL_COLORS: Record<string, string> = {
  A1: "#10b981",
  A2: "#3b82f6",
  B1: "#8b5cf6",
  B2: "#f97316",
  C1: "#ec4899",
  C2: "#eab308",
};

const CACHE_KEY = "cached_words_v2";

interface Word {
  id: number;
  word: string;
  definition: string;
  translation: string | null;
  level: string;
  exampleSentence: string | null;
  isFavorite?: boolean;
  isLearned?: boolean;
}

interface WordListResponse {
  words: Word[];
  total: number;
  page: number;
  pageSize: number;
}

function WordItem({
  item,
  onFavorite,
  colors,
}: {
  item: Word;
  onFavorite: (id: number) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const levelColor = LEVEL_COLORS[item.level] ?? colors.mutedForeground;
  return (
    <View
      style={[
        wi.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.foreground,
        },
      ]}
    >
      <View style={wi.top}>
        <View style={wi.wordCol}>
          <Text style={[wi.word, { color: colors.foreground }]}>{item.word}</Text>
          {item.translation ? (
            <Text style={[wi.translation, { color: colors.mutedForeground }]}>
              {item.translation}
            </Text>
          ) : null}
        </View>
        <View style={wi.rightCol}>
          <View style={[wi.levelBadge, { backgroundColor: levelColor + "20" }]}>
            <Text style={[wi.levelText, { color: levelColor }]}>{item.level}</Text>
          </View>
          <Pressable
            onPress={() => onFavorite(item.id)}
            style={wi.favBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons
              name={item.isFavorite ? "heart" : "heart-outline"}
              size={20}
              color={item.isFavorite ? "#ff4d6a" : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
      {item.definition ? (
        <Text style={[wi.def, { color: colors.mutedForeground }]} numberOfLines={2}>
          {item.definition}
        </Text>
      ) : null}
      {item.exampleSentence ? (
        <Text style={[wi.example, { color: colors.mutedForeground, borderLeftColor: colors.primary }]} numberOfLines={2}>
          "{item.exampleSentence}"
        </Text>
      ) : null}
    </View>
  );
}

const wi = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  wordCol: { flex: 1, gap: 2 },
  word: { fontSize: 17, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
  translation: { fontSize: 13, fontFamily: "Nunito_400Regular" },
  rightCol: { alignItems: "flex-end", gap: 6 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  levelText: { fontSize: 11, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
  favBtn: { padding: 2 },
  def: { fontSize: 13, fontFamily: "Nunito_400Regular", lineHeight: 18, marginBottom: 4 },
  example: {
    fontSize: 12, fontFamily: "Nunito_400Regular", fontStyle: "italic",
    lineHeight: 16, paddingLeft: 10, borderLeftWidth: 2, marginTop: 2,
  },
});

export default function WordsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<Level>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const fetchWords = useCallback(
    async (pg: number, lvl: Level, q: string, append = false) => {
      if (pg === 1) append ? setIsRefreshing(true) : setIsLoading(true);
      else setIsLoadingMore(true);
      try {
        const params = new URLSearchParams({ page: String(pg), pageSize: "20" });
        if (lvl) params.set("level", lvl);
        if (q) params.set("search", q);
        const data = await apiGet<WordListResponse>(`/words?${params}`);
        const newWords = data.words;
        setIsOffline(false);
        if (append && pg > 1) {
          setWords((prev) => [...prev, ...newWords]);
        } else {
          setWords(newWords);
          if (pg === 1 && !lvl && !q) {
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(newWords));
          }
        }
        setHasMore(newWords.length === 20);
      } catch {
        if (pg === 1) {
          try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
              setWords(JSON.parse(cached));
              setIsOffline(true);
            }
          } catch {}
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchWords(1, level, search);
    }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [search, level, fetchWords]);

  const handleFavorite = useCallback(async (wordId: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWords((prev) =>
      prev.map((w) => (w.id === wordId ? { ...w, isFavorite: !w.isFavorite } : w))
    );
    try {
      await apiPost(`/words/${wordId}/favorite`);
    } catch {
      setWords((prev) =>
        prev.map((w) => (w.id === wordId ? { ...w, isFavorite: !w.isFavorite } : w))
      );
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isOffline) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchWords(nextPage, level, search, true);
    }
  }, [isLoadingMore, hasMore, isOffline, page, level, search, fetchWords]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    fetchWords(1, level, search, true);
  }, [level, search, fetchWords]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: 20,
      paddingTop: topPad + 8,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.foreground, fontFamily: "Nunito_800ExtraBold", marginBottom: 14 },
    searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.muted, borderRadius: 14, paddingHorizontal: 14, height: 44, borderColor: colors.border, borderWidth: 1, marginBottom: 12 },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, marginLeft: 8, fontFamily: "Nunito_400Regular" },
    levelScroll: { flexDirection: "row", gap: 8 },
    levelChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    offlineBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.warning + "30", padding: 10, marginHorizontal: 20, borderRadius: 10, marginBottom: 8 },
    offlineText: { fontSize: 12, color: colors.foreground, fontFamily: "Nunito_600SemiBold", flex: 1 },
    list: { paddingHorizontal: 20, paddingBottom: bottomPad + 100 },
    empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground, fontFamily: "Nunito_700Bold" },
    emptyText: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Nunito_400Regular", textAlign: "center" },
    footer: { paddingVertical: 20, alignItems: "center" },
  });

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Lug'at</Text>
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            style={s.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="So'z qidirish..."
            placeholderTextColor={colors.mutedForeground}
            clearButtonMode="while-editing"
          />
        </View>
        <View style={s.levelScroll}>
          {LEVELS.map((l) => {
            const active = level === l;
            const lc = l ? LEVEL_COLORS[l] : colors.primary;
            return (
              <Pressable
                key={l || "all"}
                style={[
                  s.levelChip,
                  {
                    backgroundColor: active ? (l ? lc : colors.primary) : colors.muted,
                    borderColor: active ? (l ? lc : colors.primary) : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLevel(l);
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700" as const,
                    fontFamily: "Nunito_700Bold",
                    color: active ? "#fff" : colors.mutedForeground,
                  }}
                >
                  {l || "Barchasi"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isOffline && (
        <View style={s.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.foreground} />
          <Text style={s.offlineText}>Oflayn rejim — saqlangan ma'lumotlar ko'rsatilmoqda</Text>
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <WordItem item={item} onFavorite={handleFavorite} colors={colors} />
          )}
          contentContainerStyle={[s.list, words.length === 0 && { flex: 1 }]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          scrollEnabled={!!words.length}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="book-outline" size={48} color={colors.mutedForeground} />
              <Text style={s.emptyTitle}>So'z topilmadi</Text>
              <Text style={s.emptyText}>Qidiruv yoki filterni o'zgartiring</Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={s.footer}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
