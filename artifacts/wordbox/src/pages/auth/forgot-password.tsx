import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

type Step = "phone" | "code" | "newPassword" | "done";

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      if (data.code) setDevCode(data.code);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Kod 6 raqamdan iborat bo'lishi kerak");
      return;
    }
    setError("");
    setStep("newPassword");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Parollar mos kelmaydi");
      return;
    }
    if (newPassword.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
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
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-sm border">
          <Link href="/login" className="flex items-center gap-1 text-muted-foreground text-sm mb-4 hover:text-foreground w-fit">
            <ArrowLeft className="w-4 h-4" />
            Orqaga
          </Link>

          {step === "phone" && (
            <>
              <h2 className="text-xl font-bold mb-1">Parolni tiklash</h2>
              <p className="text-muted-foreground text-sm mb-6">Telefon raqamingizni kiriting</p>
              {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl mb-4">{error}</div>}
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon raqam</Label>
                  <Input id="phone" type="tel" placeholder="+998901234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                  {isLoading ? "Yuborilmoqda..." : "Kod yuborish"}
                </Button>
              </form>
            </>
          )}

          {step === "code" && (
            <>
              <h2 className="text-xl font-bold mb-1">Kodni kiriting</h2>
              <p className="text-muted-foreground text-sm mb-2">{phone} raqamiga yuborilgan 6 raqamli kodni kiriting</p>
              {devCode && (
                <div className="bg-blue-500/10 text-blue-600 text-sm p-3 rounded-xl mb-4">
                  <strong>Dev rejimi:</strong> Kod: <strong>{devCode}</strong>
                </div>
              )}
              {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl mb-4">{error}</div>}
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Tasdiqlash kodi</Label>
                  <Input id="code" type="text" placeholder="123456" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
                </div>
                <Button type="submit" className="w-full font-bold">Tasdiqlash</Button>
              </form>
            </>
          )}

          {step === "newPassword" && (
            <>
              <h2 className="text-xl font-bold mb-1">Yangi parol</h2>
              <p className="text-muted-foreground text-sm mb-6">Yangi parolingizni kiriting</p>
              {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl mb-4">{error}</div>}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Yangi parol</Label>
                  <div className="relative">
                    <Input id="newPassword" type={showPassword ? "text" : "password"} placeholder="Kamida 6 ta belgi" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Parolni tasdiqlang</Label>
                  <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Qayta kiriting" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                  {isLoading ? "Yangilanmoqda..." : "Parolni yangilash"}
                </Button>
              </form>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-xl font-bold mb-2">Parol yangilandi!</h2>
              <p className="text-muted-foreground text-sm mb-6">Yangi parolingiz bilan kiring</p>
              <Button className="w-full font-bold" onClick={() => navigate("/login")}>Kirish</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
