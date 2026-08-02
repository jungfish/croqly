import { authFetch } from '@/lib/apiClient';

export type PlatingRecipeRef = {
  savedRecipeId: string;
  recipeId: string;
  title: string;
  thumb: string | null;
};

export type PlatingChallengeCard = {
  id: string;
  title: string;
  recipe: PlatingRecipeRef | null;
  endsAt: string;
  isOpen: boolean;
  submissionsCount: number;
  hasSubmittedByMe: boolean;
  winner: { userId: string; email: string | null; photoThumbUrl: string; votesCount: number } | null;
};

export type PlatingFeedItem = {
  id: string;
  challengeId: string;
  challengeTitle: string;
  recipe: PlatingRecipeRef | null;
  userId: string;
  email: string | null;
  photoUrl: string;
  photoThumbUrl: string;
  caption: string | null;
  createdAt: string;
  votesCount: number;
  votedByMe: boolean;
  commentsCount: number;
};

// A submission the caller hasn't unlocked yet — see the reveal gate in
// server/routes/platingChallenges.ts getChallenge. Vote counts stay visible
// (so an open challenge still feels alive) but the photo/caption don't.
export type LockedPlatingSubmission = {
  id: string;
  userId: string;
  email: string | null;
  isMine: boolean;
  votesCount: number;
  votedByMe: boolean;
  locked: true;
};

export type RevealedPlatingSubmission = {
  id: string;
  userId: string;
  email: string | null;
  isMine: boolean;
  votesCount: number;
  votedByMe: boolean;
  locked: false;
  photoUrl: string;
  photoThumbUrl: string;
  caption: string | null;
  createdAt: string;
  commentsCount: number;
};

export type PlatingSubmission = LockedPlatingSubmission | RevealedPlatingSubmission;

export type PlatingChallengeDetail = {
  id: string;
  title: string;
  recipe: PlatingRecipeRef | null;
  endsAt: string;
  isOpen: boolean;
  createdByUserId: string;
  hasSubmittedByMe: boolean;
  revealed: boolean;
  submissions: PlatingSubmission[];
};

export type PlatingComment = {
  id: string;
  userId: string;
  email: string | null;
  body: string;
  createdAt: string;
  isMine: boolean;
};

async function parseErrorOr(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}));
  throw new Error(body.error || fallback);
}

export async function fetchChallenges(householdId: string): Promise<PlatingChallengeCard[]> {
  const response = await authFetch(`/api/plating-challenges/household/${householdId}`);
  if (!response.ok) return parseErrorOr(response, 'Failed to fetch plating challenges');
  return response.json();
}

export async function fetchDressageFeed(householdId: string): Promise<PlatingFeedItem[]> {
  const response = await authFetch(`/api/plating-challenges/household/${householdId}/feed`);
  if (!response.ok) return parseErrorOr(response, 'Failed to fetch dressage feed');
  return response.json();
}

export async function createChallenge(
  householdId: string,
  data: { title: string; savedRecipeId?: string; durationDays?: number; endsAt?: string }
): Promise<{ id: string }> {
  const response = await authFetch(`/api/plating-challenges/household/${householdId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) return parseErrorOr(response, 'Failed to create challenge');
  return response.json();
}

export async function fetchChallenge(challengeId: string): Promise<PlatingChallengeDetail> {
  const response = await authFetch(`/api/plating-challenges/${challengeId}`);
  if (!response.ok) return parseErrorOr(response, 'Failed to fetch challenge');
  return response.json();
}

// FormData sets its own multipart boundary in the Content-Type header —
// authFetch/fetch handle that automatically as long as we don't set one
// ourselves (see URLInput.tsx's handleImageUpload for the same pattern).
export async function submitPlating(challengeId: string, photo: File, caption?: string): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('photo', photo);
  if (caption) formData.append('caption', caption);

  const response = await authFetch(`/api/plating-challenges/${challengeId}/submissions`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) return parseErrorOr(response, 'Failed to submit plating photo');
  return response.json();
}

export async function deleteMySubmission(challengeId: string): Promise<void> {
  const response = await authFetch(`/api/plating-challenges/${challengeId}/submissions/mine`, { method: 'DELETE' });
  if (!response.ok) return parseErrorOr(response, 'Failed to delete submission');
}

export async function toggleVote(submissionId: string): Promise<{ votesCount: number; votedByMe: boolean }> {
  const response = await authFetch(`/api/plating-challenges/submissions/${submissionId}/vote`, { method: 'POST' });
  if (!response.ok) return parseErrorOr(response, 'Failed to toggle vote');
  return response.json();
}

export async function fetchComments(submissionId: string): Promise<PlatingComment[]> {
  const response = await authFetch(`/api/plating-challenges/submissions/${submissionId}/comments`);
  if (!response.ok) return parseErrorOr(response, 'Failed to fetch comments');
  return response.json();
}

export async function addComment(submissionId: string, body: string): Promise<PlatingComment> {
  const response = await authFetch(`/api/plating-challenges/submissions/${submissionId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) return parseErrorOr(response, 'Failed to add comment');
  return response.json();
}

export async function deleteComment(commentId: string): Promise<void> {
  const response = await authFetch(`/api/plating-challenges/comments/${commentId}`, { method: 'DELETE' });
  if (!response.ok) return parseErrorOr(response, 'Failed to delete comment');
}
