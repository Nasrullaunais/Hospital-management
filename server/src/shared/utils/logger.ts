import pino from 'pino';
import type { Request } from 'express';

const defaultLevel = process.env['NODE_ENV'] === 'production' ? 'info' : 'debug';

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? defaultLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'authorization', 'token', 'password'],
    censor: '[REDACTED]',
  },
});

export function getRequestContext(req: Request) {
  return {
    requestId: req.requestId,
    method: req.method,
    route: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    role: req.user?.role,
  };
}
