import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/context/NotificationContext";
import { useColors } from "@/hooks/useColors";
import { apiGet, apiPost } from "@/lib/api";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type Level = (typeof LEVELS)[number];

const LEVEL_COLORS: Record<string, string> = {
  A1: "#10b981",
  A2: "#3b82f6",
  B1: "#8b5cf6",
  B2: "#f97316",
  C1: "#ec4899",
  C2: "#eab308",
};

interface QuizQuestion {
  wordId: number;
  word: string;
  correctAnswer: string;
  options: string[];
  level: string;
}

type QuizState = "start" | "playing" | "result";

function AnimatedOption({
  option,
  index,
  onPress,
  selected,
  correct,
  disabled,
  correctAnswer,
  colors,
}: {
  option: string;
  index: number;
  onPress: () => void;
  selected: boolean;
  correct: boolean | null;
  disabled: boolean;
  correctAnswer: string;
  colors: ReturnType<typeof useColors>;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(withTiming(0.96, { duration: 80 }), withTiming(1, { duration: 80 }));
    onPress();
  };

  const isCorrectAnswer = option === correctAnswer;
  let bg = colors.card;
  let border = colors.border;
  let textColor = colors.foreground;

  if (disabled && selected) {
    bg = correct ? colors.primary + "30" : colors.destructive + "20";
    border = correct ? colors.primary : colors.destructive;
    textColor = correct ? colors.primary : colors.destructive;
  } else if (disabled && isCorrectAnswer) {
    bg = colors.primary + "20";
    border = colors.primary;
    textColor = colors.primary;
  }

  const letters = ["A", "B", "D", "E"];

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={[optStyles.option, { backgroundColor: bg, borderColor: border }]}
      >
        <View style={[optStyles.letter, { backgroundColor: border + "30" }]}>
          <Text style={[optStyles.letterText, { color: textColor }]}>{letters[index]}</Text>
        </View>
        <Text style={[optStyles.optText, { color: textColor }]}>{option}</Text>
        {disabled && selected && (
          <Ionicons
            name={correct ? "checkmark-circle" : "close-circle"}
            size={20}
            color={correct ? colors.primary : colors.destructive}
          />
        )}
        {disabled && !selected && isCorrectAnswer && (
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        )}
      </Pressable>
    </Animated.View>
  );
}

