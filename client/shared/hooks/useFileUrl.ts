import { useState, useEffect } from 'react';
import { Config } from '@/shared/constants/Config';
import { apiClient } from '@/shared/api/client';

interface UseFileUrlResult {
  url: string;
  loading: boolean;
  error: string | null;
}

/**
 * React hook that resolves a file reference to an actual displayable URL.
 * For S3 files, fetches a presigned download URL from the backend.
 * For local/legacy files, returns the URL synchronously.
 */
export function useFileUrl(fileRef: string | undefined | null): UseFileUrlResult {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileRef) {
      setUrl('');
      setLoading(false);
      setError(null);
      return;
    }

    if (fileRef.startsWith('local://') || fileRef.startsWith('/')) {
      const path = fileRef.startsWith('local://')
        ? fileRef.slice(6).replace(/^\/+/, '/')
        : fileRef;
      const base = Config.BASE_URL.endsWith('/') ? Config.BASE_URL.slice(0, -1) : Config.BASE_URL;
      setUrl(`${base}${path.startsWith('/') ? path : '/' + path}`);
      setLoading(false);
      setError(null);
      return;
    }

    if (fileRef.startsWith('http://') || fileRef.startsWith('https://')) {
      setUrl(fileRef);
      setLoading(false);
      setError(null);
      return;
    }

    if (fileRef.startsWith('s3://')) {
      const key = fileRef.slice(5);
      setLoading(true);
      setError(null);

      apiClient
        .post('/files/download-url', { fileKey: key })
        .then((res) => {
          setUrl(res.data.data.downloadUrl);
        })
        .catch((err) => {
          setError(err?.response?.data?.message || 'Failed to load image');
        })
        .finally(() => {
          setLoading(false);
        });

      return;
    }

    setUrl('');
    setLoading(false);
    setError('Unknown file reference format');
  }, [fileRef]);

  return { url, loading, error };
}
