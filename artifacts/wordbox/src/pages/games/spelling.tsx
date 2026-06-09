import { useState, useRef, useEffect } from "react";
import { useGetQuizWords, useMarkWordProgress, useCreateGameSession } from "@workspace/api-client-react";
import type { GameSessionLevel } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
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
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: questions, isLoading, refetch } = useGetQuizWords(
    { level, count: 10 },
    { query: { enabled: isPlaying } }
  );

  const markProgress = useMarkWordProgress();
  const createSession = useCreateGameSession();

  useEffect(() => {
    if (isPlaying && !isFinished && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPlaying, isFinished, currentIdx]);

  const startGame = () => {
    setIsPlaying(true);
    setCurrentIdx(0);
    setScore(0);
    setIsFinished(false);
    resetTurn();
    refetch();
  };

  const resetTurn = () => {
    setInputValue("");
    setShowHint(false);
    setHasError(false);
    setIsSuccess(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!questions || isSuccess) return;

    const question = questions[currentIdx];
    const isCorrect = inputValue.trim().toLowerCase() === question.word.toLowerCase();

    if (isCorrect) {
      setIsSuccess(true);
      setHasError(false);
      
      const earnedPoint = showHint ? 0.5 : 1; // Half point if used hint
      setScore(s => s + earnedPoint);

      markProgress.mutate({
        id: question.wordId,
        data: { correct: true, gameType: "spelling" }
      });

      setTimeout(() => {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx(c => c + 1);
          resetTurn();
        } else {
          setIsFinished(true);
          createSession.mutate({
            data: {
              gameType: "spelling",
              level,
              score: Math.round(((score + earnedPoint) / questions.length) * 100),
              totalQuestions: questions.length,
              correctAnswers: Math.round(score + earnedPoint)
            }
          });
        }
      }, 1500);
    } else {
      setHasError(true);
      setTimeout(() => setHasError(false), 800);
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
              <SelectTrigger className="w-full h-14 rounded-xl text-lg font-bold">
                <SelectValue placeholder="Darajani tanlang" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map(l => (
                  <SelectItem key={l} value={l} className="font-bold">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={startGame} size="lg" className="w-full h-14 rounded-xl text-lg font-black bg-red-500 hover:bg-red-600 text-white hover-elevate">
            Boshlash
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !questions) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-md mx-auto mt-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-b from-card to-muted p-8">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-4xl font-black mb-2">Natija</h2>
          <div className="text-6xl font-black text-primary mb-6">{percentage}%</div>
          <p className="text-xl font-medium text-muted-foreground mb-8">
            Imlo mashqini yakunladingiz!
          </p>
          <div className="flex gap-4">
            <Button onClick={() => setIsPlaying(false)} variant="outline" className="flex-1 h-14 rounded-xl font-bold">
              Chiqish
            </Button>
            <Button onClick={startGame} className="flex-1 h-14 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white hover-elevate">
              <RotateCcw className="mr-2 w-5 h-5" /> Qayta
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const question = questions[currentIdx];
  const progress = ((currentIdx) / questions.length) * 100;

  // Generate masked word for hint
  const maskedWord = question.word.split('').map((char, i) => {
    if (char === ' ') return ' ';
    // Show first letter, last letter, and roughly 1/3 of the others if hint is on
    if (showHint && (i === 0 || i === question.word.length - 1 || i % 3 === 0)) return char;
    return '_';
  }).join('');

  return (
    <div className="max-w-xl mx-auto space-y-8 mt-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsPlaying(false)}>
          <X className="w-5 h-5" />
        </Button>
        <Progress value={progress} className="flex-1 h-4 rounded-full bg-muted" />
      </div>

      <div className="text-center py-10 space-y-6">
        <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Shu so'zni inglizcha yozing</div>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-primary-foreground dark:text-primary">
          {question.correctAnswer}
        </h2>
        
        <div className="h-12 flex items-center justify-center">
          {showHint && !isSuccess && (
            <div className="text-2xl font-mono tracking-[0.5em] text-muted-foreground font-bold bg-muted px-6 py-2 rounded-xl">
              {maskedWord}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSuccess}
            className={cn(
              "h-20 md:h-24 text-center text-3xl md:text-4xl font-black tracking-widest rounded-2xl transition-colors",
              hasError ? "border-red-500 bg-red-500/10 text-red-500 animate-shake focus-visible:ring-red-500" : "focus-visible:ring-primary",
              isSuccess ? "border-green-500 bg-green-500/10 text-green-600 focus-visible:ring-green-500" : ""
            )}
            placeholder="Yozishni boshlang..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>

        <div className="flex gap-4">
          <Button 
            type="button" 
            variant="outline" 
            size="lg" 
            className="h-16 rounded-xl font-bold flex-1"
            onClick={() => setShowHint(true)}
            disabled={showHint || isSuccess}
          >
            <Eye className="w-5 h-5 mr-2" /> Yordam
          </Button>
          
          <Button 
            type="submit"
            size="lg" 
            className={cn(
              "h-16 rounded-xl font-black flex-[2] text-white hover-elevate transition-colors border-0",
              isSuccess ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
            )}
            disabled={!inputValue.trim() || isSuccess}
          >
            {isSuccess ? "To'g'ri!" : "Tekshirish"} <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
