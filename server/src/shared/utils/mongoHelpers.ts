interface MongoError {
  name?: string;
  code?: number;
}

export function isMongoDuplicateKeyError(err: unknown): boolean {
  const mongoErr = err as MongoError;
  return mongoErr.name === 'MongoServerError' && mongoErr.code === 11000;
}
