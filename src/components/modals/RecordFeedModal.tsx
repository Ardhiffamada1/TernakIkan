'use client';

import React, { useState, useEffect } from 'react';
import { X, Utensils, AlertCircle } from 'lucide-react';
import { CultivationBatch, FeedLog } from '@/types';
import { repository } from '@/lib/data/repository';
import { getCurrentIsoString } from '@/lib/timezone';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newLog?: FeedLog) => void;
  defaultBatchId?: string;
}

export function RecordFeedModal({ isOpen, onClose, onSuccess, defaultBatchId }: Props) {
  const [batches, setBatches] = useState<CultivationBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(defaultBatchId || '');
  const [feedName, setFeedName] = useState('Pelet PF-1000');
  const [quantity, setQuantity] = useState('2.5');
  const [unit, setUnit] = useState<'kg' | 'gram'>('kg');
  const [notes, setNotes] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBatchId) {
      setError('Silakan pilih kolam yang aktif.');
      return;
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setError('Jumlah pakan harus lebih besar dari 0.');
      return;
    }
    if (!feedName.trim()) {
      setError('Nama atau jenis pakan wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      await repository.createFeedLog({
        batch_id: selectedBatchId,
        feed_name: feedName.trim(),
        quantity: numQty,
        unit,
        fed_at: getCurrentIsoString(),
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan catatan pakan.');
    } finally {
      setLoading(false);
    }
  };

  const quickFeeds = ['Pelet PF-1000', 'Pelet 781-1', 'Pelet 781-2', 'Pelet LP-2', 'Magot BSF', 'Cacing Sutra'];

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
              <Utensils className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base text-farm-text">Catat Pemberian Pakan</h3>
              <p className="text-xs text-farm-muted">Porsi pakan harian kolam</p>
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
                  {b.pond?.name || 'Kolam'} — {b.fish_type} ({b.current_quantity.toLocaleString('id-ID')} ekor)
                </option>
              ))}
            </select>
          </div>

          {/* Nama Pakan */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Merek / Jenis Pakan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={feedName}
              onChange={(e) => setFeedName(e.target.value)}
              placeholder="Contoh: Pelet 781-1"
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {quickFeeds.map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => setFeedName(name)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    feedName === name
                      ? 'bg-primary text-white border-primary font-bold'
                      : 'bg-farm-bg text-farm-muted border-farm-border hover:bg-gray-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Jumlah & Satuan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
                Jumlah Pakan <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="2.5"
                className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
                Satuan
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setUnit('kg')}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition-all min-h-[48px] ${
                    unit === 'kg'
                      ? 'bg-primary text-white border-primary shadow-subtle'
                      : 'bg-farm-surface text-farm-text border-farm-border'
                  }`}
                >
                  Kg
                </button>
                <button
                  type="button"
                  onClick={() => setUnit('gram')}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition-all min-h-[48px] ${
                    unit === 'gram'
                      ? 'bg-primary text-white border-primary shadow-subtle'
                      : 'bg-farm-surface text-farm-text border-farm-border'
                  }`}
                >
                  Gram
                </button>
              </div>
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1">
              Catatan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pakan pagi hari, nafsu makan tinggi"
              className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-xs text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || batches.length === 0}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-subtle min-h-[48px] transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Simpan Catatan Pakan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
