export type DosageBasis = 'water_volume' | 'fish_count' | 'fish_biomass' | 'feed_weight';

export type BatchStatus = 'active' | 'harvested' | 'cancelled';

export type ActivityType =
  | 'feeding'
  | 'vitamin'
  | 'mortality'
  | 'water_change'
  | 'sorting'
  | 'water_check'
  | 'sampling'
  | 'other';

export interface Pond {
  id: string;
  name: string;
  location?: string | null;
  volume_liters: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CultivationBatch {
  id: string;
  pond_id: string;
  fish_type: string;
  initial_quantity: number;
  current_quantity: number;
  stocking_date: string; // YYYY-MM-DD
  target_harvest_date?: string | null; // YYYY-MM-DD
  harvest_date?: string | null;
  harvest_quantity?: number | null;
  harvest_weight_kg?: number | null;
  status: BatchStatus;
  notes?: string | null;
  // Biaya & Keuangan Sederhana
  seed_cost_idr?: number | null;
  feed_cost_idr?: number | null;
  other_cost_idr?: number | null;
  harvest_selling_price_per_kg?: number | null;
  harvest_revenue_idr?: number | null;
  fcr?: number | null;
  created_at: string;
  updated_at: string;
  // Gabungan / terhitung di memori
  pond?: Pond;
  age_days?: number;
  total_feed_kg?: number;
}

export interface FeedLog {
  id: string;
  batch_id: string;
  feed_name: string;
  quantity: number;
  unit: 'kg' | 'gram';
  cost_idr?: number | null;
  fed_at: string;
  notes?: string | null;
  created_at: string;
}

export interface VitaminProduct {
  id: string;
  name: string;
  brand?: string | null;
  application_method?: string | null;
  dosage_basis: DosageBasis;
  dosage_value: number;
  dosage_unit: string;
  reference_quantity: number;
  reference_unit: string;
  instructions?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VitaminLog {
  id: string;
  batch_id: string;
  vitamin_product_id?: string | null;
  dosage_used: number;
  dosage_unit: string;
  applied_at: string;
  notes?: string | null;
  created_at: string;
  vitamin_product?: VitaminProduct;
}

export interface ActivityLog {
  id: string;
  batch_id: string;
  activity_type: ActivityType;
  description: string;
  quantity?: number | null;
  unit?: string | null;
  recorded_at: string;
  created_at: string;
  batch?: CultivationBatch;
}

export interface VitaminCalculationInput {
  waterVolumeLiters?: number;
  fishCount?: number;
  averageWeightGram?: number;
  totalBiomassKg?: number;
  feedWeightKg?: number;
}

export interface VitaminCalculationResult {
  product: VitaminProduct;
  dosageBasis: DosageBasis;
  calculatedDosage: number;
  dosageUnit: string;
  labelRule: string;
  formulaDescription: string;
  stepBreakdown: string[];
  applicationInstructions: string | null;
  warnings: string[];
}

export interface FishSamplingCalculation {
  batchId: string;
  sampleCount: number;
  totalSampleWeightGram: number;
  averageWeightGram: number;
  estimatedTotalFish: number;
  estimatedBiomassKg: number;
  feedingRatePercent: number;
  dailyFeedKg: number;
  morningFeedKg: number;
  afternoonFeedKg: number;
  eveningFeedKg?: number;
  mealCount: 2 | 3;
}

export interface WaterCheckData {
  batchId: string;
  waterColor: 'green_light' | 'green_dark' | 'brown' | 'black_foul' | 'clear';
  fishBehavior: 'active' | 'gasping_surface' | 'sluggish' | 'flashing';
  weather: 'sunny' | 'cloudy' | 'heavy_rain';
  notes?: string;
  diagnosisTitle: string;
  recommendations: string[];
}

export interface TodayTask {
  id: string;
  batchId: string;
  pondName: string;
  fishType: string;
  title: string;
  subtitle: string;
  actionType: 'feed' | 'water_check' | 'harvest' | 'sort' | 'vitamin';
  priority: 'high' | 'medium' | 'low';
  isDone: boolean;
}

export interface DashboardSummary {
  activePondsCount: number;
  totalPondsCount: number;
  totalActiveFishPopulation: number;
  activeBatchesCount: number;
  recentActivities: ActivityLog[];
  activeBatches: CultivationBatch[];
  fedTodayBatchIds: string[];
  todayTasks: TodayTask[];
}
