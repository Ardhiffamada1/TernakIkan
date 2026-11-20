import type {
  CultivationBatch,
  DosageBasis,
  Pond,
  VitaminCalculationInput,
  VitaminCalculationResult,
  VitaminProduct,
} from '../types/index.ts';

export const DOSAGE_BASIS_LABELS: Record<DosageBasis, string> = {
  water_volume: 'Per volume air',
  fish_count: 'Per jumlah ikan',
  fish_biomass: 'Per kg berat ikan',
  feed_weight: 'Per kg pakan',
};

/** Satuan acuan yang sah untuk tiap dasar takaran, beserta faktor ke satuan dasar. */
export const REFERENCE_UNITS: Record<DosageBasis, { unit: string; label: string; factor: number }[]> = {
  water_volume: [
    { unit: 'liter', label: 'liter', factor: 1 },
    { unit: 'm3', label: 'm³ (1.000 liter)', factor: 1000 },
  ],
  fish_count: [{ unit: 'ekor', label: 'ekor', factor: 1 }],
  fish_biomass: [
    { unit: 'kg', label: 'kg', factor: 1 },
    { unit: 'gram', label: 'gram', factor: 0.001 },
  ],
  feed_weight: [
    { unit: 'kg', label: 'kg', factor: 1 },
    { unit: 'gram', label: 'gram', factor: 0.001 },
  ],
};

export const DOSAGE_UNITS = ['ml', 'liter', 'gram', 'kg', 'tablet', 'sachet', 'tetes'];

const BASE_UNIT: Record<DosageBasis, string> = {
  water_volume: 'liter',
  fish_count: 'ekor',
  fish_biomass: 'kg',
  feed_weight: 'kg',
};

const fmt = (n: number, digits = 2) =>
  n.toLocaleString('id-ID', { maximumFractionDigits: digits });

/** Normalisasi jumlah acuan label ke satuan dasar. Mengembalikan null jika satuan tidak cocok. */
export function normalizeReference(
  basis: DosageBasis,
  quantity: number,
  unit: string
): number | null {
  const match = REFERENCE_UNITS[basis]?.find((u) => u.unit === unit);
  if (!match) return null;
  return quantity * match.factor;
}

export function describeLabelRule(p: Pick<VitaminProduct, 'dosage_value' | 'dosage_unit' | 'reference_quantity' | 'reference_unit'>): string {
  return `${fmt(p.dosage_value)} ${p.dosage_unit} untuk setiap ${fmt(p.reference_quantity)} ${p.reference_unit}`;
}

type CalcOutcome = { success: true; result: VitaminCalculationResult } | { success: false; error: string };

export function calculateVitaminDosage(
  product: VitaminProduct | undefined,
  batch: CultivationBatch | undefined,
  pond: Pond | undefined,
  input: VitaminCalculationInput
): CalcOutcome {
  if (!product) return { success: false, error: 'Pilih produk vitamin terlebih dahulu.' };
  if (!batch || !pond) return { success: false, error: 'Pilih kolam terlebih dahulu.' };

  const { dosage_basis, dosage_value, dosage_unit, reference_quantity, reference_unit } = product;

  if (!(dosage_value > 0) || !(reference_quantity > 0) || !dosage_unit) {
    return {
      success: false,
      error: 'Data takaran produk belum lengkap. Periksa kembali label kemasan dan ubah data produk.',
    };
  }
  if (!REFERENCE_UNITS[dosage_basis]) {
    return { success: false, error: 'Dasar takaran produk tidak dikenali.' };
  }

  const refBase = normalizeReference(dosage_basis, reference_quantity, reference_unit);
  if (refBase === null) {
    return {
      success: false,
      error: `Satuan acuan "${reference_unit}" tidak cocok dengan dasar takaran "${DOSAGE_BASIS_LABELS[dosage_basis]}". Ubah data produk.`,
    };
  }

  const base = BASE_UNIT[dosage_basis];
  const steps: string[] = [];
  const warnings: string[] = [];
  let actual = 0;
  let actualLabel = '';
  let formula = '';

  switch (dosage_basis) {
    case 'water_volume': {
      actual = input.waterVolumeLiters ?? 0;
      if (!(actual > 0)) return { success: false, error: 'Isi volume air kolam (liter).' };
      actualLabel = 'Volume air';
      formula = '(Volume air ÷ Volume acuan) × Takaran label';
      break;
    }
    case 'fish_count': {
      actual = input.fishCount ?? 0;
      if (!(actual > 0)) return { success: false, error: 'Isi jumlah ikan (ekor).' };
      actualLabel = 'Jumlah ikan';
      formula = '(Jumlah ikan ÷ Jumlah acuan) × Takaran label';
      break;
    }
    case 'fish_biomass': {
      if (input.totalBiomassKg && input.totalBiomassKg > 0) {
        actual = input.totalBiomassKg;
      } else if (input.averageWeightGram && input.averageWeightGram > 0 && input.fishCount && input.fishCount > 0) {
        actual = (input.fishCount * input.averageWeightGram) / 1000;
        steps.push(
          `Berat total ikan = ${fmt(input.fishCount, 0)} ekor × ${fmt(input.averageWeightGram)} gram = ${fmt(actual)} kg`
        );
        warnings.push('Berat total adalah perkiraan dari berat rata-rata. Timbang sampel ikan agar lebih tepat.');
      } else {
        return {
          success: false,
          error: 'Produk ini dihitung dari berat ikan. Isi berat total ikan (kg), atau berat rata-rata per ekor (gram) dan jumlah ikan.',
        };
      }
      actualLabel = 'Berat total ikan';
      formula = '(Berat ikan ÷ Berat acuan) × Takaran label';
      break;
    }
    case 'feed_weight': {
      actual = input.feedWeightKg ?? 0;
      if (!(actual > 0)) return { success: false, error: 'Isi jumlah pakan yang akan dicampur (kg).' };
      actualLabel = 'Jumlah pakan';
      formula = '(Jumlah pakan ÷ Pakan acuan) × Takaran label';
      break;
    }
  }

  const raw = (actual / refBase) * dosage_value;
  const rounded = Math.round(raw * 100) / 100;

  steps.push(`${actualLabel}: ${fmt(actual)} ${base}`);
  if (refBase !== reference_quantity) {
    steps.push(`Acuan label: ${fmt(reference_quantity)} ${reference_unit} = ${fmt(refBase, 4)} ${base}`);
  }
  steps.push(`(${fmt(actual)} ÷ ${fmt(refBase, 4)}) × ${fmt(dosage_value)} ${dosage_unit} = ${fmt(rounded)} ${dosage_unit}`);

  if (rounded <= 0) {
    return { success: false, error: 'Hasil takaran terlalu kecil untuk diukur. Periksa kembali angka yang diisi.' };
  }
  if (['tablet', 'sachet', 'tetes'].includes(dosage_unit) && !Number.isInteger(rounded)) {
    warnings.push(`Hasil tidak bulat. Ikuti petunjuk label tentang cara membagi ${dosage_unit}.`);
  }

  return {
    success: true,
    result: {
      product,
      dosageBasis: dosage_basis,
      calculatedDosage: rounded,
      dosageUnit: dosage_unit,
      labelRule: describeLabelRule(product),
      formulaDescription: formula,
      stepBreakdown: steps,
      applicationInstructions: product.instructions || null,
      warnings,
    },
  };
}
