'use client';

import React, { useState, useEffect } from 'react';
import { X, Fish, AlertCircle, Calendar } from 'lucide-react';
import { Pond, CultivationBatch } from '@/types';
import { repository } from '@/lib/data/repository';
import { addDaysToDateString, getTodayJakartaString, isFutureDate } from '@/lib/timezone';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (batch: CultivationBatch) => void;
  defaultPondId?: string;
}

export function AddBatchModal({ isOpen, onClose, onSuccess, defaultPondId }: Props) {
  const [ponds, setPonds] = useState<Pond[]>([]);
  const [selectedPondId, setSelectedPondId] = useState(defaultPondId || '');
  const [fishType, setFishType] = useState('Lele Sangkuriang');
  const [initialQuantity, setInitialQuantity] = useState('3000');
  const [stockingDate, setStockingDate] = useState(getTodayJakartaString());
  const [targetHarvestDate, setTargetHarvestDate] = useState(addDaysToDateString(getTodayJakartaString(), 75)); // default 75 hari
  const [seedCostIdr, setSeedCostIdr] = useState('600000');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      repository.getPonds().then((data) => {
        setPonds(data);
        if (!selectedPondId && data.length > 0) {
          setSelectedPondId(defaultPondId || data[0].id);
        }
      });
      setError(null);
    }
  }, [isOpen, defaultPondId]);

  if (!isOpen) return null;

  const setTargetPreset = (days: number) => {
    if (stockingDate) {
      setTargetHarvestDate(addDaysToDateString(stockingDate, days));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedPondId) {
      setError('Silakan pilih kolam tujuan tebar.');
      return;
    }
    if (!fishType.trim()) {
      setError('Jenis ikan wajib diisi.');
      return;
    }
    const qty = parseInt(initialQuantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Jumlah tebar bibit harus lebih besar dari 0 ekor.');
      return;
    }
    if (!stockingDate) {
      setError('Tanggal tebar wajib diisi.');
      return;
    }
    if (isFutureDate(stockingDate)) {
      setError('Tanggal tebar tidak boleh berada di masa depan.');
      return;
    }
    if (targetHarvestDate && targetHarvestDate <= stockingDate) {
      setError('Target tanggal panen harus setelah tanggal tebar.');
      return;
    }

    try {
      setLoading(true);
      const newBatch = await repository.createBatch({
        pond_id: selectedPondId,
        fish_type: fishType.trim(),
        initial_quantity: qty,
        stocking_date: stockingDate,
        target_harvest_date: targetHarvestDate || undefined,
        seed_cost_idr: seedCostIdr ? parseFloat(seedCostIdr) : undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess(newBatch);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal memulai siklus tebar bibit.');
    } finally {
      setLoading(false);
    }
  };

  const commonFishTypes = ['Lele Sangkuriang', 'Nila Merah', 'Nila Hitam', 'Patin Siam', 'Gurame', 'Ikan Mas'];

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
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-subtle">
              <Fish className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-farm-text">Mulai Siklus Tebar Baru</h3>
              <p className="text-xs text-farm-muted">Catat bibit dan atur target panen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-farm-muted hover:text-farm-text hover:bg-farm-bg transition-colors"
          >
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
              Pilih Kolam Tujuan <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPondId}
              onChange={(e) => setSelectedPondId(e.target.value)}
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-semibold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
            >
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.volume_liters.toLocaleString('id-ID')} Liter)
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Ikan */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Jenis Ikan Budidaya <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fishType}
              onChange={(e) => setFishType(e.target.value)}
              placeholder="Contoh: Lele Sangkuriang"
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
            />
            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {commonFishTypes.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFishType(type)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    fishType === type
                      ? 'bg-primary text-white border-primary font-bold'
                      : 'bg-farm-bg text-farm-muted border-farm-border hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Jumlah Tebar & Biaya Bibit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
                Jumlah Bibit (Ekor) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
                placeholder="3000"
                className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
                Modal Beli Bibit (Rp)
              </label>
              <input
                type="number"
                step="5000"
                value={seedCostIdr}
                onChange={(e) => setSeedCostIdr(e.target.value)}
                placeholder="600000"
                className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
              />
            </div>
          </div>

          {/* Tanggal Tebar & TARGET PANEN */}
          <div className="p-3.5 rounded-2xl bg-primary-soft border border-primary-border space-y-3">
            <div>
              <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-1">
                Tanggal Tebar Bibit <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                max={getTodayJakartaString()}
                value={stockingDate}
                onChange={(e) => setStockingDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-primary-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Target Tanggal Panen</span>
                <span className="text-[11px] font-normal text-primary/80">Perkiraan Panen</span>
              </label>
              <input
                type="date"
                min={stockingDate}
                value={targetHarvestDate}
                onChange={(e) => setTargetHarvestDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-primary-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
              />
              
              {/* Presets target panen */}
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setTargetPreset(60)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-primary-border text-primary font-bold hover:bg-blue-50 transition-colors"
                >
                  60 Hari
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPreset(75)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-primary-border text-primary font-bold hover:bg-blue-50 transition-colors"
                >
                  75 Hari (Lele)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPreset(90)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white border border-primary-border text-primary font-bold hover:bg-blue-50 transition-colors"
                >
                  90 Hari (Nila)
                </button>
              </div>
            </div>
          </div>

          {/* Catatan Bibit */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1">
              Catatan Bibit (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Ukuran 5-7 cm, pembenih Sukabumi"
              className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-xs text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || ponds.length === 0}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-subtle min-h-[48px] transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Tebar Bibit &amp; Mulai Siklus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
