import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Words from "@/pages/words";
import GamesHub from "@/pages/games/index";
import QuizGame from "@/pages/games/quiz";
import CrosswordGame from "@/pages/games/crossword";
import FlashcardGame from "@/pages/games/flashcard";
import MatchingGame from "@/pages/games/matching";
import SpellingGame from "@/pages/games/spelling";
import Stats from "@/pages/stats";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/words" component={Words} />
        <Route path="/games" component={GamesHub} />
        <Route path="/games/quiz" component={QuizGame} />
        <Route path="/games/crossword" component={CrosswordGame} />
        <Route path="/games/flashcard" component={FlashcardGame} />
        <Route path="/games/matching" component={MatchingGame} />
        <Route path="/games/spelling" component={SpellingGame} />
        <Route path="/stats" component={Stats} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
