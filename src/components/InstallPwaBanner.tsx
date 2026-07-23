import { useEffect, useState } from "react";
import { X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const DISMISS_KEY = "croqly-pwa-install-dismissed-at";
const DISMISS_DAYS = 14;

function isDismissedRecently() {
  const dismissedAt = localStorage.getItem(DISMISS_KEY);
  if (!dismissedAt) return false;
  const elapsedDays = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
  return elapsedDays < DISMISS_DAYS;
}

export default function InstallPwaBanner() {
  const { canInstall, isIOS, isStandalone, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(isDismissedRecently());

  useEffect(() => {
    setDismissed(isDismissedRecently());
  }, [canInstall]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  const showIOSInstructions = isIOS && !isStandalone;
  if (dismissed || isStandalone || (!canInstall && !showIOSInstructions)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-center">
      <div className="w-full max-w-md flex items-center gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-sm shadow-lg p-4">
        <img src="/pwa-icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight">Installer Croqly</p>
          {showIOSInstructions ? (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              Appuyez sur <Share className="w-3.5 h-3.5 inline shrink-0" /> puis « Sur l'écran d'accueil »
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Accès rapide depuis votre écran d'accueil
            </p>
          )}
        </div>
        {!showIOSInstructions && (
          <Button size="sm" onClick={() => promptInstall().then(dismiss)} className="shrink-0">
            Installer
          </Button>
        )}
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 text-muted-foreground hover:text-foreground p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
