'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Utensils, 
  Sparkles, 
  Skull, 
  Droplet, 
  Layers, 
  Filter, 
  Calendar, 
  Plus, 
  Activity,
  ArrowUpDown,
  Scale
} from 'lucide-react';
import { ActivityLog, ActivityType, Pond, CultivationBatch } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListUl, faUtensils, faDroplet, faSkull, faCapsules, faWater } from '@fortawesome/free-solid-svg-icons';
import { repository } from '@/lib/data/repository';
import { formatIndonesianDate, formatRelativeDate } from '@/lib/timezone';
import { RecordActivityModal } from '@/components/modals/RecordActivityModal';
import { RecordFeedModal } from '@/components/modals/RecordFeedModal';

export default function RiwayatPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [batches, setBatches] = useState<CultivationBatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPondId, setSelectedPondId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<ActivityType | 'all'>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Modals
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [feedModalOpen, setFeedModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allPonds, allBatches, allLogs] = await Promise.all([
        repository.getPonds(),
        repository.getBatches(),
        repository.getActivityLogs({
          activityType: selectedType,
        }),
      ]);
      setPonds(allPonds);
      setBatches(allBatches);

      let filtered = allLogs;
      if (selectedPondId !== 'all') {
        const pondBatchIds = new Set(allBatches.filter((b) => b.pond_id === selectedPondId).map((b) => b.id));
        filtered = filtered.filter((l) => pondBatchIds.has(l.batch_id));
      }
      setLogs(filtered);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPondId, selectedType, selectedDateRange]);

  // Aggregate stats
  const totalFeedingKg = logs
    .filter((l) => l.activity_type === 'feeding' && l.quantity)
    .reduce((sum, l) => {
      const q = l.quantity || 0;
      return sum + (l.unit === 'gram' ? q / 1000 : q);
    }, 0);

  const totalMortalityCount = logs
    .filter((l) => l.activity_type === 'mortality' && l.quantity)
    .reduce((sum, l) => sum + (l.quantity || 0), 0);

  const getActivityBadge = (type: ActivityType) => {
    switch (type) {
      case 'feeding':
        return { label: 'Pakan', icon: Utensils, bg: 'bg-blue-50 text-primary border-blue-200' };
      case 'vitamin':
        return { label: 'Vitamin', icon: Sparkles, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'mortality':
        return { label: 'Kematian', icon: Skull, bg: 'bg-red-50 text-red-700 border-red-200' };
      case 'water_check':
        return { label: 'Cek Air', icon: Droplet, bg: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'water_change':
        return { label: 'Ganti Air', icon: Droplet, bg: 'bg-cyan-50 text-cyan-800 border-cyan-200' };
      case 'sorting':
        return { label: 'Sortir', icon: ArrowUpDown, bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'sampling':
        return { label: 'Sampling', icon: Scale, bg: 'bg-purple-50 text-purple-800 border-purple-200' };
      default:
        return { label: 'Lainnya', icon: Activity, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-farm-border pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-farm-text">
            Riwayat Kolam
          </h1>
          <p className="text-xs text-farm-muted mt-0.5">
            Log pakan, vitamin, cek air, &amp; kematian
          </p>
        </div>

        <button
          onClick={() => setActivityModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-subtle min-h-[40px] transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Catat</span>
        </button>
      </div>

      {/* Filter Bar (Mobile friendly pills & dropdown) */}
      <div className="bg-farm-surface border border-farm-border rounded-2xl p-3.5 shadow-subtle space-y-3">
        {/* Kolam Selector */}
        <div>
          <label className="block text-[11px] font-bold text-farm-muted mb-1">
            Pilih Kolam
          </label>
          <select
            value={selectedPondId}
            onChange={(e) => setSelectedPondId(e.target.value)}
            className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-xs font-bold text-farm-text min-h-[40px]"
          >
            <option value="all">Semua Kolam</option>
            {ponds.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Jenis Aktivitas Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'all', label: 'Semua', icon: faListUl },
            { id: 'feeding', label: 'Pakan', icon: faUtensils },
            { id: 'water_check', label: 'Cek Air', icon: faDroplet },
            { id: 'mortality', label: 'Mati', icon: faSkull },
            { id: 'vitamin', label: 'Vitamin', icon: faCapsules },
            { id: 'water_change', label: 'Ganti Air', icon: faWater },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedType(f.id as any)}
              className={`px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedType === f.id
                  ? 'bg-primary text-white border-primary shadow-subtle'
                  : 'bg-farm-bg text-farm-muted border-farm-border hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={f.icon} className="w-3 h-3" />
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ringkasan Akumulasi */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-farm-surface border border-farm-border rounded-xl p-2.5 text-center shadow-subtle">
          <span className="text-[10px] text-farm-muted block uppercase font-bold">Total Pakan</span>
          <span className="text-base font-extrabold text-primary block mt-0.5">
            {totalFeedingKg.toFixed(1)} <span className="text-xs font-normal">kg</span>
          </span>
        </div>

        <div className="bg-farm-surface border border-farm-border rounded-xl p-2.5 text-center shadow-subtle">
          <span className="text-[10px] text-farm-muted block uppercase font-bold">Kematian</span>
          <span className="text-base font-extrabold text-red-600 block mt-0.5">
            {totalMortalityCount} <span className="text-xs font-normal">ekor</span>
          </span>
        </div>

        <div className="bg-farm-surface border border-farm-border rounded-xl p-2.5 text-center shadow-subtle">
          <span className="text-[10px] text-farm-muted block uppercase font-bold">Total Log</span>
          <span className="text-base font-extrabold text-farm-text block mt-0.5">
            {logs.length}
          </span>
        </div>
      </div>

      {/* Log Feed */}
      {loading ? (
        <div className="bg-farm-surface border border-farm-border rounded-2xl p-8 text-center text-xs text-farm-muted">
          Memuat riwayat...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-farm-surface border border-dashed border-farm-border rounded-2xl p-8 text-center text-xs text-farm-muted">
          Tidak ada aktivitas yang sesuai filter.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const badge = getActivityBadge(log.activity_type);
            const Icon = badge.icon;

            return (
              <div
                key={log.id}
                className="p-3.5 bg-farm-surface border border-farm-border rounded-2xl shadow-subtle flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg} mt-0.5`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 space-y-0.5 flex-1">
                    <p className="font-bold text-sm text-farm-text leading-relaxed break-words">{log.description}</p>
                    <p className="text-[11px] text-farm-muted">
                      {log.batch?.pond?.name || 'Kolam'} • {formatRelativeDate(log.recorded_at)}
                    </p>
                  </div>
                </div>

                {log.quantity !== null && log.quantity !== undefined && (
                  <div className="text-right shrink-0 bg-farm-bg border border-farm-border px-2.5 py-1 rounded-xl">
                    <span className="font-extrabold text-sm text-farm-text">
                      {log.quantity.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[11px] text-farm-muted ml-1 font-bold">
                      {log.unit || ''}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <RecordActivityModal
        isOpen={activityModalOpen}
        onClose={() => setActivityModalOpen(false)}
        onSuccess={() => loadData()}
      />
      <RecordFeedModal
        isOpen={feedModalOpen}
        onClose={() => setFeedModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
