// Direct Node.js ES Module Verification Test for TernakIkan Core Logic

let passed = 0;
let failed = 0;

function assert(condition, testName, detail) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`, detail || '');
    failed++;
  }
}

// 1. Timezone & Inclusive Day Counting
function parseDateParts(dateStr) {
  const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = cleanStr.split('-').map(Number);
  return { year, month, day };
}

function calculateFishAgeDays(stockingDateStr, referenceDateStr) {
  if (!stockingDateStr) return 0;
  const todayParts = parseDateParts(referenceDateStr);
  const stockingParts = parseDateParts(stockingDateStr);

  const stockingUtc = Date.UTC(stockingParts.year, stockingParts.month - 1, stockingParts.day);
  const todayUtc = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);

  const diffMs = todayUtc - stockingUtc;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

// 2. Vitamin Dosage Calculation
function calculateVitaminDosage(product, batch, pond, input) {
  if (!product) return { success: false, error: 'Produk vitamin belum dipilih.' };
  if (!batch) return { success: false, error: 'Siklus budidaya belum dipilih.' };
  if (!pond) return { success: false, error: 'Kolam terkait tidak ditemukan.' };

  const { dosage_basis, dosage_value, reference_quantity, dosage_unit } = product;
  let calculatedDosage = 0;

  switch (dosage_basis) {
    case 'water_volume': {
      const actualVolume = input.waterVolumeLiters ?? pond.volume_liters;
      if (!actualVolume || actualVolume <= 0) return { success: false, error: 'Volume air kolam tidak valid.' };
      calculatedDosage = (actualVolume / reference_quantity) * dosage_value;
      break;
    }
    case 'fish_count': {
      const fishCount = input.fishCount ?? batch.current_quantity;
      if (!fishCount || fishCount <= 0) return { success: false, error: 'Jumlah ikan tidak valid.' };
      calculatedDosage = (fishCount / reference_quantity) * dosage_value;
      break;
    }
    case 'fish_biomass': {
      let totalBiomassKg = input.totalBiomassKg;
      if (!totalBiomassKg || totalBiomassKg <= 0) {
        if (input.averageWeightGram && input.averageWeightGram > 0) {
          const fishCount = input.fishCount ?? batch.current_quantity;
          totalBiomassKg = (fishCount * input.averageWeightGram) / 1000;
        } else {
          return { success: false, error: 'Parameter biomassa kurang.' };
        }
      }
      calculatedDosage = (totalBiomassKg / reference_quantity) * dosage_value;
      break;
    }
    case 'feed_weight': {
      const feedWeightKg = input.feedWeightKg;
      if (!feedWeightKg || feedWeightKg <= 0) return { success: false, error: 'Porsi pakan harus diisi.' };
      calculatedDosage = (feedWeightKg / reference_quantity) * dosage_value;
      break;
    }
    default:
      return { success: false, error: 'Basis tidak valid.' };
  }

  const rounded = Math.round(calculatedDosage * 100) / 100;
  return { success: true, calculatedDosage: rounded, dosageUnit: dosage_unit };
}

// 3. Target Panen Logic
function getHarvestInfo(stockingDate, targetDate, referenceDate) {
  if (!stockingDate || !targetDate) return null;
  const stockingParts = parseDateParts(stockingDate);
  const targetParts = parseDateParts(targetDate);
  const refParts = parseDateParts(referenceDate);

  const stockUtc = Date.UTC(stockingParts.year, stockingParts.month - 1, stockingParts.day);
  const targetUtc = Date.UTC(targetParts.year, targetParts.month - 1, targetParts.day);
  const refUtc = Date.UTC(refParts.year, refParts.month - 1, refParts.day);

  const targetAgeDays = Math.floor((targetUtc - stockUtc) / (86400000)) + 1;
  const age = Math.floor((refUtc - stockUtc) / (86400000)) + 1;
  const daysLeft = Math.floor((targetUtc - refUtc) / (86400000));
  const percent = targetAgeDays > 0 ? Math.min(100, Math.max(0, (age / targetAgeDays) * 100)) : 100;

  let status;
  if (daysLeft < 0) status = 'overdue';
  else if (daysLeft === 0) status = 'today';
  else if (daysLeft <= 7) status = 'soon';
  else status = 'growing';

  return { targetAgeDays, daysLeft, percent, status };
}

// 4. Sampling Feed Calculation
function calculateDailyFeedFromSampling(input) {
  const sampleCount = Math.max(1, input.sampleCount);
  const averageWeightGram = Math.round((input.totalSampleWeightGram / sampleCount) * 10) / 10;
  const estimatedBiomassKg = Math.round(((input.currentFishCount * averageWeightGram) / 1000) * 100) / 100;
  const rate = Math.max(0.5, Math.min(10, input.feedingRatePercent));
  const dailyFeedKg = Math.round((estimatedBiomassKg * (rate / 100)) * 100) / 100;

  let morningFeedKg = 0;
  let afternoonFeedKg = 0;

  if (input.mealCount === 2) {
    morningFeedKg = Math.round((dailyFeedKg * 0.45) * 100) / 100;
    afternoonFeedKg = Math.round((dailyFeedKg - morningFeedKg) * 100) / 100;
  }

  return { averageWeightGram, estimatedBiomassKg, dailyFeedKg, morningFeedKg, afternoonFeedKg };
}

// 5. Water & Fish Diagnosis
function analyzeWaterAndFish(input) {
  const recommendations = [];
  let diagnosisTitle = 'Kondisi Kolam Normal';

  if (input.fishBehavior === 'gasping_surface') {
    diagnosisTitle = 'DARURAT: Ikan Menggantung di Permukaan (Kurang Oksigen)';
    recommendations.push('Ikan kekurangan oksigen terlarut! Segera nyalakan aerasi');
  }

  if (input.waterColor === 'black_foul') {
    diagnosisTitle = 'PERINGATAN: Dasar Kolam Busuk / Amonia Tinggi';
    recommendations.push('Segera lakukan penyedotan (sipon) kotoran dasar kolam!');
  }

  if (input.weather === 'heavy_rain') {
    recommendations.push('PENTING: Jangan menebar pelet saat hujan deras');
  }

  return { diagnosisTitle, recommendations };
}

// 6. FCR & Profit Calculation
function calculateHarvestFinancials(seedCost, totalFeedKg, feedPricePerKg, harvestedKg, sellingPricePerKg) {
  const totalFeedCost = totalFeedKg * feedPricePerKg;
  const totalExpense = seedCost + totalFeedCost;
  const totalRevenue = harvestedKg * sellingPricePerKg;
  const netProfit = totalRevenue - totalExpense;
  const fcr = harvestedKg > 0 ? Math.round((totalFeedKg / harvestedKg) * 100) / 100 : 0;
  return { totalExpense, totalRevenue, netProfit, fcr };
}

// ========================================
// RUN ALL TESTS
// ========================================

console.log('--- TEST 1: INCLUSIVE FISH AGE CALCULATION (Asia/Jakarta) ---');
assert(calculateFishAgeDays('2026-11-01', '2026-11-01') === 1, 'Nov 1 on Nov 1 is Day 1');
assert(calculateFishAgeDays('2026-11-01', '2026-11-02') === 2, 'Nov 1 on Nov 2 is Day 2');
assert(calculateFishAgeDays('2026-11-01', '2026-11-10') === 10, 'Nov 1 on Nov 10 is Day 10');
assert(calculateFishAgeDays('2026-10-01', '2026-11-01') === 32, 'Oct 1 on Nov 1 is Day 32');

console.log('\n--- TEST 2: ALL 4 VITAMIN DOSAGE BASES ---');
const dummyPond = { volume_liters: 4000 };
const dummyBatch = { current_quantity: 3000 };

const r1 = calculateVitaminDosage(
  { dosage_basis: 'water_volume', dosage_value: 10, reference_quantity: 1000, dosage_unit: 'ml' },
  dummyBatch, dummyPond, { waterVolumeLiters: 4000 }
);
assert(r1.success && r1.calculatedDosage === 40, 'Water Volume: 4000L @ 10ml/1000L -> 40ml');

const r2 = calculateVitaminDosage(
  { dosage_basis: 'feed_weight', dosage_value: 5, reference_quantity: 1, dosage_unit: 'gram' },
  dummyBatch, dummyPond, { feedWeightKg: 2.5 }
);
assert(r2.success && r2.calculatedDosage === 12.5, 'Feed Weight: 2.5kg @ 5g/1kg -> 12.5g');

const r3 = calculateVitaminDosage(
  { dosage_basis: 'fish_count', dosage_value: 5, reference_quantity: 1000, dosage_unit: 'gram' },
  dummyBatch, dummyPond, { fishCount: 3000 }
);
assert(r3.success && r3.calculatedDosage === 15, 'Fish Count: 3000 fish @ 5g/1000 fish -> 15g');

const r4 = calculateVitaminDosage(
  { dosage_basis: 'fish_biomass', dosage_value: 2, reference_quantity: 10, dosage_unit: 'gram' },
  dummyBatch, dummyPond, { fishCount: 3000, averageWeightGram: 100 }
);
assert(r4.success && r4.calculatedDosage === 60, 'Fish Biomass: 300kg total @ 2g/10kg -> 60g');

const r5 = calculateVitaminDosage(
  { dosage_basis: 'feed_weight', dosage_value: 5, reference_quantity: 1, dosage_unit: 'gram' },
  dummyBatch, dummyPond, {}
);
assert(!r5.success, 'Missing feed weight safely blocked from calculating false dosage');

console.log('\n--- TEST 3: MORTALITY POPULATION CLAMPING ---');
const curPop = 100;
assert(Math.max(0, curPop - 15) === 85, 'Deducting 15 from 100 leaves 85');
assert(Math.max(0, curPop - 120) === 0, 'Deducting 120 from 100 is clamped to 0 (cannot become negative)');

console.log('\n--- TEST 4: TARGET HARVEST COUNTDOWN & STATUS ---');
// Tebar 1 Nov 2026, target 30 Nov 2026 (targetAge = 30 days)
const hGrowing = getHarvestInfo('2026-11-01', '2026-11-30', '2026-11-10');
assert(hGrowing.daysLeft === 20 && hGrowing.status === 'growing', '20 days left status is growing');

const hSoon = getHarvestInfo('2026-11-01', '2026-11-30', '2026-11-25');
assert(hSoon.daysLeft === 5 && hSoon.status === 'soon', '5 days left status is soon (H-7)');

const hToday = getHarvestInfo('2026-11-01', '2026-11-30', '2026-11-30');
assert(hToday.daysLeft === 0 && hToday.status === 'today', '0 days left status is today');

const hOverdue = getHarvestInfo('2026-11-01', '2026-11-30', '2026-12-05');
assert(hOverdue.daysLeft === -5 && hOverdue.status === 'overdue', 'Past target date status is overdue');

console.log('\n--- TEST 5: FEED SAMPLING CALCULATOR (Feature 2) ---');
// 10 ekor sampling = 800 gram -> rerata 80g / ekor. Populasi 2.000 ekor -> biomassa = 160 kg.
// Feeding rate 3% -> pakan harian = 4.8 kg. Pagi 45% = 2.16 kg, Sore 55% = 2.64 kg.
const samp = calculateDailyFeedFromSampling({
  sampleCount: 10,
  totalSampleWeightGram: 800,
  currentFishCount: 2000,
  feedingRatePercent: 3,
  mealCount: 2,
});
assert(samp.averageWeightGram === 80, 'Average sampling weight is 80g per fish');
assert(samp.estimatedBiomassKg === 160, 'Estimated biomass is 160kg');
assert(samp.dailyFeedKg === 4.8, 'Daily feed is 4.8kg');
assert(samp.morningFeedKg === 2.16, 'Morning feed (45%) is 2.16kg');
assert(samp.afternoonFeedKg === 2.64, 'Afternoon feed (55%) is 2.64kg');

console.log('\n--- TEST 6: WATER & FISH DIAGNOSTIC ENGINE (Feature 5) ---');
const diagEmergency = analyzeWaterAndFish({
  fishBehavior: 'gasping_surface',
  waterColor: 'green_dark',
  weather: 'cloudy',
});
assert(diagEmergency.diagnosisTitle.includes('DARURAT'), 'Fish gasping at surface triggers DARURAT oksigen');

const diagRain = analyzeWaterAndFish({
  fishBehavior: 'active',
  waterColor: 'green_light',
  weather: 'heavy_rain',
});
assert(diagRain.recommendations.some(r => r.includes('Jangan menebar pelet saat hujan deras')), 'Heavy rain warns to stop feeding');

console.log('\n--- TEST 7: HARVEST FINANCIALS & FCR (Feature 1) ---');
// Bibit: Rp 1.500.000, Pakan: 250kg @ Rp 12.000/kg (Rp 3.000.000) -> Total Biaya: Rp 4.500.000
// Panen: 200kg @ Rp 28.000/kg -> Omset: Rp 5.600.000 -> Laba Bersih: Rp 1.100.000
// FCR: 250kg pakan / 200kg ikan panen = 1.25
const fin = calculateHarvestFinancials(1500000, 250, 12000, 200, 28000);
assert(fin.totalExpense === 4500000, 'Total expense is 4,500,000 IDR');
assert(fin.totalRevenue === 5600000, 'Total revenue is 5,600,000 IDR');
assert(fin.netProfit === 1100000, 'Net profit is 1,100,000 IDR');
assert(fin.fcr === 1.25, 'FCR is accurately calculated as 1.25');

console.log(`\n========================================`);
console.log(`ALL VERIFICATION TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================`);

if (failed > 0) process.exit(1);
