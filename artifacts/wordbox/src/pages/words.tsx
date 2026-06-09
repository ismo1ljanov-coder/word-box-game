import { useState } from "react";
import { useListWords, useMarkWordProgress } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Volume2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { ListWordsLevel } from "@workspace/api-client-react";

const LEVELS = ["Barchasi", "A1", "A2", "B1", "B2", "C1", "C2"];

export default function Words() {
  const [activeTab, setActiveTab] = useState("Barchasi");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const levelParam = activeTab === "Barchasi" ? undefined : (activeTab as ListWordsLevel);
  const searchParam = searchQuery.trim() !== "" ? searchQuery : undefined;

  const { data: words, isLoading } = useListWords({ level: levelParam, search: searchParam });
  const markProgress = useMarkWordProgress();

  const handleMarkLearned = (wordId: number) => {
    markProgress.mutate(
      { id: wordId, data: { correct: true } },
      {
        onSuccess: () => {
          toast({
            title: "Ajoyib!",
            description: "So'z o'rganilgan deb belgilandi.",
          });
        },
      }
    );
  };

  const playAudio = (text: string) => {
    // Basic text-to-speech fallback
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

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
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
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-5">
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32 mb-4" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))
        ) : words?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            So'zlar topilmadi
          </div>
        ) : (
          words?.map((word) => (
            <Card key={word.id} className="rounded-2xl border-border/50 hover-elevate transition-all group overflow-hidden flex flex-col h-full">
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight">{word.word}</h3>
                    <p className="text-muted-foreground font-medium text-lg mt-1">{word.translation}</p>
                  </div>
                  <Badge variant="secondary" className="font-bold bg-secondary/10 text-secondary rounded-lg">
                    {word.level}
                  </Badge>
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
                      variant="default" 
                      className="w-full rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-0"
                      onClick={() => handleMarkLearned(word.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      O'rgandim
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
