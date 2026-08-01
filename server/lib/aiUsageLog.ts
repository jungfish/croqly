import { prisma } from './prisma.js';
import { logError } from './logger.js';
import { estimateCostUsd, UsageForPricing } from './aiPricing.js';

interface LogAiUsageInput extends UsageForPricing {
  // Identifies the call site (server/routes/*.ts or server/lib/*.ts), not
  // the model — e.g. 'recipe_interpret', 'recipe_illustration'.
  action: string;
  userId?: string | null;
}

// Best-effort — a failed usage write must never fail the AI call it's
// recording, same pattern as the embedding write in embeddings.ts.
export async function logAiUsage(input: LogAiUsageInput): Promise<void> {
  try {
    await prisma.aiUsageLog.create({
      data: {
        action: input.action,
        model: input.model,
        userId: input.userId ?? null,
        promptTokens: input.promptTokens ?? null,
        completionTokens: input.completionTokens ?? null,
        totalTokens: input.totalTokens ?? null,
        audioSeconds: input.audioSeconds ?? null,
        imageCount: input.imageCount ?? null,
        costUsd: estimateCostUsd(input),
      },
    });
  } catch (error) {
    logError('Error logging AI usage', error, { action: input.action, model: input.model });
  }
}
