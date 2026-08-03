import { useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bell, BellOff, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import AvatarPseudoPicker from '@/components/AvatarPseudoPicker';
import { useAuth } from '@/hooks/use-auth';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { saveMyProfile, type Profile } from '@/services/profileService';
import { isAvatarKey, type AvatarKey } from '@/lib/avatars';

// Lets a signed-in user change their pseudo/avatar, toggle push notifications
// and sign out, all from one place — triggered from the identity row in
// AppSidebar.tsx (desktop) and Header.tsx's mobile drawer, both of which
// already fetch the current Profile via the same ['profile', 'me'] query key
// this invalidates on save.
const ProfileSheet = ({ profile, trigger }: { profile: Profile | undefined; trigger: ReactNode }) => {
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: subscribeToPush, unsubscribe: unsubscribeFromPush } = usePushNotifications();
  const [open, setOpen] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [avatarKey, setAvatarKey] = useState<AvatarKey | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset to the latest fetched profile every time the sheet opens, so a
  // previous open's unsaved edits never linger into the next one.
  useEffect(() => {
    if (!open) return;
    setPseudo(profile?.pseudo ?? '');
    setAvatarKey(isAvatarKey(profile?.avatarKey) ? profile.avatarKey : null);
  }, [open, profile]);

  const handleSave = async () => {
    if (!avatarKey || !pseudo.trim() || saving) return;
    setSaving(true);
    try {
      await saveMyProfile(pseudo.trim(), avatarKey);
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      toast.success('Profil mis à jour !');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible de mettre à jour ton profil.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePush = async () => {
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush();
        toast('Notifications désactivées');
      } else {
        await subscribeToPush();
        toast.success('Notifications activées !');
      }
    } catch {
      toast.error('Impossible de mettre à jour les notifications. Réessaie dans un instant.');
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Impossible de se déconnecter. Réessaie dans un instant.');
      return;
    }
    setOpen(false);
    toast.success('À bientôt !');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Mon profil</SheetTitle>
          <SheetDescription>Change ton pseudo ou ta tête de cuisine quand tu veux.</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <AvatarPseudoPicker pseudo={pseudo} onPseudoChange={setPseudo} avatarKey={avatarKey} onAvatarKeyChange={setAvatarKey} />
        </div>
        <Button onClick={handleSave} disabled={saving || !pseudo.trim() || !avatarKey} className="w-full mt-6">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>

        <div className="mt-6 pt-6 border-t border-border space-y-2">
          {pushSupported && (
            <Button variant="outline" onClick={handleTogglePush} disabled={pushLoading} className="w-full gap-2">
              {pushSubscribed ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {pushSubscribed ? 'Désactiver les notifs' : 'Activer les notifs'}
            </Button>
          )}
          <Button variant="outline" onClick={handleSignOut} className="w-full gap-2">
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProfileSheet;
