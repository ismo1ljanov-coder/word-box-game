import { useState, useEffect } from "react";
import { useGetQuizWords, useMarkWordProgress, useCreateGameSession } from "@workspace/api-client-react";
import type { GameSessionLevel, QuizQuestion } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, RotateCcw, X, Layers3, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];

export default function MatchingGame() {
  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  const [engWords, setEngWords] = useState<{id: number, text: string}[]>([]);
  const [uzbWords, setUzWords] = useState<{id: number, text: string}[]>([]);
  
  const [selectedEng, setSelectedEng] = useState<number | null>(null);
  const [selectedUzb, setSelectedUzb] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());

  const { data: words, isLoading, refetch } = useGetQuizWords(
    { level, count: 6 },
    { query: { enabled: isPlaying } }
  );

  const markProgress = useMarkWordProgress();
  const createSession = useCreateGameSession();

  // Shuffle function
  const shuffle = (array: any[]) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  };

  useEffect(() => {
    if (words && words.length > 0) {
      const e = words.map(w => ({ id: w.wordId, text: w.word }));
      const u = words.map(w => ({ id: w.wordId, text: w.correctAnswer }));
      
      setEngWords(shuffle([...e]));
      setUzWords(shuffle([...u]));
    }
  }, [words]);

  const startGame = () => {
    setIsPlaying(true);
    setIsFinished(false);
    setScore(0);
    setMatched(new Set());
    setSelectedEng(null);
    setSelectedUzb(null);
    refetch();
  };

  // Check match when both selected
  useEffect(() => {
    if (selectedEng !== null && selectedUzb !== null) {
      const isCorrect = selectedEng === selectedUzb;
      
      if (isCorrect) {
        setMatched(prev => new Set(prev).add(selectedEng));
        setScore(s => s + 1);
        
        markProgress.mutate({
          id: selectedEng,
          data: { correct: true, gameType: "matching" }
        });
        
        setSelectedEng(null);
        setSelectedUzb(null);

        // Check if finished
        if (matched.size + 1 === words?.length) {
          setTimeout(() => {
            setIsFinished(true);
            createSession.mutate({
              data: {
                gameType: "matching",
                level,
                score: 100, // Matching game implies 100% if finished
                totalQuestions: words.length,
                correctAnswers: words.length
              }
            });
          }, 500);
        }
      } else {
        // Wrong match, clear after a small delay
        setTimeout(() => {
          setSelectedEng(null);
          setSelectedUzb(null);
        }, 500);
      }
    }
  }, [selectedEng, selectedUzb, matched.size, words, level, markProgress, createSession]);


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
          <Button onClick={startGame} size="lg" className="w-full h-14 rounded-xl text-lg font-black bg-green-500 hover:bg-green-600 text-white hover-elevate">
            Boshlash
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !words || engWords.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto mt-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-b from-card to-muted p-8">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-4xl font-black mb-2">Zo'r!</h2>
          <div className="text-6xl font-black text-primary mb-6">100%</div>
          <p className="text-xl font-medium text-muted-foreground mb-8">
            Barcha so'zlarni to'g'ri moslashtirdingiz.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => setIsPlaying(false)} variant="outline" className="flex-1 h-14 rounded-xl font-bold">
              Chiqish
            </Button>
            <Button onClick={startGame} className="flex-1 h-14 rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white hover-elevate">
              <RotateCcw className="mr-2 w-5 h-5" /> Qayta
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 mt-4 md:mt-10">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsPlaying(false)}>
          <X className="w-5 h-5" />
        </Button>
        <div className="font-bold text-lg text-muted-foreground">Moslashtirish</div>
        <div className="w-10 text-right font-black text-primary text-xl">{score}/{words.length}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:gap-8">
        {/* English Column */}
        <div className="space-y-4">
          <h3 className="text-center font-bold text-muted-foreground uppercase tracking-wider text-sm mb-4">Inglizcha</h3>
          {engWords.map(w => {
            const isMatched = matched.has(w.id);
            const isSelected = selectedEng === w.id;
            const isWrong = isSelected && selectedUzb !== null && selectedEng !== selectedUzb;
            
            return (
              <Button
                key={`eng-${w.id}`}
                variant="outline"
                className={cn(
                  "w-full h-16 md:h-20 rounded-2xl text-lg md:text-xl font-bold transition-all whitespace-normal h-auto py-4",
                  isMatched && "opacity-0 pointer-events-none translate-x-4",
                  isSelected && !isWrong && "border-primary bg-primary/10 text-primary ring-2 ring-primary/20",
                  isWrong && "border-red-500 bg-red-500/10 text-red-600 animate-shake",
                  !isMatched && !isSelected && "hover:border-primary/50 hover:bg-muted"
                )}
                onClick={() => !isMatched && setSelectedEng(w.id)}
                disabled={isMatched}
              >
                {w.text}
              </Button>
            );
          })}
        </div>

        {/* Uzbek Column */}
        <div className="space-y-4">
          <h3 className="text-center font-bold text-muted-foreground uppercase tracking-wider text-sm mb-4">O'zbekcha</h3>
          {uzbWords.map(w => {
            const isMatched = matched.has(w.id);
            const isSelected = selectedUzb === w.id;
            const isWrong = isSelected && selectedEng !== null && selectedEng !== selectedUzb;

            return (
              <Button
                key={`uzb-${w.id}`}
                variant="outline"
                className={cn(
                  "w-full h-16 md:h-20 rounded-2xl text-lg md:text-xl font-bold transition-all whitespace-normal h-auto py-4",
                  isMatched && "opacity-0 pointer-events-none -translate-x-4",
                  isSelected && !isWrong && "border-green-500 bg-green-500/10 text-green-600 ring-2 ring-green-500/20",
                  isWrong && "border-red-500 bg-red-500/10 text-red-600 animate-shake",
                  !isMatched && !isSelected && "hover:border-green-500/50 hover:bg-muted"
                )}
                onClick={() => !isMatched && setSelectedUzb(w.id)}
                disabled={isMatched}
              >
                {w.text}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
