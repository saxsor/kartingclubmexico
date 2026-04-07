/**
 * Triggers a CSV download from an authenticated API endpoint.
 * Uses credentials:include so httpOnly cookies are sent.
 */
export async function downloadCsv(url: string, filename: string): Promise<void> {
  const csrf = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1] ?? '';
  const res = await fetch(url, {
    credentials: 'include',
    headers: csrf ? { 'X-CSRF-Token': csrf } : {},
  });
  if (!res.ok) throw new Error(`Error al exportar: HTTP ${res.status}`);
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
