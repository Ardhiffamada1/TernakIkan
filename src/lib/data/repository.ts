import type {
  ActivityLog,
  ActivityType,
  CultivationBatch,
  DashboardSummary,
  FeedLog,
  Pond,
  TodayTask,
  VitaminLog,
  VitaminProduct,
  WaterCheckData,
} from '@/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { buildSeed } from './seed';
import {
  calculateFishAgeDays,
  diffDays,
  getCurrentIsoString,
  getHarvestInfo,
  getTodayJakartaString,
  isWithinRange,
  jakartaDateTimeToIso,
  toJakartaDateString,
} from '@/lib/timezone';
import { applyMortality, validateHarvestTarget } from '@/lib/rules';

// ---------------------------------------------------------------------------
// Infrastruktur Penyimpanan
// ---------------------------------------------------------------------------

type Store = ReturnType<typeof buildSeed>;
const DEMO_KEY = 'ternakikan_demo_v3';
const LEGACY_DEMO_KEY = 'fishtrack_demo_v3';
let memory: Store | null = null;

const remote = () => isSupabaseConfigured() && supabase !== null;

function db() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  return supabase;
}

function store(): Store {
  if (memory) return memory;
  if (typeof window !== 'undefined') {
    try {
      let raw = localStorage.getItem(DEMO_KEY);
      if (!raw) {
        raw = localStorage.getItem(LEGACY_DEMO_KEY);
      }
      if (raw) {
        memory = JSON.parse(raw) as Store;
        return memory;
      }
    } catch {
      /* parse error fallback */
    }
  }
  memory = buildSeed();
  persist();
  return memory;
}

