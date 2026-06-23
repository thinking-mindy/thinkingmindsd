import {
  LICENSE_RENEWAL_EXTERNAL_URL,
  LICENSE_RENEWAL_PATH,
  LICENSE_RENEWAL_URL,
} from '@/lib/app-config';

export { LICENSE_RENEWAL_EXTERNAL_URL, LICENSE_RENEWAL_PATH, LICENSE_RENEWAL_URL };

export function isExternalUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

/** Open an external URL without unloading the ERP (client only). */
export function openExternalUrl(url: string): void {
  if (typeof window === 'undefined') return;
  if (!isExternalUrl(url)) {
    window.location.assign(url);
    return;
  }
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.assign(url);
  }
}

/** Open the in-app licence renewal wizard (client only). */
export function openLicenseRenewal(): void {
  if (typeof window === 'undefined') return;
  if (LICENSE_RENEWAL_URL.startsWith('http')) {
    openExternalUrl(LICENSE_RENEWAL_URL);
    return;
  }
  window.location.assign(LICENSE_RENEWAL_PATH);
}
