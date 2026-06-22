import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Parollar mos kelmaydi");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }

    setIsLoading(true);
    try {
      await register(phone, fullName, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ro'yxatdan o'tish xatoligi");
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
          <h2 className="text-xl font-bold mb-1">Ro'yxatdan o'tish</h2>
          <p className="text-muted-foreground text-sm mb-6">Yangi hisob yarating</p>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Ism familiya</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Ismingizni kiriting"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

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
                  placeholder="Kamida 6 ta belgi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Parolni tasdiqlang</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Parolni qayta kiriting"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full font-bold" disabled={isLoading}>
              {isLoading ? "Yaratilmoqda..." : "Hisob yaratish"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Hisobingiz bormi?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Kirish
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
