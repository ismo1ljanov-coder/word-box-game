import { useState } from "react";
import { useGetQuizWords, useMarkWordProgress, useCreateGameSession } from "@workspace/api-client-react";
import type { GameSessionLevel } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, ArrowRight, ArrowLeft, RotateCcw, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];

export default function FlashcardGame() {
  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  // Track how many we actually marked to get a "score"
  const [markedLearned, setMarkedLearned] = useState<Set<number>>(new Set());

  const { data: words, isLoading, refetch } = useGetQuizWords(
    { level, count: 10 },
    { query: { enabled: isPlaying } }
  );

  const markProgress = useMarkWordProgress();
  const createSession = useCreateGameSession();

  const startGame = () => {
    setIsPlaying(true);
    setCurrentIdx(0);
    setIsFlipped(false);
    setIsFinished(false);
    setMarkedLearned(new Set());
    refetch();
  };

  const nextCard = () => {
    if (!words) return;
    if (currentIdx < words.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIdx(c => c + 1), 150);
    } else {
      finishGame();
    }
  };

  const prevCard = () => {
    if (currentIdx > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIdx(c => c - 1), 150);
    }
  };

  const markLearned = () => {
    if (!words) return;
    const word = words[currentIdx];
    
    if (!markedLearned.has(word.wordId)) {
      setMarkedLearned(prev => new Set(prev).add(word.wordId));
      markProgress.mutate({
        id: word.wordId,
        data: { correct: true, gameType: "flashcard" }
      });
    }
    
    nextCard();
  };

  const finishGame = () => {
    if (!words) return;
    setIsFinished(true);
    const score = Math.round((markedLearned.size / words.length) * 100) || 100; // If they just clicked through, give 100 for practice
    
    createSession.mutate({
      data: {
        gameType: "flashcard",
        level,
        score,
        totalQuestions: words.length,
        correctAnswers: markedLearned.size || words.length
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
          <Button onClick={startGame} size="lg" className="w-full h-14 rounded-xl text-lg font-black bg-orange-500 hover:bg-orange-600 text-white hover-elevate">
            Boshlash
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !words) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto mt-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-b from-card to-muted p-8">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-4xl font-black mb-2">Ajoyib!</h2>
          <p className="text-xl font-medium text-muted-foreground mb-8">
            Siz barcha kartalarni ko'rib chiqdingiz.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => setIsPlaying(false)} variant="outline" className="flex-1 h-14 rounded-xl font-bold">
              Chiqish
            </Button>
            <Button onClick={startGame} className="flex-1 h-14 rounded-xl font-bold bg-orange-500 hover:bg-orange-600 text-white hover-elevate">
              <RotateCcw className="mr-2 w-5 h-5" /> Qayta
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const word = words[currentIdx];

  return (
    <div className="max-w-xl mx-auto space-y-8 mt-10">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsPlaying(false)}>
          <X className="w-5 h-5" />
        </Button>
        <div className="font-bold text-muted-foreground">
          {currentIdx + 1} / {words.length}
        </div>
        <div className="w-10"></div>
      </div>

      <div className="perspective-1000 h-96 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
        <div className={cn(
          "w-full h-full transition-transform duration-500 preserve-3d relative rounded-3xl shadow-xl",
          isFlipped ? "rotate-y-180" : ""
        )}>
          {/* Front (English) */}
          <div className="absolute w-full h-full backface-hidden bg-card border border-border/50 rounded-3xl flex flex-col items-center justify-center p-8 text-center">
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6">Inglizcha</div>
            <h2 className="text-6xl font-black tracking-tight">{word.word}</h2>
            <div className="mt-10 text-muted-foreground flex items-center text-sm font-medium">
              Aylantirish uchun bosing
            </div>
          </div>

          {/* Back (Uzbek) */}
          <div className="absolute w-full h-full backface-hidden bg-primary/10 border-2 border-primary/20 rounded-3xl flex flex-col items-center justify-center p-8 text-center rotate-y-180">
            <div className="text-sm font-bold text-primary uppercase tracking-wider mb-6">O'zbekcha</div>
            <h2 className="text-5xl font-black tracking-tight text-primary-foreground dark:text-primary">{word.correctAnswer}</h2>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-8">
        <Button 
          variant="outline" 
          size="lg" 
          className="rounded-xl font-bold h-14 px-8 border-2"
          onClick={prevCard}
          disabled={currentIdx === 0}
        >
          <ArrowLeft className="mr-2 w-5 h-5" /> Oldingi
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="lg" 
            className="rounded-xl font-bold h-14 bg-green-500 hover:bg-green-600 text-white border-0 hover-elevate"
            onClick={markLearned}
          >
            O'rgandim
          </Button>
          <Button 
            size="lg" 
            className="rounded-xl font-bold h-14 px-8 hover-elevate"
            onClick={nextCard}
          >
            Keyingi <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
