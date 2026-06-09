import { useGetStatsSummary, useGetLevelStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Trophy, Flame, Target, BookOpen, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading: isStatsLoading } = useGetStatsSummary();
  const { data: levelStats, isLoading: isLevelsLoading } = useGetLevelStats();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Xush kelibsiz!</h1>
          <p className="text-muted-foreground mt-1 text-lg">Bugun qaysi so'zlarni o'rganamiz?</p>
        </div>
        <div className="flex gap-3">
          <Link href="/games">
            <Button size="lg" className="rounded-xl font-bold bg-primary text-primary-foreground hover-elevate">
              O'yinlarni boshlash <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold text-blue-700 dark:text-blue-400">O'rganilgan so'zlar</CardTitle>
            <BookOpen className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="text-4xl font-black text-blue-600 dark:text-blue-300">
                {stats?.learnedWords || 0} <span className="text-lg font-medium text-blue-500/70">/ {stats?.totalWords || 0}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-orange-500/10 to-orange-600/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold text-orange-700 dark:text-orange-400">Ketma-ket kunlar</CardTitle>
            <Flame className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-10 w-16" />
            ) : (
              <div className="text-4xl font-black text-orange-600 dark:text-orange-300">
                {stats?.streakDays || 0} <span className="text-lg font-medium text-orange-500/70">kun</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-md bg-gradient-to-br from-primary/20 to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold text-primary-foreground dark:text-primary">Umumiy XP</CardTitle>
            <Trophy className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="text-4xl font-black text-primary">
                {stats?.totalXp || 0} <span className="text-lg font-medium text-primary/70">XP</span>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-6 h-6 text-secondary" />
          <h2 className="text-2xl font-black tracking-tight">Darajalar bo'yicha progress</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLevelsLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="rounded-xl p-4">
                <Skeleton className="h-6 w-full mb-4" />
                <Skeleton className="h-3 w-full" />
              </Card>
            ))
          ) : (
            levelStats?.map((level) => (
              <Card key={level.level} className="rounded-xl border-border/50 shadow-sm hover-elevate transition-all overflow-hidden group">
                <div className="p-5">
                  <div className="flex justify-between items-end mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center font-black text-xl text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        {level.level}
                      </div>
                      <div>
                        <div className="font-bold text-lg">Daraja {level.level}</div>
                        <div className="text-sm text-muted-foreground">{level.learnedWords} / {level.totalWords} so'z</div>
                      </div>
                    </div>
                    <div className="font-black text-xl text-primary">{Math.round(level.percentage)}%</div>
                  </div>
                  <Progress value={level.percentage} className="h-3 bg-muted" />
                </div>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
