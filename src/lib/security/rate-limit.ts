export const RATE_LIMITS = {
  sensitiveAccess: {
    limit: 60,
    windowMs: 60_000,
  },
} as const;
