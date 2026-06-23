import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import AdminLayout, { AdminRoute } from "@/components/layout/AdminLayout";
import { usePageTracking } from "@/hooks/use-page-tracking";
import GameErrorBoundary from "@/components/GameErrorBoundary";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Onboarding, { isOnboardingComplete } from "@/components/Onboarding";
import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users";
import AdminWords from "@/pages/admin/words";
import AdminAnalytics from "@/pages/admin/analytics";

import Dashboard from "@/pages/dashboard";
import Words from "@/pages/words";
import GamesHub from "@/pages/games/index";
import Stats from "@/pages/stats";
import Profile from "@/pages/profile";
import Favorites from "@/pages/favorites";
import Premium from "@/pages/premium";
import Leaderboard from "@/pages/leaderboard";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import ForgotPasswordPage from "@/pages/auth/forgot-password";

const QuizGame = lazy(() => import("@/pages/games/quiz"));
const CrosswordGame = lazy(() => import("@/pages/games/crossword"));
const FlashcardGame = lazy(() => import("@/pages/games/flashcard"));
const MatchingGame = lazy(() => import("@/pages/games/matching"));
const SpellingGame = lazy(() => import("@/pages/games/spelling"));
const AnagramGame = lazy(() => import("@/pages/games/anagram"));
const SpeedQuizGame = lazy(() => import("@/pages/games/speed-quiz"));
const DailyChallenge = lazy(() => import("@/pages/games/daily-challenge"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function GameSuspenseFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="bg-primary text-primary-foreground w-12 h-12 flex items-center justify-center rounded-2xl font-black text-xl animate-pulse">W</div>
        <p className="text-muted-foreground text-sm">Yuklanmoqda...</p>
      </div>
    </div>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user && !isOnboardingComplete()) {
      setShowOnboarding(true);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-primary text-primary-foreground w-14 h-14 flex items-center justify-center rounded-2xl font-black text-2xl animate-pulse">W</div>
          <p className="text-muted-foreground text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <>
      {showOnboarding && (
        <Onboarding onComplete={() => setShowOnboarding(false)} />
      )}
      {children}
    </>
  );
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Redirect to="/" />;
  return <>{children}</>;
}

function Router() {
  usePageTracking();
  return (
    <Switch>
      <Route path="/login">
        <PublicOnly><LoginPage /></PublicOnly>
      </Route>
      <Route path="/register">
        <PublicOnly><RegisterPage /></PublicOnly>
      </Route>
      <Route path="/forgot-password">
        <PublicOnly><ForgotPasswordPage /></PublicOnly>
      </Route>
      <Route path="/admin/:rest*">
        <AdminRoute>
          <AdminLayout>
            <Switch>
              <Route path="/admin" component={AdminDashboard} />
              <Route path="/admin/users" component={AdminUsers} />
              <Route path="/admin/words" component={AdminWords} />
              <Route path="/admin/analytics" component={AdminAnalytics} />
              <Route component={NotFound} />
            </Switch>
          </AdminLayout>
        </AdminRoute>
      </Route>
      <Route>
        <AuthGate>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/words" component={Words} />
              <Route path="/favorites" component={Favorites} />
              <Route path="/games" component={GamesHub} />
              <Route path="/games/quiz">
                {() => (
                  <GameErrorBoundary gameName="Test">
                    <Suspense fallback={<GameSuspenseFallback />}>
                      <QuizGame />
                    </Suspense>
                  </GameErrorBoundary>
                )}
              </Route>
              <Route path="/games/crossword">
                {() => (
                  <GameErrorBoundary gameName="Krossvord">
                    <Suspense fallback={<GameSuspenseFallback />}>
                      <CrosswordGame />
                    </Suspense>
                  </GameErrorBoundary>
                )}
              </Route>
              <Route path="/games/flashcard">
                {() => (
                  <GameErrorBoundary gameName="Flesh kartalar">
                    <Suspense fallback={<GameSuspenseFallback />}>
                      <FlashcardGame />
                    </Suspense>
                  </GameErrorBoundary>
                )}
              </Route>
              <Route path="/games/matching">
                {() => (
                  <GameErrorBoundary gameName="Moslashtirish">
                    <Suspense fallback={<GameSuspenseFallback />}>
                      <MatchingGame />
                    </Suspense>
                  </GameErrorBoundary>
                )}
              </Route>
              <Route path="/games/spelling">
                {() => (
                  <GameErrorBoundary gameName="Imlo">
                    <Suspense fallback={<GameSuspenseFallback />}>
                      <SpellingGame />
                    </Suspense>
                  </GameErrorBoundary>
                )}
              </Route>
              <Route path="/games/anagram">
                {() => (
                  <GameErrorBoundary gameName="Anagram">
                    <Suspense fallback={<GameSuspenseFallback />}>
                      <AnagramGame />
                    </Suspense>
                  </GameErrorBoundary>
                )}
              </Route>
              <Route path="/games/speed-quiz">
                {() => (
                  <GameErrorBoundary gameName="Tezkor test">
                    <Suspense fallback={<GameSuspenseFallback />}>
                      <SpeedQuizGame />
                    </Suspense>
                  </GameErrorBoundary>
                )}
              </Route>
              <Route path="/games/daily-challenge">
                {() => (
                  <GameErrorBoundary gameName="Kunlik musobaqa">
                    <Suspense fallback={<GameSuspenseFallback />}>
                      <DailyChallenge />
                    </Suspense>
                  </GameErrorBoundary>
                )}
              </Route>
              <Route path="/stats" component={Stats} />
              <Route path="/profile" component={Profile} />
              <Route path="/leaderboard" component={Leaderboard} />
              <Route path="/premium" component={Premium} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </AuthGate>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
