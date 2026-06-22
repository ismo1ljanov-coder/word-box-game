import { useEffect, useState } from "react";
import { useGetDailyRewardStatus, useClaimDailyReward } from "@workspace/api-client-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function DailyRewardModal() {
  const [open, setOpen] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useGetDailyRewardStatus();
  const { mutateAsync: claimReward, isPending } = useClaimDailyReward();

  useEffect(() => {
    if (!isLoading && status && !status.claimed) {
      setOpen(true);
    }
  }, [status, isLoading]);

  const handleClaim = async () => {
    try {
      const result = await claimReward();
      setCoinsEarned(result.coinsEarned);
      setClaimed(true);
      queryClient.invalidateQueries({ queryKey: ["/api/stats/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-reward/status"] });
    } catch {
      setOpen(false);
    }
  };

  const handleClose = () => setOpen(false);

  if (isLoading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm rounded-3xl border-none p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 text-center text-white">
          <div className="text-6xl mb-3 animate-bounce">🎁</div>
          {claimed ? (
            <>
              <h2 className="text-2xl font-black mb-2">Tabriklaymiz!</h2>
              <p className="text-white/90 font-medium">Siz {coinsEarned} tanga oldingiz</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-4xl font-black">
                🪙 +{coinsEarned}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-black mb-2">Kunlik sovg'a!</h2>
              <p className="text-white/90 font-medium">Bugun tizimga kirganingiz uchun sovg'a</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-4xl font-black">
                🪙 +20
              </div>
            </>
          )}
        </div>
        <div className="p-6 bg-card">
          {claimed ? (
            <Button
              onClick={handleClose}
              className="w-full rounded-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:opacity-90"
            >
              Davom etish
            </Button>
          ) : (
            <Button
              onClick={handleClaim}
              disabled={isPending}
              className="w-full rounded-xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 hover:opacity-90"
            >
              {isPending ? "Yuklanmoqda..." : "🎁 Olish"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
