import { useGetReviewSchedule } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Brain, ArrowLeft, CalendarClock, CheckCircle2, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewScheduleItem {
  id: number;
  word: string;
  translation: string;
  level: string;
  category: string;
  partOfSpeech?: string | null;
  score: number;
  sm2Interval: number;
  sm2EaseFactor: number;
  nextReviewAt: string | null;
  learned: boolean;
  practiceCount: number;
}

type Bucket = "overdue" | "today" | "tomorrow" | "this_week" | "later";

const BUCKET_LABELS: Record<Bucket, string> = {
  overdue: "Muddati o'tgan",
  today: "Bugun",
  tomorrow: "Ertaga",
  this_week: "Bu hafta",
  later: "Keyinroq",
};

const BUCKET_COLORS: Record<Bucket, { bg: string; text: string; border: string; dot: string }> = {
  overdue: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20", dot: "bg-red-500" },
  today: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", dot: "bg-amber-500" },
  tomorrow: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20", dot: "bg-blue-500" },
  this_week: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20", dot: "bg-violet-500" },
  later: { bg: "bg-muted/50", text: "text-muted-foreground", border: "border-border/50", dot: "bg-muted-foreground" },
};

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  A2: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  B1: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
  B2: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  C1: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  C2: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
};

function getBucket(nextReviewAt: string | null): Bucket {
  if (!nextReviewAt) return "today";

  const now = new Date();
  const reviewDate = new Date(nextReviewAt);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const weekEnd = new Date(todayEnd);
  weekEnd.setDate(weekEnd.getDate() + 7);

  if (reviewDate < todayStart) return "overdue";
  if (reviewDate <= todayEnd) return "today";
  if (reviewDate <= tomorrowEnd) return "tomorrow";
  if (reviewDate <= weekEnd) return "this_week";
  return "later";
}

function getEaseLabel(easeFactor: number): { label: string; color: string } {
  if (easeFactor >= 2.8) return { label: "Oson", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  if (easeFactor >= 2.2) return { label: "O'rta", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" };
  return { label: "Qiyin", color: "bg-rose-500/15 text-rose-700 dark:text-rose-400" };
}

function getIntervalLabel(interval: number): string {
  if (interval === 1) return "1 kun";
  if (interval < 7) return `${interval} kun`;
  if (interval < 30) return `${Math.round(interval / 7)} hafta`;
  return `${Math.round(interval / 30)} oy`;
}

function WordRow({ item }: { item: ReviewScheduleItem }) {
  const ease = getEaseLabel(item.sm2EaseFactor);
  const levelClass = LEVEL_COLORS[item.level] ?? LEVEL_COLORS.A1;

  return (
    <div className="flex items-center justify-between py-3 px-1 border-b border-border/40 last:border-0 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-base truncate">{item.word}</span>
          {item.learned && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
          )}
        </div>
        <div className="text-sm text-muted-foreground truncate">{item.translation}</div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Badge variant="outline" className={`text-xs font-semibold px-1.5 ${levelClass}`}>
          {item.level}
        </Badge>
        <Badge variant="outline" className={`text-xs px-1.5 ${ease.color}`}>
          {ease.label}
        </Badge>
        <Badge variant="outline" className="text-xs px-1.5 bg-muted/50 text-muted-foreground gap-1 hidden sm:flex">
          <Clock className="w-3 h-3" />
          {getIntervalLabel(item.sm2Interval)}
        </Badge>
      </div>
    </div>
  );
}

function BucketSection({ bucket, items }: { bucket: Bucket; items: ReviewScheduleItem[] }) {
  const colors = BUCKET_COLORS[bucket];
  return (
    <div className="space-y-1">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${colors.bg} mb-2`}>
        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
        <span className={`font-bold text-sm ${colors.text}`}>{BUCKET_LABELS[bucket]}</span>
        <span className={`ml-auto font-bold text-sm ${colors.text}`}>{items.length} ta</span>
      </div>
      <Card className={`rounded-xl border ${colors.border}`}>
        <CardContent className="p-0 px-4">
          {items.map((item) => (
            <WordRow key={item.id} item={item} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

const BUCKET_ORDER: Bucket[] = ["overdue", "today", "tomorrow", "this_week", "later"];

export default function ReviewSchedule() {
  const { data, isLoading } = useGetReviewSchedule({ limit: 200 });

  const grouped = (() => {
    if (!data?.items) return {} as Record<Bucket, ReviewScheduleItem[]>;
    const result: Record<Bucket, ReviewScheduleItem[]> = {
      overdue: [], today: [], tomorrow: [], this_week: [], later: [],
    };
    for (const item of data.items as ReviewScheduleItem[]) {
      result[getBucket(item.nextReviewAt)].push(item);
    }
    return result;
  })();

  const totalDueToday = (grouped.overdue?.length ?? 0) + (grouped.today?.length ?? 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-foreground -ml-2 gap-1">
                <ArrowLeft className="w-4 h-4" />
                Bosh sahifa
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <CalendarClock className="w-9 h-9 text-amber-500" />
            Takrorlash jadvali
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            So'zlarning qayta ko'rib chiqish sanasi
          </p>
        </div>
        {totalDueToday > 0 && (
          <Link href="/games/flashcard?mode=review">
            <Button size="lg" className="rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 border-0 shadow-md">
              <Brain className="mr-2 w-5 h-5" />
              Hozir takrorlash ({totalDueToday})
            </Button>
          </Link>
        )}
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-red-500/10 to-amber-500/5">
          <CardContent className="p-4 text-center">
            {isLoading ? (
              <Skeleton className="h-8 w-12 mx-auto" />
            ) : (
              <>
                <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {totalDueToday}
                </div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">Bugun</div>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="p-4 text-center">
            {isLoading ? (
              <Skeleton className="h-8 w-12 mx-auto" />
            ) : (
              <>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {grouped.tomorrow?.length ?? 0}
                </div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">Ertaga</div>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-none shadow-sm bg-gradient-to-br from-violet-500/10 to-violet-600/5">
          <CardContent className="p-4 text-center">
            {isLoading ? (
              <Skeleton className="h-8 w-12 mx-auto" />
            ) : (
              <>
                <div className="text-3xl font-black text-violet-600 dark:text-violet-400">
                  {grouped.this_week?.length ?? 0}
                </div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">Bu hafta</div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-xl">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.total === 0 ? (
        <Card className="rounded-2xl border-dashed border-2 border-border/50">
          <CardContent className="p-12 text-center">
            <Zap className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-muted-foreground mb-2">
              Hali takrorlanadigan so'z yo'q
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              So'zlarni mashq qilgandan so'ng ular bu yerda ko'rinadi
            </p>
            <Link href="/words">
              <Button className="rounded-xl">
                So'zlarni o'rganish
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {BUCKET_ORDER.map((bucket) => {
            const items = grouped[bucket];
            if (!items || items.length === 0) return null;
            return <BucketSection key={bucket} bucket={bucket} items={items} />;
          })}
        </div>
      )}
    </div>
  );
}
