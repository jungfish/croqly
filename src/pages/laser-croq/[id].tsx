import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Crown, Lock, MessageCircle, Send, Trash2, Trophy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfettiBurst from "@/components/ConfettiBurst";
import ReactionBurst from "@/components/ReactionBurst";
import PlatingReactionBar from "@/components/PlatingReactionBar";
import { useInViewOnce } from "@/hooks/use-in-view-once";
import {
  fetchChallenge,
  submitPlating,
  deleteMySubmission,
  toggleVote,
  fetchComments,
  addComment,
  type PlatingChallengeDetail,
  type PlatingSubmission,
  type PlatingComment,
  type PlatingReactionSummary,
} from "@/services/platingChallengeService";

function memberLabel(email: string | null, isMine: boolean): string {
  if (isMine) return "Toi";
  return email ? email.split("@")[0] : "Membre";
}

function timeLeftLabel(endsAt: string): string {
  const msLeft = new Date(endsAt).getTime() - Date.now();
  if (msLeft <= 0) return "Terminé";
  const hours = Math.round(msLeft / (60 * 60 * 1000));
  if (hours < 24) return `Se termine dans ${hours}h`;
  return `Se termine dans ${Math.round(hours / 24)}j`;
}

// The submit/replace form for the caller's own dressage — shown instead of
// a locked/revealed card in the grid, in the slot where their submission
// will eventually sit once sent.
const SubmitForm = ({ challengeId, onSubmitted }: { challengeId: string; onSubmitted: () => void }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const handleSubmit = async () => {
    if (!file || submitting) return;
    setSubmitting(true);
    try {
      await submitPlating(challengeId, file, caption.trim() || undefined);
      toast.success("Dressage envoyé !");
      onSubmitted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'envoyer ta photo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 flex flex-col gap-3">
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePick} className="hidden" />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="h-40 rounded-lg overflow-hidden bg-card/70 border border-border flex items-center justify-center hover:bg-muted transition-colors"
      >
        {preview ? (
          <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Camera className="w-8 h-8" />
            Prendre ou choisir une photo
          </span>
        )}
      </button>
      <Input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Une légende ? (optionnel)"
        maxLength={200}
      />
      <Button onClick={handleSubmit} disabled={!file || submitting} className="w-full gap-2">
        <Zap className="w-4 h-4" />
        {submitting ? "Envoi…" : "Envoyer mon dressage"}
      </Button>
    </div>
  );
};

