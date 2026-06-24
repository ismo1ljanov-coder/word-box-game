import { useGetStatsSummary, useGetLevelStats, useGetDueWords } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Trophy, Flame, Target, BookOpen, ArrowRight, Star, Zap, Heart, Brain, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A1: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  A2: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  B1: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20" },
  B2: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  C1: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20" },
  C2: { bg: "bg-yellow-500/10", text: "text-yellow-600 dark:text-yellow-400", border: "border-yellow-500/20" },
};

export default function Dashboard() {
  const { data: stats, isLoading: isStatsLoading } = useGetStatsSummary();
  const { data: levelStats, isLoading: isLevelsLoading } = useGetLevelStats();
  const { data: dueData, isLoading: isDueLoading } = useGetDueWords({ limit: 1 });
  const dueCount = dueData?.total ?? 0;

  const dailyProgress = stats
    ? Math.round(((stats.dailyGoalCompleted ?? 0) / (stats.dailyGoalTarget ?? 20)) * 100)
    : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return "Xayrli tun";
    if (h < 12) return "Xayrli tong";
    if (h < 18) return "Xayrli kun";
    return "Xayrli kech";
  })();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">{greeting}!</h1>
          <p className="text-muted-foreground mt-1 text-lg">Bugun qaysi so'zlarni o'rganamiz?</p>
        </div>
        <div className="flex gap-3">
          <Link href="/games/daily-challenge">
            <Button size="lg" className="rounded-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:opacity-90 border-0 shadow-md">
              <Swords className="mr-2 w-5 h-5" />
              Kunlik musobaqa
            </Button>
          </Link>
          <Link href="/games">
            <Button size="lg" variant="outline" className="rounded-xl font-bold">
              O'yinlar <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600">so'z</Badge>
            </div>
            {isStatsLoading ? (
              <Skeleton className="h-9 w-20 mt-1" />
            ) : (
              <div>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-300">
                  {stats?.learnedWords ?? 0}
                </div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">
                  / {stats?.totalWords ?? 0} O'rganildi
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-orange-500/10 to-orange-600/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-600">seriya</Badge>
            </div>
            {isStatsLoading ? (
              <Skeleton className="h-9 w-16 mt-1" />
            ) : (
              <div>
                <div className="text-3xl font-black text-orange-600 dark:text-orange-300">
                  {stats?.streakDays ?? 0}
                </div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">kun ketma-ket</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-yellow-500/10 to-yellow-600/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">🪙</span>
              <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-600">tanga</Badge>
            </div>
            {isStatsLoading ? (
              <Skeleton className="h-9 w-20 mt-1" />
            ) : (
              <div>
                <div className="text-3xl font-black text-yellow-600 dark:text-yellow-300">
                  {stats?.totalCoins ?? 0}
                </div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">jami tangalar</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <Trophy className="w-5 h-5 text-primary" />
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">XP</Badge>
            </div>
            {isStatsLoading ? (
              <Skeleton className="h-9 w-20 mt-1" />
            ) : (
              <div>
                <div className="text-3xl font-black text-primary">
                  {stats?.totalXp ?? 0}
                </div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">umumiy XP</div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-secondary" />
                Kunlik maqsad
              </CardTitle>
              <span className="text-sm font-bold text-muted-foreground">
                {stats?.dailyGoalCompleted ?? 0}/{stats?.dailyGoalTarget ?? 20}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <div className="space-y-2">
                <Progress value={dailyProgress} className="h-4 rounded-full" />
                <p className="text-sm text-muted-foreground">
                  {dailyProgress >= 100
                    ? "Barakalla! Bugungi maqsadga yetdingiz!"
                    : `Maqsadga yetish uchun yana ${(stats?.dailyGoalTarget ?? 20) - (stats?.dailyGoalCompleted ?? 0)} so'z`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-500" />
              Bu hafta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="flex items-end gap-3">
                <div className="text-4xl font-black text-violet-600 dark:text-violet-400">
                  {stats?.weeklyXp ?? 0}
                </div>
                <div className="text-sm text-muted-foreground mb-1">XP qo'shildi</div>
              </div>
            )}
          </CardContent>
        </Card>

          <Card className={`rounded-2xl border-2 transition-all ${dueCount > 0 ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-orange-500/5" : "border-border/50"}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Brain className={`w-5 h-5 ${dueCount > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
                Bugun takrorlash
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isDueLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="flex items-end justify-between gap-3">
                  <div className="flex items-end gap-3">
                    <div className={`text-4xl font-black ${dueCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                      {dueCount}
                    </div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {dueCount === 0 ? "so'z tayyor" : "ta so'z kutmoqda"}
                    </div>
                  </div>
                  <Link href="/review-schedule">
                    <Button variant="ghost" size="sm" className="text-xs rounded-xl text-muted-foreground hover:text-foreground gap-1 mb-0.5">
                      Jadval <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-black tracking-tight">Darajalar bo'yicha</h2>
          </div>
          <Link href="/stats">
            <Button variant="ghost" size="sm" className="font-bold text-muted-foreground hover:text-foreground rounded-xl">
              Batafsil <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLevelsLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="rounded-xl p-4">
                  <Skeleton className="h-6 w-full mb-4" />
                  <Skeleton className="h-3 w-full" />
                </Card>
              ))
            : levelStats?.map((level) => {
                const colors = LEVEL_COLORS[level.level] ?? LEVEL_COLORS.A1;
                return (
                  <Card
                    key={level.level}
                    className={`rounded-xl border ${colors.border} hover-elevate transition-all overflow-hidden group cursor-pointer`}
                  >
                    <Link href={`/words?level=${level.level}`}>
                      <div className="p-5">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center font-black text-xl ${colors.text}`}>
                              {level.level}
                            </div>
                            <div>
                              <div className="font-bold">Daraja {level.level}</div>
                              <div className="text-sm text-muted-foreground">{level.learnedWords} / {level.totalWords} so'z</div>
                            </div>
                          </div>
                          <div className={`font-black text-xl ${colors.text}`}>{level.percentage}%</div>
                        </div>
                        <Progress value={level.percentage} className="h-2.5 bg-muted/50" />
                      </div>
                    </Link>
                  </Card>
                );
              })}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-5">
          <Heart className="w-6 h-6 text-red-500" />
          <h2 className="text-2xl font-black tracking-tight">Tezkor harakatlar</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/words", icon: "📚", label: "Lug'at", desc: "So'zlarni ko'rish", color: "from-blue-500/10 to-blue-600/5" },
            { href: "/favorites", icon: "❤️", label: "Sevimlilar", desc: `${stats?.favoriteWords ?? 0} ta so'z`, color: "from-red-500/10 to-rose-600/5" },
            { href: "/games/quiz", icon: "🧠", label: "Test", desc: "Bilimni sinash", color: "from-purple-500/10 to-violet-600/5" },
            { href: "/premium", icon: "👑", label: "Premium", desc: "Kengaytirilgan", color: "from-yellow-500/10 to-orange-500/5" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className={`rounded-xl cursor-pointer hover-elevate transition-all bg-gradient-to-br ${item.color} border-transparent`}>
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <div className="font-bold text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
