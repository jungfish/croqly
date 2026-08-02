-- Allow repeat reactions (Google Meet-style spam-clicking) instead of one
-- toggleable reaction per (submission, user, type).
DROP INDEX "PlatingReaction_submissionId_userId_type_key";
