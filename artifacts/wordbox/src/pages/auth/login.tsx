import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, BookOpen } from "lucide-react";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(phone, password, rememberMe);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kirish xatoligi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="bg-primary text-primary-foreground w-14 h-14 flex items-center justify-center rounded-2xl font-black text-2xl shadow-lg">
            W
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-foreground">Wordbox</h1>
            <p className="text-muted-foreground text-sm mt-1">Ingliz tilini o'rganing</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm border">
          <h2 className="text-xl font-bold mb-1">Kirish</h2>
          <p className="text-muted-foreground text-sm mb-6">Hisobingizga kiring</p>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon raqam</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+998901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Parol</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Parolni kiriting"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(v === true)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Eslab qolish
                </Label>
              </div>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Parolni unutdingizmi?
              </Link>
            </div>

            <Button type="submit" className="w-full font-bold" disabled={isLoading}>
              {isLoading ? "Kirilmoqda..." : "Kirish"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Hisobingiz yo'qmi?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Ro'yxatdan o'ting
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-center mt-6 text-muted-foreground text-xs">
          <BookOpen className="w-3 h-3" />
          <span>6,700+ so'z • CEFR A1–C2</span>
        </div>
      </div>
    </div>
  );
}
