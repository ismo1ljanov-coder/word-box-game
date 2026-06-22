import { useState, useEffect, useRef, useCallback } from "react";
import { useGetQuizWords, useMarkWordProgress, useCreateGameSession, getGetQuizWordsQueryKey } from "@workspace/api-client-react";
import type { GameSessionLevel } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Zap, CheckCircle2, XCircle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];
const TIME_PER_QUESTION = 10;

export default function SpeedQuizGame() {
  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong" | "timeout">("idle");
  const [timeLeft, setTimeLeft] = useState(TIME_PER_QUESTION);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const correctRef = useRef(0);

  const { data: questions, isLoading, refetch } = useGetQuizWords(
    { level, count: 10 },
    { query: { enabled: false, queryKey: getGetQuizWordsQueryKey({ level, count: 10 }) } }
  );

  const markProgress = useMarkWordProgress();
  const createSession = useCreateGameSession();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const advanceQuestion = useCallback((nextIdx: number, correct: number, total: number) => {
    if (nextIdx >= total) {
      const score = Math.round((correct / total) * 100);
      createSession.mutate({
        data: { gameType: "quiz", level, score, totalQuestions: total, correctAnswers: correct },
      });
      setCorrectCount(correct);
      setIsFinished(true);
    } else {
      setCurrentIdx(nextIdx);
      setSelectedAnswer(null);
      setAnswerState("idle");
      setIsChecking(false);
      setTimeLeft(TIME_PER_QUESTION);
    }
  }, [createSession, level]);

  const startCountdown = useCallback((idx: number, qs: typeof questions) => {
    clearTimers();
    setTimeLeft(TIME_PER_QUESTION);
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          // Time's up
          setAnswerState("timeout");
          setIsChecking(true);
          const q = qs?.[idx];
          if (q) markProgress.mutate({ id: q.wordId, data: { correct: false, gameType: "quiz" } });
          timerRef.current = setTimeout(() => {
            advanceQuestion(idx + 1, correctRef.current, qs?.length ?? 0);
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimers, markProgress, advanceQuestion]);

  useEffect(() => {
    if (isPlaying && questions && questions.length > 0 && answerState === "idle" && !isFinished) {
      startCountdown(currentIdx, questions);
    }
  }, [isPlaying, questions, currentIdx, answerState, isFinished, startCountdown]);

  useEffect(() => {
    correctRef.current = correctCount;
  }, [correctCount]);

  const startGame = () => {
    clearTimers();
    setIsPlaying(true);
    setCurrentIdx(0);
    setCorrectCount(0);
    correctRef.current = 0;
    setIsFinished(false);
    setSelectedAnswer(null);
    setAnswerState("idle");
    setTimeLeft(TIME_PER_QUESTION);
    setIsChecking(false);
    refetch();
  };

  const handleAnswer = (answer: string) => {
    if (isChecking || answerState !== "idle" || !questions) return;
    clearTimers();
    setIsChecking(true);
    setSelectedAnswer(answer);

    const q = questions[currentIdx];
    const isCorrect = answer === q.correctAnswer;
    setAnswerState(isCorrect ? "correct" : "wrong");
    const newCorrect = correctCount + (isCorrect ? 1 : 0);
    correctRef.current = newCorrect;
    if (isCorrect) setCorrectCount(newCorrect);

    markProgress.mutate({ id: q.wordId, data: { correct: isCorrect, gameType: "quiz" } });

    timerRef.current = setTimeout(() => {
      advanceQuestion(currentIdx + 1, newCorrect, questions.length);
    }, 800);
  };

  const timerPercent = (timeLeft / TIME_PER_QUESTION) * 100;
  const timerColor = timeLeft > 6 ? "bg-emerald-500" : timeLeft > 3 ? "bg-yellow-500" : "bg-red-500";

  if (!isPlaying) {
    return (
      <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-yellow-500/10 flex items-center justify-center mx-auto">
            <Zap className="w-10 h-10 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-black">Tezkor test</h1>
          <p className="text-muted-foreground text-lg">Har savolga faqat {TIME_PER_QUESTION} soniya!</p>
        </div>
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-bold text-muted-foreground mb-2 block">Daraja</label>
              <Select value={level} onValueChange={(v) => setLevel(v as GameSessionLevel)}>
                <SelectTrigger className="rounded-xl h-12"><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="bg-yellow-500/10 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-bold text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
                <Timer className="w-4 h-4" /> Qoidalar:
              </p>
              <p className="text-muted-foreground">• Har savol uchun {TIME_PER_QUESTION} soniya vaqt</p>
              <p className="text-muted-foreground">• Vaqt tugasa, savol o'tkaziladi</p>
              <p className="text-muted-foreground">• Tezroq javob = ko'proq adrenalin!</p>
            </div>
            <Button onClick={startGame} size="lg" className="w-full rounded-xl font-bold h-14 text-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
              <Zap className="mr-2 w-5 h-5" /> Boshlash
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFinished) {
    const score = Math.round((correctCount / (questions?.length ?? 1)) * 100);
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="rounded-3xl border-none overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-8 text-white text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-black">O'yin tugadi!</h2>
            <p className="text-white/80 mt-1">{correctCount}/{questions?.length} to'g'ri javob</p>
          </div>
          <CardContent className="p-8">
            <div className="grid grid-cols-2 gap-4 text-center mb-6">
              <div><div className="text-4xl font-black text-primary">{score}%</div><div className="text-sm text-muted-foreground">Ball</div></div>
              <div><div className="text-4xl font-black text-yellow-500">{correctCount}</div><div className="text-sm text-muted-foreground">To'g'ri</div></div>
            </div>
            <div className="flex gap-3">
              <Button onClick={startGame} className="flex-1 rounded-xl font-bold" size="lg">
                <RotateCcw className="mr-2 w-4 h-4" /> Qayta
              </Button>
              <Button variant="outline" onClick={() => setIsPlaying(false)} className="flex-1 rounded-xl font-bold" size="lg">
                Chiqish
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions?.[currentIdx];
  if (!question || isLoading) {
    return <div className="flex items-center justify-center h-60 text-muted-foreground font-medium">Yuklanmoqda...</div>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setIsPlaying(false)}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex justify-between text-sm font-bold text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-500" /> Tezkor test</span>
            <span>{currentIdx + 1} / {questions.length}</span>
          </div>
          <Progress value={((currentIdx) / questions.length) * 100} className="h-2" />
        </div>
        <Badge className="bg-yellow-500/10 text-yellow-600 border-0 font-bold">{level}</Badge>
      </div>

      {/* Timer bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-bold">
          <span className="flex items-center gap-1 text-muted-foreground"><Timer className="w-3 h-3" /> Vaqt</span>
          <span className={cn(
            "font-black text-base",
            timeLeft > 6 ? "text-emerald-500" : timeLeft > 3 ? "text-yellow-500" : "text-red-500"
          )}>{timeLeft}s</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-1000", timerColor)}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
      </div>

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <p className="text-sm font-bold text-muted-foreground mb-2">So'zni tarjima qiling</p>
            <h2 className="text-5xl font-black tracking-tight">{question.word}</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {question.options.map((option) => {
              let extraClass = "hover:bg-primary/5 hover:border-primary/50";
              if (selectedAnswer === option) {
                extraClass = answerState === "correct"
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                  : "bg-red-500/10 border-red-500 text-red-600";
              } else if (answerState !== "idle" && option === question.correctAnswer) {
                extraClass = "bg-emerald-500/10 border-emerald-500 text-emerald-600";
              } else if (answerState === "timeout") {
                extraClass = "opacity-50";
              }

              return (
                <Button
                  key={option}
                  variant="outline"
                  className={cn(
                    "w-full h-auto py-4 text-left justify-start px-5 rounded-2xl font-bold text-base transition-all border-2",
                    extraClass
                  )}
                  onClick={() => handleAnswer(option)}
                  disabled={answerState !== "idle"}
                >
                  <span className="flex-1">{option}</span>
                  {selectedAnswer === option && answerState === "correct" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {selectedAnswer === option && answerState === "wrong" && <XCircle className="w-5 h-5 text-red-500" />}
                  {answerState === "timeout" && option === question.correctAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
