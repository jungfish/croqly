// Best-effort USD cost estimate per OpenAI call, computed once at write time
// (see logAiUsage in aiUsageLog.ts) so historical rows keep the rate that
// actually applied then, even if prices change later.
//
// text-embedding-3-small and whisper-1 rates below are OpenAI's published
// per-unit prices. 'gpt-5.6-luna' and 'gpt-image-2' are NOT documented
// anywhere I have verified pricing for — the 0 rates below are placeholders.
// Fill in the real $/1M-token (chat) and $/image (image) rates from your
// OpenAI billing dashboard / platform.openai.com/pricing, or the admin
// dashboard's cost figures will under-report for those two actions (token
// and call counts stay accurate regardless).
type Rate =
  | { kind: 'tokens'; inputPer1M: number; outputPer1M: number }
  | { kind: 'tokensFlat'; per1M: number }
  | { kind: 'perMinute'; usdPerMinute: number }
  | { kind: 'perImage'; usdPerImage: number };

const PRICES: Record<string, Rate> = {
  'gpt-5.6-luna': { kind: 'tokens', inputPer1M: 0, outputPer1M: 0 }, // TODO: fill in real rate
  'gpt-image-2': { kind: 'perImage', usdPerImage: 0 }, // TODO: fill in real rate (quality: 'low', 1536x1024)
  'text-embedding-3-small': { kind: 'tokensFlat', per1M: 0.02 },
  'whisper-1': { kind: 'perMinute', usdPerMinute: 0.006 },
};

export interface UsageForPricing {
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  audioSeconds?: number | null;
  imageCount?: number | null;
}

export function estimateCostUsd(usage: UsageForPricing): number {
  const rate = PRICES[usage.model];
  if (!rate) return 0;

  switch (rate.kind) {
    case 'tokens':
      return (
        ((usage.promptTokens ?? 0) / 1_000_000) * rate.inputPer1M +
        ((usage.completionTokens ?? 0) / 1_000_000) * rate.outputPer1M
      );
    case 'tokensFlat':
      return ((usage.totalTokens ?? 0) / 1_000_000) * rate.per1M;
    case 'perMinute':
      return ((usage.audioSeconds ?? 0) / 60) * rate.usdPerMinute;
    case 'perImage':
      return (usage.imageCount ?? 0) * rate.usdPerImage;
  }
}
