import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Zap, BookOpen, Gamepad2, BarChart3, Heart, Swords, Star } from "lucide-react";
import { Link } from "wouter";

const FEATURES = [
  { icon: BookOpen, title: "Cheksiz lug'at", desc: "A1 dan C2 gacha barcha 1400+ so'z", free: true },
  { icon: Gamepad2, title: "5 ta o'yin", desc: "Test, Krossvord, Flesh karta, Moslashtirish, Imlo", free: true },
  { icon: Swords, title: "Kunlik musobaqa", desc: "Har kuni 10 ta so'z va +50 tanga", free: true },
  { icon: Heart, title: "Sevimlilar", desc: "So'zlarni saqlash va tezkor kirish", free: true },
  { icon: BarChart3, title: "Asosiy statistika", desc: "O'yin natijalari va progress", free: true },
  { icon: Zap, title: "Kengaytirilgan statistika", desc: "Haftalik/oylik tahlil va grafik", free: false },
  { icon: Star, title: "Offline rejim", desc: "Internet bo'lmasa ham o'rganish", free: false },
  { icon: Crown, title: "Reklama yo'q", desc: "Toza va qulay tajriba", free: false },
];

const PLANS = [
  {
    name: "Bepul",
    price: "0",
    period: "abadiy",
    color: "border-border",
    badge: null,
    buttonText: "Hozir ishlatmoqda",
    buttonVariant: "outline" as const,
    features: FEATURES.filter((f) => f.free).map((f) => f.title),
  },
  {
    name: "Premium Oylik",
    price: "29 000",
    period: "oy",
    color: "border-primary",
    badge: "Mashhur",
    buttonText: "Boshlash",
    buttonVariant: "default" as const,
    features: FEATURES.map((f) => f.title),
  },
  {
    name: "Premium Yillik",
    price: "249 000",
    period: "yil",
    color: "border-yellow-500",
    badge: "Tejamli -28%",
    buttonText: "Boshlash",
    buttonVariant: "default" as const,
    features: FEATURES.map((f) => f.title),
  },
];

export default function Premium() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="text-center max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-black tracking-tight">Wordbox Premium</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Ingliz tilini yanada tez va samarali o'rganing
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={`rounded-3xl border-2 ${plan.color} relative overflow-hidden transition-all hover-elevate`}
          >
            {plan.badge && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 font-bold">
                  {plan.badge}
                </Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-black">{plan.price}</span>
                {plan.price !== "0" && <span className="text-muted-foreground font-medium ml-1">UZS</span>}
                <span className="text-muted-foreground text-sm font-medium block">/ {plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {FEATURES.map((feature) => {
                  const included = plan.features.includes(feature.title);
                  return (
                    <div key={feature.title} className={`flex items-start gap-2 text-sm ${included ? "" : "opacity-30"}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${included ? "bg-emerald-500/20" : "bg-muted"}`}>
                        <Check className={`w-3 h-3 ${included ? "text-emerald-600" : "text-muted-foreground"}`} />
                      </div>
                      <span className="font-medium">{feature.title}</span>
                    </div>
                  );
                })}
              </div>
              <Button
                variant={plan.buttonVariant}
                className={`w-full rounded-xl font-bold mt-2 ${
                  plan.price !== "0"
                    ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:opacity-90"
                    : ""
                }`}
                disabled={plan.price === "0"}
              >
                {plan.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-none bg-muted/30 max-w-4xl mx-auto">
        <CardContent className="p-8">
          <h3 className="text-2xl font-black mb-6 text-center">Barcha imkoniyatlar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-4 p-4 rounded-2xl bg-background/50">
                <div className={`w-10 h-10 rounded-xl ${feature.free ? "bg-primary/10" : "bg-yellow-500/10"} flex items-center justify-center flex-shrink-0`}>
                  <feature.icon className={`w-5 h-5 ${feature.free ? "text-primary" : "text-yellow-500"}`} />
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    {feature.title}
                    {!feature.free && (
                      <Badge className="bg-yellow-500/10 text-yellow-600 border-0 text-xs font-bold">Premium</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/">
          <Button variant="ghost" className="font-bold text-muted-foreground">
            Keyinroq
          </Button>
        </Link>
      </div>
    </div>
  );
}
