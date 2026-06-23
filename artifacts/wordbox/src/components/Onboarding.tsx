import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, X } from "lucide-react";

const SLIDES = [
  {
    emoji: "📚",
    title: "Wordbox nima?",
    desc: "Ingliz tilini o'zbekcha tushuntirishlar bilan o'rganish uchun eng qulay ilova. CEFR tizimi A1 dan C2 gacha barcha darajalarni qamrab oladi.",
    color: "from-primary/20 to-primary/5",
  },
  {
    emoji: "🎮",
    title: "Qanday ishlaydi?",
    desc: "Har kuni yangi so'zlar o'rganing, o'yinlar orqali mustahkamlang, streak seriyangizni davom ettiring va reyting jadvalida o'rningizni egallang!",
    color: "from-secondary/20 to-secondary/5",
  },
  {
    emoji: "🚀",
    title: "Boshlaylik!",
    desc: "Bugun birinchi darsni boshlang. Har kuni faqat bir necha daqiqa sarf qiling va ingliz tilingizni sezilarli darajada yaxshilang.",
    color: "from-accent/20 to-accent/5",
  },
];

const STORAGE_KEY = "wordbox-onboarded";

export function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return true;
  }
}

function markOnboardingComplete() {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
  } catch {}
}

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < SLIDES.length - 1) {
      setStep((s) => s + 1);
    } else {
      markOnboardingComplete();
      onComplete();
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onComplete();
  };

  const slide = SLIDES[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm">
        <div className="relative bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="p-8 pt-10"
            >
              <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center mx-auto mb-6`}>
                <span className="text-5xl">{slide.emoji}</span>
              </div>

              <h2 className="text-2xl font-black text-center text-foreground mb-3">
                {slide.title}
              </h2>
              <p className="text-muted-foreground text-center leading-relaxed">
                {slide.desc}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="px-8 pb-8 space-y-4">
            <div className="flex items-center justify-center gap-2">
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === step ? "bg-primary w-6" : "bg-muted w-2"
                  }`}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="w-full rounded-xl font-bold h-12"
            >
              {step < SLIDES.length - 1 ? (
                <>
                  Keyingisi
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                "Boshlash!"
              )}
            </Button>

            {step < SLIDES.length - 1 && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="w-full rounded-xl text-muted-foreground font-medium"
              >
                O'tkazib yuborish
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
