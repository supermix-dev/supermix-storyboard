export function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  } catch {
    return date;
  }
}

export function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function getImageAlt(fallback: string, alt?: string) {
  return alt?.trim() || fallback;
}
