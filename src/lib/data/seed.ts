import type { ActivityLog, CultivationBatch, FeedLog, Pond, VitaminLog, VitaminProduct } from '@/types';
import { addDaysToDateString, getTodayJakartaString, jakartaDateTimeToIso } from '@/lib/timezone';

function daysAgo(n: number): string {
  return addDaysToDateString(getTodayJakartaString(), -n);
}

function at(n: number, time: string): string {
  return jakartaDateTimeToIso(daysAgo(n), time);
}

export function buildSeed() {
  const ponds: Pond[] = [
    {
      id: 'p-1',
      name: 'Kolam Terpal A1',
      location: 'Halaman Belakang Timur',
      volume_liters: 4000,
      notes: 'Kolam bundar diameter 3m x tinggi 1m dengan aerasi uniring',
      created_at: at(60, '08:00'),
      updated_at: at(60, '08:00'),
    },
    {
      id: 'p-2',
      name: 'Kolam Beton B1',
      location: 'Area Pembesaran Barat',
      volume_liters: 8000,
      notes: 'Kolam semen persegi 4x2m dalam 1.2m',
      created_at: at(90, '08:00'),
      updated_at: at(90, '08:00'),
    },
    {
      id: 'p-3',
      name: 'Kolam Terpal A2',
      location: 'Halaman Belakang Barat',
      volume_liters: 4000,
      notes: 'Kolam cadangan untuk sortir dan bibit baru',
      created_at: at(120, '08:00'),
      updated_at: at(120, '08:00'),
    },
  ];

  const batches: CultivationBatch[] = [
    {
      id: 'b-1',
      pond_id: 'p-1',
      fish_type: 'Lele Sangkuriang',
      initial_quantity: 3000,
      current_quantity: 2890,
      stocking_date: daysAgo(24),
      target_harvest_date: addDaysToDateString(daysAgo(24), 70), // Target panen umur 70 hari (sisa ~46 hari)
      status: 'active',
      notes: 'Bibit ukuran 5-7 cm dari pembenih Sukabumi, aktif sehat',
      seed_cost_idr: 600000, // Rp 200 / ekor
      feed_cost_idr: 780000, // 2 sak pelet
      other_cost_idr: 50000, // probiotik
      created_at: at(24, '08:00'),
      updated_at: at(1, '10:00'),
    },
    {
      id: 'b-2',
      pond_id: 'p-2',
      fish_type: 'Nila Merah Gesit',
      initial_quantity: 1500,
      current_quantity: 1475,
      stocking_date: daysAgo(83),
      target_harvest_date: addDaysToDateString(daysAgo(83), 90), // Sisa 7 hari lagi! (Mendekati panen)
      status: 'active',
      notes: 'Monoseks jantan, bobot awal 15 gram',
      seed_cost_idr: 750000, // Rp 500 / ekor
      feed_cost_idr: 2800000, // pakan pembesaran
      other_cost_idr: 100000,
      created_at: at(83, '08:00'),
      updated_at: at(2, '07:00'),
    },
    {
      id: 'b-3',
      pond_id: 'p-3',
      fish_type: 'Patin Siam',
      initial_quantity: 1000,
      current_quantity: 940,
      stocking_date: daysAgo(115),
      target_harvest_date: daysAgo(10),
      harvest_date: daysAgo(8),
      harvest_quantity: 940,
      harvest_weight_kg: 580,
      harvest_selling_price_per_kg: 24000, // Rp 24.000 / kg
      harvest_revenue_idr: 13920000, // 580 kg * 24.000 = Rp 13.920.000
      seed_cost_idr: 500000,
      feed_cost_idr: 8120000, // 670 kg pakan (FCR ~ 1.15)
      other_cost_idr: 200000,
      fcr: 1.15,
      status: 'harvested',
      notes: 'Panen sukses, FCR sangat bagus 1.15. Kolam siap dibersihkan untuk siklus baru.',
      created_at: at(115, '08:00'),
      updated_at: at(8, '10:00'),
    },
  ];

  const feedLogs: FeedLog[] = [
    { id: 'fl-1', batch_id: 'b-1', feed_name: 'Pelet PF-1000', quantity: 2.5, unit: 'kg', cost_idr: 32500, fed_at: at(0, '07:30'), notes: 'Pakan pagi nafsu makan tinggi', created_at: at(0, '07:30') },
    { id: 'fl-2', batch_id: 'b-1', feed_name: 'Pelet PF-1000', quantity: 2.5, unit: 'kg', cost_idr: 32500, fed_at: at(1, '16:30'), notes: 'Pakan sore dibibis vitamin', created_at: at(1, '16:30') },
    { id: 'fl-3', batch_id: 'b-2', feed_name: 'Pelet 781-2', quantity: 4.0, unit: 'kg', cost_idr: 52000, fed_at: at(1, '16:00'), notes: 'Pakan sore pembesaran akhir', created_at: at(1, '16:00') },
    { id: 'fl-4', batch_id: 'b-2', feed_name: 'Pelet 781-2', quantity: 4.0, unit: 'kg', cost_idr: 52000, fed_at: at(2, '07:00'), notes: null, created_at: at(2, '07:00') },
  ];

  const vitaminProducts: VitaminProduct[] = [
    {
      id: 'v-1',
      name: 'Inapro-V Vitamin Kompleks',
      brand: 'Indovet',
      application_method: 'Campur Pakan (Bibis)',
      dosage_basis: 'feed_weight',
      dosage_value: 5,
      dosage_unit: 'gram',
      reference_quantity: 1,
      reference_unit: 'kg',
      instructions: 'Larutkan 5 gram ke 100 ml air bersih, semprotkan merata ke 1 kg pelet, angin-anginkan 10 menit sebelum diberikan.',
      created_at: at(60, '08:00'),
      updated_at: at(60, '08:00'),
    },
    {
      id: 'v-2',
      name: 'Booster Vitaliquid',
      brand: 'Booster Fish Health',
      application_method: 'Larutkan ke Air Kolam',
      dosage_basis: 'water_volume',
      dosage_value: 10,
      dosage_unit: 'ml',
      reference_quantity: 1000,
      reference_unit: 'liter',
      instructions: 'Campurkan 10 ml Vitaliquid per 1.000 liter air ke dalam ember, siramkan merata ke permukaan air kolam pagi hari.',
      created_at: at(60, '08:00'),
      updated_at: at(60, '08:00'),
    },
  ];

  const vitaminLogs: VitaminLog[] = [
    {
      id: 'vl-1',
      batch_id: 'b-1',
      vitamin_product_id: 'v-1',
      dosage_used: 12.5,
      dosage_unit: 'gram',
      applied_at: at(1, '16:30'),
      notes: 'Bibis pakan 2.5 kg PF-1000',
      created_at: at(1, '16:30'),
    },
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: 'act-1',
      batch_id: 'b-1',
      activity_type: 'feeding',
      description: 'Beri pakan Pelet PF-1000 (Pagi)',
      quantity: 2.5,
      unit: 'kg',
      recorded_at: at(0, '07:30'),
      created_at: at(0, '07:30'),
    },
    {
      id: 'act-2',
      batch_id: 'b-1',
      activity_type: 'feeding',
      description: 'Beri pakan Pelet PF-1000 (Sore)',
      quantity: 2.5,
      unit: 'kg',
      recorded_at: at(1, '16:30'),
      created_at: at(1, '16:30'),
    },
    {
      id: 'act-3',
      batch_id: 'b-1',
      activity_type: 'vitamin',
      description: 'Aplikasi Inapro-V Vitamin Kompleks via bibis pakan',
      quantity: 12.5,
      unit: 'gram',
      recorded_at: at(1, '16:30'),
      created_at: at(1, '16:30'),
    },
    {
      id: 'act-4',
      batch_id: 'b-1',
      activity_type: 'mortality',
      description: 'Kematian ikan 15 ekor (pasca hujan lebat malam)',
      quantity: 15,
      unit: 'ekor',
      recorded_at: at(2, '10:00'),
      created_at: at(2, '10:00'),
    },
    {
      id: 'act-5',
      batch_id: 'b-2',
      activity_type: 'water_check',
      description: 'Cek air: Hijau cerah stabil, nafsu makan nila sangat lahap',
      quantity: null,
      unit: null,
      recorded_at: at(2, '14:00'),
      created_at: at(2, '14:00'),
    },
    {
      id: 'act-6',
      batch_id: 'b-2',
      activity_type: 'water_change',
      description: 'Sipon kotoran dasar & ganti air kolam 30%',
      quantity: 2400,
      unit: 'liter',
      recorded_at: at(5, '08:00'),
      created_at: at(5, '08:00'),
    },
  ];

  return {
    ponds,
    batches,
    feedLogs,
    vitaminProducts,
    vitaminLogs,
    activityLogs,
  };
}
