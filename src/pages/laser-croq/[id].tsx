import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { toast } from "sonner";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  LayoutGrid,
  Layers,
  Lock,
  MessageCircle,
  Send,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
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
const SubmitForm = ({
  challengeId,
  onSubmitted,
  large,
}: {
  challengeId: string;
  onSubmitted: () => void;
  large?: boolean;
}) => {
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
        className={`rounded-lg overflow-hidden bg-card/70 border border-border flex items-center justify-center hover:bg-muted transition-colors ${
          large ? "h-[24rem] sm:h-[30rem]" : "h-40"
        }`}
      >
        {preview ? (
          <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Camera className={large ? "w-12 h-12" : "w-8 h-8"} />
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

const SubmissionCard = ({
  submission,
  showConfetti,
  large,
}: {
  submission: PlatingSubmission;
  showConfetti: boolean;
  large?: boolean;
}) => {
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
      <div
        className={`relative rounded-xl overflow-hidden border border-border bg-muted flex flex-col items-center justify-center text-center p-4 text-muted-foreground ${
          large ? "h-[28rem] sm:h-[34rem]" : "h-56"
        }`}
      >
        <Lock className={large ? "w-10 h-10 mb-3" : "w-6 h-6 mb-2"} />
        <p className={large ? "text-base" : "text-sm"}>Envoie ta photo pour débloquer les dressages de la bande.</p>
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
    <div className={showConfetti && inView ? "laser-ring rounded-xl" : ""}>
      <motion.div
        ref={ref}
        className={`relative rounded-xl overflow-hidden border border-border bg-card/70 backdrop-blur-sm shadow-sm ${large ? "shadow-xl" : ""}`}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={`overflow-hidden relative ${large ? "h-[28rem] sm:h-[34rem]" : "h-56"}`}>
          <img src={submission.photoUrl} alt={submission.caption ?? ""} className="w-full h-full object-cover" />
          {showConfetti && inView && <ConfettiBurst key={`confetti-${burstKey}`} />}
          <ReactionBurst key={`reactions-${burstKey}`} reactions={reactions} />
        </div>
        <div className={large ? "p-4" : "p-3"}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`font-medium text-foreground ${large ? "text-base" : "text-sm"}`}>
              {memberLabel(submission.email, submission.isMine)}
            </span>
            {showConfetti && (
              <span
                className={`inline-flex items-center gap-1 font-semibold text-yolk-deep ${large ? "text-sm" : "text-xs"} ${
                  inView ? "winner-pop" : "opacity-0"
                }`}
              >
                <Trophy className={large ? "w-4 h-4" : "w-3.5 h-3.5"} /> Gagnant
              </span>
            )}
          </div>
          {submission.caption && <p className={`text-muted-foreground mb-2 ${large ? "text-base" : "text-sm"}`}>{submission.caption}</p>}
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
      </motion.div>
    </div>
  );
};

// Drag distance/velocity past which releasing counts as a swipe rather than
// a tap-and-cancel.
const SWIPE_THRESHOLD = 90;
const SWIPE_VELOCITY_THRESHOLD = 500;

// direction: 1 = advancing (next), -1 = going back (previous) — decides
// which side a card flies in/out from, Tinder-style.
const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 260 : -260, opacity: 0, rotate: direction > 0 ? 6 : -6, scale: 0.94 }),
  center: { x: 0, opacity: 1, rotate: 0, scale: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -260 : 260, opacity: 0, rotate: direction > 0 ? -6 : 6, scale: 0.94 }),
};

