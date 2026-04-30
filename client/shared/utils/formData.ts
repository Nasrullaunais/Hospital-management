/**
 * Type for file attachments in React Native FormData.
 * Used consistently across all feature modules when appending files to FormData.
 */
export interface FormDataFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Converts a local file asset into a FormDataFile for appending to FormData.
 * Handles null/undefined safely.
 */
export function toFormDataFile(asset: {
  uri: string;
  name: string;
  mimeType?: string;
} | null): FormDataFile | null {
  if (!asset) return null;
  return {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType ?? 'application/octet-stream',
  };
}
