import { useState, useEffect, useRef, useCallback } from "react";
import { useGetQuizWords, useMarkWordProgress, useCreateGameSession, getGetQuizWordsQueryKey } from "@workspace/api-client-react";
import type { GameSessionLevel } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, RotateCcw, Shuffle, Delete, CheckCircle2, Lightbulb, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];
const HINT_COST = 10;

function shuffleLetters(word: string): { letter: string; id: number }[] {
  const arr = word.toUpperCase().split("").map((l, i) => ({ letter: l, id: i }));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const original = word.toUpperCase().split("").map((l, i) => ({ letter: l, id: i }));
  if (arr.every((a, i) => a.id === original[i].id) && arr.length > 1) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

export default function AnagramGame() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [availableLetters, setAvailableLetters] = useState<{ letter: string; id: number }[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<{ letter: string; id: number }[]>([]);
  const [checkState, setCheckState] = useState<"idle" | "correct" | "wrong">("idle");
  const [localCoins, setLocalCoins] = useState(user?.totalCoins ?? 0);
  const [hintLetter, setHintLetter] = useState<number | null>(null); // id of hinted letter

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const correctRef = useRef(0);

  const { data: questions, isLoading, refetch } = useGetQuizWords(
    { level, count: 10 },
    { query: { enabled: false, queryKey: getGetQuizWordsQueryKey({ level, count: 10 }) } }
  );

  const markProgress = useMarkWordProgress();
  const createSession = useCreateGameSession();

  useEffect(() => {
    setLocalCoins(user?.totalCoins ?? 0);
  }, [user?.totalCoins]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const loadQuestion = useCallback((idx: number, qs: typeof questions) => {
    if (!qs || !qs[idx]) return;
    const word = qs[idx].word;
    setAvailableLetters(shuffleLetters(word));
    setSelectedLetters([]);
    setCheckState("idle");
    setHintLetter(null);
  }, []);

  useEffect(() => {
    if (isPlaying && questions && questions.length > 0) {
      loadQuestion(currentIdx, questions);
    }
  }, [isPlaying, questions, currentIdx, loadQuestion]);

  const startGame = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    correctRef.current = 0;
    setIsPlaying(true);
    setCurrentIdx(0);
    setIsFinished(false);
    setSelectedLetters([]);
    setCheckState("idle");
    setHintLetter(null);
    refetch();
  };

  const advanceQuestion = (nextIdx: number, wasCorrect: boolean) => {
    const newCorrect = correctRef.current + (wasCorrect ? 1 : 0);
    correctRef.current = newCorrect;
    if (nextIdx >= (questions?.length ?? 0)) {
      const total = questions?.length ?? 0;
      const score = total > 0 ? Math.round((newCorrect / total) * 100) : 0;
      createSession.mutate({
        data: { gameType: "anagram", level, score, totalQuestions: total, correctAnswers: newCorrect },
      });
      setIsFinished(true);
    } else {
      setCurrentIdx(nextIdx);
    }
  };

  const handlePickLetter = (item: { letter: string; id: number }) => {
    if (checkState !== "idle") return;
    const idx = currentIdx; // capture — avoid stale closure inside state setter

    setAvailableLetters(prev => prev.filter(l => l.id !== item.id));
    setSelectedLetters(prev => {
      const next = [...prev, item];
      const wordLen = questions?.[idx]?.word.length ?? 0;
      if (next.length === wordLen) {
        const formed = next.map(l => l.letter).join("").toUpperCase();
        const correctWord = (questions?.[idx]?.word ?? "").toUpperCase();
        const isCorrect = formed === correctWord;
        setCheckState(isCorrect ? "correct" : "wrong");
        if (!isCorrect) {
          timerRef.current = setTimeout(() => {
            setAvailableLetters(shuffleLetters(questions?.[idx]?.word ?? ""));
            setSelectedLetters([]);
            setCheckState("idle");
            setHintLetter(null);
          }, 1200);
        } else {
          markProgress.mutate({ wordId: questions![idx].wordId, data: { correct: true, gameType: "anagram" } });
          timerRef.current = setTimeout(() => {
            advanceQuestion(idx + 1, true);
          }, 900);
        }
      }
      return next;
    });
  };

  const handleRemoveLetter = (item: { letter: string; id: number }) => {
    if (checkState !== "idle") return;
    setSelectedLetters(prev => {
      const i = prev.findLastIndex(l => l.id === item.id);
      if (i === -1) return prev;
      return prev.filter((_, j) => j !== i);
    });
    setAvailableLetters(prev => [...prev, item]);
  };

  const handleSkip = () => {
    if (!questions || checkState !== "idle") return;
    const idx = currentIdx;
    markProgress.mutate({ wordId: questions[idx].wordId, data: { correct: false, gameType: "anagram" } });
    advanceQuestion(idx + 1, false);
  };

  const handleHint = async () => {
    if (!questions || checkState !== "idle") return;
    const question = questions[currentIdx];
    if (!question) return;

    if (localCoins < HINT_COST) {
      toast({ title: "Tangalar yetarli emas", description: `Maslahat uchun ${HINT_COST} tanga kerak`, variant: "destructive" });
      return;
    }

    const word = question.word.toUpperCase();
    // Find the next letter position that needs to be filled (first missing or wrong position)
    const hintPos = selectedLetters.length;
    if (hintPos >= word.length) return;

    const correctLetter = word[hintPos];
    const letterItem = availableLetters.find(l => l.letter === correctLetter);
    if (!letterItem) return;

    try {
      const res = await fetch("/api/auth/spend-coins", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: HINT_COST }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error ?? "Xato", variant: "destructive" });
        return;
      }
      const data = await res.json();
      setLocalCoins(data.totalCoins);
      setHintLetter(letterItem.id);
      // Auto-place the hinted letter after a short delay
      setTimeout(() => {
        handlePickLetter(letterItem);
        setHintLetter(null);
      }, 400);
    } catch {
      toast({ title: "Server bilan aloqa yo'q", variant: "destructive" });
    }
  };

  const progress = questions ? (currentIdx / questions.length) * 100 : 0;

  if (!isPlaying) {
    return (
      <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center mx-auto">
            <Shuffle className="w-10 h-10 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-black">Anagram</h1>
          <p className="text-muted-foreground text-lg">Aralashtirilgan harflardan so'z tuzing</p>
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
            <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-bold text-foreground">Qoidalar:</p>
              <p>• O'zbek tarjimasi ko'rsatiladi</p>
              <p>• Aralashtirilgan harflarni bosib so'z tuzing</p>
              <p>• Noto'g'ri bo'lsa, harflar qayta aralashtiriladi</p>
              <p>• 💡 Maslahat: {HINT_COST} 🪙 sarflab harf ochish mumkin</p>
            </div>
            <Button onClick={startGame} size="lg" className="w-full rounded-xl font-bold h-14 text-lg">
              Boshlash
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFinished) {
    const total = questions?.length ?? 1;
    const score = Math.round((correctRef.current / total) * 100);
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="rounded-3xl border-none overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-8 text-white text-center">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h2 className="text-3xl font-black">Barakalla!</h2>
            <p className="text-white/80 mt-1">{correctRef.current}/{total} so'z to'g'ri</p>
          </div>
          <CardContent className="p-8">
            <div className="grid grid-cols-2 gap-4 text-center mb-6">
              <div><div className="text-4xl font-black text-primary">{score}%</div><div className="text-sm text-muted-foreground">Ball</div></div>
              <div><div className="text-4xl font-black text-indigo-500">{correctRef.current}</div><div className="text-sm text-muted-foreground">To'g'ri</div></div>
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setIsPlaying(false)}>
          <RotateCcw className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex justify-between text-sm font-bold text-muted-foreground mb-1.5">
            <span className="flex items-center gap-1.5"><Shuffle className="w-4 h-4 text-indigo-500" /> Anagram</span>
            <span>{currentIdx + 1} / {questions.length}</span>
          </div>
          <Progress value={progress} className="h-2.5" />
        </div>
        <Badge className="bg-indigo-500/10 text-indigo-600 border-0 font-bold">{level}</Badge>
      </div>

      {/* Coin indicator */}
      <div className="flex justify-end">
        <span className="flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full">
          <Coins className="w-4 h-4" /> {localCoins}
        </span>
      </div>

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardContent className="p-8 space-y-8">
          <div className="text-center">
            <p className="text-sm font-bold text-muted-foreground mb-2">Tarjima:</p>
            <h2 className="text-3xl font-black">{question.correctAnswer}</h2>
          </div>

          {/* Answer area */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2 text-center">Sizning javobingiz:</p>
            <div className={cn(
              "min-h-[56px] flex flex-wrap justify-center gap-2 p-3 rounded-2xl border-2 border-dashed transition-colors",
              checkState === "correct" ? "border-emerald-500 bg-emerald-500/5" :
              checkState === "wrong" ? "border-red-500 bg-red-500/5" :
              "border-border bg-muted/20"
            )}>
              {selectedLetters.map((item, i) => (
                <button
                  key={`sel-${item.id}-${i}`}
                  onClick={() => handleRemoveLetter(item)}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={checkState !== "idle"}
                  className={cn(
                    "w-11 h-11 rounded-xl font-black text-lg border-2 transition-all focus:outline-none active:outline-none",
                    checkState === "correct" ? "bg-emerald-500 text-white border-emerald-500" :
                    checkState === "wrong" ? "bg-red-500 text-white border-red-500" :
                    hintLetter === item.id ? "bg-amber-400 text-white border-amber-400 scale-110" :
                    "bg-background border-border hover:border-red-500/50 hover:bg-red-500/5"
                  )}
                >
                  {item.letter || "?"}
                </button>
              ))}
              {selectedLetters.length === 0 && (
                <span className="text-muted-foreground text-sm self-center">Harflarni tanlang...</span>
              )}
            </div>
          </div>

          {/* Correct/wrong indicator */}
          {checkState === "correct" && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold animate-in fade-in zoom-in-95">
              <CheckCircle2 className="w-5 h-5" /> To'g'ri!
            </div>
          )}
          {checkState === "wrong" && (
            <div className="text-center text-red-500 font-bold animate-in fade-in zoom-in-95 text-sm">
              Noto'g'ri — qayta urining!
            </div>
          )}

          {/* Available letters */}
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2 text-center">Mavjud harflar:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {availableLetters.map((item) => (
                <button
                  key={`avail-${item.id}`}
                  onClick={() => handlePickLetter(item)}
                  onMouseDown={(e) => e.preventDefault()}
                  disabled={checkState !== "idle"}
                  className={cn(
                    "w-11 h-11 rounded-xl font-black text-lg border-2 transition-all active:scale-95 focus:outline-none active:outline-none",
                    hintLetter === item.id
                      ? "bg-amber-400 text-white border-amber-400 scale-110 animate-pulse"
                      : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 hover:bg-indigo-500 hover:text-white hover:border-indigo-500"
                  )}
                >
                  {item.letter || "?"}
                </button>
              ))}
              {availableLetters.length === 0 && checkState === "idle" && (
                <span className="text-muted-foreground text-sm">Barcha harflar ishlatildi</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 rounded-xl font-bold"
          onClick={() => {
            if (timerRef.current) clearTimeout(timerRef.current);
            setAvailableLetters(shuffleLetters(question.word));
            setSelectedLetters([]);
            setCheckState("idle");
            setHintLetter(null);
          }}
          disabled={checkState !== "idle"}
        >
          <Delete className="mr-2 w-4 h-4" /> Tozalash
        </Button>
        <Button
          variant="outline"
          className="flex-1 rounded-xl font-bold text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
          onClick={handleHint}
          disabled={checkState !== "idle" || localCoins < HINT_COST}
        >
          <Lightbulb className="mr-1.5 w-4 h-4" /> {HINT_COST}🪙
        </Button>
        <Button variant="ghost" className="flex-1 rounded-xl font-bold text-muted-foreground" onClick={handleSkip} disabled={checkState !== "idle"}>
          O'tkazish
        </Button>
      </div>
    </div>
  );
}
