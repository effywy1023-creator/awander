import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from '@/lib/auth';
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Products from "./pages/Products";
import Map from "./pages/Map";
import LevelDetail from "./pages/LevelDetail";
import Notes from "./pages/Notes";
import AdminNotes from "./pages/AdminNotes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const initialize = useAuth((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products" element={<Products />} />
        <Route path="/map" element={<Map />} />
        <Route path="/level/:levelId" element={<LevelDetail />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/admin/notes" element={<AdminNotes />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
