import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Brain, Grid3X3, Layers, Layers3, SpellCheck2, Play, Swords, Shuffle, Zap, Target, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useGetDailyChallenge, useGetWeeklyChallenge, useGetMonthlyChallenge, useCompleteChallenge } from "@workspace/api-client-react";
import type { ChallengeProgress } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const GAMES = [
  {
    id: "quiz",
    title: "Test",
    description: "To'g'ri tarjimani tanlang",
    icon: Brain,
    color: "bg-blue-500",
    lightColor: "bg-blue-500/10",
    textColor: "text-blue-500",
    tags: ["Tezkor", "Xotira"],
    isNew: false,
  },
  {
    id: "speed-quiz",
    title: "Tezkor test",
    description: "Har savolga 10 soniya — bosim ostida o'yna!",
    icon: Zap,
    color: "bg-yellow-500",
    lightColor: "bg-yellow-500/10",
    textColor: "text-yellow-600",
    tags: ["Tezlik", "Bosim"],
    isNew: true,
  },
  {
    id: "anagram",
    title: "Anagram",
    description: "Aralashtirilgan harflardan so'z tuz",
    icon: Shuffle,
    color: "bg-indigo-500",
    lightColor: "bg-indigo-500/10",
    textColor: "text-indigo-500",
    tags: ["Qiziqarli", "Mantiq"],
    isNew: true,
  },
  {
    id: "crossword",
    title: "Krossvord",
    description: "So'zlarni kataklarga yozing",
    icon: Grid3X3,
    color: "bg-purple-500",
    lightColor: "bg-purple-500/10",
    textColor: "text-purple-500",
    tags: ["Qiziqarli", "Imlo"],
    isNew: false,
  },
  {
    id: "flashcard",
    title: "Flesh kartalar",
    description: "So'zlarni yodlash uchun kartalar",
    icon: Layers,
    color: "bg-orange-500",
    lightColor: "bg-orange-500/10",
    textColor: "text-orange-500",
    tags: ["Yodlash", "Takrorlash"],
    isNew: false,
  },
  {
    id: "matching",
    title: "Moslashtirish",
    description: "So'z va tarjimani juftlang",
    icon: Layers3,
    color: "bg-green-500",
    lightColor: "bg-green-500/10",
    textColor: "text-green-500",
    tags: ["Mantiq", "Tezlik"],
    isNew: false,
  },
  {
    id: "spelling",
    title: "Imlo",
    description: "So'zlarni to'g'ri yozishni mashq qiling",
    icon: SpellCheck2,
    color: "bg-red-500",
    lightColor: "bg-red-500/10",
    textColor: "text-red-500",
    tags: ["Yozish", "Qiyin"],
    isNew: false,
  },
];

function ChallengeCard({ challenge, type }: { challenge: ChallengeProgress; type: "daily" | "weekly" | "monthly" }) {
  const { mutateAsync: claimReward, isPending } = useCompleteChallenge();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!challenge) return null;

  const pct = Math.round((challenge.progress / challenge.target) * 100);

  const handleClaim = async () => {
    try {
      const result = await claimReward({ challengeId: type });
      if (result.alreadyClaimed) {
        toast({ title: "Avval olingan", description: "Bu mukofot allaqachon olindi" });
      } else {
        toast({ title: `+${result.coinsEarned} 🪙  +${result.xpEarned} XP`, description: "Mukofot olindi!" });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/summary"] });
        queryClient.invalidateQueries({ queryKey: [`/api/challenges/${type}`] });
      }
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-muted/40 border border-border/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm">{challenge.title}</span>
            {challenge.completed && !challenge.rewardClaimed && (
              <Badge className="bg-emerald-500 text-white border-0 text-xs shrink-0">✓ Tayyor!</Badge>
            )}
            {challenge.rewardClaimed && (
              <Badge variant="outline" className="text-xs shrink-0">✓ Olindi</Badge>
            )}
          </div>
          <Progress value={pct} className="h-1.5 rounded-full mb-1" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{challenge.progress} / {challenge.target}</span>
            <span>🪙 +{challenge.reward.coins} · ⚡ +{challenge.reward.xp}</span>
          </div>
        </div>
        {challenge.completed && !challenge.rewardClaimed && (
          <Button
            size="sm"
            className="rounded-xl shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-xs"
            onClick={handleClaim}
            disabled={isPending}
          >
            {isPending ? "..." : "Ol"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function GamesHub() {
  const { data: daily } = useGetDailyChallenge();
  const { data: weekly } = useGetWeeklyChallenge();
  const { data: monthly } = useGetMonthlyChallenge();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-black tracking-tight">O'yinlar</h1>
        <p className="text-muted-foreground mt-2 text-lg">O'ynab o'rganing! O'zingizga yoqqan usulni tanlang.</p>
      </header>

      <Link href="/games/daily-challenge">
        <Card className="rounded-3xl border-none cursor-pointer hover-elevate transition-all overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Swords className="w-8 h-8 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-black">Kunlik musobaqa</h3>
                    <Badge className="bg-white/20 text-white border-0 font-bold">+50 tanga</Badge>
                  </div>
                  <p className="text-white/80 font-medium">Bugungi 10 ta so'zni o'rganing va mukofot oling</p>
                </div>
              </div>
              <Button className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-xl font-bold px-6 hidden md:flex">
                Boshlash <Play className="ml-2 w-4 h-4 fill-current" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>

      {(daily || weekly || monthly) && (
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-bold text-lg mb-4">
              <Target className="w-5 h-5 text-secondary" />
              Maqsadlar
            </div>
            {daily && <ChallengeCard challenge={daily} type="daily" />}
            {weekly && <ChallengeCard challenge={weekly} type="weekly" />}
            {monthly && <ChallengeCard challenge={monthly} type="monthly" />}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GAMES.map((game) => (
          <Link key={game.id} href={`/games/${game.id}`}>
            <Card className="rounded-3xl border-border/50 hover-elevate transition-all group cursor-pointer overflow-hidden game-card h-full">
              <CardContent className="p-0">
                <div className={`${game.lightColor} p-8 flex justify-center items-center relative overflow-hidden`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 ${game.color} opacity-10 rounded-full blur-2xl -mr-10 -mt-10`} />
                  {game.isNew && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-emerald-500 text-white border-0 font-bold text-xs">Yangi</Badge>
                    </div>
                  )}
                  <game.icon className={`w-20 h-20 ${game.textColor} transform group-hover:scale-110 transition-transform duration-300`} />
                </div>
                <div className="p-6">
                  <div className="flex gap-2 mb-3">
                    {game.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="rounded-md font-bold text-xs bg-muted">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight mb-2">{game.title}</h3>
                  <p className="text-muted-foreground font-medium mb-6">{game.description}</p>
                  <div className={`flex items-center gap-2 font-bold ${game.textColor}`}>
                    O'ynash <Play className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
