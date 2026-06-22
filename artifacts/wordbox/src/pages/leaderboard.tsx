import { useGetLeaderboard, useGetStatsSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Flame } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BADGE_EMOJI: Record<string, string> = {
  master: "🏅",
  diamond: "💎",
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
};

const BADGE_LABEL: Record<string, string> = {
  master: "Master",
  diamond: "Diamond",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
};

const RANK_COLORS = ["text-yellow-500", "text-slate-400", "text-amber-600"];

export default function Leaderboard() {
  const { user } = useAuth();
  const { data: entries, isLoading } = useGetLeaderboard();
  const { data: myStats } = useGetStatsSummary();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
          <Trophy className="w-9 h-9 text-yellow-500" />
          Reyting
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Top 20 o'quvchi — XP bo'yicha</p>
      </header>

      {myStats && (
        <Card className="rounded-2xl border-none bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-black text-primary text-lg">
                {user?.fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <div className="font-black text-lg">{user?.fullName}</div>
                <div className="text-sm text-muted-foreground">Sizning natijangiz</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-right">
              <div>
                <div className="font-black text-2xl text-primary">{myStats.totalXp}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
              <div>
                <div className="font-black text-2xl text-orange-500">{myStats.streakDays}</div>
                <div className="text-xs text-muted-foreground">kun seriya</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl border-border/50 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">Yetakchi o'quvchilar</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                  <Skeleton className="w-8 h-6" />
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="w-16 h-6" />
                </div>
              ))
            : entries?.map((entry) => {
                const isMe = entry.id === user?.id;
                const rankColor = RANK_COLORS[entry.rank - 1] ?? "text-muted-foreground";
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-4 p-4 border-b last:border-0 transition-colors ${isMe ? "bg-primary/5 border-primary/20" : "hover:bg-muted/30"}`}
                  >
                    <div className={`w-8 text-center font-black text-lg ${rankColor}`}>
                      {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                    </div>

                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-black text-primary text-sm shrink-0">
                      {entry.initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate flex items-center gap-2">
                        {entry.fullName}
                        {isMe && <span className="text-xs text-primary font-bold">(Siz)</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {BADGE_EMOJI[entry.badge]} {BADGE_LABEL[entry.badge]}
                        </span>
                        {entry.streakDays > 0 && (
                          <span className="flex items-center gap-1 text-xs text-orange-500">
                            <Flame className="w-3 h-3" />
                            {entry.streakDays}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-black text-lg text-primary">{entry.totalXp.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">XP</div>
                    </div>
                  </div>
                );
              })}
        </CardContent>
      </Card>
    </div>
  );
}
