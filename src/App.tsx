import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import DecouvrirPage from "@/pages/decouvrir";
import ChatPage from "@/pages/chat";
import RecipesList from "@/pages/recipes";
import RecipeView from "@/pages/recipe/[id]";
import ShoppingListPage from "@/pages/shopping-list";
import CreatorHub from "@/pages/createur/[handle]";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import NotFound from "./pages/NotFound";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InstallPwaBanner from '@/components/InstallPwaBanner';
import RequireAuth from '@/components/RequireAuth';
import { AuthProvider } from '@/hooks/use-auth';
import { HeroProvider } from '@/hooks/use-hero';
import { PwaInstallProvider } from '@/hooks/use-pwa-install';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router>
            <HeroProvider>
            <PwaInstallProvider>
              <div className="min-h-screen flex flex-col bg-background">
                <Header />
                <main className="flex-1">
                  <Routes>
                    {/* Public: anyone can try the product and view/share a recipe without an account */}
                    <Route path="/" element={<Index />} />
                    <Route path="/decouvrir" element={<DecouvrirPage />} />
                    <Route path="/assistant" element={<ChatPage />} />
                    <Route path="/recipe/:id" element={<RecipeView />} />
                    <Route path="/createurs/:platform/:handle" element={<CreatorHub />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    {/* Protected: only "my recipes" needs an identity */}
                    <Route element={<RequireAuth />}>
                      <Route path="/recipes" element={<RecipesList />} />
                      <Route path="/shopping-list" element={<ShoppingListPage />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
                <Footer />
                <Toaster />
                <Sonner />
                <InstallPwaBanner />
              </div>
            </PwaInstallProvider>
            </HeroProvider>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
