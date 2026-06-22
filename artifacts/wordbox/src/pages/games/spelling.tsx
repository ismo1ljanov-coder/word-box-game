import { useState, useRef, useEffect, useCallback } from "react";
import { useGetQuizWords, useMarkWordProgress, useCreateGameSession, getGetQuizWordsQueryKey } from "@workspace/api-client-react";
import type { GameSessionLevel } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, ArrowRight, RotateCcw, X, SpellCheck2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];

export default function SpellingGame() {
  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: questions, isLoading, isError, refetch } = useGetQuizWords(
    { level, count: 10 },
    { query: { enabled: false, queryKey: getGetQuizWordsQueryKey({ level, count: 10 }) } }
  );

  const markProgress = useMarkWordProgress();
  const createSession = useCreateGameSession();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const focusInput = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (isPlaying && !isFinished) focusInput();
  }, [isPlaying, isFinished, currentIdx, focusInput]);

  const startGame = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(true);
    setCurrentIdx(0);
    setCorrectCount(0);
    setIsFinished(false);
    resetTurn();
    refetch();
  };

  const resetTurn = () => {
    setInputValue("");
    setShowHint(false);
    setHasError(false);
    setIsSuccess(false);
    setUsedHint(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!questions || isSuccess) return;

    const question = questions[currentIdx];
    const isCorrect = inputValue.trim().toLowerCase() === question.word.toLowerCase();

    if (isCorrect) {
      setIsSuccess(true);
      setHasError(false);
      const newCorrectCount = correctCount + 1;
      setCorrectCount(newCorrectCount);

      markProgress.mutate({ id: question.wordId, data: { correct: true, gameType: "spelling" } });

      timerRef.current = setTimeout(() => {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx(c => c + 1);
          resetTurn();
        } else {
          setIsFinished(true);
          createSession.mutate({
            data: {
              gameType: "spelling", level,
              score: Math.round((newCorrectCount / questions.length) * 100),
              totalQuestions: questions.length,
              correctAnswers: newCorrectCount,
            }
          });
        }
      }, 1200);
    } else {
      setHasError(true);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setHasError(false), 700);
    }
  };

  if (!isPlaying) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <SpellCheck2 className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-4xl font-black">Imlo</h1>
        <p className="text-xl text-muted-foreground">So'zlarni xatosiz yozishni mashq qiling.</p>
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
          <Button onClick={startGame} size="lg" className="w-full h-14 rounded-xl text-lg font-black bg-red-500 hover:bg-red-600 text-white" data-testid="button-start">
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

  if (isFinished) {
    const percentage = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="max-w-md mx-auto mt-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="rounded-3xl border-none shadow-xl bg-gradient-to-b from-card to-muted p-8 space-y-6">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-4xl font-black">Natija</h2>
          <div className="text-6xl font-black text-primary">{percentage}%</div>
          <p className="text-xl font-medium text-muted-foreground">
            {questions.length} ta so'zdan <strong>{correctCount}</strong> tasini to'g'ri yozdingiz.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => setIsPlaying(false)} variant="outline" className="flex-1 h-14 rounded-xl font-bold">Chiqish</Button>
            <Button onClick={startGame} className="flex-1 h-14 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white">
              <RotateCcw className="mr-2 w-5 h-5" /> Qayta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;

  const maskedWord = question.word.split('').map((char, i) => {
    if (char === ' ') return ' ';
    if (showHint && (i === 0 || i === question.word.length - 1 || i % 3 === 0)) return char;
    return '_';
  }).join('');

  return (
    <div className="max-w-xl mx-auto space-y-8 mt-10" onClick={focusInput}>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={(e) => { e.stopPropagation(); if (timerRef.current) clearTimeout(timerRef.current); setIsPlaying(false); }} data-testid="button-exit">
          <X className="w-5 h-5" />
        </Button>
        <Progress value={progress} className="flex-1 h-4 rounded-full bg-muted" />
        <span className="text-sm font-bold text-muted-foreground shrink-0">{currentIdx + 1}/{questions.length}</span>
      </div>

      <div className="text-center py-8 space-y-4">
        <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Shu so'zni inglizcha yozing</div>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-primary" data-testid="text-prompt">
          {question.correctAnswer}
        </h2>
        <div className="h-10 flex items-center justify-center">
          {showHint && !isSuccess && (
            <div className="text-xl font-mono tracking-[0.4em] text-muted-foreground font-bold bg-muted px-6 py-2 rounded-xl">
              {maskedWord}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isSuccess}
          className={cn(
            "h-20 text-center text-3xl font-black tracking-widest rounded-2xl transition-colors",
            hasError && "border-red-500 bg-red-500/10 text-red-500 animate-shake focus-visible:ring-red-500",
            isSuccess && "border-green-500 bg-green-500/10 text-green-600 focus-visible:ring-green-500"
          )}
          placeholder="Yozishni boshlang..."
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-testid="input-spelling"
        />

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-16 rounded-xl font-bold flex-1"
            onClick={(e) => { e.stopPropagation(); setShowHint(true); setUsedHint(true); }}
            disabled={showHint || isSuccess}
            data-testid="button-hint"
          >
            <Eye className="w-5 h-5 mr-2" /> Yordam
          </Button>
          <Button
            type="submit"
            size="lg"
            className={cn(
              "h-16 rounded-xl font-black flex-[2] text-white border-0 transition-colors",
              isSuccess ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
            )}
            disabled={!inputValue.trim() || isSuccess}
            data-testid="button-submit"
          >
            {isSuccess ? "To'g'ri!" : "Tekshirish"} <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
