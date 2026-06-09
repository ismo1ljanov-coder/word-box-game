import { useState, useEffect, useRef } from "react";
import { useGetCrosswordPuzzle, useCreateGameSession } from "@workspace/api-client-react";
import type { GameSessionLevel } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, ArrowRight, RotateCcw, X, Grid3X3, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];

export default function CrosswordGame() {
  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState<string[][]>([]);
  const [answers, setAnswers] = useState<string[][]>([]);
  const [focus, setFocus] = useState<{r: number, c: number} | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  const { data: puzzle, isLoading, refetch } = useGetCrosswordPuzzle(
    { level },
    { query: { enabled: isPlaying } }
  );

  const createSession = useCreateGameSession();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (puzzle) {
      setGrid(puzzle.grid.map(row => row.map(cell => cell)));
      setAnswers(puzzle.grid.map(row => row.map(cell => cell === null ? "" : "")));
    }
  }, [puzzle]);

  const startGame = () => {
    setIsPlaying(true);
    setIsFinished(false);
    setFocus(null);
    setScore(0);
    refetch();
  };

  const handleCellClick = (r: number, c: number) => {
    if (grid[r][c] !== null) {
      setFocus({r, c});
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focus || isFinished) return;
    const { r, c } = focus;

    if (e.key === "Backspace") {
      setAnswers(prev => {
        const next = [...prev];
        next[r] = [...next[r]];
        next[r][c] = "";
        return next;
      });
    } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      setAnswers(prev => {
        const next = [...prev];
        next[r] = [...next[r]];
        next[r][c] = e.key.toUpperCase();
        return next;
      });
      // Simple auto-advance to next empty cell in row/col could go here
    }
  };

  const checkAnswers = () => {
    if (!puzzle) return;
    let correctCells = 0;
    let totalCells = 0;

    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] !== null) {
          totalCells++;
          if (answers[r][c]?.toUpperCase() === grid[r][c]?.toUpperCase()) {
            correctCells++;
          }
        }
      }
    }

    const finalScore = Math.round((correctCells / totalCells) * 100) || 0;
    setScore(finalScore);
    setIsFinished(true);

    createSession.mutate({
      data: {
        gameType: "crossword",
        level,
        score: finalScore,
        totalQuestions: totalCells,
        correctAnswers: correctCells
      }
    });
  };

  if (!isPlaying) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Grid3X3 className="w-12 h-12 text-purple-500" />
        </div>
        <h1 className="text-4xl font-black">Krossvord</h1>
        <p className="text-xl text-muted-foreground">Berilgan ma'nolarga qarab inglizcha so'zlarni toping.</p>
        
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
          <Button onClick={startGame} size="lg" className="w-full h-14 rounded-xl text-lg font-black bg-purple-500 hover:bg-purple-600 text-white hover-elevate">
            Boshlash
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !puzzle || grid.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto mt-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <Card className="rounded-3xl border-none shadow-xl bg-gradient-to-b from-card to-muted p-8">
          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-4xl font-black mb-2">Natija</h2>
          <div className="text-6xl font-black text-primary mb-6">{score}%</div>
          <p className="text-xl font-medium text-muted-foreground mb-8">
            Krossvordni muvaffaqiyatli yakunladingiz!
          </p>
          <div className="flex gap-4">
            <Button onClick={() => setIsPlaying(false)} variant="outline" className="flex-1 h-14 rounded-xl font-bold">
              Chiqish
            </Button>
            <Button onClick={startGame} className="flex-1 h-14 rounded-xl font-bold bg-purple-500 hover:bg-purple-600 text-white hover-elevate">
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
        <div className="font-bold text-lg text-muted-foreground">Krossvord ({level})</div>
        <Button onClick={checkAnswers} className="rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white border-0">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Tekshirish
        </Button>
      </div>

      {/* Hidden input for mobile keyboard support */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute w-0 h-0"
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 overflow-auto pb-4">
          <div 
            className="inline-grid gap-1 bg-muted p-2 rounded-2xl mx-auto touch-none"
            style={{ 
              gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))`,
              width: "max-content"
            }}
          >
            {grid.map((row, r) => 
              row.map((cell, c) => {
                const isNull = cell === null;
                const isFocused = focus?.r === r && focus?.c === c;
                const ans = answers[r]?.[c] || "";
                
                // Find if there's a clue starting here
                const clueNum = puzzle.clues.find(clue => clue.row === r && clue.col === c)?.number;

                return (
                  <div 
                    key={`${r}-${c}`}
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 flex items-center justify-center relative text-xl font-black rounded-lg select-none",
                      isNull ? "bg-transparent" : "bg-card border-2 cursor-pointer transition-colors",
                      !isNull && isFocused ? "border-primary bg-primary/10 ring-4 ring-primary/20 z-10" : "border-border/50",
                      !isNull && !isFocused && "hover:bg-muted/80"
                    )}
                    onClick={() => handleCellClick(r, c)}
                  >
                    {!isNull && clueNum && (
                      <span className="absolute top-0.5 left-1 text-[9px] font-bold text-muted-foreground">{clueNum}</span>
                    )}
                    {ans}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6 bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
          <div>
            <h3 className="font-black text-lg mb-3 flex items-center"><ArrowRight className="w-4 h-4 mr-2" /> Yotiqiga</h3>
            <ul className="space-y-2">
              {puzzle.clues.filter(c => c.direction === "across").map(clue => (
                <li key={`a-${clue.number}`} className="text-sm">
                  <span className="font-bold mr-2">{clue.number}.</span>
                  {clue.clue}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-black text-lg mb-3 flex items-center"><ArrowRight className="w-4 h-4 mr-2 rotate-90" /> Tikkasiga</h3>
            <ul className="space-y-2">
              {puzzle.clues.filter(c => c.direction === "down").map(clue => (
                <li key={`d-${clue.number}`} className="text-sm">
                  <span className="font-bold mr-2">{clue.number}.</span>
                  {clue.clue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
