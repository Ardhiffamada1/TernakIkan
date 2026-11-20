'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Coins, Scale } from 'lucide-react';
import { CultivationBatch } from '@/types';
import { repository } from '@/lib/data/repository';
import { getTodayJakartaString } from '@/lib/timezone';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batch: CultivationBatch;
}

export function HarvestModal({ isOpen, onClose, onSuccess, batch }: Props) {
  const [harvestDate, setHarvestDate] = useState(getTodayJakartaString());
  const [harvestQuantity, setHarvestQuantity] = useState(String(batch.current_quantity || ''));
  const [harvestWeight, setHarvestWeight] = useState('');
  const [sellingPricePerKg, setSellingPricePerKg] = useState('24000'); // default Rp 24.000 / kg
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numWeight = parseFloat(harvestWeight) || 0;
  const numPrice = parseFloat(sellingPricePerKg) || 0;
  const totalRevenue = numWeight * numPrice;

  // Total pakan siklus
  const totalFeedKg = batch.total_feed_kg || 0;
  const fcr = numWeight > 0 && totalFeedKg > 0 ? (totalFeedKg / numWeight).toFixed(2) : '-';

  // Perkiraan Modal (Bibit + Pakan + Lain)
  const totalCost = (batch.seed_cost_idr || 0) + (batch.feed_cost_idr || 0) + (batch.other_cost_idr || 0);
  const estimatedProfit = totalRevenue > 0 && totalCost > 0 ? totalRevenue - totalCost : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = parseInt(harvestQuantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Jumlah ikan yang dipanen harus lebih dari 0 ekor.');
      return;
    }
    if (isNaN(numWeight) || numWeight <= 0) {
      setError('Total bobot timbangan panen (kg) wajib diisi untuk menghitung FCR.');
      return;
    }

    try {
      setLoading(true);
      await repository.harvestBatch(batch.id, {
        harvest_date: harvestDate,
        harvest_quantity: qty,
        harvest_weight_kg: numWeight,
        harvest_selling_price_per_kg: numPrice > 0 ? numPrice : undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan data panen.');
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
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base text-farm-text">Panen &amp; Tutup Siklus</h3>
              <p className="text-xs text-farm-muted">
                {batch.pond?.name || 'Kolam'} — {batch.fish_type}
              </p>
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

          {/* Tanggal Panen */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Tanggal Panen <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-semibold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
            />
          </div>

          {/* Jumlah Ekor & Total Bobot Kg */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
                Jumlah Ikan (Ekor) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={harvestQuantity}
                onChange={(e) => setHarvestQuantity(e.target.value)}
                placeholder="2800"
                className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
                Timbangan Panen (Kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={harvestWeight}
                onChange={(e) => setHarvestWeight(e.target.value)}
                placeholder="Contoh: 350"
                className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
              />
            </div>
          </div>

          {/* Harga Jual per Kg */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Harga Jual per Kg (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-xs font-bold text-farm-muted">Rp</span>
              <input
                type="number"
                step="500"
                value={sellingPricePerKg}
                onChange={(e) => setSellingPricePerKg(e.target.value)}
                placeholder="24000"
                className="w-full pl-10 pr-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
              />
            </div>
          </div>

          {/* Ringkasan Finansial & FCR Otomatis (Fitur 1) */}
          <div className="p-3.5 rounded-2xl bg-farm-bg border border-farm-border space-y-2.5 text-xs">
            <span className="font-bold text-farm-text flex items-center gap-1.5 text-xs">
              <Coins className="w-4 h-4 text-primary" />
              <span>Estimasi Hasil &amp; FCR Siklus:</span>
            </span>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-farm-divider">
              <div>
                <span className="text-farm-muted block text-[11px]">Total Omset Penjualan:</span>
                <span className="font-extrabold text-sm text-primary">
                  Rp {totalRevenue.toLocaleString('id-ID')}
                </span>
              </div>

              <div>
                <span className="text-farm-muted block text-[11px]">FCR (Rasio Pakan):</span>
                <span className="font-extrabold text-sm text-primary">
                  {fcr} {fcr !== '-' ? '' : '(isi kg panen)'}
                </span>
              </div>
            </div>

            {totalCost > 0 && estimatedProfit !== null && (
              <div className="pt-2 border-t border-farm-divider flex items-center justify-between">
                <span className="text-farm-muted">Perkiraan Keuntungan Bersih:</span>
                <span className={`font-bold text-sm ${estimatedProfit >= 0 ? 'text-primary' : 'text-red-600'}`}>
                  {estimatedProfit >= 0 ? '+ ' : ''}Rp {estimatedProfit.toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>

          {/* Catatan Panen */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1">
              Catatan Pembeli / Tengkulak (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Dibeli tengkulak pasar induk, tunai"
              className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-xs text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-subtle min-h-[48px] transition-colors"
            >
              {loading ? 'Menyimpan...' : 'Konfirmasi Panen &amp; Tutup Siklus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
