import { useState, useCallback } from 'react';

interface UploadOptions {
  url: string;
  field: string;
  file: File;
}

interface UploadState {
  progress: number;   // 0-100
  uploading: boolean;
  error: string | null;
}

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

export function useFileUpload<T = unknown>() {
  const [state, setState] = useState<UploadState>({ progress: 0, uploading: false, error: null });

  const upload = useCallback(({ url, field, file }: UploadOptions): Promise<T> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append(field, file);

      setState({ progress: 0, uploading: true, error: null });

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setState((prev) => ({ ...prev, progress: Math.round((e.loaded / e.total) * 100) }));
        }
      });

      xhr.addEventListener('load', () => {
        setState({ progress: 100, uploading: false, error: null });
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as T);
          } catch {
            resolve(xhr.responseText as T);
          }
        } else {
          let msg = `HTTP ${xhr.status}`;
          try {
            const body = JSON.parse(xhr.responseText);
            msg = body.error ?? msg;
          } catch { /* ignore */ }
          setState((prev) => ({ ...prev, error: msg }));
          reject(new Error(msg));
        }
      });

      xhr.addEventListener('error', () => {
        const msg = 'Error de red al subir el archivo';
        setState({ progress: 0, uploading: false, error: msg });
        reject(new Error(msg));
      });

      xhr.open('POST', url);
      xhr.withCredentials = true;

      const csrf = getCsrfToken();
      if (csrf) xhr.setRequestHeader('X-CSRF-Token', csrf);

      xhr.send(fd);
    });
  }, []);

  const reset = useCallback(() => {
    setState({ progress: 0, uploading: false, error: null });
  }, []);

  return { ...state, upload, reset };
}