const optStyles = StyleSheet.create({
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5, marginBottom: 10 },
  letter: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  letterText: { fontSize: 13, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
  optText: { flex: 1, fontSize: 15, fontFamily: "Nunito_600SemiBold" },
});

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { markPracticedToday } = useNotifications();

  const [state, setState] = useState<QuizState>("start");
  const [selectedLevel, setSelectedLevel] = useState<Level>("A1");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [answered, setAnswered] = useState(false);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const startQuiz = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiGet<QuizQuestion[]>(`/games/quiz?level=${selectedLevel}&count=10`);
      setQuestions(data);
      setCurrentIdx(0);
      setScore(0);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setAnswered(false);
      setState("playing");
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel]);

  const handleAnswer = useCallback(
    async (answer: string) => {
      if (answered) return;
      setAnswered(true);
      setSelectedAnswer(answer);
      const q = questions[currentIdx];
      const correct = answer === q.correctAnswer;
      setIsCorrect(correct);
      if (correct) {
        setScore((s) => s + 1);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      try {
        await apiPost(`/words/${q.wordId}/progress`, { correct, gameType: "multiple_choice" });
      } catch {}
    },
    [answered, questions, currentIdx]
  );

  const handleNext = useCallback(async () => {
    if (currentIdx + 1 >= questions.length) {
      try {
        await apiPost("/games/sessions", {
          gameType: "quiz",
          score,
          totalQuestions: questions.length,
          correctAnswers: score,
          level: selectedLevel,
        });
      } catch {}
      markPracticedToday().catch(() => {});
      setState("result");
    } else {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setAnswered(false);
    }
  }, [currentIdx, questions.length, score, selectedLevel]);

  const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
    titleBar: { fontSize: 26, fontWeight: "800" as const, color: colors.foreground, fontFamily: "Nunito_800ExtraBold", marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Nunito_400Regular", marginBottom: 28 },
    sectionLabel: { fontSize: 13, fontWeight: "700" as const, color: colors.mutedForeground, fontFamily: "Nunito_700Bold", marginBottom: 10 },
    levelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 32 },
    levelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5 },
    levelBtnText: { fontSize: 14, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
    startBtn: { height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
    startBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
    qProgress: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    qProgressText: { fontSize: 13, fontWeight: "700" as const, color: colors.mutedForeground, fontFamily: "Nunito_700Bold" },
    progressTrack: { flex: 1, height: 6, backgroundColor: colors.muted, borderRadius: 3, marginHorizontal: 12, overflow: "hidden" },
    progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
    qCard: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 24, marginBottom: 24 },
    qLabel: { fontSize: 12, fontWeight: "700" as const, color: colors.mutedForeground, fontFamily: "Nunito_700Bold", marginBottom: 10, textTransform: "uppercase" as const, letterSpacing: 1 },
    qWord: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, fontFamily: "Nunito_800ExtraBold" },
    nextBtn: { height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 8 },
    nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" as const, fontFamily: "Nunito_700Bold" },
    resultCard: {
      backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: "center", gap: 8, marginBottom: 28,
    },
    resultEmoji: { fontSize: 48, marginBottom: 8 },
    resultTitle: { fontSize: 24, fontWeight: "800" as const, color: colors.foreground, fontFamily: "Nunito_800ExtraBold", textAlign: "center" },
    resultScore: { fontSize: 48, fontWeight: "800" as const, fontFamily: "Nunito_800ExtraBold", marginVertical: 12 },
    resultSub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Nunito_400Regular", textAlign: "center" },
    retryBtn: { height: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 },
  });

  if (state === "start") {
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <Text style={s.titleBar}>Viktorina</Text>
        <Text style={s.subtitle}>Darajani tanlang va bilimingizni sinab ko'ring</Text>
        <Text style={s.sectionLabel}>DARAJANI TANLANG</Text>
        <View style={s.levelGrid}>
          {LEVELS.map((l) => {
            const active = selectedLevel === l;
            const lc = LEVEL_COLORS[l];
            return (
              <Pressable
                key={l}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedLevel(l);
                }}
                style={[
                  s.levelBtn,
                  { backgroundColor: active ? lc : colors.muted, borderColor: active ? lc : colors.border },
                ]}
              >
                <Text style={[s.levelBtnText, { color: active ? "#fff" : colors.foreground }]}>{l}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          style={({ pressed }) => [s.startBtn, { backgroundColor: colors.primary, opacity: pressed || isLoading ? 0.8 : 1 }]}
          onPress={startQuiz}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={s.startBtnText}>Boshlash</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    );
  }

  if (state === "result") {
    const pct = Math.round((score / questions.length) * 100);
    const emoji = pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "📚";
    const msg = pct >= 80 ? "Ajoyib natija!" : pct >= 60 ? "Yaxshi urinish!" : "Ko'proq mashq qiling";
    return (
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <View style={s.resultCard}>
          <Text style={s.resultEmoji}>{emoji}</Text>
          <Text style={s.resultTitle}>{msg}</Text>
          <Text style={[s.resultScore, { color: pct >= 80 ? colors.primary : pct >= 60 ? colors.secondary : colors.destructive }]}>
            {score}/{questions.length}
          </Text>
          <Text style={s.resultSub}>To'g'ri javoblar: {pct}%</Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.retryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          onPress={() => setState("start")}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={[s.nextBtnText, { color: "#fff" }]}>Qayta boshlash</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const q = questions[currentIdx];
  const progress = (currentIdx + 1) / questions.length;

  return (
    <View style={s.root}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.qProgress}>
          <Text style={s.qProgressText}>{currentIdx + 1}</Text>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={s.qProgressText}>{questions.length}</Text>
        </View>

        <View style={s.qCard}>
          <Text style={s.qLabel}>So'zni toping</Text>
          <Text style={s.qWord}>{q.word}</Text>
        </View>

        {q.options.map((opt, idx) => (
          <AnimatedOption
            key={opt}
            option={opt}
            index={idx}
            onPress={() => handleAnswer(opt)}
            selected={selectedAnswer === opt}
            correct={selectedAnswer === opt ? isCorrect : null}
            disabled={answered}
            correctAnswer={q.correctAnswer}
            colors={colors}
          />
        ))}

        {answered && (
          <Pressable
            style={({ pressed }) => [s.nextBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleNext}
          >
            <Text style={s.nextBtnText}>
              {currentIdx + 1 >= questions.length ? "Natijani ko'rish" : "Keyingisi"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
