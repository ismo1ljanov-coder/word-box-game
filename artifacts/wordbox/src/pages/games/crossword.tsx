import { useState, useEffect, useRef } from "react";
import { useGetCrosswordPuzzle, useCreateGameSession, getGetCrosswordPuzzleQueryKey } from "@workspace/api-client-react";
import type { GameSessionLevel } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, ArrowRight, RotateCcw, X, Grid3X3, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];

type CellState = { value: string; isCorrect: boolean | null };

export default function CrosswordGame() {
  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [cells, setCells] = useState<(CellState | null)[][]>([]);
  const [focus, setFocus] = useState<{ r: number; c: number; dir: "across" | "down" } | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [checked, setChecked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: puzzle, isLoading, isError, refetch } = useGetCrosswordPuzzle(
    { level },
    { query: { enabled: false, queryKey: getGetCrosswordPuzzleQueryKey({ level }) } }
  );

  const createSession = useCreateGameSession();

  useEffect(() => {
    if (puzzle && puzzle.grid.length > 0) {
      setCells(puzzle.grid.map(row => row.map(cell => cell === null ? null : { value: "", isCorrect: null })));
      setFocus(null);
      setChecked(false);
    }
  }, [puzzle]);

  const startGame = () => {
    setIsPlaying(true);
    setIsFinished(false);
    setFocus(null);
    setScore(0);
    setChecked(false);
    setCells([]);
    refetch();
  };

  // Find direction for a focused cell based on clues
  const getDirectionForCell = (r: number, c: number, currentDir: "across" | "down"): "across" | "down" => {
    if (!puzzle) return currentDir;
    const hasAcross = puzzle.clues.some(cl => cl.direction === "across" && cl.row === r && c >= cl.col && c < cl.col + cl.length);
    const hasDown = puzzle.clues.some(cl => cl.direction === "down" && cl.col === c && r >= cl.row && r < cl.row + cl.length);
    if (hasAcross && !hasDown) return "across";
    if (hasDown && !hasAcross) return "down";
    return currentDir;
  };

  const handleCellClick = (r: number, c: number) => {
    if (!cells[r]?.[c]) return;
    // Toggle direction if clicking same cell
    let newDir: "across" | "down" = "across";
    if (focus?.r === r && focus?.c === c) {
      newDir = focus.dir === "across" ? "down" : "across";
    } else {
      newDir = getDirectionForCell(r, c, focus?.dir ?? "across");
    }
    setFocus({ r, c, dir: newDir });
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  // Advance focus to next cell in current direction
  const advanceFocus = (r: number, c: number, dir: "across" | "down") => {
    if (!cells.length) return;
    const nr = dir === "down" ? r + 1 : r;
    const nc = dir === "across" ? c + 1 : c;
    if (nr < cells.length && nc < cells[0].length && cells[nr]?.[nc] !== null) {
      setFocus({ r: nr, c: nc, dir });
    }
  };

  const retreatFocus = (r: number, c: number, dir: "across" | "down") => {
    const nr = dir === "down" ? r - 1 : r;
    const nc = dir === "across" ? c - 1 : c;
    if (nr >= 0 && nc >= 0 && cells[nr]?.[nc] !== null) {
      setFocus({ r: nr, c: nc, dir });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!focus || isFinished) return;
    const { r, c, dir } = focus;

    if (e.key === "Backspace") {
      e.preventDefault();
      setCells(prev => {
        const next = prev.map(row => row.map(cell => cell ? { ...cell } : null));
        if (next[r]?.[c]) {
          if ((next[r][c] as CellState).value === "") {
            retreatFocus(r, c, dir);
          } else {
            (next[r][c] as CellState).value = "";
            (next[r][c] as CellState).isCorrect = null;
          }
        }
        return next;
      });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setFocus(f => f ? { ...f, dir: "across" } : f);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocus(f => f ? { ...f, dir: "down" } : f);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      retreatFocus(r, c, "across");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      retreatFocus(r, c, "down");
    } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      setCells(prev => {
        const next = prev.map(row => row.map(cell => cell ? { ...cell } : null));
        if (next[r]?.[c]) {
          (next[r][c] as CellState).value = e.key.toUpperCase();
          (next[r][c] as CellState).isCorrect = null;
        }
        return next;
      });
      advanceFocus(r, c, dir);
    }
  };

  const checkAnswers = () => {
    if (!puzzle) return;
    let correctCells = 0;
    let totalCells = 0;

    const next = cells.map((row, r) => row.map((cell, c) => {
      if (cell === null) return null;
      const expected = puzzle.grid[r][c];
      totalCells++;
      const isCorrect = cell.value.toUpperCase() === (expected ?? "").toUpperCase() && cell.value !== "";
      if (isCorrect) correctCells++;
      return { ...cell, isCorrect };
    }));

    setCells(next);
    setChecked(true);

    const finalScore = totalCells > 0 ? Math.round((correctCells / totalCells) * 100) : 0;
    setScore(finalScore);
    setIsFinished(true);

    createSession.mutate({
      data: {
        gameType: "crossword", level,
        score: finalScore,
        totalQuestions: totalCells,
        correctAnswers: correctCells,
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
              <SelectTrigger className="w-full h-14 rounded-xl text-lg font-bold" data-testid="select-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map(l => <SelectItem key={l} value={l} className="font-bold">{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={startGame} size="lg" className="w-full h-14 rounded-xl text-lg font-black bg-purple-500 hover:bg-purple-600 text-white" data-testid="button-start">
            Boshlash
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !puzzle || cells.length === 0) {
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
          <h2 className="text-4xl font-black">Natija</h2>
          <div className="text-6xl font-black text-primary">{score}%</div>
          <p className="text-xl font-medium text-muted-foreground">Krossvordni yakunladingiz!</p>
          <div className="flex gap-4">
            <Button onClick={() => setIsPlaying(false)} variant="outline" className="flex-1 h-14 rounded-xl font-bold">Chiqish</Button>
            <Button onClick={startGame} className="flex-1 h-14 rounded-xl font-bold bg-purple-500 hover:bg-purple-600 text-white">
              <RotateCcw className="mr-2 w-5 h-5" /> Qayta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Highlight cells in current word
  const highlightedCells = new Set<string>();
  if (focus && puzzle) {
    const clue = puzzle.clues.find(cl =>
      cl.direction === focus.dir &&
      (focus.dir === "across" ? cl.row === focus.r && focus.c >= cl.col && focus.c < cl.col + cl.length
        : cl.col === focus.c && focus.r >= cl.row && focus.r < cl.row + cl.length)
    );
    if (clue) {
      for (let i = 0; i < clue.length; i++) {
        if (clue.direction === "across") highlightedCells.add(`${clue.row}-${clue.col + i}`);
        else highlightedCells.add(`${clue.row + i}-${clue.col}`);
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-4 md:mt-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsPlaying(false)} data-testid="button-exit">
          <X className="w-5 h-5" />
        </Button>
        <div className="font-bold text-lg text-muted-foreground">Krossvord ({level})</div>
        <Button onClick={checkAnswers} className="rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white border-0" data-testid="button-check">
          <CheckCircle2 className="w-4 h-4 mr-2" /> Tekshirish
        </Button>
      </div>

      {/* Hidden input for keyboard capture */}
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute w-0 h-0 pointer-events-none"
        onKeyDown={handleKeyDown}
        onChange={() => {}}
        value=""
        readOnly
        autoComplete="off"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 overflow-auto">
          <div
            className="inline-grid gap-0.5 bg-gray-800 p-1 rounded-xl mx-auto"
            style={{ gridTemplateColumns: `repeat(${cells[0]?.length ?? 1}, minmax(0, 1fr))`, width: "max-content" }}
          >
            {cells.map((row, r) =>
              row.map((cell, c) => {
                if (cell === null) {
                  return <div key={`${r}-${c}`} className="w-9 h-9 md:w-11 md:h-11 bg-gray-800" />;
                }
                const isFocused = focus?.r === r && focus?.c === c;
                const isHighlighted = highlightedCells.has(`${r}-${c}`);
                const clueNum = puzzle.clues.find(cl => cl.row === r && cl.col === c)?.number;
                let bgClass = "bg-white dark:bg-zinc-100";
                if (isFocused) bgClass = "bg-yellow-300 dark:bg-yellow-400";
                else if (isHighlighted) bgClass = "bg-blue-100 dark:bg-blue-200";
                if (checked && cell.isCorrect === true) bgClass = "bg-green-200 dark:bg-green-300";
                if (checked && cell.isCorrect === false && cell.value !== "") bgClass = "bg-red-200 dark:bg-red-300";

                return (
                  <div
                    key={`${r}-${c}`}
                    className={cn("w-9 h-9 md:w-11 md:h-11 flex items-center justify-center relative cursor-pointer select-none border border-gray-300 dark:border-gray-600", bgClass)}
                    onClick={() => handleCellClick(r, c)}
                    data-testid={`cell-${r}-${c}`}
                  >
                    {clueNum && (
                      <span className="absolute top-0 left-0.5 text-[8px] font-bold text-gray-600 dark:text-gray-800 leading-none">{clueNum}</span>
                    )}
                    <span className="text-sm md:text-base font-black text-gray-900 dark:text-gray-900">{cell.value}</span>
                  </div>
                );
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">Katakni bosing, so'ng klaviaturadan yozing</p>
        </div>

        <div className="space-y-5 bg-card border border-border/50 rounded-2xl p-5 shadow-sm max-h-[60vh] overflow-y-auto">
          <div>
            <h3 className="font-black text-base mb-2 flex items-center gap-1">
              <ArrowRight className="w-4 h-4" /> Yotiqiga
            </h3>
            <ul className="space-y-1.5">
              {puzzle.clues.filter(cl => cl.direction === "across").map(clue => (
                <li
                  key={`a-${clue.number}`}
                  className={cn("text-sm cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-muted",
                    focus?.dir === "across" && highlightedCells.has(`${clue.row}-${clue.col}`) && "bg-blue-100 dark:bg-blue-900/30 font-bold"
                  )}
                  onClick={() => { setFocus({ r: clue.row, c: clue.col, dir: "across" }); setTimeout(() => inputRef.current?.focus(), 10); }}
                >
                  <span className="font-bold mr-1">{clue.number}.</span>{clue.clue}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-black text-base mb-2 flex items-center gap-1">
              <ArrowRight className="w-4 h-4 rotate-90" /> Tikkasiga
            </h3>
            <ul className="space-y-1.5">
              {puzzle.clues.filter(cl => cl.direction === "down").map(clue => (
                <li
                  key={`d-${clue.number}`}
                  className={cn("text-sm cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-muted",
                    focus?.dir === "down" && highlightedCells.has(`${clue.row}-${clue.col}`) && "bg-blue-100 dark:bg-blue-900/30 font-bold"
                  )}
                  onClick={() => { setFocus({ r: clue.row, c: clue.col, dir: "down" }); setTimeout(() => inputRef.current?.focus(), 10); }}
                >
                  <span className="font-bold mr-1">{clue.number}.</span>{clue.clue}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
