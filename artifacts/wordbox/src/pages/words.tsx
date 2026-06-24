import { useState } from "react";
import { useListWords, useMarkWordProgress, useToggleFavorite } from "@workspace/api-client-react";
import type { WordWithProgress, ListWordsLevel } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Volume2, CheckCircle2, Heart, ChevronLeft, ChevronRight, BookOpen, GraduationCap, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LEVELS = ["Barchasi", "A1", "A2", "B1", "B2", "C1", "C2"];
const PAGE_SIZE = 50;

type Section = "lugat" | "yodlangan";

export default function Words() {
  const [section, setSection] = useState<Section>("lugat");
  const [activeTab, setActiveTab] = useState("Barchasi");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const levelParam = activeTab === "Barchasi" ? undefined : (activeTab as ListWordsLevel);
  const searchParam = searchQuery.trim() !== "" ? searchQuery : undefined;

  const learnedOnly = section === "yodlangan" ? true : false;

  const { data, isLoading } = useListWords({
    level: levelParam,
    search: searchParam,
    learnedOnly,
    page,
    pageSize: PAGE_SIZE,
  });

  const wordListData = data as unknown as { items: WordWithProgress[]; total: number; page: number; pageSize: number } | undefined;
  const words: WordWithProgress[] = wordListData?.items ?? [];
  const total = wordListData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const markProgress = useMarkWordProgress();
  const toggleFavorite = useToggleFavorite();

  const handleSectionChange = (val: Section) => {
    setSection(val);
    setPage(1);
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setPage(1);
  };

  const handleMarkLearned = (wordId: number) => {
    markProgress.mutate(
      { wordId, data: { correct: true } },
      {
        onSuccess: () => {
          toast({ title: "Ajoyib! 🎉", description: "So'z yodlangan bo'limiga o'tkazildi." });
        },
      }
    );
  };

  const handleRelearn = (wordId: number) => {
    markProgress.mutate(
      { wordId, data: { correct: false } },
      {
        onSuccess: () => {
          toast({ title: "Qayta o'rganishga qo'shildi", description: "So'z lug'atga qaytarildi." });
        },
      }
    );
  };

  const handleFavorite = (wordId: number) => {
    toggleFavorite.mutate({ wordId });
  };

  const playAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-black tracking-tight">So'z lug'ati</h1>
        <p className="text-muted-foreground mt-2 text-lg">Yangi so'zlarni o'rganing va takrorlang</p>
      </header>

      {/* Section toggle */}
      <div className="flex gap-3">
        <button
          onClick={() => handleSectionChange("lugat")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all",
            section === "lugat"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <BookOpen className="w-4 h-4" />
          Lug'at
        </button>
        <button
          onClick={() => handleSectionChange("yodlangan")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all",
            section === "yodlangan"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/25"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <GraduationCap className="w-4 h-4" />
          Yodlangan
          {section === "yodlangan" && total > 0 && (
            <span className="ml-1 bg-white/20 rounded-full px-2 py-0.5 text-xs">{total}</span>
          )}
        </button>
      </div>

      {/* Section description */}
      {section === "lugat" && (
        <p className="text-sm text-muted-foreground -mt-4">
          O'rganilmagan so'zlar — "O'rgandim" tugmasini bosing, yodlangandan so'ng u alohida bo'limga o'tadi.
        </p>
      )}
      {section === "yodlangan" && (
        <p className="text-sm text-muted-foreground -mt-4">
          Siz yodlagan so'zlar. Qayta mashq qilish uchun "Qaytarish" tugmasini bosing.
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full md:w-auto">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex flex-wrap md:flex-nowrap">
            {LEVELS.map((lvl) => (
              <TabsTrigger
                key={lvl}
                value={lvl}
                className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2"
              >
                {lvl}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Qidirish..."
            className="pl-9 rounded-xl border-border/50 bg-card h-11"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {!isLoading && total > 0 && (
        <div className="text-sm text-muted-foreground font-medium">
          Jami {total} ta so'z
        </div>
      )}

      {/* Word cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 9 }).map((_, i) => (
              <Card key={i} className="rounded-2xl">
                <CardContent className="p-5">
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))
          : words.length === 0
          ? (
            <div className="col-span-full py-16 text-center">
              {section === "yodlangan" ? (
                <div className="space-y-3">
                  <div className="text-5xl">🎓</div>
                  <p className="text-muted-foreground font-medium">Hali yodlangan so'zlar yo'q</p>
                  <p className="text-sm text-muted-foreground">
                    Lug'atdagi so'zlarni o'rganib, "O'rgandim" tugmasini bosing
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-5xl">📚</div>
                  <p className="text-muted-foreground font-medium">So'zlar topilmadi</p>
                </div>
              )}
            </div>
          )
          : words.map((word) => (
            <Card
              key={word.id}
              className={cn(
                "rounded-2xl border-border/50 hover-elevate transition-all group overflow-hidden flex flex-col h-full",
                section === "yodlangan" && "border-emerald-500/30 bg-emerald-500/5"
              )}
            >
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-2xl font-black text-foreground tracking-tight">{word.word}</h3>
                    <p className="text-muted-foreground font-medium text-lg mt-1">{word.translation}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary" className="font-bold bg-secondary/10 text-secondary rounded-lg">
                      {word.level}
                    </Badge>
                    {section === "yodlangan" && (word.score ?? 0) > 0 && (
                      <Badge className="font-bold bg-emerald-500/20 text-emerald-600 rounded-lg border-0 text-xs">
                        {word.score}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-4 space-y-3">
                  {word.exampleSentence && (
                    <div className="bg-muted/30 p-3 rounded-xl text-sm">
                      <p className="font-medium text-foreground italic">"{word.exampleSentence}"</p>
                      <p className="text-muted-foreground mt-1">{word.exampleTranslation}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl flex-shrink-0"
                      onClick={() => playAudio(word.word)}
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("rounded-xl flex-shrink-0", word.isFavorite ? "text-red-500 border-red-500/30 bg-red-500/5" : "")}
                      onClick={() => handleFavorite(word.id)}
                    >
                      <Heart className={cn("w-4 h-4", word.isFavorite ? "fill-red-500" : "")} />
                    </Button>

                    {section === "yodlangan" ? (
                      <Button
                        variant="outline"
                        className="w-full rounded-xl font-bold text-muted-foreground hover:text-foreground"
                        onClick={() => handleRelearn(word.id)}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Qaytarish
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-0"
                        onClick={() => handleMarkLearned(word.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        O'rgandim
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="font-bold text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