function persist() {
  if (typeof window === 'undefined' || !memory) return;
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(memory));
  } catch {
    /* storage full/blocked */
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function friendly(error: { code?: string; message?: string } | null): never {
  const code = error?.code;
  const msg = error?.message ?? '';
  if (code === '23505' && msg.includes('one_active_batch')) {
    throw new Error('Kolam ini masih memiliki siklus yang berjalan. Selesaikan panen dulu sebelum tebar bibit baru.');
  }
  if (code === '23503') throw new Error('Data ini masih dipakai catatan lain sehingga tidak bisa dihapus.');
  if (code === '23514') throw new Error('Isian tidak memenuhi validasi. Periksa kembali angka dan tanggal.');
  if (code === 'P0001') throw new Error(msg);
  throw new Error(msg || 'Terjadi kesalahan. Silakan coba kembali.');
}

const nowIso = getCurrentIsoString;

export function enrichBatch(batch: CultivationBatch, pond?: Pond, totalFeedKg?: number): CultivationBatch {
  return {
    ...batch,
    age_days: calculateFishAgeDays(batch.stocking_date),
    pond: pond ?? batch.pond,
    total_feed_kg: totalFeedKg ?? batch.total_feed_kg ?? 0,
  };
}

export interface ActivityFilter {
  batchId?: string;
  pondId?: string;
  activityType?: ActivityType | 'all';
  range?: { from?: string; to?: string };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export const repository = {
  isRemote: remote,

  // ============================ KOLAM ============================
  async getPonds(): Promise<Pond[]> {
    if (remote()) {
      const { data, error } = await db().from('ponds').select('*').order('created_at', { ascending: true });
      if (error) friendly(error);
      return (data ?? []).map((p) => ({ ...p, volume_liters: Number(p.volume_liters) }));
    }
    return [...store().ponds].sort((a, b) => a.created_at.localeCompare(b.created_at));
  },

  async getPondById(id: string): Promise<Pond | null> {
    const ponds = await this.getPonds();
    return ponds.find((p) => p.id === id) ?? null;
  },

  async createPond(input: { name: string; location?: string | null; volume_liters: number; notes?: string | null }): Promise<Pond> {
    if (remote()) {
      const { data, error } = await db().from('ponds').insert(input).select().single();
      if (error) friendly(error);
      return data;
    }
    const pond: Pond = {
      id: newId(),
      name: input.name,
      location: input.location ?? null,
      volume_liters: input.volume_liters,
      notes: input.notes ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store().ponds.push(pond);
    persist();
    return pond;
  },

  async updatePond(id: string, input: { name: string; location?: string | null; volume_liters: number; notes?: string | null }): Promise<Pond> {
    if (remote()) {
      const { data, error } = await db().from('ponds').update(input).eq('id', id).select().single();
      if (error) friendly(error);
      return data;
    }
    const s = store();
    const idx = s.ponds.findIndex((p) => p.id === id);
    if (idx < 0) throw new Error('Kolam tidak ditemukan.');
    s.ponds[idx] = { ...s.ponds[idx], ...input, updated_at: nowIso() };
    persist();
    return s.ponds[idx];
  },

  async deletePond(id: string): Promise<void> {
    const batches = await this.getBatchesByPond(id);
    if (batches.length > 0) {
      throw new Error('Kolam ini memiliki riwayat siklus budidaya. Data historis dipertahankan dan tidak dapat dihapus.');
    }
    if (remote()) {
      const { error } = await db().from('ponds').delete().eq('id', id);
      if (error) friendly(error);
      return;
    }
    const s = store();
    s.ponds = s.ponds.filter((p) => p.id !== id);
    persist();
  },

  // ============================ SIKLUS ============================
  async getBatches(): Promise<CultivationBatch[]> {
    const ponds = await this.getPonds();
    const pondMap = new Map(ponds.map((p) => [p.id, p]));
    const feedLogs = await this.getFeedLogs();

    // Map total pakan dalam kg per batch
    const feedMap = new Map<string, number>();
    for (const fl of feedLogs) {
      const kg = fl.unit === 'gram' ? fl.quantity / 1000 : fl.quantity;
      feedMap.set(fl.batch_id, (feedMap.get(fl.batch_id) || 0) + kg);
    }

    let rows: CultivationBatch[];
    if (remote()) {
      const { data, error } = await db().from('cultivation_batches').select('*').order('stocking_date', { ascending: false });
      if (error) friendly(error);
      rows = (data ?? []).map((b) => ({
        ...b,
        harvest_weight_kg: b.harvest_weight_kg === null ? null : Number(b.harvest_weight_kg),
        seed_cost_idr: b.seed_cost_idr === null ? null : Number(b.seed_cost_idr),
        feed_cost_idr: b.feed_cost_idr === null ? null : Number(b.feed_cost_idr),
        other_cost_idr: b.other_cost_idr === null ? null : Number(b.other_cost_idr),
        harvest_selling_price_per_kg: b.harvest_selling_price_per_kg === null ? null : Number(b.harvest_selling_price_per_kg),
        harvest_revenue_idr: b.harvest_revenue_idr === null ? null : Number(b.harvest_revenue_idr),
        fcr: b.fcr === null ? null : Number(b.fcr),
      }));
    } else {
      rows = [...store().batches].sort((a, b) => b.stocking_date.localeCompare(a.stocking_date));
    }
    return rows.map((b) => enrichBatch(b, pondMap.get(b.pond_id), feedMap.get(b.id)));
  },

  async getActiveBatches(): Promise<CultivationBatch[]> {
    return (await this.getBatches()).filter((b) => b.status === 'active');
  },

  async getBatchesByPond(pondId: string): Promise<CultivationBatch[]> {
    return (await this.getBatches()).filter((b) => b.pond_id === pondId);
  },

  async getBatchById(id: string): Promise<CultivationBatch | null> {
    return (await this.getBatches()).find((b) => b.id === id) ?? null;
  },

  async createBatch(input: {
    pond_id: string;
    fish_type: string;
    initial_quantity: number;
    stocking_date: string;
    target_harvest_date?: string | null;
    seed_cost_idr?: number | null;
    feed_cost_idr?: number | null;
    other_cost_idr?: number | null;
    notes?: string | null;
  }): Promise<CultivationBatch> {
    if (input.stocking_date > getTodayJakartaString()) throw new Error('Tanggal tebar tidak boleh di masa depan.');
    const targetError = validateHarvestTarget(input.stocking_date, input.target_harvest_date);
    if (targetError) throw new Error(targetError);

    const existing = await this.getBatchesByPond(input.pond_id);
    if (existing.some((b) => b.status === 'active')) {
      throw new Error('Kolam ini masih memiliki siklus aktif. Tutup siklus (panen) terlebih dahulu sebelum tebar bibit baru.');
    }

    const payload = {
      pond_id: input.pond_id,
      fish_type: input.fish_type,
      initial_quantity: input.initial_quantity,
      current_quantity: input.initial_quantity,
      stocking_date: input.stocking_date,
      target_harvest_date: input.target_harvest_date || null,
      seed_cost_idr: input.seed_cost_idr ?? null,
      feed_cost_idr: input.feed_cost_idr ?? null,
      other_cost_idr: input.other_cost_idr ?? null,
      status: 'active' as const,
      notes: input.notes ?? null,
    };

    let created: CultivationBatch;
    if (remote()) {
      const { data, error } = await db().from('cultivation_batches').insert(payload).select().single();
      if (error) friendly(error);
      created = data;
    } else {
      created = { id: newId(), ...payload, created_at: nowIso(), updated_at: nowIso() };
      store().batches.push(created);
      persist();
    }

    await this.createActivityLog({
      batch_id: created.id,
      activity_type: 'other',
      description: `Tebar bibit baru: ${created.fish_type} (${created.initial_quantity.toLocaleString('id-ID')} ekor)`,
      quantity: created.initial_quantity,
      unit: 'ekor',
      recorded_at: jakartaDateTimeToIso(created.stocking_date, '08:00'),
    });

    return enrichBatch(created);
  },

  async updateBatchTarget(batchId: string, targetDate: string | null): Promise<void> {
    const batch = await this.getBatchById(batchId);
    if (!batch) throw new Error('Siklus tidak ditemukan.');
    const targetError = validateHarvestTarget(batch.stocking_date, targetDate);
    if (targetError) throw new Error(targetError);

    if (remote()) {
      const { error } = await db().from('cultivation_batches').update({ target_harvest_date: targetDate }).eq('id', batchId);
      if (error) friendly(error);
      return;
    }
    const s = store();
    s.batches = s.batches.map((b) => (b.id === batchId ? { ...b, target_harvest_date: targetDate, updated_at: nowIso() } : b));
    persist();
  },

  async updateBatchCosts(
    batchId: string,
    costs: { seed_cost_idr?: number | null; feed_cost_idr?: number | null; other_cost_idr?: number | null }
  ): Promise<void> {
    if (remote()) {
      const { error } = await db().from('cultivation_batches').update(costs).eq('id', batchId);
      if (error) friendly(error);
      return;
    }
    const s = store();
    s.batches = s.batches.map((b) => (b.id === batchId ? { ...b, ...costs, updated_at: nowIso() } : b));
    persist();
  },

  async harvestBatch(
    batchId: string,
    input: {
      harvest_date: string;
      harvest_quantity: number;
      harvest_weight_kg: number;
      harvest_selling_price_per_kg?: number | null;
      notes?: string | null;
    }
  ): Promise<void> {
    const batch = await this.getBatchById(batchId);
    if (!batch) throw new Error('Siklus tidak ditemukan.');
    if (batch.status !== 'active') throw new Error('Siklus ini sudah dipanen.');
    if (input.harvest_date < batch.stocking_date) throw new Error('Tanggal panen tidak boleh sebelum tanggal tebar.');
    if (input.harvest_date > getTodayJakartaString()) throw new Error('Tanggal panen tidak boleh di masa depan.');

    // Hitung FCR otomatis (Total Pakan Kg / Total Berat Panen Kg)
    const feedLogs = await this.getFeedLogs({ batchId });
    const totalFeedKg = feedLogs.reduce((sum, f) => sum + (f.unit === 'gram' ? f.quantity / 1000 : f.quantity), 0);
    const fcr = input.harvest_weight_kg > 0 ? Math.round((totalFeedKg / input.harvest_weight_kg) * 100) / 100 : null;

    // Hitung Pendapatan Panen
    const price = input.harvest_selling_price_per_kg ?? 0;
    const revenue = price > 0 ? Math.round(input.harvest_weight_kg * price) : null;

    const notes = input.notes ? (batch.notes ? `${batch.notes}\n[Panen]: ${input.notes}` : `[Panen]: ${input.notes}`) : batch.notes ?? null;
    const patch = {
      status: 'harvested' as const,
      harvest_date: input.harvest_date,
      harvest_quantity: input.harvest_quantity,
      harvest_weight_kg: input.harvest_weight_kg,
      harvest_selling_price_per_kg: input.harvest_selling_price_per_kg ?? null,
      harvest_revenue_idr: revenue,
      fcr,
      notes,
    };

    if (remote()) {
      const { error } = await db().from('cultivation_batches').update(patch).eq('id', batchId);
      if (error) friendly(error);
    } else {
      const s = store();
      s.batches = s.batches.map((b) => (b.id === batchId ? { ...b, ...patch, updated_at: nowIso() } : b));
      persist();
    }

    const priceText = price > 0 ? `, Rp ${price.toLocaleString('id-ID')}/kg` : '';
    const fcrText = fcr ? ` (FCR: ${fcr})` : '';

    await this.createActivityLog({
      batch_id: batchId,
      activity_type: 'other',
      description: `Panen ikan: ${input.harvest_quantity.toLocaleString('id-ID')} ekor, ${input.harvest_weight_kg} kg${priceText}${fcrText} — Siklus Selesai`,
      quantity: input.harvest_quantity,
      unit: 'ekor',
      recorded_at: jakartaDateTimeToIso(input.harvest_date, '10:00'),
    });
  },

  // ============================ PAKAN ============================
  async getFeedLogs(filter?: { batchId?: string }): Promise<FeedLog[]> {
    let rows: FeedLog[];
    if (remote()) {
      let q = db().from('feed_logs').select('*').order('fed_at', { ascending: false });
      if (filter?.batchId) q = q.eq('batch_id', filter.batchId);
      const { data, error } = await q;
      if (error) friendly(error);
      rows = (data ?? []).map((f) => ({ ...f, quantity: Number(f.quantity) }));
    } else {
      rows = store().feedLogs.filter((f) => !filter?.batchId || f.batch_id === filter.batchId);
    }
    return rows.sort((a, b) => b.fed_at.localeCompare(a.fed_at));
  },

  async createFeedLog(input: {
    batch_id: string;
    feed_name: string;
    quantity: number;
    unit: 'kg' | 'gram';
    cost_idr?: number | null;
    fed_at: string;
    notes?: string | null;
  }): Promise<void> {
    if (remote()) {
      const { error } = await db().from('feed_logs').insert(input);
      if (error) friendly(error);
      return;
    }
    const log: FeedLog = { id: newId(), ...input, notes: input.notes ?? null, created_at: nowIso() };
    store().feedLogs.push(log);
    const feedDesc = input.notes ? `Beri pakan ${log.feed_name} (${input.notes})` : `Beri pakan ${log.feed_name}`;
    store().activityLogs.push({
      id: newId(),
      batch_id: log.batch_id,
      activity_type: 'feeding',
      description: feedDesc,
      quantity: log.quantity,
      unit: log.unit,
      recorded_at: log.fed_at,
      created_at: nowIso(),
    });
    persist();
  },

  // ============================ VITAMIN ============================
  async getVitaminProducts(): Promise<VitaminProduct[]> {
    if (remote()) {
      const { data, error } = await db().from('vitamin_products').select('*').order('name');
      if (error) friendly(error);
      return (data ?? []).map((p) => ({
        ...p,
        dosage_value: Number(p.dosage_value),
        reference_quantity: Number(p.reference_quantity),
      }));
    }
    return [...store().vitaminProducts].sort((a, b) => a.name.localeCompare(b.name));
  },

  async createVitaminProduct(input: Omit<VitaminProduct, 'id' | 'created_at' | 'updated_at'>): Promise<VitaminProduct> {
    if (remote()) {
      const { data, error } = await db().from('vitamin_products').insert(input).select().single();
      if (error) friendly(error);
      return data;
    }
    const p: VitaminProduct = { id: newId(), ...input, created_at: nowIso(), updated_at: nowIso() };
    store().vitaminProducts.push(p);
    persist();
    return p;
  },

  async updateVitaminProduct(id: string, input: Omit<VitaminProduct, 'id' | 'created_at' | 'updated_at'>): Promise<void> {
    if (remote()) {
      const { error } = await db().from('vitamin_products').update(input).eq('id', id);
      if (error) friendly(error);
      return;
    }
    const s = store();
    s.vitaminProducts = s.vitaminProducts.map((p) => (p.id === id ? { ...p, ...input, updated_at: nowIso() } : p));
    persist();
  },

  async deleteVitaminProduct(id: string): Promise<void> {
    if (remote()) {
      const { error } = await db().from('vitamin_products').delete().eq('id', id);
      if (error) friendly(error);
      return;
    }
    const s = store();
    s.vitaminProducts = s.vitaminProducts.filter((p) => p.id !== id);
    s.vitaminLogs = s.vitaminLogs.map((l) => (l.vitamin_product_id === id ? { ...l, vitamin_product_id: null } : l));
    persist();
  },

  async getVitaminLogs(): Promise<VitaminLog[]> {
    if (remote()) {
      const { data, error } = await db().from('vitamin_logs').select('*').order('applied_at', { ascending: false });
      if (error) friendly(error);
      return data ?? [];
    }
    return [...store().vitaminLogs].sort((a, b) => b.applied_at.localeCompare(a.applied_at));
  },

  async createVitaminLog(input: {
    batch_id: string;
    vitamin_product_id: string;
    product_name: string;
    dosage_used: number;
    dosage_unit: string;
    applied_at: string;
    notes?: string | null;
  }): Promise<void> {
    const { product_name, ...row } = input;
    if (remote()) {
      const { error } = await db().from('vitamin_logs').insert(row);
      if (error) friendly(error);
      return;
    }
    const log: VitaminLog = { id: newId(), ...row, notes: row.notes ?? null, created_at: nowIso() };
    store().vitaminLogs.push(log);
    store().activityLogs.push({
      id: newId(),
      batch_id: log.batch_id,
      activity_type: 'vitamin',
      description: `Beri ${product_name}`,
      quantity: log.dosage_used,
      unit: log.dosage_unit,
      recorded_at: log.applied_at,
      created_at: nowIso(),
    });
    persist();
  },

  // ============================ AKTIVITAS ============================
  async getActivityLogs(filter: ActivityFilter = {}): Promise<ActivityLog[]> {
    const batches = await this.getBatches();
    const batchMap = new Map(batches.map((b) => [b.id, b]));

    let rows: ActivityLog[];
    if (remote()) {
      let q = db().from('activity_logs').select('*').order('recorded_at', { ascending: false });
      if (filter.batchId) q = q.eq('batch_id', filter.batchId);
      if (filter.activityType && filter.activityType !== 'all') q = q.eq('activity_type', filter.activityType);
      const { data, error } = await q;
      if (error) friendly(error);
      rows = (data ?? []).map((a) => ({ ...a, quantity: a.quantity === null ? null : Number(a.quantity) }));
    } else {
      rows = store().activityLogs.filter(
        (a) =>
          (!filter.batchId || a.batch_id === filter.batchId) &&
          (!filter.activityType || filter.activityType === 'all' || a.activity_type === filter.activityType)
      );
    }

    return rows
      .map((a) => ({ ...a, batch: batchMap.get(a.batch_id) }))
      .filter((a) => !filter.pondId || a.batch?.pond_id === filter.pondId)
      .filter((a) => !filter.range || isWithinRange(a.recorded_at, filter.range))
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
  },

  async createActivityLog(input: {
    batch_id: string;
    activity_type: ActivityType;
    description: string;
    quantity?: number | null;
    unit?: string | null;
    recorded_at: string;
  }): Promise<void> {
    if (input.activity_type === 'mortality') {
      const batch = await this.getBatchById(input.batch_id);
      if (!batch) throw new Error('Siklus tidak ditemukan.');
      if (batch.status !== 'active') throw new Error('Kematian hanya bisa dicatat pada siklus aktif.');
      const remaining = applyMortality(batch.current_quantity, Number(input.quantity));
      if (!remote()) {
        const s = store();
        s.batches = s.batches.map((b) => (b.id === batch.id ? { ...b, current_quantity: remaining, updated_at: nowIso() } : b));
      }
    }

    const row = {
      batch_id: input.batch_id,
      activity_type: input.activity_type,
      description: input.description,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      recorded_at: input.recorded_at,
    };

    if (remote()) {
      const { error } = await db().from('activity_logs').insert(row);
      if (error) friendly(error);
      return;
    }
    store().activityLogs.push({ id: newId(), ...row, created_at: nowIso() });
    persist();
  },

  async recordWaterCheck(data: WaterCheckData): Promise<void> {
    const summaryText = data.notes?.trim()
      ? `Cek Air & Ikan: ${data.diagnosisTitle} — Catatan: ${data.notes.trim()}`
      : `Cek Air & Ikan: ${data.diagnosisTitle}`;
    await this.createActivityLog({
      batch_id: data.batchId,
      activity_type: 'water_check',
      description: summaryText,
      recorded_at: nowIso(),
    });
  },

  // ============================ DASHBOARD & PENGINGAT HARI INI ============================
  async getDashboardSummary(): Promise<DashboardSummary> {
    const [ponds, batches] = await Promise.all([this.getPonds(), this.getBatches()]);
    const active = batches.filter((b) => b.status === 'active');
    const activities = await this.getActivityLogs();
    const today = getTodayJakartaString();

    const fedTodayBatchIds = Array.from(
      new Set(
        activities
          .filter((a) => a.activity_type === 'feeding' && toJakartaDateString(a.recorded_at) === today)
          .map((a) => a.batch_id)
      )
    );

    // =========================================================================
    // FITUR 3: Pengingat Tugas Hari Ini di Layar Utama HP
    // =========================================================================
    const todayTasks: TodayTask[] = [];

    for (const b of active) {
      const pondName = b.pond?.name || 'Kolam';
      const isFed = fedTodayBatchIds.includes(b.id);
      const harvestInfo = getHarvestInfo(b.stocking_date, b.target_harvest_date);

      // 1. Tugas Pakan Hari Ini
      todayTasks.push({
        id: `feed-${b.id}`,
        batchId: b.id,
        pondName,
        fishType: b.fish_type,
        title: isFed ? `Pakan ${pondName} sudah tercatat` : `Beri Pakan Hari Ini`,
        subtitle: isFed ? `Sudah ada pemberian pakan hari ini` : `Belum ada catatan pakan untuk ${b.fish_type}`,
        actionType: 'feed',
        priority: isFed ? 'low' : 'high',
        isDone: isFed,
      });

      // 2. Peringatan Target Panen
      if (harvestInfo) {
        if (harvestInfo.daysLeft <= 0) {
          todayTasks.push({
            id: `harvest-${b.id}`,
            batchId: b.id,
            pondName,
            fishType: b.fish_type,
            title: harvestInfo.daysLeft === 0 ? `Target Panen Hari Ini!` : `Melewati Target Panen (${Math.abs(harvestInfo.daysLeft)} hari)`,
            subtitle: `Ikan umur ${b.age_days} hari. Segera siapkan timbangan & pembeli.`,
            actionType: 'harvest',
            priority: 'high',
            isDone: false,
          });
        } else if (harvestInfo.daysLeft <= 7) {
          todayTasks.push({
            id: `harvest-${b.id}`,
            batchId: b.id,
            pondName,
            fishType: b.fish_type,
            title: `Persiapan Panen (H-${harvestInfo.daysLeft})`,
            subtitle: `Target: ${harvestInfo.targetDate}. Hubungi calon pembeli.`,
            actionType: 'harvest',
            priority: 'medium',
            isDone: false,
          });
        }
      }

      // 3. Rekomendasi Sortir Ukuran (Khusus pembesaran umur 25-30 hari atau 50-60 hari)
      const age = b.age_days ?? 0;
      if ((age >= 25 && age <= 32) || (age >= 50 && age <= 58)) {
        const hasSorted = activities.some(
          (a) => a.batch_id === b.id && a.activity_type === 'sorting' && diffDays(toJakartaDateString(a.recorded_at), today) <= 10
        );
        if (!hasSorted) {
          todayTasks.push({
            id: `sort-${b.id}`,
            batchId: b.id,
            pondName,
            fishType: b.fish_type,
            title: `Waktunya Sortir Ukuran Ikan`,
            subtitle: `Umur ${age} hari rawan kanibal/pertumbuhan tidak rata.`,
            actionType: 'sort',
            priority: 'medium',
            isDone: false,
          });
        }
      }

      // 4. Rekomendasi Cek Air / Sipon Kotoran (Jika belum ada ganti air / cek air dalam 5 hari)
      const lastWaterActivity = activities.find(
        (a) => a.batch_id === b.id && (a.activity_type === 'water_change' || a.activity_type === 'water_check')
      );
      const daysSinceWater = lastWaterActivity ? diffDays(toJakartaDateString(lastWaterActivity.recorded_at), today) : 99;
      if (daysSinceWater >= 5) {
        todayTasks.push({
          id: `water-${b.id}`,
          batchId: b.id,
          pondName,
          fishType: b.fish_type,
          title: `Cek Kondisi Air & Endapan`,
          subtitle: `Terakhir dicek ${daysSinceWater === 99 ? 'belum pernah' : `${daysSinceWater} hari lalu`}. Periksa bau dan warna.`,
          actionType: 'water_check',
          priority: 'low',
          isDone: false,
        });
      }
    }

    // Urutkan tugas: yang belum selesai (high -> medium -> low) dulu, yang sudah selesai di bawah
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    todayTasks.sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });

    return {
      activePondsCount: new Set(active.map((b) => b.pond_id)).size,
      totalPondsCount: ponds.length,
      totalActiveFishPopulation: active.reduce((sum, b) => sum + b.current_quantity, 0),
      activeBatchesCount: active.length,
      recentActivities: activities.slice(0, 7),
      activeBatches: active,
      fedTodayBatchIds,
      todayTasks,
    };
  },

  resetDemo(): void {
    memory = buildSeed();
    persist();
  },
};
