import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Brain, Grid3X3, Layers, Layers3, SpellCheck2, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const GAMES = [
  {
    id: "quiz",
    title: "Test",
    description: "To'g'ri tarjimani tanlang",
    icon: Brain,
    color: "bg-blue-500",
    lightColor: "bg-blue-500/10",
    textColor: "text-blue-500",
    tags: ["Tezkor", "Xotira"]
  },
  {
    id: "crossword",
    title: "Krossvord",
    description: "So'zlarni kataklarga yozing",
    icon: Grid3X3,
    color: "bg-purple-500",
    lightColor: "bg-purple-500/10",
    textColor: "text-purple-500",
    tags: ["Qiziqarli", "Imlo"]
  },
  {
    id: "flashcard",
    title: "Flesh kartalar",
    description: "So'zlarni yodlash uchun kartalar",
    icon: Layers,
    color: "bg-orange-500",
    lightColor: "bg-orange-500/10",
    textColor: "text-orange-500",
    tags: ["Yodlash", "Takrorlash"]
  },
  {
    id: "matching",
    title: "Moslashtirish",
    description: "So'z va tarjimani juftlang",
    icon: Layers3,
    color: "bg-green-500",
    lightColor: "bg-green-500/10",
    textColor: "text-green-500",
    tags: ["Mantiq", "Tezlik"]
  },
  {
    id: "spelling",
    title: "Imlo",
    description: "So'zlarni to'g'ri yozishni mashq qiling",
    icon: SpellCheck2,
    color: "bg-red-500",
    lightColor: "bg-red-500/10",
    textColor: "text-red-500",
    tags: ["Yozish", "Qiyin"]
  }
];

export default function GamesHub() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-black tracking-tight">O'yinlar</h1>
        <p className="text-muted-foreground mt-2 text-lg">O'ynab o'rganing! O'zingizga yoqqan usulni tanlang.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {GAMES.map((game) => (
          <Link key={game.id} href={`/games/${game.id}`}>
            <Card className="rounded-3xl border-border/50 hover-elevate transition-all group cursor-pointer overflow-hidden game-card h-full">
              <CardContent className="p-0">
                <div className={`${game.lightColor} p-8 flex justify-center items-center relative overflow-hidden`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 ${game.color} opacity-10 rounded-full blur-2xl -mr-10 -mt-10`} />
                  <game.icon className={`w-20 h-20 ${game.textColor} transform group-hover:scale-110 transition-transform duration-300`} />
                </div>
                <div className="p-6">
                  <div className="flex gap-2 mb-3">
                    {game.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="rounded-md font-bold text-xs bg-muted">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight mb-2">{game.title}</h3>
                  <p className="text-muted-foreground font-medium mb-6">{game.description}</p>
                  
                  <div className={`flex items-center gap-2 font-bold ${game.textColor}`}>
                    O'ynash <Play className="w-4 h-4 fill-current" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
