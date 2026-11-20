'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faDroplet, 
  faPenToSquare, 
  faFish, 
  faCalendarDays, 
  faCoins, 
  faUtensils, 
  faScaleBalanced, 
  faSkull, 
  faCircleCheck,
  faCircleExclamation 
} from '@fortawesome/free-solid-svg-icons';
import { Pond, CultivationBatch, FeedLog, ActivityLog } from '@/types';
import { repository } from '@/lib/data/repository';
import { calculateFishAgeDays, formatIndonesianDate, formatRelativeDate, getHarvestInfo } from '@/lib/timezone';
import { RecordFeedModal } from '@/components/modals/RecordFeedModal';
import { RecordMortalityModal } from '@/components/modals/RecordMortalityModal';
import { RecordActivityModal } from '@/components/modals/RecordActivityModal';
import { HarvestModal } from '@/components/modals/HarvestModal';
import { AddBatchModal } from '@/components/modals/AddBatchModal';
import { AddPondModal } from '@/components/modals/AddPondModal';
import { EditTargetHarvestModal } from '@/components/modals/EditTargetHarvestModal';
import { FeedSamplingModal } from '@/components/modals/FeedSamplingModal';
import { RecordWaterCheckModal } from '@/components/modals/RecordWaterCheckModal';

export default function PondDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pondId = params.id as string;

  const [pond, setPond] = useState<Pond | null>(null);
  const [batches, setBatches] = useState<CultivationBatch[]>([]);
  const [feedLogs, setFeedLogs] = useState<FeedLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [feedModalOpen, setFeedModalOpen] = useState(false);
  const [mortalityModalOpen, setMortalityModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [harvestModalOpen, setHarvestModalOpen] = useState(false);
  const [addBatchModalOpen, setAddBatchModalOpen] = useState(false);
  const [editPondModalOpen, setEditPondModalOpen] = useState(false);
  const [editTargetModalOpen, setEditTargetModalOpen] = useState(false);
  const [samplingModalOpen, setSamplingModalOpen] = useState(false);
  const [waterCheckModalOpen, setWaterCheckModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'aktivitas' | 'pakan' | 'riwayat_siklus'>('aktivitas');

  const loadData = async () => {
    try {
      setLoading(true);
      const pondData = await repository.getPondById(pondId);
      if (!pondData) {
        setPond(null);
        return;
      }
      setPond(pondData);

      const pondBatches = await repository.getBatchesByPond(pondId);
      setBatches(pondBatches);

      const activeBatch = pondBatches.find((b) => b.status === 'active');
      if (activeBatch) {
        const [feeds, activities] = await Promise.all([
          repository.getFeedLogs({ batchId: activeBatch.id }),
          repository.getActivityLogs({ batchId: activeBatch.id }),
        ]);
        setFeedLogs(feeds);
        setActivityLogs(activities);
      } else {
        setFeedLogs([]);
        setActivityLogs([]);
      }
    } catch (err) {
      console.error('Failed to load pond detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pondId]);

  const activeBatch = batches.find((b) => b.status === 'active');
  const pastBatches = batches.filter((b) => b.status === 'harvested');
  const ageDays = activeBatch ? calculateFishAgeDays(activeBatch.stocking_date) : 0;
  const harvest = activeBatch ? getHarvestInfo(activeBatch.stocking_date, activeBatch.target_harvest_date) : null;

  const totalMortality = activeBatch
    ? Math.max(0, activeBatch.initial_quantity - activeBatch.current_quantity)
    : 0;

  // Total Pakan kg
  const totalFeedKg = feedLogs.reduce((sum, f) => sum + (f.unit === 'gram' ? f.quantity / 1000 : f.quantity), 0);

  // Total Modal Tercatat (Bibit + Pakan + Lain)
  const totalCost = (activeBatch?.seed_cost_idr || 0) + (activeBatch?.feed_cost_idr || 0) + (activeBatch?.other_cost_idr || 0);

  if (loading) {
    return (
      <div className="bg-farm-surface border border-farm-border rounded-2xl p-8 text-center text-xs text-farm-muted">
        Memuat detail kolam...
      </div>
    );
  }

  if (!pond) {
    return (
      <div className="bg-farm-surface border border-farm-border rounded-2xl p-6 text-center space-y-3">
        <FontAwesomeIcon icon={faCircleExclamation} className="w-8 h-8 text-red-500 mx-auto" />
        <h2 className="text-sm font-bold text-farm-text">Kolam Tidak Ditemukan</h2>
        <Link
          href="/kolam"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
          <span>Kembali ke Kolam</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Top Header Bar */}
      <div className="space-y-2 border-b border-farm-border pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/kolam"
              className="p-2 rounded-xl bg-farm-surface border border-farm-border text-farm-muted hover:text-farm-text transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-farm-text leading-tight">
                {pond.name}
              </h1>
              <p className="text-[11px] sm:text-xs text-farm-muted flex items-center gap-1 mt-0.5">
                <FontAwesomeIcon icon={faDroplet} className="w-2.5 h-2.5 text-primary shrink-0" />
                <span>{pond.volume_liters.toLocaleString('id-ID')} Liter</span>
                {pond.location && <span>• {pond.location}</span>}
              </p>
            </div>
          </div>

          <button
            onClick={() => setEditPondModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl border border-farm-border bg-farm-surface text-farm-text text-xs font-bold flex items-center gap-1.5 min-h-[38px]"
          >
            <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3" />
            <span className="text-[11px]">Edit</span>
          </button>
        </div>

        {/* Catatan Kolam (Bahan/Ukuran) jika ada */}
        {pond.notes && (
          <div className="bg-farm-surface border border-farm-border rounded-xl px-2.5 py-1.5 text-[11px] flex items-start gap-1.5 shadow-subtle">
            <span className="font-bold text-farm-muted shrink-0">Catatan:</span>
            <span className="text-farm-text break-words leading-relaxed">{pond.notes}</span>
          </div>
        )}
      </div>

      {/* SIKLUS AKTIF CARD: Compact, Streamlined, No Overflow */}
      {activeBatch ? (
        <div className="bg-farm-surface border border-farm-border rounded-2xl p-3 sm:p-4 shadow-subtle space-y-2.5">
          {/* Top: Ikan & Prominent Umur Ikan */}
          <div className="flex items-start justify-between gap-2 border-b border-farm-border pb-2.5">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-farm-muted uppercase tracking-wider block">
                Siklus Berjalan
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-farm-text truncate mt-0.5">
                {activeBatch.fish_type}
              </h2>
              <span className="text-[11px] text-farm-muted block truncate">
                Tebar: {formatIndonesianDate(activeBatch.stocking_date)}
              </span>
            </div>

            {/* Fish Age Badge Prominent */}
            <div className="px-2.5 sm:px-3 py-1 rounded-xl bg-primary text-white text-right shrink-0 shadow-subtle">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider block text-blue-200">
                Umur Ikan
              </span>
              <span className="text-lg sm:text-xl font-black leading-tight">
                Hari ke-{ageDays}
              </span>
            </div>
          </div>

          {/* Catatan Bibit / Siklus Berjalan jika ada */}
          {activeBatch.notes && (
            <div className="bg-farm-bg border border-farm-border rounded-xl px-2.5 py-1.5 text-[11px] flex items-start gap-1.5">
              <span className="font-bold text-farm-muted shrink-0">Bibit:</span>
              <span className="text-farm-text font-medium break-words leading-relaxed">{activeBatch.notes}</span>
            </div>
          )}

          {/* TARGET TANGGAL PANEN */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-primary-soft border border-primary-border space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-primary text-[11px]">
                <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 text-primary" />
                <span>Target: {harvest ? formatIndonesianDate(harvest.targetDate) : 'Belum diatur'}</span>
              </div>

              <button
                onClick={() => setEditTargetModalOpen(true)}
                className="text-[11px] font-bold text-primary underline"
              >
                Ubah Target
              </button>
            </div>

            {harvest && (
              <>
                <div className="w-full h-1.5 rounded-full bg-white border border-primary-border overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${harvest.percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-primary/90 font-medium">
                  <span className="font-bold">{harvest.label}</span>
                  <span>Rencana siklus: {harvest.targetAgeDays} hari</span>
                </div>
              </>
            )}
          </div>

          {/* Metrik Populasi & Mortalitas (3 columns) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-farm-bg border border-farm-border">
              <span className="text-[10px] text-farm-muted block uppercase font-bold">Populasi</span>
              <span className="text-sm sm:text-base font-extrabold text-primary block mt-0.5">
                {activeBatch.current_quantity.toLocaleString('id-ID')}
              </span>
              <span className="text-[9px] text-farm-muted block truncate">dari {activeBatch.initial_quantity.toLocaleString('id-ID')}</span>
            </div>

            <div className="p-2 rounded-xl bg-farm-bg border border-farm-border">
              <span className="text-[10px] text-farm-muted block uppercase font-bold">Kematian</span>
              <span className="text-sm sm:text-base font-extrabold text-red-600 block mt-0.5">
                {totalMortality.toLocaleString('id-ID')}
              </span>
              <span className="text-[9px] text-farm-muted block">ekor</span>
            </div>

            <div className="p-2 rounded-xl bg-farm-bg border border-farm-border">
              <span className="text-[10px] text-farm-muted block uppercase font-bold">Total Pakan</span>
              <span className="text-sm sm:text-base font-extrabold text-farm-text block mt-0.5">
                {totalFeedKg.toFixed(1)}
              </span>
              <span className="text-[9px] text-farm-muted block">kg</span>
            </div>
          </div>

          {/* Catatan Modal & Biaya jika ada */}
          {totalCost > 0 && (
            <div className="p-2 rounded-xl bg-farm-bg border border-farm-border text-[11px] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-farm-muted">
                <FontAwesomeIcon icon={faCoins} className="w-3 h-3 text-primary" />
                <span>Modal Tercatat:</span>
              </div>
              <span className="font-extrabold text-farm-text">
                Rp {totalCost.toLocaleString('id-ID')}
              </span>
            </div>
          )}

          {/* Action Grid: 4 compact buttons in 1 row on mobile! */}
          <div className="pt-0.5 space-y-1.5">
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              <button
                onClick={() => setFeedModalOpen(true)}
                className="py-2 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 font-bold flex flex-col items-center justify-center gap-1 min-h-[50px] active:scale-95 transition-all shadow-subtle"
              >
                <FontAwesomeIcon icon={faUtensils} className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] leading-tight">Pakan</span>
              </button>

              <button
                onClick={() => setSamplingModalOpen(true)}
                className="py-2 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold flex flex-col items-center justify-center gap-1 min-h-[50px] active:scale-95 transition-all shadow-subtle"
              >
                <FontAwesomeIcon icon={faScaleBalanced} className="w-3.5 h-3.5 text-blue-800" />
                <span className="text-[10px] leading-tight">Sample</span>
              </button>

              <button
                onClick={() => setWaterCheckModalOpen(true)}
                className="py-2 px-1 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold flex flex-col items-center justify-center gap-1 min-h-[50px] active:scale-95 transition-all shadow-subtle"
              >
                <FontAwesomeIcon icon={faDroplet} className="w-3.5 h-3.5 text-cyan-800" />
                <span className="text-[10px] leading-tight">Cek Air</span>
              </button>

              <button
                onClick={() => setMortalityModalOpen(true)}
                className="py-2 px-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold flex flex-col items-center justify-center gap-1 min-h-[50px] active:scale-95 transition-all shadow-subtle"
              >
                <FontAwesomeIcon icon={faSkull} className="w-3.5 h-3.5 text-red-700" />
                <span className="text-[10px] leading-tight">Mati</span>
              </button>
            </div>

            {/* Tombol Panen / Tutup Siklus */}
            <button
              onClick={() => setHarvestModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 min-h-[38px] active:scale-95 transition-all"
            >
              <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5 text-amber-800" />
              <span>Panen &amp; Tutup Siklus Kolam</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty Pond */
        <div className="bg-farm-surface border border-farm-border rounded-2xl p-6 text-center space-y-3">
          <FontAwesomeIcon icon={faFish} className="w-8 h-8 text-farm-muted mx-auto" />
          <h3 className="font-bold text-sm text-farm-text">Kolam Sedang Kosong</h3>
          <p className="text-xs text-farm-muted">Siap untuk tebar bibit siklus baru.</p>
          <button
            onClick={() => setAddBatchModalOpen(true)}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-subtle min-h-[44px]"
          >
            Tebar Bibit Baru
          </button>
        </div>
      )}

      {/* TABS: AKTIVITAS, PAKAN, ARSIP PANEN */}
      <div className="space-y-2.5 pt-0.5">
        <div className="flex border-b border-farm-border text-xs">
          <button
            onClick={() => setActiveTab('aktivitas')}
            className={`flex-1 pb-2 font-bold text-center border-b-2 transition-all ${
              activeTab === 'aktivitas'
                ? 'border-primary text-primary'
                : 'border-transparent text-farm-muted'
            }`}
          >
            Aktivitas ({activityLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('pakan')}
            className={`flex-1 pb-2 font-bold text-center border-b-2 transition-all ${
              activeTab === 'pakan'
                ? 'border-primary text-primary'
                : 'border-transparent text-farm-muted'
            }`}
          >
            Pakan ({feedLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('riwayat_siklus')}
            className={`flex-1 pb-2 font-bold text-center border-b-2 transition-all ${
              activeTab === 'riwayat_siklus'
                ? 'border-primary text-primary'
                : 'border-transparent text-farm-muted'
            }`}
          >
            Panen Lalu ({pastBatches.length})
          </button>
        </div>

        {/* Tab Aktivitas */}
        {activeTab === 'aktivitas' && (
          <div className="space-y-2">
            {activityLogs.length === 0 ? (
              <div className="bg-farm-surface border border-farm-border rounded-2xl p-6 text-center text-xs text-farm-muted">
                Belum ada aktivitas tercatat.
              </div>
            ) : (
              activityLogs.map((act) => (
                <div key={act.id} className="p-3 bg-farm-surface border border-farm-border rounded-xl flex items-start justify-between gap-3 text-xs shadow-subtle">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-farm-text break-words leading-relaxed">{act.description}</p>
                    <p className="text-[11px] text-farm-muted mt-1">{formatRelativeDate(act.recorded_at)}</p>
                  </div>
                  {act.quantity !== null && act.quantity !== undefined && (
                    <span className="font-extrabold text-farm-text shrink-0 bg-farm-bg border border-farm-border px-2 py-0.5 rounded-lg text-xs">
                      {act.quantity} {act.unit || ''}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Pakan */}
        {activeTab === 'pakan' && (
          <div className="space-y-2">
            {feedLogs.length === 0 ? (
              <div className="bg-farm-surface border border-farm-border rounded-2xl p-6 text-center text-xs text-farm-muted">
                Belum ada catatan pakan pada siklus ini.
              </div>
            ) : (
              feedLogs.map((log) => (
                <div key={log.id} className="p-3 bg-farm-surface border border-farm-border rounded-xl flex items-start justify-between gap-3 text-xs shadow-subtle">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-farm-text leading-tight">{log.feed_name}</p>
                    <p className="text-[11px] text-farm-muted mt-0.5">{formatIndonesianDate(log.fed_at, { includeTime: true })}</p>
                    {log.notes && (
                      <div className="mt-1.5 p-2 rounded-lg bg-farm-bg border border-farm-border/60 text-[11px] text-farm-muted break-words leading-relaxed">
                        <strong className="text-farm-text font-semibold">Catatan:</strong> {log.notes}
                      </div>
                    )}
                  </div>
                  <span className="font-extrabold text-primary text-sm shrink-0 bg-primary-soft border border-primary-border px-2.5 py-1 rounded-xl">
                    {log.quantity} {log.unit}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab Panen Lalu */}
        {activeTab === 'riwayat_siklus' && (
          <div className="space-y-2">
            {pastBatches.length === 0 ? (
              <div className="bg-farm-surface border border-farm-border rounded-2xl p-6 text-center text-xs text-farm-muted">
                Belum ada arsip panen sebelumnya.
              </div>
            ) : (
              pastBatches.map((b) => (
                <div key={b.id} className="p-3.5 bg-farm-surface border border-farm-border rounded-xl text-xs space-y-2.5 shadow-subtle">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-farm-text">{b.fish_type}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                      Panen: {formatIndonesianDate(b.harvest_date)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-farm-divider">
                    <div>
                      <span className="text-farm-muted block">Hasil:</span>
                      <span className="font-bold text-primary">{b.harvest_quantity?.toLocaleString('id-ID')} ekor</span>
                    </div>
                    <div>
                      <span className="text-farm-muted block">Bobot:</span>
                      <span className="font-bold text-farm-text">{b.harvest_weight_kg} kg</span>
                    </div>
                    <div>
                      <span className="text-farm-muted block">FCR:</span>
                      <span className="font-bold text-primary">{b.fcr || '-'}</span>
                    </div>
                  </div>

                  {b.notes && (
                    <div className="p-2 rounded-lg bg-farm-bg border border-farm-border/60 text-[11px] text-farm-muted break-words leading-relaxed">
                      <strong className="text-farm-text font-semibold">Catatan Panen:</strong> {b.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {activeBatch && (
        <>
          <RecordFeedModal
            isOpen={feedModalOpen}
            defaultBatchId={activeBatch.id}
            onClose={() => setFeedModalOpen(false)}
            onSuccess={() => loadData()}
          />

          <RecordMortalityModal
            isOpen={mortalityModalOpen}
            defaultBatchId={activeBatch.id}
            onClose={() => setMortalityModalOpen(false)}
            onSuccess={() => loadData()}
          />

          <RecordActivityModal
            isOpen={activityModalOpen}
            defaultBatchId={activeBatch.id}
            onClose={() => setActivityModalOpen(false)}
            onSuccess={() => loadData()}
          />

          <FeedSamplingModal
            isOpen={samplingModalOpen}
            defaultBatchId={activeBatch.id}
            onClose={() => setSamplingModalOpen(false)}
            onSuccess={() => loadData()}
          />

          <RecordWaterCheckModal
            isOpen={waterCheckModalOpen}
            defaultBatchId={activeBatch.id}
            onClose={() => setWaterCheckModalOpen(false)}
            onSuccess={() => loadData()}
          />

          <EditTargetHarvestModal
            isOpen={editTargetModalOpen}
            batch={activeBatch}
            onClose={() => setEditTargetModalOpen(false)}
            onSuccess={() => loadData()}
          />

          <HarvestModal
            isOpen={harvestModalOpen}
            batch={activeBatch}
            onClose={() => setHarvestModalOpen(false)}
            onSuccess={() => loadData()}
          />
        </>
      )}

      <AddBatchModal
        isOpen={addBatchModalOpen}
        defaultPondId={pond.id}
        onClose={() => setAddBatchModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <AddPondModal
        isOpen={editPondModalOpen}
        initialPond={pond}
        onClose={() => setEditPondModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
