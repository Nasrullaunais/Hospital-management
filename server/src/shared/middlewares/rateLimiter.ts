import rateLimit from 'express-rate-limit';

const standardRateLimitOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
};

// 100 requests per 15 minutes per IP — all routes
export const generalLimiter = rateLimit({
  ...standardRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 100,
});

// 10 requests per 15 minutes per IP — login/register (brute force protection)
export const authLimiter = rateLimit({
  ...standardRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
});
