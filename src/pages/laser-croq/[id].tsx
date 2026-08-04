import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { toast } from "sonner";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Lock,
  MessageCircle,
  Send,
  Trash2,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfettiBurst from "@/components/ConfettiBurst";
import ReactionBurst from "@/components/ReactionBurst";
import PlatingReactionBar from "@/components/PlatingReactionBar";
import ShareButton from "@/components/ShareButton";
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
import UserAvatar from "@/components/UserAvatar";

function memberLabel(pseudo: string | null, email: string | null, isMine: boolean): string {
  if (isMine) return "Toi";
  if (pseudo) return pseudo;
  return email ? email.split("@")[0] : "Membre";
}

function timeLeftLabel(endsAt: string): string {
  const msLeft = new Date(endsAt).getTime() - Date.now();
  if (msLeft <= 0) return "Terminé";
  const hours = Math.round(msLeft / (60 * 60 * 1000));
  if (hours < 24) return `Se termine dans ${hours}h`;
  return `Se termine dans ${Math.round(hours / 24)}j`;
}

const EXPLAINER_DISMISSED_KEY = "laser-croq-explainer-dismissed";

// One-time explainer for the blind-reveal + vote mechanic — shown once
// ever (persisted in localStorage, not per-défi) the first time someone
// opens a challenge, since nothing else in the UI spells out why other
// people's photos are locked or what the final swipe-deck slide is for.
const RevealExplainer = () => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(EXPLAINER_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(EXPLAINER_DISMISSED_KEY, "1");
    } catch {
      // Storage can be unavailable (private browsing, quota) — worst case
      // the explainer just reappears next visit, not worth failing over.
    }
    setDismissed(true);
  };

  return (
    <div className="mb-4 sm:mb-6 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4 flex items-start gap-3">
      <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 text-xs sm:text-sm">
        <p className="font-medium text-foreground mb-1">Comment ça marche ?</p>
        <p className="text-muted-foreground">
          Les dressages des autres restent flous tant que tu n'as pas envoyé le tien (ou que le défi n'est pas
          terminé) — impossible de copier ! Une fois débloqués, swipe jusqu'au bout pour voter pour ton préféré.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fermer"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

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
        className="relative rounded-lg overflow-hidden bg-card/70 border border-border flex items-center justify-center hover:bg-muted transition-colors h-[24rem] sm:h-[30rem]"
      >
        {preview ? (
          <motion.img
            key={preview}
            src={preview}
            alt="Aperçu"
            className="w-full h-full object-cover"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          />
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Camera className="w-12 h-12" />
            Prendre ou choisir une photo
          </span>
        )}
        {/* Camera-flash + a big bouncing 📷 the instant a photo lands —
            pairs the picker with the app's photo-taking framing (Camera
            icon, capture=environment) instead of the preview just silently
            appearing. The emoji is the obvious, hard-to-miss part; the
            flash just adds the "click" feel underneath it. */}
        {preview && (
          <>
            <span key={`flash-${preview}`} className="photo-flash" aria-hidden="true" />
            <span key={`snap-${preview}`} className="camera-snap" aria-hidden="true">
              📷
            </span>
          </>
        )}
      </button>
      <Input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Une légende légendaire ? (optionnel)"
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
        <p key={comment.id} className="flex items-start gap-1.5 text-sm">
          <UserAvatar avatarKey={comment.avatarKey} pseudo={comment.pseudo} className="w-7 h-7 mt-0.5" />
          <span>
            <span className="font-medium text-foreground">{memberLabel(comment.pseudo, comment.email, comment.isMine)}</span>{" "}
            <span className="text-muted-foreground">{comment.body}</span>
          </span>
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
  onDeleteSubmission,
}: {
  submission: PlatingSubmission;
  showConfetti: boolean;
  onDeleteSubmission: () => void;
}) => {
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
      <div className="relative rounded-xl overflow-hidden border border-border bg-muted flex flex-col items-center justify-center text-center p-4 text-muted-foreground h-[28rem] sm:h-[34rem]">
        <Lock className="w-10 h-10 mb-3" />
        <p className="text-base">Envoie ta photo pour débloquer les dressages de la bande.</p>
      </div>
    );
  }

  return (
    <div className={showConfetti && inView ? "laser-ring rounded-xl" : ""}>
      {/* lg:flex splits the card into 2 columns on desktop — info/reactions
          on the left, photo on the right (lg:order-2) — so the photo gets
          its own dedicated column instead of competing with the text below
          it for vertical space, which used to force a lot of scrolling to
          see the whole photo plus the reactions row under it. Below lg,
          it's back to a single stacked column (photo on top). No hover
          zoom on the card itself anymore — that lives on the reaction
          pills now (see PlatingReactionBar), so hovering doesn't make the
          whole thing jump. */}
      <div
        ref={ref}
        className="relative rounded-xl overflow-hidden border border-border bg-card/70 backdrop-blur-sm shadow-xl lg:flex lg:items-stretch"
      >
        <div className="overflow-hidden relative h-[28rem] sm:h-[34rem] lg:h-auto lg:min-h-[28rem] lg:w-1/2 lg:order-2 lg:shrink-0">
          <img src={submission.photoUrl} alt={submission.caption ?? ""} className="w-full h-full object-cover" />
          {showConfetti && inView && <ConfettiBurst key={`confetti-${burstKey}`} />}
          <ReactionBurst key={`reactions-${burstKey}`} reactions={reactions} />
        </div>
        <div className="p-4 lg:w-1/2 lg:order-1 lg:flex lg:flex-col lg:justify-center">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="flex items-center gap-1.5 font-medium text-foreground text-base">
              <UserAvatar avatarKey={submission.avatarKey} pseudo={submission.pseudo} className="w-10 h-10" />
              {memberLabel(submission.pseudo, submission.email, submission.isMine)}
            </span>
            {showConfetti && (
              <span
                className={`inline-flex items-center gap-1 text-sm font-semibold text-yolk-deep ${inView ? "winner-pop" : "opacity-0"}`}
              >
                <Trophy className="w-4 h-4" /> Gagnant
              </span>
            )}
          </div>
          {submission.caption && <p className="text-muted-foreground mb-2 text-base">{submission.caption}</p>}
          <button
            onClick={() => setCommentsOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2 w-fit"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {submission.commentsCount}
          </button>
          <p className="text-xs text-muted-foreground mb-1.5">
            Spam les réactions pour montrer ton soutien à ce dressage 🎉
          </p>
          <PlatingReactionBar
            submissionId={submission.id}
            reactions={reactions}
            onChange={(updated) => {
              setReactions(updated);
              setBurstKey((k) => k + 1);
            }}
          />
          {commentsOpen && <Comments submissionId={submission.id} />}
          {submission.isMine && (
            <button
              onClick={onDeleteSubmission}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors mt-3 w-fit"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Retirer mon dressage
            </button>
          )}
        </div>
      </div>
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
  const [height, setHeight] = useState<number>();
  const measureRef = useRef<HTMLDivElement>(null);
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

  // Measures the current slide's real height (photo + name + caption +
  // vote/react/comment row — not just the photo) and sizes the wrapper to
  // match, so the prev/next controls below always sit right after the
  // actual card instead of a guessed height. Also re-measures if the slide's
  // own content changes height (e.g. opening its comment thread). Each
  // slide stays position:absolute inside this sized wrapper so the outgoing
  // and incoming cards overlay exactly during the crossfade, instead of
  // both sitting in flow — which used to make the next card visibly appear
  // low (behind/below the still-exiting one) before snapping into place.
  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;
    const update = () => setHeight(node.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [clamped]);

  if (slides.length === 0) return null;

  return (
    <div className="max-w-xl lg:max-w-4xl mx-auto">
      {/* Full-width on mobile (inset-x-0) since touch is the primary way to
          move through the deck there and the prev/next arrows only reappear
          from sm: up, once there's a gutter (inset-x-12/16) to land them in
          without overlapping the card's own content. */}
      <div className="relative transition-[height] duration-200" style={{ height, touchAction: "pan-y" }}>
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={slides[clamped].key}
            ref={measureRef}
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
            className="absolute inset-x-0 sm:inset-x-12 lg:inset-x-16 top-0"
          >
            {slides[clamped].node}
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={() => goTo(clamped - 1, -1)}
          disabled={clamped === 0}
          aria-label="Dressage précédent"
          className="hidden sm:flex absolute left-0 top-[17rem] lg:top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-lg items-center justify-center text-foreground hover:bg-muted disabled:opacity-0 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(clamped + 1, 1)}
          disabled={clamped === slides.length - 1}
          aria-label="Dressage suivant"
          className="hidden sm:flex absolute right-0 top-[17rem] lg:top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-lg items-center justify-center text-foreground hover:bg-muted disabled:opacity-0 disabled:pointer-events-none transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Below sm: an animated chevron nudging left spells out the swipe
          gesture explicitly — arrows aren't on screen there to hint at
          directionality some other way. From sm: up the arrows already show
          the direction, so it's just the plain "swipe or arrows" reminder. */}
      {clamped < slides.length - 1 && (
        <div className="flex sm:hidden items-center justify-center gap-1.5 mt-2">
          <motion.span
            aria-hidden="true"
            animate={{ x: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            className="inline-flex text-primary"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.span>
          <p className="text-xs text-muted-foreground">Swipe à gauche pour voir la suite</p>
        </div>
      )}
      <p className="hidden sm:block text-center text-xs text-muted-foreground mt-2">👉 Swipe ou flèches</p>

      <div className="flex items-center justify-center gap-1.5 mt-2">
        {slides.map((slide, i) => (
          <span key={slide.key} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === clamped ? "bg-primary" : "bg-border"}`} />
        ))}
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
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const myVoteId = submissions.find((s) => s.votedByMe)?.id ?? null;

  const handleSelect = async (submission: RevealedSubmission) => {
    if (submission.isMine || pendingId) return;
    const isNewChoice = myVoteId !== submission.id;
    setPendingId(submission.id);
    try {
      if (myVoteId && isNewChoice) await toggleVote(myVoteId);
      await toggleVote(submission.id);
      onVoted();
      // Only treat this as "the final choice" when it's an actual new pick,
      // not when tapping your current pick again to undo it — an undo
      // should just update the grid in place, not bounce you back to the
      // Laser Croq home.
      if (isNewChoice) {
        toast.success(`Tu as choisi le dressage de ${memberLabel(submission.pseudo, submission.email, false)} ! 🔫`);
        navigate("/laser-croq");
      }
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
                <span className="flex items-center gap-1 text-xs font-medium text-foreground truncate">
                  <UserAvatar avatarKey={submission.avatarKey} pseudo={submission.pseudo} className="w-5 h-5" />
                  {memberLabel(submission.pseudo, submission.email, submission.isMine)}
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
      <div className="container mx-auto px-4 sm:px-8 py-8 pt-28 max-w-4xl">
        <div className="flex items-center justify-between gap-3">
          <Link to="/laser-croq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Laser Croq
          </Link>
          <ShareButton
            title="Laser Croq"
            text={
              challenge.isOpen
                ? `🔫 Défi de dressage « ${challenge.title} » en cours — envoie ta photo avant la révélation !`
                : `🔫 Le défi « ${challenge.title} » est révélé — viens voir qui a gagné et voter !`
            }
          />
        </div>

        <div className="mt-3 mb-4 sm:mb-6">
          <h1 className="font-display text-2xl sm:text-3xl text-foreground mb-1">{challenge.title}</h1>
          <p className="text-sm text-muted-foreground">{challenge.isOpen ? timeLeftLabel(challenge.endsAt) : "Défi terminé"}</p>
        </div>

        <RevealExplainer />

        <FocusDeck
          slides={[
            ...(!challenge.hasSubmittedByMe && challenge.isOpen
              ? [{ key: "submit-form", node: <SubmitForm challengeId={challenge.id} onSubmitted={refresh} /> }]
              : []),
            ...challenge.submissions.map((submission) => ({
              key: submission.id,
              node: (
                <SubmissionCard
                  submission={submission}
                  showConfetti={!challenge.isOpen && submission.id === topVotedId && !submission.locked}
                  onDeleteSubmission={handleDeleteSubmission}
                />
              ),
            })),
            ...(revealedSubmissions.length >= 2
              ? [{ key: "vote-slide", node: <VoteSlide submissions={revealedSubmissions} onVoted={handleVoted} /> }]
              : []),
          ]}
        />

        {challenge.recipe && (
          <Link
            to={`/recipe/${challenge.recipe.recipeId}`}
            className="flex items-center gap-3 mt-6 p-3 rounded-xl border border-border bg-card/70 backdrop-blur-sm shadow-sm hover:bg-muted hover:border-primary/40 active:scale-[0.99] transition-all"
          >
            {challenge.recipe.thumb && (
              <img src={challenge.recipe.thumb} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Recette réalisée</p>
              <p className="font-medium text-foreground truncate">{challenge.recipe.title}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        )}

        {challenge.submissions.length === 0 && challenge.hasSubmittedByMe === false && !challenge.isOpen && (
          <p className="text-center text-muted-foreground py-12">Ce défi s'est terminé sans aucun dressage envoyé.</p>
        )}
      </div>
    </div>
  );
};

export default ChallengeDetailPage;
