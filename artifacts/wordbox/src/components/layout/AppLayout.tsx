import { Link, useLocation } from "wouter";
import { BookOpen, Gamepad2, Home, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Asosiy" },
    { href: "/words", icon: BookOpen, label: "Lug'at" },
    { href: "/games", icon: Gamepad2, label: "O'yinlar" },
    { href: "/stats", icon: BarChart3, label: "Statistika" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar for Desktop / Bottom Nav for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t md:relative md:border-t-0 md:border-r md:w-64 md:flex-col md:h-screen transition-all shadow-sm">
        <div className="p-4 hidden md:block">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black text-primary hover-elevate p-2 rounded-xl">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">W</div>
            Wordbox
          </Link>
        </div>
        <div className="flex md:flex-col justify-around md:justify-start md:px-4 md:gap-2 p-2 md:p-0">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="flex-1 md:flex-none">
                <div
                  className={cn(
                    "flex flex-col md:flex-row items-center gap-1 md:gap-3 p-2 md:px-4 md:py-3 rounded-xl transition-all duration-200 hover-elevate font-bold text-sm md:text-base",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-6 h-6 md:w-5 md:h-5", isActive ? "stroke-[2.5px]" : "")} />
                  <span className={cn("text-[10px] md:text-base", isActive ? "block" : "block")}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 h-screen overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
