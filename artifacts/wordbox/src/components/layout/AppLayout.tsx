import { Link, useLocation } from "wouter";
import { BookOpen, Gamepad2, Home, BarChart3, User, Heart, Crown, Trophy, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetStatsSummary } from "@workspace/api-client-react";
import DailyRewardModal from "@/components/DailyRewardModal";
import { useAuth } from "@/contexts/AuthContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: stats } = useGetStatsSummary();
  const { user } = useAuth();

  const navItems = [
    { href: "/", icon: Home, label: "Asosiy" },
    { href: "/words", icon: BookOpen, label: "Lug'at" },
    { href: "/games", icon: Gamepad2, label: "O'yinlar" },
    { href: "/stats", icon: BarChart3, label: "Statistika" },
    { href: "/profile", icon: User, label: "Profil" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <DailyRewardModal />
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t md:relative md:border-t-0 md:border-r md:w-64 md:flex-col md:h-screen transition-all shadow-sm">
        <div className="p-4 hidden md:flex md:flex-col gap-2">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black text-primary hover-elevate p-2 rounded-xl">
            <div className="bg-primary text-primary-foreground w-9 h-9 flex items-center justify-center rounded-xl font-black text-lg">W</div>
            Wordbox
          </Link>
          {stats && (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="flex items-center gap-1 text-sm font-bold text-orange-500">
                <span>🔥</span>
                <span>{stats.streakDays} kun</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold text-yellow-500">
                <span>🪙</span>
                <span>{stats.totalCoins ?? 0}</span>
              </div>
              <div className="flex items-center gap-1 text-sm font-bold text-primary">
                <span>⚡</span>
                <span>{stats.totalXp ?? 0}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex md:flex-col justify-around md:justify-start md:px-4 md:gap-1 p-2 md:p-0 md:mt-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="flex-1 md:flex-none">
                <div
                  className={cn(
                    "flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2 md:px-4 md:py-3 rounded-xl transition-all duration-200 font-bold text-sm md:text-base",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "")} />
                  <span className="text-[10px] md:text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex flex-col gap-2 px-4 mt-4">
          {user?.isAdmin && (
            <Link href="/admin">
              <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                location.startsWith("/admin") ? "bg-destructive/10 text-destructive" : "text-muted-foreground hover:bg-muted/50"
              )}>
                <Shield className="w-5 h-5" />
                <span>Admin Panel</span>
              </div>
            </Link>
          )}
          <Link href="/leaderboard">
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
              location === "/leaderboard" ? "bg-yellow-500/10 text-yellow-600" : "text-muted-foreground hover:bg-muted/50"
            )}>
              <Trophy className="w-5 h-5" />
              <span>Reyting</span>
            </div>
          </Link>
          <Link href="/favorites">
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
              location === "/favorites" ? "bg-red-500/10 text-red-500" : "text-muted-foreground hover:bg-muted/50"
            )}>
              <Heart className="w-5 h-5" />
              <span>Sevimlilar</span>
            </div>
          </Link>
          <Link href="/premium">
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
              location === "/premium"
                ? "bg-yellow-500/10 text-yellow-600"
                : "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-yellow-600 hover:from-yellow-500/20 hover:to-orange-500/20"
            )}>
              <Crown className="w-5 h-5" />
              <span>Premium</span>
            </div>
          </Link>
        </div>
      </nav>

      <main className="flex-1 pb-20 md:pb-0 h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
