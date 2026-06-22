import { useGetStatsSummary, useGetLevelStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flame, BookOpen, Star, Zap, Heart, Target, Crown } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const ACHIEVEMENTS = [
  { id: "first_word", icon: "📖", title: "Birinchi so'z", desc: "Birinchi so'zni o'rgandingiz", condition: (s: { learnedWords: number }) => s.learnedWords >= 1 },
  { id: "ten_words", icon: "🎯", title: "10 so'z", desc: "10 ta so'zni o'rgandingiz", condition: (s: { learnedWords: number }) => s.learnedWords >= 10 },
  { id: "fifty_words", icon: "🌟", title: "50 so'z", desc: "50 ta so'zni o'rgandingiz", condition: (s: { learnedWords: number }) => s.learnedWords >= 50 },
  { id: "hundred_words", icon: "💯", title: "100 so'z", desc: "100 ta so'zni o'rgandingiz", condition: (s: { learnedWords: number }) => s.learnedWords >= 100 },
  { id: "first_game", icon: "🎮", title: "O'yinchi", desc: "Birinchi o'yinni o'ynading", condition: (s: { totalSessions: number }) => s.totalSessions >= 1 },
  { id: "ten_games", icon: "🏆", title: "Tajribali", desc: "10 ta o'yin sessiyasi", condition: (s: { totalSessions: number }) => s.totalSessions >= 10 },
  { id: "streak_3", icon: "🔥", title: "Seriyachi", desc: "3 kun ketma-ket", condition: (s: { streakDays: number }) => s.streakDays >= 3 },
  { id: "coins_100", icon: "🪙", title: "Boylik", desc: "100 ta tanga yig'ding", condition: (s: { totalCoins?: number }) => (s.totalCoins ?? 0) >= 100 },
];

export default function Profile() {
  const { data: stats, isLoading } = useGetStatsSummary();
  const { data: levelStats } = useGetLevelStats();

  const initials = "WB";
  const totalLevel = levelStats
    ? levelStats.find((l) => l.percentage < 100)?.level ?? "C2"
    : "A1";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-black tracking-tight">Profil</h1>
        <p className="text-muted-foreground mt-2 text-lg">Yutuqlaringiz va taraqqiyotingiz</p>
      </header>

      <Card className="rounded-3xl border-none bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-3xl font-black text-primary-foreground shadow-lg">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center text-sm font-black">
                {totalLevel}
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-black">O'quvchi</h2>
              <p className="text-muted-foreground font-medium mt-1">Ingliz tili o'rganuvchi</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
                <div className="flex items-center gap-1.5 text-orange-500 font-bold">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm">{stats?.streakDays ?? 0} kun</span>
                </div>
                <div className="flex items-center gap-1.5 text-yellow-500 font-bold">
                  <span className="text-sm">🪙 {stats?.totalCoins ?? 0} tanga</span>
                </div>
                <div className="flex items-center gap-1.5 text-primary font-bold">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm">{stats?.totalXp ?? 0} XP</span>
                </div>
              </div>
            </div>
            <Link href="/premium">
              <Button className="rounded-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:opacity-90">
                <Crown className="mr-2 w-4 h-4" />
                Premium
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: "O'rganildi", value: stats?.learnedWords ?? 0, suffix: "so'z", color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Star, label: "Sevimlilar", value: stats?.favoriteWords ?? 0, suffix: "so'z", color: "text-red-500", bg: "bg-red-500/10" },
          { icon: Zap, label: "Sessiyalar", value: stats?.totalSessions ?? 0, suffix: "ta", color: "text-violet-500", bg: "bg-violet-500/10" },
          { icon: Target, label: "O'rtacha ball", value: Math.round(stats?.averageScore ?? 0), suffix: "%", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        ].map((item) => (
          <Card key={item.label} className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <div className={`text-3xl font-black ${item.color}`}>
                  {item.value}<span className="text-lg font-medium text-muted-foreground ml-1">{item.suffix}</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground font-medium mt-0.5">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {levelStats && (
        <Card className="rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-secondary" />
              CEFR darajalari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {levelStats.map((level) => (
              <div key={level.level}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-bold w-10 justify-center">{level.level}</Badge>
                    <span className="text-sm text-muted-foreground">{level.learnedWords} / {level.totalWords}</span>
                  </div>
                  <span className="font-bold text-sm">{level.percentage}%</span>
                </div>
                <Progress value={level.percentage} className="h-2 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Yutuqlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((ach) => {
              const earned = stats ? ach.condition(stats as { learnedWords: number; totalSessions: number; streakDays: number; totalCoins?: number }) : false;
              return (
                <div
                  key={ach.id}
                  className={`p-4 rounded-2xl text-center transition-all ${
                    earned ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-muted/30 opacity-50"
                  }`}
                >
                  <div className="text-3xl mb-2">{earned ? ach.icon : "🔒"}</div>
                  <div className="font-bold text-sm">{ach.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{ach.desc}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
