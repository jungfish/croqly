import { useState, FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { toFriendlyAuthError } from '@/lib/authErrors';
import { authFetch } from '@/lib/apiClient';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

const Login = () => {
  const { signInWithPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; pendingSaveRecipeId?: string } | null;
  const from = state?.from ?? '/recipes';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signInWithPassword(email, password);
    setSubmitting(false);
    if (error) {
      toast.error(toFriendlyAuthError(error));
      return;
    }
    // Never make the visitor redo the action that sent them here.
    if (state?.pendingSaveRecipeId) {
      await authFetch(`/api/recipes/${state.pendingSaveRecipeId}/save`, { method: 'POST' }).catch(() => {});
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12 bg-background">
      <Card className="w-full max-w-md glass-card border-none">
        <CardHeader className="text-center items-center">
          <Logo className="mb-2" />
          <CardDescription>Connecte-toi pour retrouver tes recettes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>

          <div className="relative text-center text-sm text-muted-foreground">
            <span className="bg-transparent px-2">ou</span>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={async () => {
              const { error } = await signInWithGoogle();
              if (error) toast.error(toFriendlyAuthError(error));
            }}
          >
            Continuer avec Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Link to="/signup" state={location.state} className="text-primary underline underline-offset-4">
              Créer un compte
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
