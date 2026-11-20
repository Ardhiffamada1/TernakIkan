'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Calculator, 
  Scale, 
  Sparkles, 
  Plus, 
  AlertCircle, 
  CheckCircle2, 
  Edit2, 
  Trash2,
  BookmarkCheck,
  Utensils
} from 'lucide-react';
import { 
  CultivationBatch, 
  VitaminProduct, 
  VitaminCalculationResult,
  FishSamplingCalculation
} from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScaleBalanced, faCapsules, faBoxesStacked } from '@fortawesome/free-solid-svg-icons';
import { repository } from '@/lib/data/repository';
import { calculateVitaminDosage, DOSAGE_BASIS_LABELS } from '@/lib/calculator';
import { calculateDailyFeedFromSampling } from '@/lib/samplingCalculator';
import { getCurrentIsoString } from '@/lib/timezone';
import { AddVitaminProductModal } from '@/components/modals/AddVitaminProductModal';

function CalculatorContent() {
  const searchParams = useSearchParams();
  const preselectedBatchId = searchParams.get('batchId') || '';

  const [calcMode, setCalcMode] = useState<'sampling' | 'vitamin' | 'catalog'>('sampling');
  const [batches, setBatches] = useState<CultivationBatch[]>([]);
  const [products, setProducts] = useState<VitaminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Sampling Pakan state
  const [samplingBatchId, setSamplingBatchId] = useState(preselectedBatchId);
  const [sampleCount, setSampleCount] = useState('10');
  const [totalSampleWeightGram, setTotalSampleWeightGram] = useState('650');
  const [feedingRatePercent, setFeedingRatePercent] = useState<number>(3.5);
  const [mealCount, setMealCount] = useState<2 | 3>(2);
  const [recordedMealSuccess, setRecordedMealSuccess] = useState(false);

  // Vitamin Calculator state
  const [selectedBatchId, setSelectedBatchId] = useState(preselectedBatchId);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customWaterVolume, setCustomWaterVolume] = useState('');
  const [customFishCount, setCustomFishCount] = useState('');
  const [feedWeightKg, setFeedWeightKg] = useState('2.5');
  const [calcResult, setCalcResult] = useState<VitaminCalculationResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [savingVitLog, setSavingVitLog] = useState(false);
  const [vitSavedSuccess, setVitSavedSuccess] = useState(false);

  // Modal product
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VitaminProduct | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [activeBatches, allProducts] = await Promise.all([
        repository.getActiveBatches(),
        repository.getVitaminProducts(),
      ]);
      setBatches(activeBatches);
      setProducts(allProducts);

      if (!samplingBatchId && activeBatches.length > 0) {
        setSamplingBatchId(preselectedBatchId || activeBatches[0].id);
      }
      if (!selectedBatchId && activeBatches.length > 0) {
        setSelectedBatchId(preselectedBatchId || activeBatches[0].id);
      }
      if (!selectedProductId && allProducts.length > 0) {
        setSelectedProductId(allProducts[0].id);
      }
    } catch (err) {
      console.error('Failed to load calculator:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const samplingBatch = batches.find((b) => b.id === samplingBatchId);

  // Auto set parameters when batch selected
  useEffect(() => {
    if (selectedBatch) {
      setCustomFishCount(String(selectedBatch.current_quantity));
      if (selectedBatch.pond?.volume_liters) {
        setCustomWaterVolume(String(selectedBatch.pond.volume_liters));
      }
    }
    setCalcResult(null);
    setVitSavedSuccess(false);
  }, [selectedBatchId, batches]);

  // Hitung sampling pakan
  const samplingResult: FishSamplingCalculation = calculateDailyFeedFromSampling({
    batchId: samplingBatchId,
    sampleCount: parseInt(sampleCount) || 1,
    totalSampleWeightGram: parseFloat(totalSampleWeightGram) || 0,
    currentFishCount: samplingBatch?.current_quantity || 3000,
    feedingRatePercent,
    mealCount,
  });

  const handleRecordSampleMeal = async (meal: 'Pagi' | 'Sore', kg: number) => {
    if (!samplingBatchId || kg <= 0) return;
    try {
      await repository.createFeedLog({
        batch_id: samplingBatchId,
        feed_name: `Pelet Sampling (${meal})`,
        quantity: kg,
        unit: 'kg',
        fed_at: getCurrentIsoString(),
        notes: `Sampling: rata-rata ${samplingResult.averageWeightGram}g, rate ${samplingResult.feedingRatePercent}%`,
      });
      setRecordedMealSuccess(true);
      setTimeout(() => setRecordedMealSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan pakan.');
    }
  };

  // Hitung Vitamin
  const handleCalculateVitamin = () => {
    setCalcError(null);
    setVitSavedSuccess(false);

    if (!selectedProduct) {
      setCalcError('Pilih produk vitamin terlebih dahulu.');
      return;
    }
    if (!selectedBatch || !selectedBatch.pond) {
      setCalcError('Pilih kolam terlebih dahulu.');
      return;
    }

    const outcome = calculateVitaminDosage(
      selectedProduct,
      selectedBatch,
      selectedBatch.pond,
      {
        waterVolumeLiters: customWaterVolume ? parseFloat(customWaterVolume) : undefined,
        fishCount: customFishCount ? parseInt(customFishCount) : undefined,
        feedWeightKg: feedWeightKg ? parseFloat(feedWeightKg) : undefined,
      }
    );

    if (!outcome.success) {
      setCalcError(outcome.error);
      setCalcResult(null);
      return;
    }

    setCalcResult(outcome.result);
  };

  const handleSaveVitaminLog = async () => {
    if (!calcResult || !selectedBatch) return;
    try {
      setSavingVitLog(true);
      await repository.createVitaminLog({
        batch_id: selectedBatch.id,
        vitamin_product_id: calcResult.product.id,
        product_name: calcResult.product.name,
        dosage_used: calcResult.calculatedDosage,
        dosage_unit: calcResult.dosageUnit,
        applied_at: getCurrentIsoString(),
        notes: `Dihitung via TernakIkan: ${DOSAGE_BASIS_LABELS[calcResult.dosageBasis]}`,
      });
      setVitSavedSuccess(true);
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan vitamin.');
    } finally {
      setSavingVitLog(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Hapus produk "${name}"?`)) return;
    try {
      await repository.deleteVitaminProduct(id);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Gagal menghapus produk.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="border-b border-farm-border pb-3">
        <h1 className="text-xl font-bold tracking-tight text-farm-text">
          Kalkulator Budidaya
        </h1>
        <p className="text-xs text-farm-muted mt-0.5">
          Hitung porsi pakan sampling &amp; dosis vitamin aman
        </p>
      </div>

      {/* Pill Nav Tabs */}
      <div className="flex p-1 bg-farm-surface border border-farm-border rounded-2xl text-xs font-bold">
        <button
          onClick={() => setCalcMode('sampling')}
          className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            calcMode === 'sampling'
              ? 'bg-primary text-white shadow-subtle'
              : 'text-farm-muted hover:text-farm-text'
          }`}
        >
          <FontAwesomeIcon icon={faScaleBalanced} className="w-3.5 h-3.5" />
          <span>Pakan Sampling</span>
        </button>

        <button
          onClick={() => setCalcMode('vitamin')}
          className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            calcMode === 'vitamin'
              ? 'bg-primary text-white shadow-subtle'
              : 'text-farm-muted hover:text-farm-text'
          }`}
        >
          <FontAwesomeIcon icon={faCapsules} className="w-3.5 h-3.5" />
          <span>Dosis Vitamin</span>
        </button>

        <button
          onClick={() => setCalcMode('catalog')}
          className={`flex-1 py-2 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            calcMode === 'catalog'
              ? 'bg-primary text-white shadow-subtle'
              : 'text-farm-muted hover:text-farm-text'
          }`}
        >
          <FontAwesomeIcon icon={faBoxesStacked} className="w-3.5 h-3.5" />
          <span>Produk</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-farm-surface border border-farm-border rounded-2xl p-8 text-center text-xs text-farm-muted">
          Memuat kalkulator...
        </div>
      ) : calcMode === 'sampling' ? (
        /* ============================================================== */
        /* TAB 1: KALKULATOR PAKAN DARI SAMPLING (Fitur 2) */
        /* ============================================================== */
        <div className="space-y-3.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 items-start">
          <div className="bg-farm-surface border border-farm-border rounded-2xl p-4 shadow-subtle space-y-3">
            <span className="text-xs font-bold text-farm-text uppercase tracking-wider block">
              1. Pilih Kolam &amp; Data Sampling
            </span>

            <div>
              <label className="block text-[11px] font-bold text-farm-muted mb-1">
                Pilih Kolam
              </label>
              <select
                value={samplingBatchId}
                onChange={(e) => setSamplingBatchId(e.target.value)}
                className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.pond?.name || 'Kolam'} — {b.fish_type} ({b.current_quantity.toLocaleString('id-ID')} ekor)
                  </option>
                ))}
              </select>
            </div>

            {/* Input Sampling Timbangan */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-farm-muted mb-1">
                  Sampel (Ekor)
                </label>
                <input
                  type="number"
                  min="1"
                  value={sampleCount}
                  onChange={(e) => setSampleCount(e.target.value)}
                  className="w-full px-3 py-2 bg-farm-bg border border-farm-border rounded-xl text-sm font-bold text-farm-text min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-farm-muted mb-1">
                  Total Timbangan (Gram)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={totalSampleWeightGram}
                  onChange={(e) => setTotalSampleWeightGram(e.target.value)}
                  className="w-full px-3 py-2 bg-farm-bg border border-farm-border rounded-xl text-sm font-bold text-farm-text min-h-[44px]"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-primary-soft text-xs flex items-center justify-between">
              <span className="text-primary font-bold">Rata-rata Berat:</span>
              <span className="text-base font-extrabold text-primary">
                {samplingResult.averageWeightGram} gram / ekor
              </span>
            </div>

            {/* Rate % */}
            <div>
              <label className="block text-[11px] font-bold text-farm-muted mb-1">
                Tingkat Pakan (% Biomassa)
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[2.5, 3.0, 3.5, 4.0].map((r) => (
                  <button
                    key={r}
                    onClick={() => setFeedingRatePercent(r)}
                    className={`py-2 rounded-xl border font-bold ${
                      feedingRatePercent === r
                        ? 'bg-primary text-white border-primary shadow-subtle'
                        : 'bg-farm-surface border-farm-border text-farm-text'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hasil Porsi Makan & Tombol Catat Langsung */}
          <div className="bg-farm-surface border-2 border-primary rounded-2xl p-4 shadow-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-farm-border pb-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Rekomendasi Pakan Harian
              </span>
              <span className="text-2xl font-extrabold text-primary">
                {samplingResult.dailyFeedKg} <span className="text-xs">kg/hari</span>
              </span>
            </div>

            <p className="text-xs text-farm-muted">
              Total biomassa ikan kolam: <strong>{samplingResult.estimatedBiomassKg} kg</strong>
            </p>

            {recordedMealSuccess && (
              <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Pakan berhasil dicatat ke riwayat!</span>
              </div>
            )}

            {/* Tombol Catat Pagi & Sore */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-3 bg-farm-bg rounded-xl border border-farm-border space-y-1.5 text-center">
                <span className="text-xs font-bold text-farm-text block">Porsi Pagi</span>
                <span className="text-lg font-extrabold text-primary block">
                  {samplingResult.morningFeedKg} kg
                </span>
                <button
                  onClick={() => handleRecordSampleMeal('Pagi', samplingResult.morningFeedKg)}
                  className="w-full py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-subtle"
                >
                  Catat Pagi
                </button>
              </div>

              <div className="p-3 bg-farm-bg rounded-xl border border-farm-border space-y-1.5 text-center">
                <span className="text-xs font-bold text-farm-text block">Porsi Sore</span>
                <span className="text-lg font-extrabold text-primary block">
                  {samplingResult.afternoonFeedKg} kg
                </span>
                <button
                  onClick={() => handleRecordSampleMeal('Sore', samplingResult.afternoonFeedKg)}
                  className="w-full py-1.5 rounded-lg bg-primary text-white text-xs font-bold shadow-subtle"
                >
                  Catat Sore
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : calcMode === 'vitamin' ? (
        /* ============================================================== */
        /* TAB 2: KALKULATOR DOSIS VITAMIN */
        /* ============================================================== */
        <div className="space-y-3.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 items-start">
          <div className="bg-farm-surface border border-farm-border rounded-2xl p-4 shadow-subtle space-y-3">
            <span className="text-xs font-bold text-farm-text uppercase tracking-wider block">
              Parameter Perhitungan Vitamin
            </span>

            {calcError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{calcError}</span>
              </div>
            )}

            {/* Pilih Kolam */}
            <div>
              <label className="block text-[11px] font-bold text-farm-muted mb-1">
                Pilih Kolam
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.pond?.name || 'Kolam'} — {b.fish_type}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Produk */}
            <div>
              <label className="block text-[11px] font-bold text-farm-muted mb-1">
                Pilih Produk Vitamin / Obat
              </label>
              {products.length === 0 ? (
                <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  Belum ada produk vitamin di katalog. Tambahkan di tab Produk.
                </p>
              ) : (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {DOSAGE_BASIS_LABELS[p.dosage_basis]}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Dosis Basis Parameters */}
            {selectedProduct && (
              <div className="p-3 rounded-xl bg-farm-bg border border-farm-border space-y-2 text-xs">
                <p className="font-bold text-farm-text">
                  Label: {selectedProduct.dosage_value} {selectedProduct.dosage_unit} / {selectedProduct.reference_quantity} {selectedProduct.reference_unit}
                </p>

                {selectedProduct.dosage_basis === 'feed_weight' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-farm-muted mb-1">
                      Porsi Pakan yang Diberi (Kg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={feedWeightKg}
                      onChange={(e) => setFeedWeightKg(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-farm-border rounded-lg text-sm font-bold text-farm-text min-h-[40px]"
                    />
                  </div>
                )}

                {selectedProduct.dosage_basis === 'water_volume' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-farm-muted mb-1">
                      Volume Air Kolam (Liter)
                    </label>
                    <input
                      type="number"
                      value={customWaterVolume}
                      onChange={(e) => setCustomWaterVolume(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-farm-border rounded-lg text-sm font-bold text-farm-text min-h-[40px]"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleCalculateVitamin}
              disabled={!selectedProduct || !selectedBatch}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-subtle min-h-[48px] transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              <span>Hitung Dosis Sekarang</span>
            </button>
          </div>

          {/* Hasil Perhitungan Vitamin */}
          {calcResult && (
            <div className="bg-farm-surface border-2 border-primary rounded-2xl p-4 shadow-subtle space-y-3">
              <div className="p-3 rounded-xl bg-primary-soft text-center">
                <span className="text-[11px] font-bold text-primary uppercase block">
                  Takaran yang Harus Diberikan:
                </span>
                <span className="text-3xl font-extrabold text-primary block mt-0.5">
                  {calcResult.calculatedDosage} {calcResult.dosageUnit}
                </span>
                <span className="text-xs text-primary/80 font-medium">
                  Formula: {calcResult.formulaDescription}
                </span>
              </div>

              {calcResult.applicationInstructions && (
                <p className="text-xs text-farm-muted p-2.5 rounded-xl bg-farm-bg border border-farm-border italic">
                  &ldquo;{calcResult.applicationInstructions}&rdquo;
                </p>
              )}

              {vitSavedSuccess ? (
                <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl text-xs font-bold text-center">
                  Berhasil dicatat ke riwayat kolam!
                </div>
              ) : (
                <button
                  onClick={handleSaveVitaminLog}
                  disabled={savingVitLog}
                  className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-subtle min-h-[44px]"
                >
                  {savingVitLog ? 'Menyimpan...' : 'Simpan ke Catatan Kolam'}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* TAB 3: KATALOG PRODUK VITAMIN */
        /* ============================================================== */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-farm-text uppercase tracking-wider">
              Katalog Vitamin ({products.length})
            </span>
            <button
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
              className="text-xs px-3 py-1.5 rounded-xl bg-primary text-white font-bold flex items-center gap-1 shadow-subtle"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="p-3.5 bg-farm-surface border border-farm-border rounded-2xl shadow-subtle space-y-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-farm-text">{p.name}</h3>
                    {p.brand && <p className="text-[11px] text-farm-muted">{p.brand}</p>}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {DOSAGE_BASIS_LABELS[p.dosage_basis]}
                  </span>
                </div>

                <p className="font-bold text-farm-text">
                  Dosis: {p.dosage_value} {p.dosage_unit} per {p.reference_quantity} {p.reference_unit}
                </p>

                <div className="pt-2 border-t border-farm-divider flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setCalcMode('vitamin');
                    }}
                    className="font-bold text-primary"
                  >
                    Pakai di Kalkulator →
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProduct(p);
                        setProductModalOpen(true);
                      }}
                      className="p-1 text-farm-muted hover:text-farm-text"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddVitaminProductModal
        isOpen={productModalOpen}
        initialProduct={editingProduct}
        onClose={() => setProductModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-farm-muted">Memuat kalkulator...</div>}>
      <CalculatorContent />
    </Suspense>
  );
}
