/**
 * Client feature flags. Read from NEXT_PUBLIC_* env so they can be flipped at
 * build/deploy time without code changes.
 */

/**
 * AI matchday pitch (natural-language recommendation summary + Smart/AI toggle).
 * Kept in the codebase for a future launch but OFF in production until the
 * Claude-backed workflow is wired in. Set NEXT_PUBLIC_ENABLE_AI_PITCH=true to
 * preview it locally.
 */
export const AI_PITCH_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_AI_PITCH === "true";
