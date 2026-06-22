import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, Gamepad2, Activity, TrendingUp, Ban, Star, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
  totalUsers: number;
  activeToday: number;
  premiumUsers: number;
  bannedUsers: number;
  totalWords: number;
  sessionsToday: number;
  totalSessions: number;
  masteredWords: number;
}

async function fetchDashboard(): Promise<DashboardStats> {
  const res = await fetch("/api/admin/dashboard", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}

export default function AdminDashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-dashboard"], queryFn: fetchDashboard, refetchInterval: 60_000 });

  if (isLoading) return <div className="text-muted-foreground animate-pulse">Yuklanmoqda...</div>;
  if (error) return <div className="text-destructive">Xatolik: {(error as Error).message}</div>;
  if (!data) return null;

  const stats = [
    { icon: Users, label: "Jami foydalanuvchilar", value: data.totalUsers, color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: Activity, label: "Bugun faol", value: data.activeToday, color: "text-green-500", bg: "bg-green-500/10" },
    { icon: Star, label: "Premium/Pro", value: data.premiumUsers, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { icon: Ban, label: "Bloklangan", value: data.bannedUsers, color: "text-red-500", bg: "bg-red-500/10" },
    { icon: BookOpen, label: "Jami so'zlar", value: data.totalWords, color: "text-violet-500", bg: "bg-violet-500/10" },
    { icon: Award, label: "O'zlashtirilgan so'zlar", value: data.masteredWords, color: "text-teal-500", bg: "bg-teal-500/10" },
    { icon: Gamepad2, label: "Bugungi sessionlar", value: data.sessionsToday, color: "text-orange-500", bg: "bg-orange-500/10" },
    { icon: TrendingUp, label: "Jami sessionlar", value: data.totalSessions, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platforma umumiy ko'rinishi</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-black">{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
