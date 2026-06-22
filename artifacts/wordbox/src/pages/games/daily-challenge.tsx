import { useState, useEffect, useRef } from "react";
import { useGetDailyChallenge, useCreateGameSession } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, XCircle, Trophy, Swords, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = {
  wordId: number;
  word: string;
  correctAnswer: string;
  options: string[];
};

type AnswerState = "idle" | "correct" | "wrong";

export default function DailyChallenge() {
  const { data, isLoading } = useGetDailyChallenge();
  const createSession = useCreateGameSession();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [correctCount, setCorrectCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const questions: Question[] = (data as { questions?: Question[] })?.questions ?? [];
  const completedToday = (data as { completedToday?: boolean })?.completedToday ?? false;
  const bonusCoins = (data as { bonusCoins?: number })?.bonusCoins ?? 50;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAnswer = (answer: string) => {
    if (isChecking || answerState !== "idle") return;
    setIsChecking(true);
    setSelectedAnswer(answer);

    const q = questions[currentIndex];
    const correct = answer === q.correctAnswer;
    setAnswerState(correct ? "correct" : "wrong");
    if (correct) setCorrectCount((c) => c + 1);

    timerRef.current = setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        const finalCorrect = correct ? correctCount + 1 : correctCount;
        const score = Math.round((finalCorrect / questions.length) * 100);
        createSession.mutate({
          data: {
            gameType: "daily_challenge",
            level: "A1",
            score,
            totalQuestions: questions.length,
            correctAnswers: finalCorrect,
          },
        });
        setIsFinished(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(null);
        setAnswerState("idle");
        setIsChecking(false);
      }
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto animate-pulse">
            <Swords className="w-8 h-8 text-yellow-500" />
          </div>
          <p className="text-muted-foreground font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (completedToday && !isFinished) {
    return (
      <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href="/games">
          <Button variant="ghost" className="gap-2 font-bold rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            Orqaga
          </Button>
        </Link>
        <Card className="rounded-3xl border-none bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
          <CardContent className="p-10 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
              <Trophy className="w-10 h-10 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-3xl font-black mb-2">Barakalla!</h2>
              <p className="text-muted-foreground text-lg">Bugungi musobaqani allaqachon yakunladingiz.</p>
              <p className="text-muted-foreground mt-1">Ertaga yangi musobaqa bo'ladi!</p>
            </div>
            <Link href="/games">
              <Button size="lg" className="rounded-xl font-bold">
                Boshqa o'yinlar
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isFinished || questions.length === 0) {
    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
    const earned = correctCount * 2 + (correctCount === questions.length ? 10 : 0) + bonusCoins;
    return (
      <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link href="/games">
          <Button variant="ghost" className="gap-2 font-bold rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            Orqaga
          </Button>
        </Link>
        <Card className="rounded-3xl border-none overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-8 text-white text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black mb-1">Musobaqa tugadi!</h2>
            <p className="text-white/80 text-lg">{correctCount}/{questions.length} to'g'ri javob</p>
          </div>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-3xl font-black text-primary">{score}%</div>
                <div className="text-sm text-muted-foreground font-medium">Ball</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-yellow-500">+{earned}</div>
                <div className="text-sm text-muted-foreground font-medium">Tanga</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-black text-emerald-500">{correctCount}</div>
                <div className="text-sm text-muted-foreground font-medium">To'g'ri</div>
              </div>
            </div>
            {bonusCoins > 0 && (
              <div className="bg-yellow-500/10 rounded-xl p-4 flex items-center gap-3">
                <Star className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <div className="font-bold text-yellow-600">Kunlik bonus: +{bonusCoins} tanga!</div>
                  <div className="text-sm text-muted-foreground">Har kuni musobaqada qatnashing</div>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Link href="/games" className="flex-1">
                <Button variant="outline" size="lg" className="w-full rounded-xl font-bold">
                  O'yinlar
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button size="lg" className="w-full rounded-xl font-bold">
                  Bosh sahifa
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Link href="/games">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex justify-between text-sm font-bold text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Swords className="w-4 h-4 text-yellow-500" />
              Kunlik musobaqa
            </span>
            <span>{currentIndex + 1} / {questions.length}</span>
          </div>
          <Progress value={progress} className="h-2.5 rounded-full" />
        </div>
        <Badge className="bg-yellow-500/10 text-yellow-600 border-0 font-bold">
          +{bonusCoins}🪙
        </Badge>
      </div>

      <Card className="rounded-3xl border-border/50 shadow-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <p className="text-sm font-bold text-muted-foreground mb-2">So'zni tarjima qiling</p>
            <h2 className="text-5xl font-black tracking-tight">{currentQuestion.word}</h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option) => {
              let variant: "outline" | "default" = "outline";
              let extraClass = "hover:bg-primary/5 hover:border-primary/50";

              if (selectedAnswer === option) {
                if (answerState === "correct") {
                  extraClass = "bg-emerald-500/10 border-emerald-500 text-emerald-600";
                } else if (answerState === "wrong") {
                  extraClass = "bg-red-500/10 border-red-500 text-red-600";
                }
              } else if (answerState !== "idle" && option === currentQuestion.correctAnswer) {
                extraClass = "bg-emerald-500/10 border-emerald-500 text-emerald-600";
              }

              return (
                <Button
                  key={option}
                  variant={variant}
                  className={cn(
                    "w-full h-auto py-4 text-left justify-start px-5 rounded-2xl font-bold text-base transition-all border-2",
                    extraClass
                  )}
                  onClick={() => handleAnswer(option)}
                  disabled={answerState !== "idle"}
                >
                  <span className="flex-1">{option}</span>
                  {selectedAnswer === option && answerState === "correct" && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  )}
                  {selectedAnswer === option && answerState === "wrong" && (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-2">
        {questions.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              i < currentIndex ? "bg-primary" : i === currentIndex ? "bg-primary w-4" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
