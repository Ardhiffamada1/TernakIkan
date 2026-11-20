/**
 * Aturan bisnis murni (tanpa I/O) agar bisa diuji langsung.
 */

/** Kurangi populasi karena kematian. Menolak angka tidak valid atau yang membuat populasi negatif. */
export function applyMortality(currentQuantity: number, deadCount: number): number {
  if (!Number.isInteger(deadCount) || deadCount <= 0) {
    throw new Error('Jumlah ikan mati harus bilangan bulat lebih dari 0.');
  }
  if (deadCount > currentQuantity) {
    throw new Error(
      `Jumlah ikan mati (${deadCount}) melebihi perkiraan jumlah ikan saat ini (${currentQuantity} ekor).`
    );
  }
  return currentQuantity - deadCount;
}

/** Target panen harus setelah tanggal tebar. Mengembalikan pesan galat atau null. */
export function validateHarvestTarget(stockingDate: string, targetDate: string | null | undefined): string | null {
  if (!targetDate) return null;
  if (targetDate <= stockingDate) return 'Target panen harus setelah tanggal tebar.';
  return null;
}

/**
 * Ubah teks angka gaya Indonesia menjadi number.
 * "2,5" → 2.5 · "4.000" → 4000 · "1.500,75" → 1500.75 · "2.5" → 2.5
 */
export function parseNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return NaN;
  let s = String(value).trim().replace(/\s/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return Number(s);
}
