'use client';

import React, { useState, useEffect } from 'react';
import { X, Skull, AlertCircle, ArrowDown } from 'lucide-react';
import { CultivationBatch } from '@/types';
import { repository } from '@/lib/data/repository';
import { getCurrentIsoString } from '@/lib/timezone';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBatchId?: string;
}

export function RecordMortalityModal({ isOpen, onClose, onSuccess, defaultBatchId }: Props) {
  const [batches, setBatches] = useState<CultivationBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(defaultBatchId || '');
  const [deadCount, setDeadCount] = useState('');
  const [reason, setReason] = useState('');
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

  const currentBatch = batches.find((b) => b.id === selectedBatchId);
  const currentPop = currentBatch?.current_quantity ?? 0;
  const numDead = parseInt(deadCount) || 0;
  const projectedPop = Math.max(0, currentPop - numDead);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBatchId) {
      setError('Silakan pilih siklus ikan yang aktif.');
      return;
    }
    if (isNaN(numDead) || numDead <= 0) {
      setError('Jumlah ikan mati harus lebih besar dari 0.');
      return;
    }
    if (numDead > currentPop) {
      setError(`Jumlah kematian (${numDead}) tidak boleh melebihi populasi saat ini (${currentPop} ekor).`);
      return;
    }

    try {
      setLoading(true);
      await repository.createActivityLog({
        batch_id: selectedBatchId,
        activity_type: 'mortality',
        description: reason.trim() 
          ? `Kematian ikan: ${numDead} ekor (${reason.trim()})` 
          : `Kematian ikan: ${numDead} ekor`,
        quantity: numDead,
        unit: 'ekor',
        recorded_at: getCurrentIsoString(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal mencatat kematian ikan.');
    } finally {
      setLoading(false);
    }
  };

  const quickReasons = ['Perubahan Cuaca / Hujan', 'Stres Sortir', 'Kualitas Air Drop', 'Jamur'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-farm-border w-full sm:max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3 border-b border-farm-border flex items-center justify-between bg-red-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
              <Skull className="w-4 h-4 text-red-700" />
            </div>
            <div>
              <h3 className="font-bold text-base text-farm-text">Catat Kematian Ikan</h3>
              <p className="text-xs text-farm-muted">Populasi kolam otomatis berkurang</p>
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
                  {b.pond?.name || 'Kolam'} — {b.fish_type} (Sisa: {b.current_quantity.toLocaleString('id-ID')} ekor)
                </option>
              ))}
            </select>
          </div>

          {/* Jumlah Kematian */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Jumlah Ikan Mati (Ekor) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={currentPop}
              value={deadCount}
              onChange={(e) => setDeadCount(e.target.value)}
              placeholder="Contoh: 10"
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
            />
          </div>

          {/* Indikator Perubahan Populasi */}
          {currentBatch && (
            <div className="p-3.5 rounded-xl bg-farm-bg border border-farm-border text-xs flex items-center justify-between">
              <div>
                <span className="text-farm-muted block text-[11px]">Populasi Awal:</span>
                <span className="font-bold text-farm-text text-sm">{currentPop.toLocaleString('id-ID')} ekor</span>
              </div>
              <ArrowDown className="w-4 h-4 text-red-500 shrink-0" />
              <div className="text-right">
                <span className="text-farm-muted block text-[11px]">Estimasi Sisa:</span>
                <span className={`font-extrabold text-sm ${numDead > 0 ? 'text-red-600' : 'text-farm-text'}`}>
                  {projectedPop.toLocaleString('id-ID')} ekor
                </span>
              </div>
            </div>
          )}

          {/* Dugaan Penyebab */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Dugaan Penyebab (Opsional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Suhu air drop setelah hujan lebat"
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-medium text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickReasons.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setReason(r)}
                  className="text-xs px-2.5 py-1 rounded-full border border-farm-border bg-farm-bg text-farm-muted hover:bg-gray-200"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || batches.length === 0}
              className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-subtle min-h-[48px] transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Kurangi Populasi &amp; Catat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
