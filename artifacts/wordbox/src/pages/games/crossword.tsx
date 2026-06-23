import { useState, useEffect, useRef, useCallback } from "react";
import { useGetCrosswordPuzzle, useCreateGameSession, getGetCrosswordPuzzleQueryKey } from "@workspace/api-client-react";
import type { GameSessionLevel } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, ArrowRight, RotateCcw, X, Grid3X3, CheckCircle2, Lightbulb, Coins, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as GameSessionLevel[];
const HINT_COST = 15;

const KB_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", "⌫"],
];

type CellState = { value: string; isCorrect: boolean | null };

export default function CrosswordGame() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [level, setLevel] = useState<GameSessionLevel>("A1");
  const [isPlaying, setIsPlaying] = useState(false);
  const [cells, setCells] = useState<(CellState | null)[][]>([]);
  const [focus, setFocus] = useState<{ r: number; c: number; dir: "across" | "down" } | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [checked, setChecked] = useState(false);
  const [localCoins, setLocalCoins] = useState(user?.totalCoins ?? 0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: puzzle, isLoading, isError, refetch } = useGetCrosswordPuzzle(
    { level },
    { query: { enabled: false, queryKey: getGetCrosswordPuzzleQueryKey({ level }) } }
  );

  const createSession = useCreateGameSession();

  useEffect(() => {
    setLocalCoins(user?.totalCoins ?? 0);
  }, [user?.totalCoins]);

  useEffect(() => {
    if (puzzle && puzzle.grid.length > 0) {
      setCells(puzzle.grid.map(row => row.map(cell => cell === null ? null : { value: "", isCorrect: null })));
      setFocus(null);
      setChecked(false);
    }
  }, [puzzle]);

  // Focus the hidden input when cell focus changes (desktop keyboard)
  useEffect(() => {
    if (focus) {
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [focus]);

  const startGame = () => {
    setIsPlaying(true);
    setIsFinished(false);
    setFocus(null);
    setScore(0);
    setChecked(false);
    setCells([]);
    refetch();
  };

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
    let newDir: "across" | "down" = "across";
    if (focus?.r === r && focus?.c === c) {
      newDir = focus.dir === "across" ? "down" : "across";
    } else {
      newDir = getDirectionForCell(r, c, focus?.dir ?? "across");
    }
    setFocus({ r, c, dir: newDir });
  };

  const advanceFocus = useCallback((r: number, c: number, dir: "across" | "down") => {
    if (!cells.length) return;
    const nr = dir === "down" ? r + 1 : r;
    const nc = dir === "across" ? c + 1 : c;
    if (nr < cells.length && nc < (cells[0]?.length ?? 0) && cells[nr]?.[nc] !== null) {
      setFocus({ r: nr, c: nc, dir });
    }
  }, [cells]);

  const retreatFocus = useCallback((r: number, c: number, dir: "across" | "down") => {
    const nr = dir === "down" ? r - 1 : r;
    const nc = dir === "across" ? c - 1 : c;
    if (nr >= 0 && nc >= 0 && cells[nr]?.[nc] !== null) {
      setFocus({ r: nr, c: nc, dir });
    }
  }, [cells]);

  const processKey = useCallback((key: string) => {
    if (!focus || isFinished) return;
    const { r, c, dir } = focus;

    if (key === "Backspace" || key === "⌫") {
      setCells(prev => {
        const next = prev.map(row => row.map(cell => cell ? { ...cell } : null));
        const cell = next[r]?.[c] as CellState | null | undefined;
        if (cell) {
          if (cell.value === "") {
            retreatFocus(r, c, dir);
          } else {
            cell.value = "";
            cell.isCorrect = null;
          }
        }
        return next;
      });
    } else if (key === "ArrowRight") {
      setFocus(f => f ? { ...f, dir: "across" } : f);
    } else if (key === "ArrowDown") {
      setFocus(f => f ? { ...f, dir: "down" } : f);
    } else if (key === "ArrowLeft") {
      retreatFocus(r, c, "across");
    } else if (key === "ArrowUp") {
      retreatFocus(r, c, "down");
    } else if (key.length === 1 && /[a-zA-Z]/.test(key)) {
      setCells(prev => {
        const next = prev.map(row => row.map(cell => cell ? { ...cell } : null));
        const cell = next[r]?.[c] as CellState | null | undefined;
        if (cell) {
          cell.value = key.toUpperCase();
          cell.isCorrect = null;
        }
        return next;
      });
      advanceFocus(r, c, dir);
    }
  }, [focus, isFinished, retreatFocus, advanceFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const handled = ["Backspace", "ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (handled.includes(e.key) || (e.key.length === 1 && /[a-zA-Z]/.test(e.key))) {
      e.preventDefault();
      processKey(e.key);
    }
  };

  // Handle mobile text input via onChange
  const handleMobileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      processKey(val.slice(-1));
      e.target.value = "";
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
      data: { gameType: "crossword", level, score: finalScore, totalQuestions: totalCells, correctAnswers: correctCells },
    });
  };

  const handleHint = async () => {
    if (!focus || !puzzle || isFinished) return;

    const clue = puzzle.clues.find(cl =>
      cl.direction === focus.dir &&
      (focus.dir === "across"
        ? cl.row === focus.r && focus.c >= cl.col && focus.c < cl.col + cl.length
        : cl.col === focus.c && focus.r >= cl.row && focus.r < cl.row + cl.length)
    );
    if (!clue) {
      toast({ title: "Avval so'z tanlang", description: "Katakni bosing, so'ng maslahat so'rang" });
      return;
    }

    if (localCoins < HINT_COST) {
      toast({ title: "Tangalar yetarli emas", description: `Maslahat uchun ${HINT_COST} tanga kerak`, variant: "destructive" });
      return;
    }

    // Find first incorrect/empty cell in focused word
    let hintR = -1, hintC = -1;
    for (let i = 0; i < clue.length; i++) {
      const r = clue.direction === "across" ? clue.row : clue.row + i;
      const c = clue.direction === "across" ? clue.col + i : clue.col;
      const cell = cells[r]?.[c];
      const expected = puzzle.grid[r]?.[c] ?? "";
      if (cell && cell.value.toUpperCase() !== expected.toUpperCase()) {
        hintR = r; hintC = c;
        break;
      }
    }
    if (hintR === -1) {
      toast({ title: "Bu so'z allaqachon to'g'ri!", description: "Boshqa so'zni tanlang" });
      return;
    }

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

      const expected = puzzle.grid[hintR]?.[hintC] ?? "";
      setCells(prev => {
        const next = prev.map(row => row.map(cell => cell ? { ...cell } : null));
        const cell = next[hintR]?.[hintC] as CellState | null | undefined;
        if (cell) {
          cell.value = expected.toUpperCase();
          cell.isCorrect = null;
        }
        return next;
      });
      setFocus({ r: hintR, c: hintC, dir: focus.dir });
      toast({ title: "Maslahat", description: `"${expected.toUpperCase()}" harfi ochildi`, duration: 1500 });
    } catch {
      toast({ title: "Server bilan aloqa yo'q", variant: "destructive" });
    }
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
    <div className="max-w-4xl mx-auto space-y-4 mt-4 md:mt-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setIsPlaying(false)} data-testid="button-exit">
          <X className="w-5 h-5" />
        </Button>
        <div className="font-bold text-base text-muted-foreground truncate">Krossvord ({level})</div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full whitespace-nowrap">
            <Coins className="w-3.5 h-3.5" /> {localCoins}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-bold text-amber-600 border-amber-500/30 hover:bg-amber-500/10 shrink-0"
            onClick={handleHint}
            disabled={!focus || localCoins < HINT_COST}
          >
            <Lightbulb className="w-4 h-4 mr-1" /> {HINT_COST}🪙
          </Button>
          <Button onClick={checkAnswers} className="rounded-xl font-bold bg-green-500 hover:bg-green-600 text-white border-0 shrink-0" data-testid="button-check">
            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Tekshirish
          </Button>
        </div>
      </div>

      {/* Hidden input — captures physical keyboard; also works on Android via onChange */}
      <input
        ref={inputRef}
        type="text"
        inputMode="text"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="fixed -top-20 left-0 w-px h-px opacity-0 pointer-events-none"
        onKeyDown={handleKeyDown}
        onChange={handleMobileInput}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Grid */}
        <div className="lg:col-span-2 overflow-auto">
          <div
            className="inline-grid gap-0.5 bg-gray-800 p-1 rounded-xl"
            style={{ gridTemplateColumns: `repeat(${cells[0]?.length ?? 1}, minmax(0, 1fr))`, width: "max-content" }}
          >
            {cells.map((row, r) =>
              row.map((cell, c) => {
                if (cell === null) {
                  return <div key={`${r}-${c}`} className="w-9 h-9 md:w-10 md:h-10 bg-gray-800" />;
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
                    className={cn("w-9 h-9 md:w-10 md:h-10 flex items-center justify-center relative cursor-pointer select-none border border-gray-300 dark:border-gray-600 touch-manipulation", bgClass)}
                    onClick={() => handleCellClick(r, c)}
                    data-testid={`cell-${r}-${c}`}
                  >
                    {clueNum && (
                      <span className="absolute top-0 left-0.5 text-[7px] font-bold text-gray-600 dark:text-gray-800 leading-none">{clueNum}</span>
                    )}
                    <span className="text-sm md:text-base font-black text-gray-900 dark:text-gray-900">{cell.value}</span>
                  </div>
                );
              })
            )}
          </div>

          {/* On-screen keyboard — shown on all screens (physical keyboard also works) */}
          {focus && (
            <div className="mt-4 select-none">
              {KB_ROWS.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-1 mb-1">
                  {row.map(key => (
                    <button
                      key={key}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => processKey(key === "⌫" ? "Backspace" : key)}
                      className={cn(
                        "h-10 rounded-lg font-bold text-sm shadow-sm border border-border transition-colors active:scale-95 active:bg-muted touch-manipulation",
                        key === "⌫"
                          ? "px-3 bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20"
                          : "min-w-[30px] px-2 bg-card hover:bg-muted"
                      )}
                    >
                      {key === "⌫" ? <Delete className="w-4 h-4" /> : key}
                    </button>
                  ))}
                </div>
              ))}
              <p className="text-center text-xs text-muted-foreground mt-1">
                Yoki klaviaturadan yozing • Katakni bosib yo'nalishni almashtiring
              </p>
            </div>
          )}
        </div>

        {/* Clues panel */}
        <div className="space-y-5 bg-card border border-border/50 rounded-2xl p-5 shadow-sm max-h-[50vh] lg:max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="font-black text-base mb-2 flex items-center gap-1">
              <ArrowRight className="w-4 h-4" /> Yotiqiga
            </h3>
            <ul className="space-y-1.5">
              {puzzle.clues.filter(cl => cl.direction === "across").map(clue => (
                <li
                  key={`a-${clue.number}`}
                  className={cn("text-sm cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-muted touch-manipulation",
                    focus?.dir === "across" && highlightedCells.has(`${clue.row}-${clue.col}`) && "bg-blue-100 dark:bg-blue-900/30 font-bold"
                  )}
                  onClick={() => {
                    setFocus({ r: clue.row, c: clue.col, dir: "across" });
                    setTimeout(() => inputRef.current?.focus(), 10);
                  }}
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
                  className={cn("text-sm cursor-pointer rounded-lg px-2 py-1 transition-colors hover:bg-muted touch-manipulation",
                    focus?.dir === "down" && highlightedCells.has(`${clue.row}-${clue.col}`) && "bg-blue-100 dark:bg-blue-900/30 font-bold"
                  )}
                  onClick={() => {
                    setFocus({ r: clue.row, c: clue.col, dir: "down" });
                    setTimeout(() => inputRef.current?.focus(), 10);
                  }}
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