const Comments = ({ submissionId }: { submissionId: string }) => {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  const { data: comments = [], isLoading } = useQuery<PlatingComment[]>({
    queryKey: ["laser-croq", "comments", submissionId],
    queryFn: () => fetchComments(submissionId),
  });

  const handlePost = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const comment = await addComment(submissionId, body.trim());
      queryClient.setQueryData<PlatingComment[]>(["laser-croq", "comments", submissionId], (current) => [
        ...(current ?? []),
        comment,
      ]);
      setBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'ajouter ce commentaire.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-2">
      {isLoading && <p className="text-xs text-muted-foreground">Chargement…</p>}
      {comments.map((comment) => (
        <p key={comment.id} className="text-sm">
          <span className="font-medium text-foreground">{memberLabel(comment.email, comment.isMine)}</span>{" "}
          <span className="text-muted-foreground">{comment.body}</span>
        </p>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ajouter un commentaire…"
          maxLength={500}
          onKeyDown={(e) => {
            if (e.key === "Enter") handlePost();
          }}
          className="h-8 text-sm"
        />
        <Button size="icon" variant="ghost" onClick={handlePost} disabled={!body.trim() || posting} aria-label="Envoyer">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const SubmissionCard = ({ submission, showConfetti }: { submission: PlatingSubmission; showConfetti: boolean }) => {
  const queryClient = useQueryClient();
  const [voting, setVoting] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reactions, setReactions] = useState<PlatingReactionSummary[]>(submission.reactions);
  const [burstKey, setBurstKey] = useState(0);
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  // Replays the reaction burst (and, for the winner, the confetti) once the
  // card actually scrolls into view rather than the instant it mounts —
  // same "seen = replay" idea as the hub feed's DressageFeedCard.
  useEffect(() => {
    if (inView && reactions.some((r) => r.count > 0)) setBurstKey((k) => k + 1);
  }, [inView]); // eslint-disable-line react-hooks/exhaustive-deps

  if (submission.locked) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border bg-muted h-56 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
        <Lock className="w-6 h-6 mb-2" />
        <p className="text-sm">Envoie ta photo pour débloquer les dressages de la bande.</p>
      </div>
    );
  }

  const handleVote = async () => {
    if (submission.isMine || voting) return;
    setVoting(true);
    try {
      await toggleVote(submission.id);
      queryClient.invalidateQueries({ queryKey: ["laser-croq", "challenge"] });
      queryClient.invalidateQueries({ queryKey: ["laser-croq", "feed"] });
      queryClient.invalidateQueries({ queryKey: ["laser-croq", "challenges"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer ton vote.");
    } finally {
      setVoting(false);
    }
  };

  return (
    <div ref={ref} className="relative rounded-xl overflow-hidden border border-border bg-card/70 backdrop-blur-sm shadow-sm">
      <div className="h-56 overflow-hidden relative">
        <img src={submission.photoUrl} alt={submission.caption ?? ""} className="w-full h-full object-cover" />
        {showConfetti && inView && <ConfettiBurst key={`confetti-${burstKey}`} />}
        <ReactionBurst key={`reactions-${burstKey}`} reactions={reactions} />
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">{memberLabel(submission.email, submission.isMine)}</span>
          {showConfetti && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold text-yolk-deep ${inView ? "winner-pop" : "opacity-0"}`}>
              <Trophy className="w-3.5 h-3.5" /> Gagnant
            </span>
          )}
        </div>
        {submission.caption && <p className="text-sm text-muted-foreground mb-2">{submission.caption}</p>}
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={handleVote}
            disabled={submission.isMine || voting}
            title={submission.isMine ? "Tu ne peux pas voter pour ton propre dressage" : "Couronner ce dressage"}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
              submission.votedByMe
                ? "bg-yolk/20 border-yolk text-yolk-deep"
                : "bg-card border-border text-foreground hover:bg-muted disabled:opacity-50"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            {submission.votesCount}
          </button>
          <button
            onClick={() => setCommentsOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {submission.commentsCount}
          </button>
        </div>
        <PlatingReactionBar
          submissionId={submission.id}
          reactions={reactions}
          onChange={(updated) => {
            setReactions(updated);
            setBurstKey((k) => k + 1);
          }}
        />
        {commentsOpen && <Comments submissionId={submission.id} />}
      </div>
    </div>
  );
};

const ChallengeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: challenge, isLoading, isError } = useQuery<PlatingChallengeDetail>({
    queryKey: ["laser-croq", "challenge", id],
    queryFn: () => fetchChallenge(id!),
    enabled: Boolean(id),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["laser-croq", "challenge", id] });

  const handleDeleteSubmission = async () => {
    if (!id || !window.confirm("Retirer ton dressage de ce défi ?")) return;
    try {
      await deleteMySubmission(id);
      toast.success("Dressage retiré.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de retirer ton dressage.");
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Chargement…</div>;
  }
  if (isError || !challenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Ce défi est introuvable.
      </div>
    );
  }

  const topVotedId = !challenge.isOpen
    ? [...challenge.submissions]
        .filter((s): s is Extract<PlatingSubmission, { locked: false }> => !s.locked)
        .sort((a, b) => b.votesCount - a.votesCount)[0]?.id
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-8 pt-28 max-w-4xl">
        <Link to="/laser-croq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Laser Croq
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap mt-3 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-1">{challenge.title}</h1>
            <p className="text-sm text-muted-foreground">{challenge.isOpen ? timeLeftLabel(challenge.endsAt) : "Défi terminé"}</p>
          </div>
          {challenge.hasSubmittedByMe && (
            <Button variant="ghost" size="sm" onClick={handleDeleteSubmission} className="gap-1.5 text-muted-foreground">
              <Trash2 className="w-4 h-4" />
              Retirer mon dressage
            </Button>
          )}
        </div>

        {challenge.recipe && (
          <Link
            to={`/recipe/${challenge.recipe.recipeId}`}
            className="flex items-center gap-3 mb-6 p-3 rounded-xl border border-border bg-card/70 backdrop-blur-sm hover:bg-muted transition-colors"
          >
            {challenge.recipe.thumb && (
              <img src={challenge.recipe.thumb} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Recette réalisée</p>
              <p className="font-medium text-foreground truncate">{challenge.recipe.title}</p>
            </div>
          </Link>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {!challenge.hasSubmittedByMe && challenge.isOpen && (
            <SubmitForm challengeId={challenge.id} onSubmitted={refresh} />
          )}
          {challenge.submissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              showConfetti={!challenge.isOpen && submission.id === topVotedId && !submission.locked && submission.votesCount > 0}
            />
          ))}
        </div>

        {challenge.submissions.length === 0 && challenge.hasSubmittedByMe === false && !challenge.isOpen && (
          <p className="text-center text-muted-foreground py-12">Ce défi s'est terminé sans aucun dressage envoyé.</p>
        )}
      </div>
    </div>
  );
};

export default ChallengeDetailPage;
