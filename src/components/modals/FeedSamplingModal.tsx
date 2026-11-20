'use client';

import React, { useState, useEffect } from 'react';
import { X, Scale, Utensils, Check, ArrowRight } from 'lucide-react';
import { CultivationBatch, FishSamplingCalculation } from '@/types';
import { repository } from '@/lib/data/repository';
import { calculateDailyFeedFromSampling } from '@/lib/samplingCalculator';
import { getCurrentIsoString } from '@/lib/timezone';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBatchId?: string;
}

export function FeedSamplingModal({ isOpen, onClose, onSuccess, defaultBatchId }: Props) {
  const [batches, setBatches] = useState<CultivationBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(defaultBatchId || '');
  const [sampleCount, setSampleCount] = useState('10');
  const [totalSampleWeightGram, setTotalSampleWeightGram] = useState('650'); // default 65g/ekor
  const [feedingRatePercent, setFeedingRatePercent] = useState<number>(3.5);
  const [mealCount, setMealCount] = useState<2 | 3>(2);
  const [savingFeed, setSavingFeed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      repository.getActiveBatches().then((data) => {
        setBatches(data);
        if (!selectedBatchId && data.length > 0) {
          setSelectedBatchId(defaultBatchId || data[0].id);
        }
      });
    }
  }, [isOpen, defaultBatchId]);

  if (!isOpen) return null;

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);
  const currentPop = selectedBatch?.current_quantity ?? 3000;

  const result: FishSamplingCalculation = calculateDailyFeedFromSampling({
    batchId: selectedBatchId,
    sampleCount: parseInt(sampleCount) || 1,
    totalSampleWeightGram: parseFloat(totalSampleWeightGram) || 0,
    currentFishCount: currentPop,
    feedingRatePercent,
    mealCount,
  });

  const handleRecordDirectMeal = async (mealName: 'Pagi' | 'Sore', kg: number) => {
    if (!selectedBatchId || kg <= 0) return;
    try {
      setSavingFeed(true);
      await repository.createFeedLog({
        batch_id: selectedBatchId,
        feed_name: `Pelet Sampling (${mealName})`,
        quantity: kg,
        unit: 'kg',
        fed_at: getCurrentIsoString(),
        notes: `Takaran sampling: rata-rata ${result.averageWeightGram}g/ekor, rate ${result.feedingRatePercent}% biomassa`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan catatan pakan.');
    } finally {
      setSavingFeed(false);
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
              <Scale className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base text-farm-text">Kalkulator Pakan Sampling</h3>
              <p className="text-xs text-farm-muted">Hitung porsi makan dari timbangan sampel ikan</p>
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
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
          {/* 1. Pilih Kolam */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Pilih Kolam
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

          {/* 2. Sampling Timbangan */}
          <div className="p-3.5 rounded-xl bg-farm-bg border border-farm-border space-y-3">
            <span className="text-xs font-bold text-farm-text block">Data Sampling Timbangan:</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-farm-muted mb-1">
                  Sampel Ikan (Ekor)
                </label>
                <input
                  type="number"
                  min="1"
                  value={sampleCount}
                  onChange={(e) => setSampleCount(e.target.value)}
                  placeholder="10"
                  className="w-full px-3 py-2 bg-white border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-farm-muted mb-1">
                  Total Timbangan (Gram)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={totalSampleWeightGram}
                  onChange={(e) => setTotalSampleWeightGram(e.target.value)}
                  placeholder="650"
                  className="w-full px-3 py-2 bg-white border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-farm-divider text-xs">
              <span className="text-farm-muted">Rata-rata Bobot:</span>
              <span className="font-extrabold text-primary text-sm">
                {result.averageWeightGram} gram / ekor
              </span>
            </div>
          </div>

          {/* 3. Tingkat Pemberian Pakan (% Biomassa) */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Tingkat Pakan (% dari Total Berat Ikan)
            </label>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {[2.5, 3.0, 3.5, 4.0].map((rate) => (
                <button
                  type="button"
                  key={rate}
                  onClick={() => setFeedingRatePercent(rate)}
                  className={`py-2 px-1 rounded-xl border font-bold text-center transition-all min-h-[44px] ${
                    feedingRatePercent === rate
                      ? 'bg-primary text-white border-primary shadow-subtle'
                      : 'bg-farm-surface border-farm-border text-farm-text hover:bg-farm-bg'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
            <p className="text-[11px] text-farm-muted mt-1">
              *3%–3.5% umum untuk ikan lele/nila pembesaran mendekati panen.
            </p>
          </div>

          {/* 4. Frekuensi Makan */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Jadwal Pemberian Pakan
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMealCount(2)}
                className={`py-2.5 px-3 rounded-xl border font-bold text-center transition-all min-h-[44px] ${
                  mealCount === 2
                    ? 'bg-primary text-white border-primary shadow-subtle'
                    : 'bg-farm-surface border-farm-border text-farm-text hover:bg-farm-bg'
                }`}
              >
                2x Sehari (Pagi &amp; Sore)
              </button>
              <button
                type="button"
                onClick={() => setMealCount(3)}
                className={`py-2.5 px-3 rounded-xl border font-bold text-center transition-all min-h-[44px] ${
                  mealCount === 3
                    ? 'bg-primary text-white border-primary shadow-subtle'
                    : 'bg-farm-surface border-farm-border text-farm-text hover:bg-farm-bg'
                }`}
              >
                3x Sehari (Pagi, Siang, Sore)
              </button>
            </div>
          </div>

          {/* HASIL REKOMENDASI TAKARAN */}
          <div className="p-4 rounded-2xl bg-primary-soft border border-primary-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Total Pakan Harian
              </span>
              <span className="text-2xl font-extrabold text-primary">
                {result.dailyFeedKg} <span className="text-xs font-bold">kg / hari</span>
              </span>
            </div>

            <p className="text-xs text-primary/90 font-medium">
              Estimasi total berat ikan kolam: <strong>{result.estimatedBiomassKg} kg</strong> ({result.estimatedTotalFish.toLocaleString('id-ID')} ekor)
            </p>

            {/* Pembagian Sesi Makan */}
            <div className="pt-2 border-t border-primary/20 space-y-2">
              <span className="text-xs font-bold text-farm-text block">Takaran per Jam Makan:</span>
              
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-primary-border">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-primary" />
                  <div>
                    <span className="font-bold text-xs text-farm-text block">Porsi Pagi (07:30)</span>
                    <span className="text-[11px] text-farm-muted">{result.morningFeedKg} kg pelet</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRecordDirectMeal('Pagi', result.morningFeedKg)}
                  disabled={savingFeed}
                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-subtle min-h-[36px]"
                >
                  Catat Pagi
                </button>
              </div>

              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-primary-border">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-primary" />
                  <div>
                    <span className="font-bold text-xs text-farm-text block">Porsi Sore (16:30)</span>
                    <span className="text-[11px] text-farm-muted">{result.afternoonFeedKg} kg pelet</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRecordDirectMeal('Sore', result.afternoonFeedKg)}
                  disabled={savingFeed}
                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-subtle min-h-[36px]"
                >
                  Catat Sore
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
