import { useState, FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { toFriendlyAuthError } from '@/lib/authErrors';
import { authFetch } from '@/lib/apiClient';
import { clearAnonRecipeIds } from '@/lib/anonRecipes';
import { saveMyProfile } from '@/services/profileService';
import type { AvatarKey } from '@/lib/avatars';
import Logo from '@/components/Logo';
import AvatarPseudoPicker from '@/components/AvatarPseudoPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

const Signup = () => {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; pendingSaveRecipeIds?: string[] } | null;
  const from = state?.from ?? '/recipes';

  // Step 2 (pseudo + avatar) only shows once the account itself exists — the
  // session is usable right away (no email-confirmation wall), so this is
  // just a second screen in the same flow rather than a separate route.
  const [step, setStep] = useState<'account' | 'profile'>('account');

  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [pseudo, setPseudo] = useState('');
  const [avatarKey, setAvatarKey] = useState<AvatarKey | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signUp(email, password, firstName.trim());
    setSubmitting(false);
    if (error) {
      toast.error(toFriendlyAuthError(error));
      return;
    }
    setPseudo(firstName.trim());
    setStep('profile');
  };

  const finishSignup = async () => {
    // No email-confirmation wall — the session is usable right away. Never
    // make the visitor redo the action that sent them here.
    const pendingIds = state?.pendingSaveRecipeIds ?? [];
    if (pendingIds.length > 0) {
      await Promise.all(
        pendingIds.map((id) => authFetch(`/api/recipes/${id}/save`, { method: 'POST' }).catch(() => {}))
      );
      clearAnonRecipeIds();
      // Confirm the conversion moment explicitly — this is the action that
      // most correlates with retention, so it shouldn't happen silently.
      toast.success(
        pendingIds.length > 1
          ? `Compte créé — tes ${pendingIds.length} recettes sont sauvegardées.`
          : 'Compte créé — ta recette est sauvegardée.'
      );
    }
    navigate(from, { replace: true });
  };

  const handleCreateProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!avatarKey) {
      toast.error('Choisis un avatar pour continuer.');
      return;
    }
    setSavingProfile(true);
    try {
      await saveMyProfile(pseudo, avatarKey);
      await finishSignup();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d\'enregistrer ton profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (step === 'profile') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12 bg-background">
        <Card className="w-full max-w-md glass-card border-none">
          <CardHeader className="text-center items-center">
            <Logo className="mb-2" />
            <CardDescription>Choisis ton pseudo et ta tête de cuisine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleCreateProfile} className="space-y-5">
              <AvatarPseudoPicker
                pseudo={pseudo}
                onPseudoChange={setPseudo}
                avatarKey={avatarKey}
                onAvatarKeyChange={setAvatarKey}
              />
              <Button type="submit" className="w-full" disabled={savingProfile || !pseudo.trim() || !avatarKey}>
                {savingProfile ? 'Enregistrement…' : 'Continuer'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-12 bg-background">
      <Card className="w-full max-w-md glass-card border-none">
        <CardHeader className="text-center items-center">
          <Logo className="mb-2" />
          <CardDescription>Crée un compte pour sauvegarder tes recettes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </div>
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
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Création…' : 'Créer mon compte'}
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
              const { error } = await signInWithGoogle(from);
              if (error) toast.error(toFriendlyAuthError(error));
            }}
          >
            Continuer avec Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{' '}
            <Link to="/login" state={location.state} className="text-primary underline underline-offset-4">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
