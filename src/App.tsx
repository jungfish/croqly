import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import RecipesList from "@/pages/recipes";
import RecipeView from "@/pages/recipe/[id]";
import CreatorHub from "@/pages/createur/[handle]";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import NotFound from "./pages/NotFound";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RequireAuth from '@/components/RequireAuth';
import { AuthProvider } from '@/hooks/use-auth';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-background">
              <Header />
              <main className="flex-1">
                <Routes>
                  {/* Public: anyone can try the product and view/share a recipe without an account */}
                  <Route path="/" element={<Index />} />
                  <Route path="/recipe/:id" element={<RecipeView />} />
                  <Route path="/createurs/:handle" element={<CreatorHub />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  {/* Protected: only "my recipes" needs an identity */}
                  <Route element={<RequireAuth />}>
                    <Route path="/recipes" element={<RecipesList />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <Toaster />
              <Sonner />
            </div>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