// Tinder-style "one dressage at a time" browser — the default way to go
// through a défi's submissions: bigger, more focused, and closer to how the
// bande actually wants to savor each other's plating one at a time instead
// of scanning a grid. Real drag physics via Framer Motion (spring back if
// the swipe doesn't clear the threshold, fling off-card if it does) —
// dragging only "arms" past a few pixels of movement, so tapping a button
// inside the card (vote, react, comment...) is never mistaken for a swipe,
// unlike the manual pointer-capture version this replaced.
const FocusDeck = ({ slides }: { slides: { key: string; node: React.ReactNode }[] }) => {
  const [[index, direction], setIndexState] = useState<[number, number]>([0, 0]);
  const clamped = Math.max(0, Math.min(index, slides.length - 1));

  const goTo = (next: number, dir: number) => {
    const bounded = Math.max(0, Math.min(slides.length - 1, next));
    if (bounded === clamped) return;
    setIndexState([bounded, dir]);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY_THRESHOLD) goTo(clamped + 1, 1);
    else if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY_THRESHOLD) goTo(clamped - 1, -1);
  };

  if (slides.length === 0) return null;

  return (
    <div className="max-w-md mx-auto">
      <div className="relative" style={{ touchAction: "pan-y" }}>
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={slides[clamped].key}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            whileDrag={{ cursor: "grabbing" }}
          >
            {slides[clamped].node}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 mt-5">
        <button
          type="button"
          onClick={() => goTo(clamped - 1, -1)}
          disabled={clamped === 0}
          aria-label="Dressage précédent"
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-1.5">
          {slides.map((slide, i) => (
            <span key={slide.key} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === clamped ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => goTo(clamped + 1, 1)}
          disabled={clamped === slides.length - 1}
          aria-label="Dressage suivant"
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

type RevealedSubmission = Extract<PlatingSubmission, { locked: false }>;

// Final slide of the focus deck, after everyone's dressage — a compact poll
// to pick a single favorite. Single-choice UX built on top of the existing
// per-submission toggle-vote endpoint: picking a new photo un-votes your
// previous pick first, so tapping around always leaves exactly one crown
// with your name on it instead of stacking votes across submissions.
const VoteSlide = ({ submissions, onVoted }: { submissions: RevealedSubmission[]; onVoted: () => void }) => {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const myVoteId = submissions.find((s) => s.votedByMe)?.id ?? null;

  const handleSelect = async (submission: RevealedSubmission) => {
    if (submission.isMine || pendingId) return;
    setPendingId(submission.id);
    try {
      if (myVoteId && myVoteId !== submission.id) await toggleVote(myVoteId);
      await toggleVote(submission.id);
      onVoted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer ton vote.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm shadow-sm p-5">
      <div className="text-center mb-5">
        <p className="text-3xl mb-1">🔫✨</p>
        <h3 className="font-display text-xl font-semibold text-foreground">Laquelle est la plus laser ?</h3>
        <p className="text-sm text-muted-foreground mt-1">Choisis ton dressage préféré de la bande.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {submissions.map((submission) => {
          const selected = submission.votedByMe;
          return (
            <button
              key={submission.id}
              type="button"
              onClick={() => handleSelect(submission)}
              disabled={submission.isMine || pendingId === submission.id}
              title={submission.isMine ? "Tu ne peux pas voter pour ton propre dressage" : "Choisir ce dressage"}
              className={`relative rounded-lg overflow-hidden border-2 transition-all disabled:opacity-60 ${
                selected ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50"
              }`}
            >
              <img src={submission.photoThumbUrl} alt="" className="w-full h-28 object-cover" />
              <div className="p-1.5 bg-card/90 flex items-center justify-between gap-1">
                <span className="text-xs font-medium text-foreground truncate">
                  {memberLabel(submission.email, submission.isMine)}
                </span>
                <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground shrink-0">
                  <Crown className="w-3 h-3" />
                  {submission.votesCount}
                </span>
              </div>
              {selected && (
                <span className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="w-3 h-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ChallengeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"focus" | "grid">("focus");

  const { data: challenge, isLoading, isError } = useQuery<PlatingChallengeDetail>({
    queryKey: ["laser-croq", "challenge", id],
    queryFn: () => fetchChallenge(id!),
    enabled: Boolean(id),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["laser-croq", "challenge", id] });

  const handleVoted = () => {
    refresh();
    queryClient.invalidateQueries({ queryKey: ["laser-croq", "feed"] });
    queryClient.invalidateQueries({ queryKey: ["laser-croq", "challenges"] });
  };

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

  const revealedSubmissions = challenge.submissions.filter((s): s is RevealedSubmission => !s.locked);

  const topVotedId = !challenge.isOpen
    ? [...revealedSubmissions].sort((a, b) => b.votesCount - a.votesCount)[0]?.id
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

        {(challenge.submissions.length > 0 || (!challenge.hasSubmittedByMe && challenge.isOpen)) && (
          <div className="flex justify-end mb-4">
            <div className="inline-flex rounded-lg border border-border p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode("focus")}
                aria-label="Mode focus"
                title="Mode focus — un dressage à la fois"
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  viewMode === "focus" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="Mode grille"
                title="Mode grille — tout voir d'un coup"
                className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                  viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {viewMode === "focus" ? (
          <FocusDeck
            slides={[
              ...(!challenge.hasSubmittedByMe && challenge.isOpen
                ? [{ key: "submit-form", node: <SubmitForm challengeId={challenge.id} onSubmitted={refresh} large /> }]
                : []),
              ...challenge.submissions.map((submission) => ({
                key: submission.id,
                node: (
                  <SubmissionCard
                    submission={submission}
                    showConfetti={!challenge.isOpen && submission.id === topVotedId && !submission.locked}
                    large
                  />
                ),
              })),
              ...(revealedSubmissions.length >= 2
                ? [{ key: "vote-slide", node: <VoteSlide submissions={revealedSubmissions} onVoted={handleVoted} /> }]
                : []),
            ]}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {!challenge.hasSubmittedByMe && challenge.isOpen && (
              <SubmitForm challengeId={challenge.id} onSubmitted={refresh} />
            )}
            {challenge.submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                showConfetti={!challenge.isOpen && submission.id === topVotedId && !submission.locked}
              />
            ))}
          </div>
        )}

        {challenge.submissions.length === 0 && challenge.hasSubmittedByMe === false && !challenge.isOpen && (
          <p className="text-center text-muted-foreground py-12">Ce défi s'est terminé sans aucun dressage envoyé.</p>
        )}
      </div>
    </div>
  );
};

export default ChallengeDetailPage;
