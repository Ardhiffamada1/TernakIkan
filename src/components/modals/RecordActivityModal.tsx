'use client';

import React, { useState, useEffect } from 'react';
import { X, ClipboardList, AlertCircle } from 'lucide-react';
import { CultivationBatch, ActivityType } from '@/types';
import { repository } from '@/lib/data/repository';
import { getCurrentIsoString } from '@/lib/timezone';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBatchId?: string;
}

export function RecordActivityModal({ isOpen, onClose, onSuccess, defaultBatchId }: Props) {
  const [batches, setBatches] = useState<CultivationBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(defaultBatchId || '');
  const [activityType, setActivityType] = useState<ActivityType>('water_change');
  const [description, setDescription] = useState('Sipon kotoran dasar & ganti air 30%');
  const [quantity, setQuantity] = useState('1200');
  const [unit, setUnit] = useState('liter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      repository.getActiveBatches().then((data) => {
        setBatches(data);
        if (!selectedBatchId && data.length > 0) {
          setSelectedBatchId(defaultBatchId || data[0].id);
        }
      });
      setError(null);
    }
  }, [isOpen, defaultBatchId]);

  if (!isOpen) return null;

  const handleTypeChange = (type: ActivityType) => {
    setActivityType(type);
    if (type === 'water_change') {
      setUnit('liter');
      setDescription('Sipon kotoran dasar & ganti air 30%');
    } else if (type === 'sorting') {
      setUnit('ekor');
      setDescription('Sortir penyeragaman ukuran ikan');
    } else {
      setUnit('');
      setDescription('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBatchId) {
      setError('Silakan pilih kolam aktif.');
      return;
    }
    if (!description.trim()) {
      setError('Deskripsi aktivitas wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      await repository.createActivityLog({
        batch_id: selectedBatchId,
        activity_type: activityType,
        description: description.trim(),
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit: unit.trim() || undefined,
        recorded_at: getCurrentIsoString(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal mencatat aktivitas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-farm-border w-full sm:max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3 border-b border-farm-border flex items-center justify-between bg-blue-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-primary flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base text-farm-text">Catat Perawatan Kolam</h3>
              <p className="text-xs text-farm-muted">Ganti air, sortir, atau pembersihan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-farm-muted hover:text-farm-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Pilih Kolam */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Pilih Kolam <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-semibold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.pond?.name || 'Kolam'} — {b.fish_type}
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Perawatan */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Jenis Perawatan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'water_change', label: 'Ganti Air' },
                { id: 'sorting', label: 'Sortir Ikan' },
                { id: 'other', label: 'Lainnya' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => handleTypeChange(opt.id as any)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all min-h-[44px] ${
                    activityType === opt.id
                      ? 'bg-primary text-white border-primary shadow-subtle'
                      : 'bg-farm-surface text-farm-text border-farm-border hover:bg-farm-bg'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Deskripsi Aktivitas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Kuras 30% air dan sedot amonia dasar"
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-medium text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
            />
          </div>

          {/* Jumlah & Satuan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1">
                Volume / Jumlah
              </label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1000"
                className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1">
                Satuan
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="liter / ekor"
                className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-xs font-bold text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || batches.length === 0}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-subtle min-h-[48px] transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Simpan Catatan Perawatan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
