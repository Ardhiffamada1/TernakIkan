import { FishSamplingCalculation } from '@/types';

export function calculateDailyFeedFromSampling(input: {
  batchId: string;
  sampleCount: number;
  totalSampleWeightGram: number;
  currentFishCount: number;
  feedingRatePercent: number; // e.g. 3, 4, 5
  mealCount: 2 | 3;
}): FishSamplingCalculation {
  const sampleCount = Math.max(1, input.sampleCount);
  const averageWeightGram = Math.round((input.totalSampleWeightGram / sampleCount) * 10) / 10;
  const estimatedBiomassKg = Math.round(((input.currentFishCount * averageWeightGram) / 1000) * 100) / 100;

  const rate = Math.max(0.5, Math.min(10, input.feedingRatePercent));
  const dailyFeedKg = Math.round((estimatedBiomassKg * (rate / 100)) * 100) / 100;

  let morningFeedKg = 0;
  let afternoonFeedKg = 0;
  let eveningFeedKg: number | undefined = undefined;

  if (input.mealCount === 2) {
    // 2x makan: Pagi (45%), Sore (55%)
    morningFeedKg = Math.round((dailyFeedKg * 0.45) * 100) / 100;
    afternoonFeedKg = Math.round((dailyFeedKg - morningFeedKg) * 100) / 100;
  } else {
    // 3x makan: Pagi (30%), Siang (30%), Sore (40%)
    morningFeedKg = Math.round((dailyFeedKg * 0.3) * 100) / 100;
    afternoonFeedKg = Math.round((dailyFeedKg * 0.3) * 100) / 100;
    eveningFeedKg = Math.round((dailyFeedKg - morningFeedKg - afternoonFeedKg) * 100) / 100;
  }

  return {
    batchId: input.batchId,
    sampleCount,
    totalSampleWeightGram: input.totalSampleWeightGram,
    averageWeightGram,
    estimatedTotalFish: input.currentFishCount,
    estimatedBiomassKg,
    feedingRatePercent: rate,
    dailyFeedKg,
    morningFeedKg,
    afternoonFeedKg,
    eveningFeedKg,
    mealCount: input.mealCount,
  };
}
