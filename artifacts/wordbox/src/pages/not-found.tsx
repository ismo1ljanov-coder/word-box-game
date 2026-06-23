import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 px-4 max-w-md">
        <div className="text-8xl select-none">🔍</div>
        <div>
          <h1 className="text-4xl font-black text-foreground mb-2">404</h1>
          <h2 className="text-xl font-bold text-foreground">Sahifa topilmadi</h2>
          <p className="text-muted-foreground mt-2">
            Kechirasiz, siz izlayotgan sahifa mavjud emas yoki ko'chirilgan.
          </p>
        </div>
        <Link href="/">
          <Button className="rounded-xl font-bold px-8">
            Bosh sahifaga
          </Button>
        </Link>
      </div>
    </div>
  );
}
