'use client';

import React, { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { CultivationBatch } from '@/types';
import { repository } from '@/lib/data/repository';
import { addDaysToDateString, getTodayJakartaString } from '@/lib/timezone';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batch: CultivationBatch;
}

export function EditTargetHarvestModal({ isOpen, onClose, onSuccess, batch }: Props) {
  const [targetDate, setTargetDate] = useState(batch.target_harvest_date || addDaysToDateString(batch.stocking_date, 75));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (targetDate && targetDate <= batch.stocking_date) {
      setError('Target panen harus setelah tanggal tebar bibit.');
      return;
    }

    try {
      setLoading(true);
      await repository.updateBatchTarget(batch.id, targetDate || null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui target panen.');
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

        <div className="px-5 py-3 border-b border-farm-border flex items-center justify-between bg-primary-soft">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-farm-text">Atur Target Panen</h3>
              <p className="text-xs text-farm-muted">{batch.pond?.name} • {batch.fish_type}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-farm-muted hover:text-farm-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Target Tanggal Panen
            </label>
            <input
              type="date"
              min={batch.stocking_date}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
            />
            <span className="text-[11px] text-farm-muted block mt-1">
              Tanggal tebar: {batch.stocking_date}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTargetDate(addDaysToDateString(batch.stocking_date, 60))}
              className="text-xs px-3 py-1.5 rounded-lg bg-farm-bg border border-farm-border text-farm-text font-bold hover:bg-gray-200"
            >
              60 Hari
            </button>
            <button
              type="button"
              onClick={() => setTargetDate(addDaysToDateString(batch.stocking_date, 75))}
              className="text-xs px-3 py-1.5 rounded-lg bg-farm-bg border border-farm-border text-farm-text font-bold hover:bg-gray-200"
            >
              75 Hari
            </button>
            <button
              type="button"
              onClick={() => setTargetDate(addDaysToDateString(batch.stocking_date, 90))}
              className="text-xs px-3 py-1.5 rounded-lg bg-farm-bg border border-farm-border text-farm-text font-bold hover:bg-gray-200"
            >
              90 Hari
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-subtle min-h-[48px] transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Simpan Target Panen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
