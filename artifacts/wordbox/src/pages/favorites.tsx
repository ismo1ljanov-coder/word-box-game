import { useListWords, useToggleFavorite } from "@workspace/api-client-react";
import type { WordWithProgress } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Volume2, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function Favorites() {
  const { data: favoritesData, isLoading, refetch } = useListWords({ favoritesOnly: true });
  const favorites = (favoritesData as unknown as { items: WordWithProgress[] } | undefined)?.items;
  const toggleFavorite = useToggleFavorite();

  const handleRemoveFavorite = (wordId: number) => {
    toggleFavorite.mutate({ wordId }, { onSuccess: () => refetch() });
  };

  const playAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Sevimlilar</h1>
        </div>
        <p className="text-muted-foreground text-lg">Saqlab qo'ygan so'zlaringiz</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-5">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !favorites || favorites.length === 0 ? (
        <div className="py-16 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Heart className="w-10 h-10 text-red-500/50" />
          </div>
          <h3 className="text-xl font-bold">Hali sevimli so'zlar yo'q</h3>
          <p className="text-muted-foreground">Lug'atdan so'zlarni yurak belgisi bilan saqlang</p>
          <Link href="/words">
            <Button className="rounded-xl font-bold mt-2">
              <BookOpen className="mr-2 w-4 h-4" />
              Lug'atga o'tish
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground font-medium">{favorites.length} ta sevimli so'z</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(favorites as WordWithProgress[]).map((word) => (
              <Card
                key={word.id}
                className={cn(
                  "rounded-2xl border-red-500/20 hover-elevate transition-all overflow-hidden flex flex-col h-full",
                  word.learned && "bg-emerald-500/5 border-emerald-500/20"
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
                      {word.learned && (
                        <Badge className="font-bold bg-emerald-500/20 text-emerald-600 rounded-lg border-0 text-xs">
                          O'rganildi
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 space-y-3">
                    {word.exampleSentence && (
                      <div className="bg-muted/30 p-3 rounded-xl text-sm">
                        <p className="font-medium italic">"{word.exampleSentence}"</p>
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
                        className="rounded-xl flex-shrink-0 text-red-500 border-red-500/30 bg-red-500/5 hover:bg-red-500 hover:text-white"
                        onClick={() => handleRemoveFavorite(word.id)}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
