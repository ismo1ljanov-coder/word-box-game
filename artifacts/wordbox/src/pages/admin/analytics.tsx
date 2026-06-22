import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from "recharts";
import { TrendingUp, Users, Activity, Clock, Target, Zap } from "lucide-react";

interface AnalyticsData {
  dau: number;
  wau: number;
  mau: number;
  dauTrend: { date: string; count: number }[];
  wauTrend: { date: string; count: number }[];
  topLearned: { word: string; translation: string; level: string; count: number }[];
  hardestWords: { word: string; translation: string; level: string; avgScore: number; practiceCount: number }[];
  levelRates: { level: string; totalWords: number; learnedWords: number }[];
  avgSessionScore: number;
  avgCorrectRate: number;
  avgSessionDuration: number | null;
  eventCounts: { eventType: string; count: number }[];
}

async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch("/api/admin/analytics", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load analytics");
  return res.json();
}

const LEVEL_COLORS: Record<string, string> = {
  A1: "#10b981", A2: "#14b8a6", B1: "#3b82f6", B2: "#8b5cf6", C1: "#f97316", C2: "#ef4444",
};

export default function AdminAnalytics() {
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-analytics"], queryFn: fetchAnalytics, refetchInterval: 60_000 });

  if (isLoading) return <div className="text-muted-foreground animate-pulse">Yuklanmoqda...</div>;
  if (error) return <div className="text-destructive">Xatolik: {(error as Error).message}</div>;
  if (!data) return null;

  const levelChartData = data.levelRates.map((l) => ({
    level: l.level,
    total: l.totalWords,
    learned: l.learnedWords,
    percentage: l.totalWords > 0 ? Math.round((l.learnedWords / l.totalWords) * 100) : 0,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black">Analitika</h1>
        <p className="text-muted-foreground mt-1">Platforma ko'rsatkichlari</p>
      </div>

      {/* Active users summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Activity, label: "DAU (bugun)", value: data.dau, color: "text-green-500", bg: "bg-green-500/10" },
          { icon: Users, label: "WAU (hafta)", value: data.wau, color: "text-blue-500", bg: "bg-blue-500/10" },
          { icon: TrendingUp, label: "MAU (oy)", value: data.mau, color: "text-violet-500", bg: "bg-violet-500/10" },
        ].map((s) => (
          <Card key={s.label} className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-3xl font-black">{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session metrics */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: Target,
            label: "O'rtacha sessiya bali",
            value: `${data.avgSessionScore}/100`,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
          },
          {
            icon: Zap,
            label: "O'rtacha to'g'ri javoblar",
            value: `${data.avgCorrectRate}%`,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            icon: Clock,
            label: "O'rtacha sessiya davomiyligi",
            value: data.avgSessionDuration != null
              ? data.avgSessionDuration >= 60
                ? `${Math.floor(data.avgSessionDuration / 60)}m ${data.avgSessionDuration % 60}s`
                : `${data.avgSessionDuration}s`
              : "—",
            color: "text-sky-500",
            bg: "bg-sky-500/10",
          },
        ].map((s) => (
          <Card key={s.label} className="rounded-2xl border-none shadow-sm">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DAU/WAU trends side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data.dauTrend.length > 0 && (
          <Card className="rounded-2xl border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">DAU/MAU trendi (so'nggi 30 kun)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.dauTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v) => [v, "Faol"]}
                  />
                  <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} name="DAU" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {data.wauTrend.length > 0 && (
          <Card className="rounded-2xl border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">WAU trendi (so'nggi 7 kun)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.wauTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v) => [v, "Faol"]}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="WAU" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Level completion rates */}
      <Card className="rounded-2xl border-none shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">CEFR darajalar bo'yicha o'zlashtirish</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={levelChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="level" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                formatter={(v, name) => [v, name === "learned" ? "O'zlashtirilgan" : "Jami"]}
              />
              <Legend formatter={(v) => v === "learned" ? "O'zlashtirilgan" : "Jami"} />
              <Bar dataKey="total" fill="hsl(var(--muted))" radius={[4,4,0,0]} name="total" />
              <Bar dataKey="learned" fill="hsl(var(--primary))" radius={[4,4,0,0]} name="learned" />
            </BarChart>
          </ResponsiveContainer>
          {/* Percentage pills */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {levelChartData.map((l) => (
              <div key={l.level} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border" style={{ borderColor: LEVEL_COLORS[l.level], color: LEVEL_COLORS[l.level], background: `${LEVEL_COLORS[l.level]}15` }}>
                {l.level}: {l.percentage}%
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event counts */}
      {data.eventCounts.length > 0 && (
        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Hodisalar soni (so'nggi 30 kun)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.eventCounts} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="eventType" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v) => [v, "Soni"]}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top learned words */}
        {data.topLearned.length > 0 && (
          <Card className="rounded-2xl border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Ko'proq o'rganilgan so'zlar (top 20)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart layout="vertical" data={data.topLearned.slice(0, 12)} margin={{ top: 0, right: 20, bottom: 0, left: 60 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="word" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v) => [v, "O'zlashtirildi"]}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Hardest words */}
        {data.hardestWords.length > 0 && (
          <Card className="rounded-2xl border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Eng qiyin so'zlar (past o'rtacha ball)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart layout="vertical" data={data.hardestWords.slice(0, 12)} margin={{ top: 0, right: 20, bottom: 0, left: 60 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="word" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(v) => [`${v}/100`, "O'rtacha ball"]}
                  />
                  <Bar dataKey="avgScore" fill="#ef4444" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
