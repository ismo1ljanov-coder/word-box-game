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
} from "@workspace/api-client-react";
import type { UpdateProfileInputDailyGoalTarget } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Flame, BookOpen, Star, Zap, Target, Crown, LogOut, Settings, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

const GOAL_OPTIONS = [10, 20, 30, 50];

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useGetStatsSummary();
  const { data: levelStats } = useGetLevelStats();
  const { data: achievements } = useGetAllAchievements();
  const { data: dailyChallenge } = useGetDailyChallenge();
  const { data: weeklyChallenge } = useGetWeeklyChallenge();
  const { data: monthlyChallenge } = useGetMonthlyChallenge();

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

  const totalLevel = levelStats?.find((l) => l.percentage < 100)?.level ?? "C2";

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
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-card border-2 border-background flex items-center justify-center text-xs font-black">
                {totalLevel}
              </div>
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
            <Button
              variant="outline"
              className="rounded-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:opacity-90"
            >
              <Crown className="mr-2 w-4 h-4" />
              {user?.subscriptionTier === "free" ? "Premium" : "Premium ✓"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: "O'rganildi", value: stats?.learnedWords ?? 0, suffix: "so'z", color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: Flame, label: "Eng uzun seriya", value: stats?.longestStreak ?? 0, suffix: "kun", color: "text-orange-500", bg: "bg-orange-500/10" },
          { icon: Star, label: "Tangalar", value: stats?.totalCoins ?? 0, suffix: "🪙", color: "text-yellow-500", bg: "bg-yellow-500/10" },
          { icon: Zap, label: "Sessiyalar", value: stats?.totalSessions ?? 0, suffix: "ta", color: "text-violet-500", bg: "bg-violet-500/10" },
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
              ch ? (
                <div key={ch.id}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div>
                      <span className="font-bold text-sm">{ch.title}</span>
                      {ch.completed && (
                        <Badge className="ml-2 bg-emerald-500 text-white border-0 text-xs">✓ Bajarildi</Badge>
                      )}
                    </div>
                    <span className="text-sm font-bold text-muted-foreground">
                      {ch.progress}/{ch.target}
                    </span>
                  </div>
                  <Progress value={Math.round((ch.progress / ch.target) * 100)} className="h-2 rounded-full" />
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>🪙 +{ch.reward.coins}</span>
                    <span>⚡ +{ch.reward.xp} XP</span>
                  </div>
                </div>
              ) : null
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
