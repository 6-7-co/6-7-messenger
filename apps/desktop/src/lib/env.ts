export const API_BASE: string =
  window.desktop?.apiBase ?? import.meta.env.VITE_API_URL ?? '';

export function resolveUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/')) {
    return API_BASE ? `${API_BASE}${url}` : url;
  }
  return url;
}
