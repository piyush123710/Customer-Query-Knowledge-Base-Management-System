import type { SupportCategory } from '../types.ts';

export const ALL_CATEGORIES: SupportCategory[] = [
  'Hardware',
  'Software',
  'Network',
  'Account',
  'Security',
];

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatShortDate(iso);
}

export function helpfulPercentage(helpful: number, notHelpful: number): number {
  const total = helpful + notHelpful;
  if (total === 0) return 100;
  return Math.round((helpful / total) * 100);
}
