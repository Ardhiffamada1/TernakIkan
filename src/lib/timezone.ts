/**
 * Utilitas tanggal & zona waktu TernakIkan.
 * Semua "tanggal kalender" dihitung menurut Asia/Jakarta (WIB, UTC+7).
 * Format tanggal internal: 'YYYY-MM-DD'.
 */

export const APP_TIMEZONE = 'Asia/Jakarta';
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const jakartaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const jakartaTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: APP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Ubah timestamp/Date menjadi tanggal kalender Jakarta 'YYYY-MM-DD'. */
export function toJakartaDateString(input: string | Date): string {
  if (typeof input === 'string' && DATE_ONLY.test(input)) return input;
  const date = typeof input === 'string' ? new Date(input) : input;
  return jakartaDateFormatter.format(date);
}

export function getTodayJakartaString(): string {
  return toJakartaDateString(new Date());
}

/** Jam saat ini di Jakarta, format 'HH:mm'. */
export function getNowJakartaTime(): string {
  return jakartaTimeFormatter.format(new Date());
}

export function getJakartaHour(): number {
  return Number(getNowJakartaTime().slice(0, 2));
}

export function getCurrentIsoString(): string {
  return new Date().toISOString();
}

/** Gabungkan tanggal + jam WIB menjadi ISO UTC untuk disimpan. */
export function jakartaDateTimeToIso(date: string, time = '00:00'): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

function toUtcMidnight(dateStr: string): number {
  const [y, m, d] = toJakartaDateString(dateStr).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Selisih hari kalender: to - from. */
export function diffDays(fromDate: string, toDate: string): number {
  return Math.round((toUtcMidnight(toDate) - toUtcMidnight(fromDate)) / DAY_MS);
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(toUtcMidnight(dateStr) + days * DAY_MS);
  return d.toISOString().slice(0, 10);
}

/**
 * Umur ikan dengan hitungan inklusif:
 * Umur = Tanggal hari ini (WIB) - Tanggal tebar + 1.
 * Tanggal tebar = Hari ke-1.
 */
export function calculateFishAgeDays(stockingDate: string, referenceDate?: string): number {
  if (!stockingDate) return 0;
  return diffDays(stockingDate, referenceDate ?? getTodayJakartaString()) + 1;
}

export function isFutureDate(dateStr: string): boolean {
  return toJakartaDateString(dateStr) > getTodayJakartaString();
}

// ---------------------------------------------------------------------------
// Target panen
// ---------------------------------------------------------------------------

export type HarvestStatus = 'growing' | 'soon' | 'today' | 'overdue';

export interface HarvestInfo {
  targetDate: string;
  /** Umur ikan saat tanggal target (inklusif). */
  targetAgeDays: number;
  daysLeft: number;
  percent: number;
  status: HarvestStatus;
  label: string;
}

export const HARVEST_SOON_DAYS = 7;

export function getHarvestInfo(
  stockingDate: string,
  targetDate: string | null | undefined,
  referenceDate?: string
): HarvestInfo | null {
  if (!stockingDate || !targetDate) return null;
  const today = referenceDate ?? getTodayJakartaString();
  const targetAgeDays = diffDays(stockingDate, targetDate) + 1;
  const age = calculateFishAgeDays(stockingDate, today);
  const daysLeft = diffDays(today, targetDate);
  const percent = targetAgeDays > 0 ? Math.min(100, Math.max(0, (age / targetAgeDays) * 100)) : 100;

  let status: HarvestStatus;
  let label: string;
  if (daysLeft < 0) {
    status = 'overdue';
    label = `Lewat ${Math.abs(daysLeft)} hari dari target`;
  } else if (daysLeft === 0) {
    status = 'today';
    label = 'Target panen hari ini';
  } else if (daysLeft <= HARVEST_SOON_DAYS) {
    status = 'soon';
    label = `${daysLeft} hari lagi`;
  } else {
    status = 'growing';
    label = `${daysLeft} hari lagi`;
  }

  return { targetDate, targetAgeDays, daysLeft, percent, status, label };
}

// ---------------------------------------------------------------------------
// Rentang tanggal (filter riwayat)
// ---------------------------------------------------------------------------

export type PeriodKey = 'today' | 'week' | 'month' | 'all' | 'custom';

export function getPeriodRange(
  period: PeriodKey,
  custom?: { from?: string; to?: string },
  referenceDate?: string
): { from?: string; to?: string } {
  const today = referenceDate ?? getTodayJakartaString();
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'week': {
      // Minggu dimulai hari Senin
      const [y, m, d] = today.split('-').map(Number);
      const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Minggu
      const offset = (weekday + 6) % 7;
      return { from: addDaysToDateString(today, -offset), to: today };
    }
    case 'month':
      return { from: `${today.slice(0, 8)}01`, to: today };
    case 'custom':
      return { from: custom?.from || undefined, to: custom?.to || undefined };
    default:
      return {};
  }
}

export function isWithinRange(isoOrDate: string, range: { from?: string; to?: string }): boolean {
  const d = toJakartaDateString(isoOrDate);
  if (range.from && d < range.from) return false;
  if (range.to && d > range.to) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Format tampilan (Bahasa Indonesia)
// ---------------------------------------------------------------------------

function toDisplayDate(input: string | Date): Date {
  if (typeof input === 'string' && DATE_ONLY.test(input)) {
    return new Date(`${input}T12:00:00+07:00`);
  }
  return typeof input === 'string' ? new Date(input) : input;
}

export function formatIndonesianDate(
  input: string | Date | null | undefined,
  options?: { includeDayName?: boolean; long?: boolean; includeTime?: boolean }
): string {
  if (!input) return '-';
  const date = toDisplayDate(input);
  if (isNaN(date.getTime())) return String(input);

  const formatted = new Intl.DateTimeFormat('id-ID', {
    timeZone: APP_TIMEZONE,
    day: 'numeric',
    month: options?.long || options?.includeDayName ? 'long' : 'short',
    year: 'numeric',
    weekday: options?.includeDayName ? 'long' : undefined,
  }).format(date);

  return options?.includeTime ? `${formatted}, ${formatTime(date)}` : formatted;
}

export function formatTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  return jakartaTimeFormatter.format(date).replace(':', '.');
}

/** "Hari ini", "Kemarin", "3 hari lalu", atau tanggal. */
export function formatRelativeDate(input: string | Date): string {
  if (!input) return '-';
  const diff = diffDays(toJakartaDateString(input), getTodayJakartaString());
  if (diff === 0) return 'Hari ini';
  if (diff === 1) return 'Kemarin';
  if (diff > 1 && diff < 7) return `${diff} hari lalu`;
  return formatIndonesianDate(input);
}

export function getGreeting(): string {
  const h = getJakartaHour();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}
