import { Link, useLocation, Redirect } from "wouter";
import { LayoutDashboard, Users, BookOpen, BarChart3, ChevronLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Foydalanuvchilar" },
  { href: "/admin/words", icon: BookOpen, label: "So'zlar" },
  { href: "/admin/analytics", icon: BarChart3, label: "Analitika" },
];

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Yuklanmoqda...</div>
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  if (!user.isAdmin) return <Redirect to="/" />;
  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-64 border-r bg-card flex flex-col fixed inset-y-0">
        <div className="p-6 border-b flex items-center gap-2">
          <div className="w-8 h-8 bg-destructive text-destructive-foreground rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-sm">Admin Panel</p>
            <p className="text-xs text-muted-foreground">Wordbox</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === "/admin"
              ? location === "/admin"
              : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Link href="/">
            <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
              Ilovaga qaytish
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
