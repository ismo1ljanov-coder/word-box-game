import { useState, useRef, useEffect } from "react";
import { useGetQuizWords, useMarkWordProgress, useCreateGameSession, getGetQuizWordsQueryKey } from "@workspace/api-client-react";
import type { GameSessionLevel } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, ArrowRight, ArrowLeft, RotateCcw, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];

export default function FlashcardGame() {
  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [markedLearned, setMarkedLearned] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: words, isLoading, isError, refetch } = useGetQuizWords(
    { level, count: 15 },
    { query: { enabled: false, queryKey: getGetQuizWordsQueryKey({ level, count: 15 }) } }
  );

  const markProgress = useMarkWordProgress();
  const createSession = useCreateGameSession();

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const startGame = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(true);
    setCurrentIdx(0);
    setIsFlipped(false);
    setIsAnimating(false);
    setIsFinished(false);
    setMarkedLearned(new Set());
    refetch();
  };

  const flipToNext = (nextIdx: number | null) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped(false);
    timerRef.current = setTimeout(() => {
      if (nextIdx !== null) setCurrentIdx(nextIdx);
      setIsAnimating(false);
    }, 300);
  };

  const nextCard = () => {
    if (!words || isAnimating) return;
    if (currentIdx < words.length - 1) {
      flipToNext(currentIdx + 1);
    } else {
      finishGame();
    }
  };

  const prevCard = () => {
    if (currentIdx > 0 && !isAnimating) {
      flipToNext(currentIdx - 1);
    }
  };

  const markLearned = () => {
    if (!words || isAnimating) return;
    const word = words[currentIdx];
    if (!markedLearned.has(word.wordId)) {
      setMarkedLearned(prev => new Set(prev).add(word.wordId));
      markProgress.mutate({ wordId: word.wordId, data: { correct: true, gameType: "flashcard" } });
    }
    nextCard();
  };

  const finishGame = () => {
    if (!words) return;
    setIsFinished(true);
    const learnedCount = markedLearned.size;
    const finalScore = words.length > 0 ? Math.round((learnedCount / words.length) * 100) : 0;
    createSession.mutate({
      data: {
        gameType: "flashcard", level,
        score: finalScore,
        totalQuestions: words.length,
        correctAnswers: learnedCount,
      }
    });
  };

  if (!isPlaying) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Layers className="w-12 h-12 text-orange-500" />
        </div>
        <h1 className="text-4xl font-black">Flesh Kartalar</h1>
        <p className="text-xl text-muted-foreground">So'zlarni yodlashning eng oson usuli.</p>
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
          <Button onClick={startGame} size="lg" className="w-full h-14 rounded-xl text-lg font-black bg-orange-500 hover:bg-orange-600 text-white" data-testid="button-start">
            Boshlash
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !words) {
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
    const learnedCount = markedLearned.size;
    return (
      <div className="max-w-md mx-auto mt-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="rounded-3xl border-none shadow-xl bg-gradient-to-b from-card to-muted p-8 space-y-6">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-4xl font-black">Ajoyib!</h2>
          <p className="text-xl font-medium text-muted-foreground">
            {words.length} ta kartadan <strong>{learnedCount}</strong> tasini o'rgandingiz.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => setIsPlaying(false)} variant="outline" className="flex-1 h-14 rounded-xl font-bold">Chiqish</Button>
            <Button onClick={startGame} className="flex-1 h-14 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white">
              <RotateCcw className="mr-2 w-5 h-5" /> Qayta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const word = words[currentIdx];
  const progress = ((currentIdx + 1) / words.length) * 100;
  const isLearned = markedLearned.has(word.wordId);

  return (
    <div className="max-w-xl mx-auto space-y-6 mt-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setIsPlaying(false); }}>
          <X className="w-5 h-5" />
        </Button>
        <Progress value={progress} className="flex-1 h-4 rounded-full bg-muted" />
        <span className="text-sm font-bold text-muted-foreground shrink-0">{currentIdx + 1}/{words.length}</span>
      </div>

      {isLearned && (
        <div className="text-center text-sm font-bold text-green-600 bg-green-500/10 rounded-xl py-2">
          O'rganilgan
        </div>
      )}

      <div
        className="perspective-1000 h-80 cursor-pointer select-none"
        onClick={() => !isAnimating && setIsFlipped(f => !f)}
        data-testid="card-flip"
      >
        <div className={cn(
          "w-full h-full transition-transform duration-500 preserve-3d relative rounded-3xl shadow-xl",
          isFlipped ? "rotate-y-180" : ""
        )}>
          <div className="absolute w-full h-full backface-hidden bg-card border border-border/50 rounded-3xl flex flex-col items-center justify-center p-8 text-center">
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">Inglizcha</div>
            <h2 className="text-5xl font-black tracking-tight" data-testid="text-word-front">{word.word}</h2>
            <div className="mt-8 text-muted-foreground text-sm font-medium">Tarjimani ko'rish uchun bosing</div>
          </div>
          <div className="absolute w-full h-full backface-hidden bg-primary/10 border-2 border-primary/20 rounded-3xl flex flex-col items-center justify-center p-8 text-center rotate-y-180">
            <div className="text-sm font-bold text-primary uppercase tracking-wider mb-6">O'zbekcha</div>
            <h2 className="text-4xl font-black tracking-tight text-primary" data-testid="text-word-back">{word.correctAnswer}</h2>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-4">
        <Button variant="outline" size="lg" className="rounded-xl font-bold h-14 px-6 border-2" onClick={prevCard} disabled={currentIdx === 0 || isAnimating}>
          <ArrowLeft className="mr-2 w-5 h-5" /> Oldingi
        </Button>
        <Button variant="outline" size="lg" className="rounded-xl font-bold h-14 bg-green-500 hover:bg-green-600 text-white border-0 px-6" onClick={markLearned} disabled={isAnimating} data-testid="button-learned">
          O'rgandim
        </Button>
        <Button size="lg" className="rounded-xl font-bold h-14 px-6" onClick={nextCard} disabled={isAnimating} data-testid="button-next">
          Keyingi <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
