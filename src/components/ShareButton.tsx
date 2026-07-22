import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ShareButtonProps {
  title: string;
  text?: string;
  className?: string;
}

// navigator.share() opens the native share sheet (WhatsApp, Instagram
// Stories, Messages...) on mobile/supporting browsers — a real distribution
// loop for a creator sharing their own hub page to their followers. Falls
// back to the clipboard-copy behavior this button replaces on desktop/
// unsupported browsers.
const ShareButton = ({ title, text, className }: ShareButtonProps) => {
  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (error) {
        // AbortError just means the user closed the share sheet — not a failure.
        if ((error as Error)?.name !== 'AbortError') {
          toast.error("Impossible de partager. Réessaie dans un instant.");
        }
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    toast.success('Lien copié !');
  };

  return (
    <Button variant="outline" size="sm" onClick={handleShare} className={className ? `gap-2 ${className}` : 'gap-2'}>
      <Share2 className="w-4 h-4" />
      Partager
    </Button>
  );
};

export default ShareButton;
