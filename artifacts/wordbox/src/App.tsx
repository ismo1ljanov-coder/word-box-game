import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Dashboard from "@/pages/dashboard";
import Words from "@/pages/words";
import GamesHub from "@/pages/games/index";
import QuizGame from "@/pages/games/quiz";
import CrosswordGame from "@/pages/games/crossword";
import FlashcardGame from "@/pages/games/flashcard";
import MatchingGame from "@/pages/games/matching";
import SpellingGame from "@/pages/games/spelling";
import AnagramGame from "@/pages/games/anagram";
import SpeedQuizGame from "@/pages/games/speed-quiz";
import DailyChallenge from "@/pages/games/daily-challenge";
import Stats from "@/pages/stats";
import Profile from "@/pages/profile";
import Favorites from "@/pages/favorites";
import Premium from "@/pages/premium";
import LoginPage from "@/pages/auth/login";
import RegisterPage from "@/pages/auth/register";
import ForgotPasswordPage from "@/pages/auth/forgot-password";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

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

  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Redirect to="/" />;
  return <>{children}</>;
}

function Router() {
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
      <Route>
        <AuthGate>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/words" component={Words} />
              <Route path="/favorites" component={Favorites} />
              <Route path="/games" component={GamesHub} />
              <Route path="/games/quiz" component={QuizGame} />
              <Route path="/games/crossword" component={CrosswordGame} />
              <Route path="/games/flashcard" component={FlashcardGame} />
              <Route path="/games/matching" component={MatchingGame} />
              <Route path="/games/spelling" component={SpellingGame} />
              <Route path="/games/anagram" component={AnagramGame} />
              <Route path="/games/speed-quiz" component={SpeedQuizGame} />
              <Route path="/games/daily-challenge" component={DailyChallenge} />
              <Route path="/stats" component={Stats} />
              <Route path="/profile" component={Profile} />
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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
