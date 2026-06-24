import { useState, useEffect, useRef, useMemo } from "react";
import { useGetQuizWords, useMarkWordProgress, useCreateGameSession, getGetQuizWordsQueryKey, useGetDueWords, getGetDueWordsQueryKey } from "@workspace/api-client-react";
import type { GameSessionLevel, QuizQuestion } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, RotateCcw, Brain, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearch } from "wouter";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizGame() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const isReviewMode = params.get("mode") === "review";

  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(isReviewMode);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: quizQuestions, isLoading: isQuizLoading, isError: isQuizError, refetch: refetchQuiz } = useGetQuizWords(
    { level, count: 10 },
    { query: { enabled: false, queryKey: getGetQuizWordsQueryKey({ level, count: 10 }) } }
  );

  const { data: dueData, isLoading: isDueLoading, isError: isDueError, refetch: refetchDue } = useGetDueWords(
    { limit: 40 },
    { query: { enabled: isReviewMode, queryKey: getGetDueWordsQueryKey({ limit: 40 }) } }
  );

  const reviewQuestions = useMemo<QuizQuestion[]>(() => {
    if (!dueData?.items || dueData.items.length === 0) return [];
    const items = dueData.items;
    const allTranslations = items.map(w => w.translation);
    return items.slice(0, 10).map(w => {
      const distractors = shuffle(allTranslations.filter(t => t !== w.translation)).slice(0, 3);
      const options = shuffle([w.translation, ...distractors]);
      return { wordId: w.id, word: w.word, correctAnswer: w.translation, options };
    });
  }, [dueData]);

  const questions = isReviewMode ? reviewQuestions : quizQuestions;
  const isLoading = isReviewMode ? isDueLoading : isQuizLoading;
  const isError = isReviewMode ? isDueError : isQuizError;

  const markProgress = useMarkWordProgress();
  const createSession = useCreateGameSession();

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const startGame = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(true);
    setCurrentIdx(0);
    setScore(0);
    setSelectedAnswer(null);
    setIsFinished(false);
    if (isReviewMode) {
      refetchDue();
    } else {
      refetchQuiz();
    }
  };

  const handleAnswer = (answer: string) => {
    if (selectedAnswer || !questions) return;
    setSelectedAnswer(answer);
    const question = questions[currentIdx];
    const isCorrect = answer === question.correctAnswer;
    const newScore = score + (isCorrect ? 1 : 0);

    markProgress.mutate({ wordId: question.wordId, data: { correct: isCorrect, gameType: "quiz" } });

    timerRef.current = setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(c => c + 1);
        setSelectedAnswer(null);
        setScore(newScore);
      } else {
        setScore(newScore);
        setIsFinished(true);
        createSession.mutate({
          data: {
            gameType: "quiz", level: isReviewMode ? "A1" : level,
            score: Math.round((newScore / questions.length) * 100),
            totalQuestions: questions.length,
            correctAnswers: newScore,
          }
        });
      }
    }, 1200);
  };

  if (!isPlaying) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Brain className="w-12 h-12 text-blue-500" />
        </div>
        <h1 className="text-4xl font-black">Test</h1>
        <p className="text-xl text-muted-foreground">So'zlar tarjimasini topishda o'z bilimingizni sinab ko'ring.</p>
        <div className="space-y-4 pt-8">
          <div className="text-left">
            <label className="text-sm font-bold text-muted-foreground mb-2 block">Darajani tanlang</label>
            <Select value={level} onValueChange={(v) => setLevel(v as GameSessionLevel)}>
              <SelectTrigger className="w-full h-14 rounded-xl text-lg font-bold" data-testid="select-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map(l => <SelectItem key={l} value={l} className="font-bold">{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={startGame} size="lg" className="w-full h-14 rounded-xl text-lg font-black bg-blue-500 hover:bg-blue-600 text-white" data-testid="button-start">
            Boshlash
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !questions) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-4">
        <p className="text-xl text-red-500 font-bold">Xato yuz berdi. Qayta urinib ko'ring.</p>
        <Button onClick={startGame} className="rounded-xl">Qayta</Button>
      </div>
    );
  }

  if (questions.length === 0 && isReviewMode) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
          <Brain className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-black">Ajoyib!</h2>
        <p className="text-lg text-muted-foreground">Bugun takrorlanadigan so'zlar yo'q. Ertaga qaytib keling!</p>
        <Button onClick={() => window.history.back()} className="rounded-xl h-12 px-8 font-bold">Orqaga</Button>
      </div>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-md mx-auto mt-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="rounded-3xl border-none shadow-xl bg-gradient-to-b from-card to-muted p-8 space-y-6">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-4xl font-black">Natija</h2>
          <div className="text-6xl font-black text-primary">{percentage}%</div>
          <p className="text-xl font-medium text-muted-foreground">
            {questions.length} ta savoldan <strong>{score}</strong> tasiga to'g'ri javob berdingiz.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => setIsPlaying(false)} variant="outline" className="flex-1 h-14 rounded-xl font-bold">Chiqish</Button>
            <Button onClick={startGame} className="flex-1 h-14 rounded-xl font-bold bg-blue-500 hover:bg-blue-600 text-white">
              <RotateCcw className="mr-2 w-5 h-5" /> Qayta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentIdx];
  const wordText = question?.word || "—";
  const correctAnswer = question?.correctAnswer || "";
  const options = question?.options || [];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-8 mt-10">
      {isReviewMode && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">
          <Brain className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="text-sm font-bold text-amber-700 dark:text-amber-400">Takrorlash rejimi — {questions.length} ta so'z</span>
        </div>
      )}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setIsPlaying(false); }} data-testid="button-exit">
          <X className="w-5 h-5" />
        </Button>
        <Progress value={progress} className="flex-1 h-4 rounded-full bg-muted" />
        <span className="text-sm font-bold text-muted-foreground shrink-0">{currentIdx + 1}/{questions.length}</span>
      </div>

      <div className="text-center py-10">
        <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Tarjima qiling</div>
        <h2 className="text-5xl font-black tracking-tight" data-testid="text-word">{wordText}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option, i) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === correctAnswer;
          const showStatus = selectedAnswer !== null;
          let btnClass = "border-2 bg-card hover:bg-muted";
          if (showStatus) {
            if (isCorrect) btnClass = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
            else if (isSelected) btnClass = "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 animate-shake";
            else btnClass = "opacity-40 border-muted bg-card";
          }
          return (
            <Button
              key={i}
              variant="outline"
              className={cn("h-auto min-h-[5rem] rounded-2xl text-lg font-bold transition-all justify-between px-6 py-4 whitespace-normal text-left focus:outline-none focus:ring-0 active:outline-none", btnClass)}
              onClick={() => handleAnswer(option)}
              onMouseDown={(e) => e.preventDefault()}
              disabled={selectedAnswer !== null}
              data-testid={`button-option-${i}`}
            >
              <span>{option || "—"}</span>
              {showStatus && isCorrect && <Check className="w-6 h-6 text-green-500 shrink-0 ml-2" />}
              {showStatus && isSelected && !isCorrect && <X className="w-6 h-6 text-red-500 shrink-0 ml-2" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
