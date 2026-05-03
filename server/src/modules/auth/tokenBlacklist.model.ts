import mongoose, { type Document, Schema } from 'mongoose';

/**
 * TokenBlacklist — stores revoked JWT tokens for server-side session invalidation.
 *
 * On logout, the token's JTI (JWT ID) is stored here with its expiry.
 * The auth middleware checks this collection before accepting any token.
 * A TTL index auto-cleans expired entries so the collection stays small.
 */

export interface ITokenBlacklist extends Document {
  jti: string;
  expiresAt: Date;
  revokedAt: Date;
  userId: string;
}

const tokenBlacklistSchema = new Schema<ITokenBlacklist>(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: Date.now,
    },
    userId: {
      type: String,
      required: true,
    },
  },
  { versionKey: false },
);

// TTL index: auto-remove documents whose expiresAt has passed
tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenBlacklist = mongoose.model<ITokenBlacklist>('TokenBlacklist', tokenBlacklistSchema);
