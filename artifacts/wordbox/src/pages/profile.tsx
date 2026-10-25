import { useState } from "react";
import {
  useGetStatsSummary,
  useGetLevelStats,
  useGetAllAchievements,
  useGetDailyChallenge,
  useGetWeeklyChallenge,
  useGetMonthlyChallenge,
  useUpdateProfile,
  useChangePassword,
  useCompleteChallenge,
  useGetActivityHistory,
} from "@workspace/api-client-react";
import type { UpdateProfileInputDailyGoalTarget, ChallengeProgress } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Flame, BookOpen, Star, Zap, Target, Crown, LogOut, Settings, Lock, Sun, Moon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";
import { PAYMENTS_ENABLED } from "@/lib/features";

const BADGE_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  master: { label: "Master", emoji: "🏅", color: "text-amber-700", bg: "bg-amber-100 dark:bg-amber-900/30" },
  diamond: { label: "Diamond", emoji: "💎", color: "text-sky-600", bg: "bg-sky-100 dark:bg-sky-900/30" },
  gold: { label: "Gold", emoji: "🥇", color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30" },
  silver: { label: "Silver", emoji: "🥈", color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
  bronze: { label: "Bronze", emoji: "🥉", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30" },
};

function getBadge(xp: number) {
  if (xp >= 10000) return "master";
  if (xp >= 5000) return "diamond";
  if (xp >= 2000) return "gold";
  if (xp >= 500) return "silver";
  return "bronze";
}

// CEFR level is derived from total XP thresholds
function getCefrLevelFromXp(xp: number): string {
  if (xp >= 20000) return "C2";
  if (xp >= 10000) return "C1";
  if (xp >= 5000) return "B2";
  if (xp >= 2500) return "B1";
  if (xp >= 1000) return "A2";
  return "A1";
}

const GOAL_OPTIONS = [10, 20, 30, 50];

function ChallengeRow({ ch }: { ch: ChallengeProgress }) {
  const { mutateAsync: claim, isPending } = useCompleteChallenge();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const pct = Math.round((ch.progress / ch.target) * 100);

  const handleClaim = async () => {
    try {
      const result = await claim({ challengeId: ch.id as "daily" | "weekly" | "monthly" });
      if (result.alreadyClaimed) {
        toast({ title: "Avval olingan" });
      } else {
        toast({ title: `+${result.coinsEarned} 🪙  +${result.xpEarned} XP`, description: "Mukofot olindi!" });
        queryClient.invalidateQueries({ queryKey: ["/api/stats/summary"] });
        queryClient.invalidateQueries({ queryKey: [`/api/challenges/${ch.id}`] });
      }
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1.5 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="font-bold text-sm truncate">{ch.title}</span>
          {ch.completed && !ch.rewardClaimed && (
            <Badge className="bg-emerald-500 text-white border-0 text-xs shrink-0">✓ Tayyor!</Badge>
          )}
          {ch.rewardClaimed && (
            <Badge variant="outline" className="text-xs shrink-0">✓ Olindi</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold text-muted-foreground">
            {ch.progress}/{ch.target}
          </span>
          {ch.completed && !ch.rewardClaimed && (
            <Button
              size="sm"
              className="rounded-xl h-7 px-3 text-xs bg-emerald-500 hover:bg-emerald-600 text-white border-0"
              onClick={handleClaim}
              disabled={isPending}
            >
              {isPending ? "..." : "Ol"}
            </Button>
          )}
        </div>
      </div>
      <Progress value={pct} className="h-2 rounded-full" />
      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
        <span>🪙 +{ch.reward.coins}</span>
        <span>⚡ +{ch.reward.xp} XP</span>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [theme, toggleTheme] = useTheme();

  const { data: stats, isLoading } = useGetStatsSummary();
  const { data: levelStats } = useGetLevelStats();
  const { data: achievements } = useGetAllAchievements();
  const { data: dailyChallenge } = useGetDailyChallenge();
  const { data: weeklyChallenge } = useGetWeeklyChallenge();
  const { data: monthlyChallenge } = useGetMonthlyChallenge();
  const { data: activityHistory } = useGetActivityHistory();

  const { mutateAsync: updateProfile, isPending: isUpdatingProfile } = useUpdateProfile();
  const { mutateAsync: changePassword, isPending: isChangingPassword } = useChangePassword();

  const [editName, setEditName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [isChangingPw, setIsChangingPw] = useState(false);

  const initials = user?.fullName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "??";

  const badgeKey = getBadge(stats?.totalXp ?? 0);
  const badge = BADGE_CONFIG[badgeKey]!;
  const currentLevel = getCefrLevelFromXp(stats?.totalXp ?? 0);

  const totalLearned = levelStats?.reduce((s, l) => s + l.learnedWords, 0) ?? 0;
  const totalWords = levelStats?.reduce((s, l) => s + l.totalWords, 0) ?? 0;
  const remaining = totalWords - totalLearned;

  const heatmap = (() => {
    const activityMap = new Map<string, number>();
    if (activityHistory) {
      for (const d of activityHistory) activityMap.set(d.date, d.count);
    }
    const NUM_WEEKS = 52;
    const today = new Date();
    const todayDow = today.getUTCDay();
    const gridEndDate = new Date(today);
    gridEndDate.setUTCDate(today.getUTCDate() + (6 - todayDow));
    const weeks: { date: string; count: number }[][] = [];
    for (let w = NUM_WEEKS - 1; w >= 0; w--) {
      const week: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const cell = new Date(gridEndDate);
        cell.setUTCDate(gridEndDate.getUTCDate() - (w * 7 + (6 - d)));
        const dateStr = cell.toISOString().split("T")[0]!;
        week.push({ date: dateStr, count: activityMap.get(dateStr) ?? 0 });
      }
      weeks.push(week);
    }
    return weeks;
  })();

  const MONTH_ABBR = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

  const monthLabels = (() => {
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    heatmap.forEach((week, wi) => {
      const month = new Date(week[0]!.date).getUTCMonth();
      if (month !== lastMonth) {
        labels.push({ label: MONTH_ABBR[month] ?? "", col: wi });
        lastMonth = month;
      }
    });
    return labels;
  })();

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    try {
      await updateProfile({ data: { fullName: editName.trim() } });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditingName(false);
      toast({ title: "Ism yangilandi" });
    } catch {
      toast({ title: "Xatolik", description: "Ismni yangilashda xatolik", variant: "destructive" });
    }
  };

  const handleGoalChange = async (goal: number) => {
    try {
      await updateProfile({ data: { dailyGoalTarget: goal as UpdateProfileInputDailyGoalTarget } });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/summary"] });
      toast({ title: `Kunlik maqsad: ${goal} ta so'z` });
    } catch {
      toast({ title: "Xatolik", variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) return;
    try {
      await changePassword({ data: { currentPassword: currentPw, newPassword: newPw } });
      setCurrentPw("");
      setNewPw("");
      setIsChangingPw(false);
      toast({ title: "Parol yangilandi" });
    } catch {
      toast({ title: "Xatolik", description: "Joriy parol noto'g'ri", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-black tracking-tight">Profil</h1>
        <p className="text-muted-foreground mt-2 text-lg">Yutuqlaringiz va sozlamalar</p>
      </header>

      {/* Hero card */}
      <Card className="rounded-3xl border-none bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-3xl font-black text-primary-foreground shadow-lg">
                {initials}
              </div>
              {currentLevel && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center text-xs font-black">
                  {currentLevel}
                </div>
              )}
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-black">{user?.fullName ?? "O'quvchi"}</h2>
              <p className="text-muted-foreground font-medium mt-0.5">{user?.phone}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${badge.bg} ${badge.color}`}>
                  {badge.emoji} {badge.label}
                </span>
                <div className="flex items-center gap-1.5 text-orange-500 font-bold">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm">{stats?.streakDays ?? 0} kun seriya</span>
                </div>
                <div className="flex items-center gap-1.5 text-primary font-bold">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm">{stats?.totalXp ?? 0} XP</span>
                </div>
              </div>
            </div>
            {PAYMENTS_ENABLED && <Button
              variant="outline"
              className="rounded-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:opacity-90"
            >
              <Crown className="mr-2 w-4 h-4" />
              {user?.subscriptionTier === "free" ? "Premium" : "Premium ✓"}
            </Button>}
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: "O'zlashtirilgan", value: totalLearned, suffix: "so'z", color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Star, label: "Sevimlilar", value: stats?.favoriteWords ?? 0, suffix: "ta", color: "text-pink-500", bg: "bg-pink-500/10" },
          { icon: Flame, label: "Eng uzun seriya", value: stats?.longestStreak ?? 0, suffix: "kun", color: "text-orange-500", bg: "bg-orange-500/10" },
          { icon: Zap, label: "Qolgan so'zlar", value: remaining, suffix: "ta", color: "text-violet-500", bg: "bg-violet-500/10" },
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
                  {item.value}
                  <span className="text-lg font-medium text-muted-foreground ml-1">{item.suffix}</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground font-medium mt-0.5">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 52-week learning calendar heatmap */}
      <Card className="rounded-2xl border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 font-bold mb-4">
            <Flame className="w-5 h-5 text-orange-500" />
            O'rganish tarixi
          </div>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-max">
              {/* Month labels row */}
              <div className="flex mb-1" style={{ paddingLeft: "28px" }}>
                {heatmap.map((_, wi) => {
                  const label = monthLabels.find((m) => m.col === wi);
                  return (
                    <div key={wi} className="w-[12px] mr-[2px] text-[9px] text-muted-foreground font-medium leading-none">
                      {label ? label.label : ""}
                    </div>
                  );
                })}
              </div>
              {/* Grid: 7 rows × 52 cols */}
              <div className="flex gap-0">
                {/* Day labels */}
                <div className="flex flex-col gap-[2px] mr-1 shrink-0">
                  {["Ya", "", "Se", "", "Pa", "", "Sh"].map((lbl, i) => (
                    <div key={i} className="w-[22px] h-[12px] text-[9px] text-muted-foreground font-medium flex items-center justify-end pr-1">
                      {lbl}
                    </div>
                  ))}
                </div>
                {/* Heatmap columns */}
                <div className="flex gap-[2px]">
                  {heatmap.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[2px]">
                      {week.map((cell, di) => {
                        const intensity = cell.count === 0 ? 0 : cell.count === 1 ? 1 : cell.count <= 3 ? 2 : 3;
                        const colors = [
                          "bg-muted",
                          "bg-primary/20",
                          "bg-primary/50",
                          "bg-primary",
                        ];
                        return (
                          <div
                            key={di}
                            title={`${cell.date}: ${cell.count} o'yin`}
                            className={`w-[12px] h-[12px] rounded-[2px] ${colors[intensity]}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-1 mt-2 justify-end">
                <span className="text-[10px] text-muted-foreground">Kam</span>
                {["bg-muted", "bg-primary/20", "bg-primary/50", "bg-primary"].map((c, i) => (
                  <div key={i} className={`w-[12px] h-[12px] rounded-[2px] ${c}`} />
                ))}
                <span className="text-[10px] text-muted-foreground">Ko'p</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Challenges */}
      {(dailyChallenge || weeklyChallenge || monthlyChallenge) && (
        <Card className="rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-secondary" />
              Maqsadlar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[dailyChallenge, weeklyChallenge, monthlyChallenge].filter(Boolean).map((ch) =>
              ch ? <ChallengeRow key={ch.id} ch={ch} /> : null
            )}
          </CardContent>
        </Card>
      )}

      {/* CEFR levels */}
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
                    <span className="text-sm text-muted-foreground">
                      {level.learnedWords} o'rganildi · {level.totalWords - level.learnedWords} qoldi
                    </span>
                  </div>
                  <span className="font-bold text-sm">{level.percentage}%</span>
                </div>
                <Progress value={level.percentage} className="h-2 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Achievements */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Yutuqlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {achievements
              ? achievements.map((ach) => (
                  <div
                    key={ach.type}
                    className={`p-4 rounded-2xl text-center transition-all ${
                      ach.unlocked
                        ? "bg-yellow-500/10 border border-yellow-500/20"
                        : "bg-muted/30 opacity-50"
                    }`}
                  >
                    <div className="text-3xl mb-2">{ach.unlocked ? ach.icon : "🔒"}</div>
                    <div className="font-bold text-sm">{ach.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{ach.description}</div>
                    {ach.unlocked && ach.unlockedAt && (
                      <div className="text-xs text-yellow-600 mt-1">
                        {new Date(ach.unlockedAt).toLocaleDateString("uz-UZ")}
                      </div>
                    )}
                  </div>
                ))
              : Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            Sozlamalar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Edit name */}
          <div className="space-y-2">
            <Label className="font-bold">Ism</Label>
            {isEditingName ? (
              <div className="flex gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={user?.fullName}
                  className="rounded-xl"
                />
                <Button onClick={handleSaveName} disabled={isUpdatingProfile} size="sm" className="rounded-xl">
                  Saqlash
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setIsEditingName(false)}
                >
                  Bekor
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{user?.fullName}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    setEditName(user?.fullName ?? "");
                    setIsEditingName(true);
                  }}
                >
                  O'zgartirish
                </Button>
              </div>
            )}
          </div>

          {/* Daily goal */}
          <div className="space-y-2">
            <Label className="font-bold">Kunlik maqsad</Label>
            <div className="flex gap-2 flex-wrap">
              {GOAL_OPTIONS.map((goal) => (
                <Button
                  key={goal}
                  size="sm"
                  variant={stats?.dailyGoalTarget === goal ? "default" : "outline"}
                  className="rounded-xl font-bold"
                  onClick={() => handleGoalChange(goal)}
                >
                  {goal} so'z
                </Button>
              ))}
            </div>
          </div>

          {/* Dark mode toggle */}
          <div className="flex items-center justify-between">
            <Label className="font-bold flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              Ko'rinish
            </Label>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-bold gap-2"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-4 h-4" />
                  Kunduzgi
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  Tungi
                </>
              )}
            </Button>
          </div>

          {/* Change password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-bold flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Parol
              </Label>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setIsChangingPw(!isChangingPw)}
              >
                {isChangingPw ? "Bekor qilish" : "O'zgartirish"}
              </Button>
            </div>
            {isChangingPw && (
              <div className="space-y-3 mt-2">
                <Input
                  type="password"
                  placeholder="Joriy parol"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="rounded-xl"
                />
                <Input
                  type="password"
                  placeholder="Yangi parol (kamida 6 belgi)"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="rounded-xl"
                />
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPw || !newPw}
                  className="rounded-xl w-full"
                >
                  {isChangingPassword ? "Saqlanmoqda..." : "Parolni yangilash"}
                </Button>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="pt-2 border-t">
            <Button
              variant="destructive"
              className="w-full rounded-xl font-bold"
              onClick={logout}
            >
              <LogOut className="mr-2 w-4 h-4" />
              Chiqish
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
