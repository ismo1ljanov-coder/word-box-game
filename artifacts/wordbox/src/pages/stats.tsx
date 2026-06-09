import { useState } from "react";
import { useGetStatsSummary, useListGameSessions } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Trophy, Calendar, Target, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Stats() {
  const { data: stats, isLoading: isStatsLoading } = useGetStatsSummary();
  const { data: sessions, isLoading: isSessionsLoading } = useListGameSessions();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-black tracking-tight">Statistika</h1>
        <p className="text-muted-foreground mt-2 text-lg">O'zlashtirish va o'yin natijalaringiz</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-none shadow-sm bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground">Umumiy XP</p>
                {isStatsLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-black">{stats?.totalXp || 0}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground">O'rtacha ball</p>
                {isStatsLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-black">{stats?.averageScore ? Math.round(stats.averageScore) : 0}%</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground">O'yin sessiyalari</p>
                {isStatsLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-black">{stats?.totalSessions || 0}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm bg-muted/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground">Ketma-ket kunlar</p>
                {isStatsLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className="text-2xl font-black">{stats?.streakDays || 0}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="col-span-1 lg:col-span-2 rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold">O'yinlar bo'yicha XP</CardTitle>
          </CardHeader>
          <CardContent>
            {isSessionsLoading ? (
              <Skeleton className="w-full h-[300px]" />
            ) : sessions && sessions.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sessions.slice(0, 10).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="gameType" />
                    <YAxis />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground font-medium">
                Ma'lumot yo'q
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader>
            <CardTitle className="text-xl font-bold">So'nggi o'yinlar</CardTitle>
          </CardHeader>
          <CardContent>
            {isSessionsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : sessions && sessions.length > 0 ? (
              <div className="space-y-4">
                {sessions.slice(0, 5).map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div>
                      <div className="font-bold capitalize text-sm">{session.gameType}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(session.createdAt), 'dd MMM yyyy')} • {session.level}</div>
                    </div>
                    <div className="font-black text-primary bg-primary/10 px-3 py-1 rounded-lg">
                      {session.score}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground font-medium">
                Sessiyalar yo'q
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
