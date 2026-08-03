import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AppSidebar from '@/components/AppSidebar';
import InstallPwaBanner from '@/components/InstallPwaBanner';
import RequireAuth from '@/components/RequireAuth';
import RequireAdmin from '@/components/RequireAdmin';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { HeroProvider } from '@/hooks/use-hero';
import { PwaInstallProvider } from '@/hooks/use-pwa-install';
import { PushNotificationsProvider } from '@/hooks/use-push-notifications';

const Index = lazy(() => import("@/pages/Index"));
const DecouvrirPage = lazy(() => import("@/pages/decouvrir"));
const ChatPage = lazy(() => import("@/pages/chat"));
const RecipesList = lazy(() => import("@/pages/recipes"));
const RecipeView = lazy(() => import("@/pages/recipe/[id]"));
const ShoppingListPage = lazy(() => import("@/pages/shopping-list"));
const BandePage = lazy(() => import("@/pages/bande"));
const LaserCroqPage = lazy(() => import("@/pages/laser-croq"));
const LaserCroqChallengePage = lazy(() => import("@/pages/laser-croq/[id]"));
const CreatorHub = lazy(() => import("@/pages/createur/[handle]"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// The chat page manages its own full-viewport scroll region (conversation
// scrolls, not the page), so it opts out of the sitewide footer that would
// otherwise sit below the fold and make the whole page scrollable again.
const FULL_SCREEN_ROUTES = ["/assistant"];

const AppShell = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isFullScreen = FULL_SCREEN_ROUTES.includes(location.pathname);

  return (
    <div className={`min-h-screen flex flex-col bg-background ${user ? 'md:pl-64' : ''}`}>
      {user && <AppSidebar />}
      <Header />
      <main className="flex-1">
        <Suspense fallback={null}>
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
              <Route path="/bande" element={<BandePage />} />
              <Route path="/laser-croq" element={<LaserCroqPage />} />
              <Route path="/laser-croq/:id" element={<LaserCroqChallengePage />} />
              <Route path="/shopping-list" element={<ShoppingListPage />} />
            </Route>
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {/* Signed-in shell reads as a desktop app (sidebar + no footer);
          the marketing footer stays for logged-out visitors. */}
      {!isFullScreen && !user && <Footer />}
      <Toaster />
      <Sonner />
      {!user && <InstallPwaBanner />}
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router>
            <HeroProvider>
              <PwaInstallProvider>
                <PushNotificationsProvider>
                  <AppShell />
                </PushNotificationsProvider>
              </PwaInstallProvider>
            </HeroProvider>
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
