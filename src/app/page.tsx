'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUtensils, 
  faPlus, 
  faArrowRight, 
  faFish, 
  faDroplet,
  faScaleBalanced,
  faCircleCheck,
  faTriangleExclamation,
  faCalendarDays
} from '@fortawesome/free-solid-svg-icons';
import { DashboardSummary, TodayTask } from '@/types';
import { repository } from '@/lib/data/repository';
import { formatIndonesianDate, getHarvestInfo } from '@/lib/timezone';
import { RecordFeedModal } from '@/components/modals/RecordFeedModal';
import { AddPondModal } from '@/components/modals/AddPondModal';
import { RecordWaterCheckModal } from '@/components/modals/RecordWaterCheckModal';
import { FeedSamplingModal } from '@/components/modals/FeedSamplingModal';
import { WeatherWidget } from '@/components/WeatherWidget';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [feedModalOpen, setFeedModalOpen] = useState(false);
  const [pondModalOpen, setPondModalOpen] = useState(false);
  const [waterCheckModalOpen, setWaterCheckModalOpen] = useState(false);
  const [samplingModalOpen, setSamplingModalOpen] = useState(false);
  const [activeBatchForModal, setActiveBatchForModal] = useState<string | undefined>();

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await repository.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTaskAction = (task: TodayTask) => {
    setActiveBatchForModal(task.batchId);
    if (task.actionType === 'feed') {
      setFeedModalOpen(true);
    } else if (task.actionType === 'water_check') {
      setWaterCheckModalOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* 1. RINGKASAN POPULASI & KOLAM (Compact Mobile Stat Card) */}
      {/* ============================================================== */}
      <div className="bg-farm-surface border border-farm-border rounded-2xl p-4 shadow-subtle">
        <div className="grid grid-cols-3 divide-x divide-farm-divider text-center">
          <div className="px-1">
            <span className="text-[11px] font-bold text-farm-muted block uppercase tracking-wider">
              Kolam Aktif
            </span>
            <div className="mt-0.5">
              <span className="text-xl font-extrabold text-farm-text">
                {summary?.activePondsCount ?? 0}
              </span>
              <span className="text-[11px] text-farm-muted ml-1">/ {summary?.totalPondsCount ?? 0}</span>
            </div>
          </div>

          <div className="px-1">
            <span className="text-[11px] font-bold text-farm-muted block uppercase tracking-wider">
              Total Ikan
            </span>
            <div className="mt-0.5">
              <span className="text-xl font-extrabold text-primary">
                {(summary?.totalActiveFishPopulation ?? 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="px-1">
            <span className="text-[11px] font-bold text-farm-muted block uppercase tracking-wider">
              Siklus
            </span>
            <div className="mt-0.5">
              <span className="text-xl font-extrabold text-farm-text">
                {summary?.activeBatchesCount ?? 0}
              </span>
              <span className="text-[11px] text-farm-muted ml-1">aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. PREDIKSI CUACA BMKG & REKOMENDASI PAKAN */}
      {/* ============================================================== */}
      <WeatherWidget />

      {/* ============================================================== */}
      {/* 3. FITUR: PENGINGAT TUGAS HARI INI DI LAYAR UTAMA HP */}
      {/* ============================================================== */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-farm-text uppercase tracking-wider flex items-center gap-1.5">
            <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5 text-primary" />
            <span>Tugas &amp; Peringatan</span>
          </span>
          <span className="text-[11px] font-bold text-primary">
            {summary?.todayTasks.filter(t => !t.isDone).length ?? 0} Perlu Dicek
          </span>
        </div>

        {loading ? (
          <div className="bg-farm-surface border border-farm-border rounded-xl p-3 text-center text-xs text-farm-muted">
            Memeriksa tugas hari ini...
          </div>
        ) : !summary?.todayTasks || summary.todayTasks.length === 0 ? (
          <div className="bg-farm-surface border border-dashed border-farm-border rounded-xl p-3 text-center text-xs text-farm-muted">
            Semua kolam dalam kondisi terpantau baik hari ini.
          </div>
        ) : (
          <div className="space-y-1.5">
            {summary.todayTasks.map((task) => (
              <div
                key={task.id}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 shadow-subtle ${
                  task.isDone
                    ? 'bg-blue-50/50 border-blue-200 text-blue-900 opacity-80'
                    : task.priority === 'high'
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                    : 'bg-farm-surface border-farm-border text-farm-text'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    task.isDone
                      ? 'bg-blue-200 text-blue-800'
                      : task.actionType === 'feed'
                      ? 'bg-blue-100 text-primary'
                      : task.actionType === 'harvest'
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-cyan-100 text-cyan-800'
                  }`}>
                    {task.isDone ? (
                      <FontAwesomeIcon icon={faCircleCheck} className="w-3.5 h-3.5" />
                    ) : task.actionType === 'feed' ? (
                      <FontAwesomeIcon icon={faUtensils} className="w-3.5 h-3.5" />
                    ) : task.actionType === 'harvest' ? (
                      <FontAwesomeIcon icon={faTriangleExclamation} className="w-3.5 h-3.5" />
                    ) : (
                      <FontAwesomeIcon icon={faDroplet} className="w-3.5 h-3.5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs font-bold leading-tight block truncate">
                      {task.title} <span className="text-farm-muted font-normal">• {task.pondName}</span>
                    </span>
                    <p className="text-[10px] text-farm-muted leading-tight truncate">
                      {task.subtitle}
                    </p>
                  </div>
                </div>

                {!task.isDone && (
                  <button
                    onClick={() => handleTaskAction(task)}
                    className="h-7 px-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-bold shrink-0 shadow-subtle active:scale-95 transition-all"
                  >
                    {task.actionType === 'feed' ? 'Beri Pakan' : task.actionType === 'harvest' ? 'Lihat' : 'Cek'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. MENU AKSI CEPAT HP (App Grid) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-4 gap-2 pt-0.5">
        <button
          onClick={() => {
            setActiveBatchForModal(undefined);
            setFeedModalOpen(true);
          }}
          className="flex flex-col items-center justify-center p-2 bg-farm-surface border border-farm-border rounded-xl shadow-subtle hover:bg-blue-50 active:scale-95 transition-all min-h-[62px]"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-primary flex items-center justify-center mb-1">
            <FontAwesomeIcon icon={faUtensils} className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-farm-text">Catat Pakan</span>
        </button>

        <button
          onClick={() => {
            setActiveBatchForModal(undefined);
            setSamplingModalOpen(true);
          }}
          className="flex flex-col items-center justify-center p-2 bg-farm-surface border border-farm-border rounded-xl shadow-subtle hover:bg-blue-50 active:scale-95 transition-all min-h-[62px]"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center mb-1">
            <FontAwesomeIcon icon={faScaleBalanced} className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-farm-text">Pakan Sample</span>
        </button>

        <button
          onClick={() => setWaterCheckModalOpen(true)}
          className="flex flex-col items-center justify-center p-2 bg-farm-surface border border-farm-border rounded-xl shadow-subtle hover:bg-blue-50 active:scale-95 transition-all min-h-[62px]"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center mb-1">
            <FontAwesomeIcon icon={faDroplet} className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-farm-text">Cek Air</span>
        </button>

        <button
          onClick={() => setPondModalOpen(true)}
          className="flex flex-col items-center justify-center p-2 bg-farm-surface border border-farm-border rounded-xl shadow-subtle hover:bg-blue-50 active:scale-95 transition-all min-h-[62px]"
        >
          <div className="w-8 h-8 rounded-lg bg-farm-bg text-farm-text flex items-center justify-center mb-1">
            <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-farm-text">Kolam Baru</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 4. DAFTAR KOLAM AKTIF + PROMINENT UMUR IKAN + TARGET PANEN */}
      {/* ============================================================== */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-farm-text uppercase tracking-wider">
            Kolam &amp; Target Panen
          </span>
          <Link
            href="/kolam"
            className="text-xs font-bold text-primary flex items-center gap-1"
          >
            <span>Semua Kolam</span>
            <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="bg-farm-surface border border-farm-border rounded-xl p-6 text-center text-xs text-farm-muted">
            Memuat kolam...
          </div>
        ) : !summary?.activeBatches || summary.activeBatches.length === 0 ? (
          <div className="bg-farm-surface border border-dashed border-farm-border rounded-2xl p-6 text-center space-y-2">
            <FontAwesomeIcon icon={faFish} className="w-8 h-8 text-farm-muted mx-auto" />
            <p className="font-bold text-sm text-farm-text">Belum ada kolam aktif</p>
            <p className="text-xs text-farm-muted">Mulai dengan menambah kolam dan tebar bibit.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 md:gap-4">
            {summary.activeBatches.map((batch) => {
              const age = batch.age_days ?? 0;
              const harvest = getHarvestInfo(batch.stocking_date, batch.target_harvest_date);

              return (
                <Link
                  key={batch.id}
                  href={`/kolam/${batch.pond_id}`}
                  className="bg-farm-surface border border-farm-border rounded-2xl p-3 shadow-subtle hover:border-primary/50 transition-all flex flex-col justify-between group active:scale-[0.98]"
                >
                  <div>
                    {/* Header: Kolam Name + Age Badge */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-farm-muted uppercase tracking-wider truncate">
                        {batch.pond?.name || 'Kolam'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-primary text-white text-[10px] font-extrabold shadow-subtle shrink-0">
                        H-{age}
                      </span>
                    </div>

                    {/* Fish Type & Population */}
                    <h3 className="font-extrabold text-xs sm:text-sm text-farm-text leading-tight truncate group-hover:text-primary transition-colors">
                      {batch.fish_type}
                    </h3>
                    <p className="text-[10px] text-farm-muted mt-0.5 font-medium">
                      {batch.current_quantity.toLocaleString('id-ID')} ekor
                    </p>
                  </div>

                  {/* Compact Harvest Countdown & Mini Progress Bar */}
                  {harvest ? (
                    <div className="mt-2.5 pt-2 border-t border-farm-divider space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-farm-muted flex items-center gap-1 truncate">
                          <FontAwesomeIcon icon={faCalendarDays} className="w-2.5 h-2.5 text-primary shrink-0" />
                          <span className="truncate">Panen:</span>
                        </span>
                        <span className={`font-extrabold text-[10px] truncate ${
                          harvest.status === 'overdue'
                            ? 'text-red-600'
                            : harvest.status === 'today'
                            ? 'text-primary animate-pulse'
                            : harvest.status === 'soon'
                            ? 'text-amber-800'
                            : 'text-primary'
                        }`}>
                          {harvest.daysLeft <= 0 ? harvest.label : `${harvest.daysLeft} hari lagi`}
                        </span>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${harvest.percent}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2.5 pt-2 border-t border-farm-divider text-[10px] text-farm-muted flex items-center justify-between">
                      <span>Target: -</span>
                      <span className="text-primary font-bold">Atur →</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Reusable Modals */}
      <RecordFeedModal
        isOpen={feedModalOpen}
        defaultBatchId={activeBatchForModal}
        onClose={() => setFeedModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <FeedSamplingModal
        isOpen={samplingModalOpen}
        defaultBatchId={activeBatchForModal}
        onClose={() => setSamplingModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <RecordWaterCheckModal
        isOpen={waterCheckModalOpen}
        defaultBatchId={activeBatchForModal}
        onClose={() => setWaterCheckModalOpen(false)}
        onSuccess={() => loadData()}
      />

      <AddPondModal
        isOpen={pondModalOpen}
        onClose={() => setPondModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
