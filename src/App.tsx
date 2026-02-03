import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { PlanProvider, usePlan } from "./contexts/PlanContext";
import { AuthProvider } from './contexts/AuthContext';
import { SmallScreenOverlay } from './components/SmallScreenOverlay';

const queryClient = new QueryClient();

// Keyboard event handler component
const KeyboardHandler = () => {
  const { undo, redo } = usePlan();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ["INPUT", "TEXTAREA"].includes(
        (e.target as HTMLElement)?.tagName
      );

      if (!isInput && (e.ctrlKey || e.metaKey)) {
        if (e.key === "z") {
          e.preventDefault(); // prevent browser undo
          undo();
        } else if (e.key === "y" || (e.shiftKey && e.key === "Z")) {
          e.preventDefault(); // prevent browser redo
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  return null;
};

const App = () => (
  <AuthProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PlanProvider>
          <KeyboardHandler />
          <SmallScreenOverlay>
            <Toaster />
            <Sonner />
            <BrowserRouter basename="/">
              <Routes>
                <Route path="/" element={<Index />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </SmallScreenOverlay>
        </PlanProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </AuthProvider>
);

export default App;
