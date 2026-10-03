export const RATE_LIMITS = {
  sensitiveAccess: {
    limit: 60,
    windowMs: 60_000,
  },
  studioApi: {
    limit: 120,
    windowMs: 60_000,
  },
  pdfGeneration: {
    limit: 12,
    windowMs: 60_000,
  },
  login: {
    limit: 10,
    windowMs: 60_000,
  },
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;
