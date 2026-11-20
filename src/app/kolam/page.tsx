'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faLayerGroup, 
  faDroplet, 
  faChevronRight, 
  faCalendarDays 
} from '@fortawesome/free-solid-svg-icons';
import { Pond, CultivationBatch } from '@/types';
import { repository } from '@/lib/data/repository';
import { calculateFishAgeDays, formatIndonesianDate, getHarvestInfo } from '@/lib/timezone';
import { AddPondModal } from '@/components/modals/AddPondModal';
import { AddBatchModal } from '@/components/modals/AddBatchModal';

export default function KolamPage() {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [batches, setBatches] = useState<CultivationBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [addPondModalOpen, setAddPondModalOpen] = useState(false);
  const [addBatchModalOpen, setAddBatchModalOpen] = useState(false);
  const [selectedPondIdForBatch, setSelectedPondIdForBatch] = useState<string | undefined>();

  const loadData = async () => {
    try {
      setLoading(true);
      const [allPonds, allBatches] = await Promise.all([
        repository.getPonds(),
        repository.getBatches(),
      ]);
      setPonds(allPonds);
      setBatches(allBatches);
    } catch (err) {
      console.error('Failed to load ponds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getActiveBatchForPond = (pondId: string) => {
    return batches.find((b) => b.pond_id === pondId && b.status === 'active');
  };

  const getPastBatchesForPond = (pondId: string) => {
    return batches.filter((b) => b.pond_id === pondId && b.status === 'harvested');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-farm-border pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-farm-text">
            Kolam Budidaya
          </h1>
          <p className="text-xs text-farm-muted mt-0.5">
            Daftar kapasitas kolam &amp; siklus aktif
          </p>
        </div>

        <button
          onClick={() => setAddPondModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-subtle min-h-[40px] transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
          <span>Tambah</span>
        </button>
      </div>

      {/* Ponds List: 2-column grid on mobile (gap-2.5) and desktop (gap-4) */}
      {loading ? (
        <div className="bg-farm-surface border border-farm-border rounded-2xl p-8 text-center text-xs text-farm-muted">
          Memuat kolam...
        </div>
      ) : ponds.length === 0 ? (
        <div className="bg-farm-surface border border-dashed border-farm-border rounded-2xl p-8 text-center space-y-3">
          <FontAwesomeIcon icon={faLayerGroup} className="w-10 h-10 text-farm-muted mx-auto" />
          <h3 className="font-bold text-sm text-farm-text">Belum Ada Kolam</h3>
          <p className="text-xs text-farm-muted max-w-xs mx-auto">
            Daftarkan kolam pertama Anda untuk mulai mencatat siklus ikan.
          </p>
          <button
            onClick={() => setAddPondModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-subtle min-h-[44px]"
          >
            <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
            <span>Tambah Kolam Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 md:gap-4">
          {ponds.map((pond) => {
            const activeBatch = getActiveBatchForPond(pond.id);
            const pastBatches = getPastBatchesForPond(pond.id);
            const ageDays = activeBatch ? calculateFishAgeDays(activeBatch.stocking_date) : 0;
            const harvest = activeBatch ? getHarvestInfo(activeBatch.stocking_date, activeBatch.target_harvest_date) : null;

            return (
              <div
                key={pond.id}
                className="bg-farm-surface border border-farm-border rounded-2xl p-3 md:p-4 shadow-subtle flex flex-col justify-between group hover:border-primary/50 transition-all"
              >
                <div className="space-y-2">
                  {/* Pond Top Header: Name & Status */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-base font-extrabold text-farm-text truncate leading-tight">
                        {pond.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-farm-muted flex items-center gap-1 mt-0.5 truncate">
                        <FontAwesomeIcon icon={faDroplet} className="w-2.5 h-2.5 text-primary shrink-0" />
                        <span className="truncate">{pond.volume_liters.toLocaleString('id-ID')} L</span>
                        {pond.location && <span className="hidden sm:inline">• {pond.location}</span>}
                      </p>
                    </div>

                    {activeBatch ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                        Aktif
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-farm-bg text-farm-muted border border-farm-border shrink-0">
                        Kosong
                      </span>
                    )}
                  </div>

                  {/* Active Batch Summary / Empty Box */}
                  {activeBatch ? (
                    <div className="p-2 sm:p-3 rounded-xl bg-farm-bg border border-farm-border space-y-1.5 text-xs">
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <span className="font-extrabold text-xs sm:text-sm text-farm-text block truncate leading-tight">
                            {activeBatch.fish_type}
                          </span>
                          <span className="text-farm-muted text-[10px] sm:text-[11px] block truncate mt-0.5">
                            {activeBatch.current_quantity.toLocaleString('id-ID')} ekor
                          </span>
                        </div>

                        {/* Fish Age Pill */}
                        <div className="px-1.5 sm:px-2 py-0.5 rounded-md bg-primary text-white font-extrabold text-[10px] sm:text-xs shrink-0 shadow-subtle">
                          H-{ageDays}
                        </div>
                      </div>

                      {/* Target Panen */}
                      {harvest && (
                        <div className="pt-1.5 border-t border-farm-divider space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-farm-muted truncate flex items-center gap-1">
                              <FontAwesomeIcon icon={faCalendarDays} className="w-2.5 h-2.5 text-primary shrink-0" />
                              <span className="truncate">Panen:</span>
                            </span>
                            <span className={`font-extrabold truncate ${
                              harvest.status === 'overdue' ? 'text-red-600' : 'text-primary'
                            }`}>
                              {harvest.daysLeft <= 0 ? harvest.label : `${harvest.daysLeft} hr lagi`}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${harvest.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 sm:p-3 rounded-xl bg-farm-bg border border-farm-border text-center space-y-2">
                      <p className="text-[11px] font-bold text-farm-muted">Siap tebar bibit</p>
                      <button
                        onClick={() => {
                          setSelectedPondIdForBatch(pond.id);
                          setAddBatchModalOpen(true);
                        }}
                        className="w-full py-1.5 px-2 rounded-lg bg-primary hover:bg-primary-hover active:scale-95 text-white text-[11px] font-bold shadow-subtle transition-all"
                      >
                        + Tebar Bibit
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Link to Detail */}
                <div className="pt-2 mt-2 border-t border-farm-divider flex items-center justify-between text-[11px]">
                  <span className="text-farm-muted text-[10px] hidden sm:inline">
                    {pastBatches.length} panen lalu
                  </span>
                  <Link
                    href={`/kolam/${pond.id}`}
                    className="font-bold text-primary flex items-center gap-1 hover:underline ml-auto"
                  >
                    <span>Rincian</span>
                    <FontAwesomeIcon icon={faChevronRight} className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddPondModal
        isOpen={addPondModalOpen}
        onClose={() => setAddPondModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <AddBatchModal
        isOpen={addBatchModalOpen}
        defaultPondId={selectedPondIdForBatch}
        onClose={() => setAddBatchModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
