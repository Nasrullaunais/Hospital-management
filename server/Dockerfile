# ── Stage 1: Install all dependencies ──────────────────────────────────────────
FROM oven/bun:1-alpine AS deps

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY src/ ./src/
COPY tsconfig.json ./

# ── Stage 2: Runtime ───────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS runtime

WORKDIR /app

# Install production dependencies only (no devDeps)
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source from deps stage
COPY --from=deps /app/src/ ./src/
COPY --from=deps /app/tsconfig.json ./

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Create uploads directory writable by appuser (uploadMiddleware needs it at runtime)
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads

USER appuser

# Expose the port (matches env.ts default PORT=5000)
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:5000/api/health || exit 1

# Start the server — Bun runs TypeScript natively, no build step needed
CMD ["bun", "src/index.ts"]
