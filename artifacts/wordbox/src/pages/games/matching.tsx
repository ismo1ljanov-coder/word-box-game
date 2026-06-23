import { useState, useEffect, useRef, useMemo } from "react";
import { useGetQuizWords, useMarkWordProgress, useCreateGameSession, getGetQuizWordsQueryKey } from "@workspace/api-client-react";
import type { GameSessionLevel } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, RotateCcw, X, Layers3 } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchingGame() {
  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [selectedEng, setSelectedEng] = useState<number | null>(null);
  const [selectedUzb, setSelectedUzb] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shuffleGenRef = useRef(0);

  const { data: words, isLoading, isError, refetch } = useGetQuizWords(
    { level, count: 6 },
    { query: { enabled: false, queryKey: getGetQuizWordsQueryKey({ level, count: 6 }) } }
  );

  const markProgress = useMarkWordProgress();
  const createSession = useCreateGameSession();

  // Stable shuffle: only re-shuffle when words actually change (not on re-render)
  const { engWords, uzbWords } = useMemo(() => {
    if (!words || words.length === 0) return { engWords: [], uzbWords: [] };
    const e = words.map(w => ({ id: w.wordId, text: w.word }));
    const u = words.map(w => ({ id: w.wordId, text: w.correctAnswer }));
    return { engWords: shuffleArray(e), uzbWords: shuffleArray(u) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, shuffleGenRef.current]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const startGame = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    shuffleGenRef.current += 1;
    setIsPlaying(true);
    setIsFinished(false);
    setScore(0);
    setMatched(new Set());
    setSelectedEng(null);
    setSelectedUzb(null);
    setIsChecking(false);
    refetch();
  };

  const handleEngClick = (id: number) => {
    if (isChecking || matched.has(id)) return;
    setSelectedEng(id);
  };

  const handleUzbClick = (id: number) => {
    if (isChecking || matched.has(id)) return;
    setSelectedUzb(id);
  };

  // Check match when both selected
  useEffect(() => {
    if (selectedEng === null || selectedUzb === null) return;
    setIsChecking(true);

    const isCorrect = selectedEng === selectedUzb;

    if (isCorrect) {
      const newMatched = new Set(matched);
      newMatched.add(selectedEng);
      const newScore = score + 1;

      markProgress.mutate({ wordId: selectedEng, data: { correct: true, gameType: "matching" } });
      setMatched(newMatched);
      setScore(newScore);
      setSelectedEng(null);
      setSelectedUzb(null);
      setIsChecking(false);

      if (newMatched.size === words?.length) {
        timerRef.current = setTimeout(() => {
          setIsFinished(true);
          createSession.mutate({
            data: {
              gameType: "matching", level,
              score: 100,
              totalQuestions: words!.length,
              correctAnswers: words!.length,
            }
          });
        }, 400);
      }
    } else {
      timerRef.current = setTimeout(() => {
        setSelectedEng(null);
        setSelectedUzb(null);
        setIsChecking(false);
      }, 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEng, selectedUzb]);

  if (!isPlaying) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Layers3 className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-4xl font-black">Moslashtirish</h1>
        <p className="text-xl text-muted-foreground">So'z va uning tarjimasini topib juftlang.</p>
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
          <Button onClick={startGame} size="lg" className="w-full h-14 rounded-xl text-lg font-black bg-green-500 hover:bg-green-600 text-white" data-testid="button-start">
            Boshlash
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !words || engWords.length === 0) {
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
    return (
      <div className="max-w-md mx-auto mt-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="rounded-3xl border-none shadow-xl bg-gradient-to-b from-card to-muted p-8 space-y-6">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-4xl font-black">Zo'r!</h2>
          <div className="text-6xl font-black text-primary">100%</div>
          <p className="text-xl font-medium text-muted-foreground">Barcha so'zlarni to'g'ri moslashtirdingiz.</p>
          <div className="flex gap-4">
            <Button onClick={() => setIsPlaying(false)} variant="outline" className="flex-1 h-14 rounded-xl font-bold">Chiqish</Button>
            <Button onClick={startGame} className="flex-1 h-14 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white">
              <RotateCcw className="mr-2 w-5 h-5" /> Qayta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-4 md:mt-10">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { if (timerRef.current) clearTimeout(timerRef.current); setIsPlaying(false); }}>
          <X className="w-5 h-5" />
        </Button>
        <div className="font-bold text-lg text-muted-foreground">Moslashtirish</div>
        <div className="w-16 text-right font-black text-primary text-xl">{score}/{words.length}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-8">
        <div className="space-y-3">
          <h3 className="text-center font-bold text-muted-foreground uppercase tracking-wider text-sm">Inglizcha</h3>
          {engWords.map(w => {
            const isMatchedItem = matched.has(w.id);
            const isSelected = selectedEng === w.id;
            const isWrong = isSelected && selectedUzb !== null && isChecking && selectedEng !== selectedUzb;
            return (
              <Button
                key={`eng-${w.id}`}
                variant="outline"
                className={cn(
                  "w-full rounded-2xl text-base md:text-lg font-bold transition-all whitespace-normal py-4 h-auto focus:outline-none focus:ring-0 active:outline-none",
                  isMatchedItem && "opacity-0 pointer-events-none scale-95",
                  isSelected && !isWrong && "border-primary bg-primary/10 text-primary ring-2 ring-primary/20",
                  isWrong && "border-red-500 bg-red-500/10 text-red-600 animate-shake",
                  !isMatchedItem && !isSelected && "hover:border-primary/50 hover:bg-muted"
                )}
                onClick={() => handleEngClick(w.id)}
                onMouseDown={(e) => e.preventDefault()}
                disabled={isMatchedItem}
                data-testid={`button-eng-${w.id}`}
              >
                {w.text || "—"}
              </Button>
            );
          })}
        </div>

        <div className="space-y-3">
          <h3 className="text-center font-bold text-muted-foreground uppercase tracking-wider text-sm">O'zbekcha</h3>
          {uzbWords.map(w => {
            const isMatchedItem = matched.has(w.id);
            const isSelected = selectedUzb === w.id;
            const isWrong = isSelected && selectedEng !== null && isChecking && selectedEng !== selectedUzb;
            return (
              <Button
                key={`uzb-${w.id}`}
                variant="outline"
                className={cn(
                  "w-full rounded-2xl text-base md:text-lg font-bold transition-all whitespace-normal py-4 h-auto focus:outline-none focus:ring-0 active:outline-none",
                  isMatchedItem && "opacity-0 pointer-events-none scale-95",
                  isSelected && !isWrong && "border-green-500 bg-green-500/10 text-green-600 ring-2 ring-green-500/20",
                  isWrong && "border-red-500 bg-red-500/10 text-red-600 animate-shake",
                  !isMatchedItem && !isSelected && "hover:border-green-500/50 hover:bg-muted"
                )}
                onClick={() => handleUzbClick(w.id)}
                onMouseDown={(e) => e.preventDefault()}
                disabled={isMatchedItem}
                data-testid={`button-uzb-${w.id}`}
              >
                {w.text || "—"}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
