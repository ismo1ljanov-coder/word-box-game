import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown, Check, X, Zap, BookOpen, Gamepad2, BarChart3, Heart, Swords, Star,
  Lock, Sparkles, Flame
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Tier = "free" | "premium" | "pro";

interface PlanFeature {
  label: string;
  free: boolean;
  premium: boolean;
  pro: boolean;
}

const FEATURES: PlanFeature[] = [
  { label: "A1 va A2 daraja so'zlari", free: true, premium: true, pro: true },
  { label: "B1 va B2 daraja so'zlari", free: false, premium: true, pro: true },
  { label: "C1 va C2 daraja so'zlari", free: false, premium: false, pro: true },
  { label: "Test va Flesh karta o'yinlari", free: true, premium: true, pro: true },
  { label: "Krossvord va Moslashtirish", free: true, premium: true, pro: true },
  { label: "Kunlik musobaqa", free: true, premium: true, pro: true },
  { label: "Imlo o'yini", free: false, premium: true, pro: true },
  { label: "Anagram o'yini", free: false, premium: false, pro: true },
  { label: "Tezkor test (Speed Quiz)", free: false, premium: false, pro: true },
  { label: "Sevimlilar va takrorlash", free: false, premium: true, pro: true },
  { label: "Kengaytirilgan statistika", free: false, premium: true, pro: true },
  { label: "AI tavsiyalar (tez kunda)", free: false, premium: false, pro: true },
];

const TIER_DETAILS: Record<Tier, {
  name: string;
  price: string;
  period: string;
  color: string;
  badge: string | null;
  icon: React.ElementType;
  gradient: string;
  buttonGradient: string;
}> = {
  free: {
    name: "Bepul",
    price: "0",
    period: "abadiy",
    color: "border-border",
    badge: null,
    icon: BookOpen,
    gradient: "from-muted/50 to-muted/20",
    buttonGradient: "",
  },
  premium: {
    name: "Premium",
    price: "49 000",
    period: "oy",
    color: "border-primary",
    badge: "Mashhur",
    icon: Star,
    gradient: "from-primary/10 to-primary/5",
    buttonGradient: "bg-gradient-to-r from-primary to-green-400 text-white border-0",
  },
  pro: {
    name: "Pro",
    price: "99 000",
    period: "oy",
    color: "border-yellow-500",
    badge: "Eng kuchli",
    icon: Crown,
    gradient: "from-yellow-500/10 to-orange-500/5",
    buttonGradient: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0",
  },
};

const TIER_ORDER: Tier[] = ["free", "premium", "pro"];

export default function Premium() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [subscribing, setSubscribing] = useState<Tier | null>(null);

  const currentTier = user?.subscriptionTier ?? "free";

  const handleSubscribe = async (tier: Tier) => {
    if (tier === currentTier) return;
    setSubscribing(tier);
    try {
      const res = await fetch("/api/auth/subscription", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Xatolik yuz berdi");
      }
      await refetchUser();
      toast({
        title: `${TIER_DETAILS[tier].name} tarifi faollashtirildi! 🎉`,
        description: tier === "pro"
          ? "Barcha C1/C2 so'zlar va Pro o'yinlar mavjud."
          : "B1/B2 so'zlar va Premium o'yinlar mavjud.",
      });
    } catch (e) {
      toast({
        title: "Xatolik",
        description: e instanceof Error ? e.message : "Qayta urinib ko'ring",
        variant: "destructive",
      });
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="text-center max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-black tracking-tight">Wordbox Tarif Rejalari</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Ingliz tilini yanada tez va samarali o'rganing
        </p>
        {currentTier !== "free" && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            Hozirgi tarifingiz: {TIER_DETAILS[currentTier].name}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {TIER_ORDER.map((tier) => {
          const plan = TIER_DETAILS[tier];
          const Icon = plan.icon;
          const isCurrent = currentTier === tier;
          const isUpgrade = TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(currentTier);
          const isDowngrade = TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(currentTier);

          return (
            <Card
              key={tier}
              className={`rounded-3xl border-2 ${plan.color} relative overflow-hidden transition-all ${isCurrent ? "ring-2 ring-primary ring-offset-2" : "hover-elevate"}`}
            >
              {isCurrent && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-green-400" />
              )}
              {plan.badge && !isCurrent && (
                <div className="absolute top-4 right-4">
                  <Badge className={`${tier === "pro" ? "bg-gradient-to-r from-yellow-500 to-orange-500" : "bg-primary"} text-white border-0 font-bold`}>
                    {plan.badge}
                  </Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-primary-foreground border-0 font-bold">
                    Joriy tarif
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-2`}>
                  <Icon className="w-5 h-5 text-foreground" />
                </div>
                <CardTitle className="text-xl font-black">{plan.name}</CardTitle>
                <div className="mt-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  {plan.price !== "0" && <span className="text-muted-foreground font-medium ml-1 text-sm">UZS</span>}
                  <span className="text-muted-foreground text-sm font-medium block">/ {plan.period}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  {FEATURES.map((feature) => {
                    const included = tier === "free" ? feature.free : tier === "premium" ? feature.premium : feature.pro;
                    return (
                      <div key={feature.label} className={`flex items-center gap-2 text-sm ${included ? "" : "opacity-35"}`}>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${included ? "bg-emerald-500/20" : "bg-muted"}`}>
                          {included
                            ? <Check className="w-2.5 h-2.5 text-emerald-600" />
                            : <X className="w-2.5 h-2.5 text-muted-foreground" />
                          }
                        </div>
                        <span className="font-medium leading-tight">{feature.label}</span>
                      </div>
                    );
                  })}
                </div>

                {isCurrent ? (
                  <Button variant="outline" className="w-full rounded-xl font-bold" disabled>
                    Hozirgi tarif
                  </Button>
                ) : isDowngrade ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-bold text-muted-foreground"
                    onClick={() => handleSubscribe(tier)}
                    disabled={subscribing !== null}
                  >
                    {subscribing === tier ? "O'zgartirilmoqda..." : "Pastroqqa o'tish"}
                  </Button>
                ) : (
                  <Button
                    className={`w-full rounded-xl font-bold ${plan.buttonGradient || ""}`}
                    onClick={() => handleSubscribe(tier)}
                    disabled={subscribing !== null}
                  >
                    {subscribing === tier ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⟳</span>
                        Faollashtirmoqda...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {tier === "pro" ? <Flame className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        {tier === "pro" ? "Pro olish" : "Premium olish"}
                      </span>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border-none bg-muted/30 max-w-4xl mx-auto">
        <CardContent className="p-6 md:p-8">
          <h3 className="text-xl font-black mb-2 text-center">To'lov haqida</h3>
          <p className="text-muted-foreground text-center text-sm mb-6">
            Hozircha to'lov tizimi ishlab chiqilmoqda. "Premium olish" tugmasi tarifni darhol faollashtiradi.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50">
              <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>Xavfsiz to'lov tizimi tez kunda</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50">
              <Gamepad2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>Premium o'yinlarni sinab ko'ring</span>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50">
              <BarChart3 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span>Kengaytirilgan statistika va tahlil</span>
            </div>
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
