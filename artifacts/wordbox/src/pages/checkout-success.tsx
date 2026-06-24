import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { CheckCircle, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function CheckoutSuccess() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");
  const { refetchUser } = useAuth();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const MAX_ATTEMPTS = 8;

    async function poll() {
      try {
        await refetchUser();
        attempts++;
        if (attempts < MAX_ATTEMPTS) {
          setTimeout(poll, 1500);
        } else {
          setLoaded(true);
        }
      } catch {
        setLoaded(true);
      }
    }

    const timer = setTimeout(() => {
      poll().then(() => setLoaded(true));
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="rounded-3xl border-none shadow-xl max-w-md w-full mx-4">
        <CardContent className="p-10 text-center space-y-6">
          {!loaded ? (
            <>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <div>
                <h1 className="text-2xl font-black">To'lov tasdiqlanmoqda...</h1>
                <p className="text-muted-foreground mt-2">
                  Bir lahza kuting, tarifingiz yangilanmoqda.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black">To'lov muvaffaqiyatli!</h1>
                <p className="text-muted-foreground mt-2">
                  Tarifingiz faollashtirildi. Endi barcha imkoniyatlardan foydalanishingiz mumkin.
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Link href="/">
                  <Button className="w-full rounded-xl font-bold" size="lg">
                    Bosh sahifaga o'tish
                  </Button>
                </Link>
                <Link href="/premium">
                  <Button variant="outline" className="w-full rounded-xl font-bold gap-2">
                    <Crown className="w-4 h-4" />
                    Tarif rejasini ko'rish
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
