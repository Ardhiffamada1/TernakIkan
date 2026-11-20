'use client';

import React, { useState, useEffect } from 'react';
import { X, Droplet, AlertTriangle, CheckCircle2, CloudRain, Sun, Cloud } from 'lucide-react';
import { CultivationBatch, WaterCheckData } from '@/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCircle, 
  faLeaf, 
  faBolt, 
  faTriangleExclamation, 
  faBed, 
  faArrowsRotate, 
  faSun, 
  faCloud, 
  faCloudRain 
} from '@fortawesome/free-solid-svg-icons';
import { repository } from '@/lib/data/repository';
import { analyzeWaterAndFish } from '@/lib/waterCheck';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultBatchId?: string;
}

export function RecordWaterCheckModal({ isOpen, onClose, onSuccess, defaultBatchId }: Props) {
  const [batches, setBatches] = useState<CultivationBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(defaultBatchId || '');
  const [waterColor, setWaterColor] = useState<WaterCheckData['waterColor']>('green_light');
  const [fishBehavior, setFishBehavior] = useState<WaterCheckData['fishBehavior']>('active');
  const [weather, setWeather] = useState<WaterCheckData['weather']>('sunny');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

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

  const analysis = analyzeWaterAndFish({
    batchId: selectedBatchId,
    waterColor,
    fishBehavior,
    weather,
    notes,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;

    try {
      setLoading(true);
      await repository.recordWaterCheck(analysis);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Gagal menyimpan catatan kondisi air.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      {/* Mobile Bottom Sheet Container */}
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-farm-border w-full sm:max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle pill on top */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-3 border-b border-farm-border flex items-center justify-between bg-cyan-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center">
              <Droplet className="w-4 h-4 text-cyan-800" />
            </div>
            <div>
              <h3 className="font-bold text-base text-farm-text">Cek Kondisi Air &amp; Ikan</h3>
              <p className="text-xs text-farm-muted">Pengamatan visual tanpa alat laboratorium</p>
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
                  {b.pond?.name || 'Kolam'} — {b.fish_type}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Warna Air */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Warna Air Kolam
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'green_light', label: 'Hijau Cerah', icon: faCircle, iconColor: 'text-emerald-500', desc: 'Plankton segar, kondisi prima' },
                { id: 'green_dark', label: 'Hijau Pekat', icon: faLeaf, iconColor: 'text-emerald-800', desc: 'Terlalu lebat, waspada malam' },
                { id: 'brown', label: 'Cokelat Keruh', icon: faCircle, iconColor: 'text-amber-700', desc: 'Bahan organik mulai tinggi' },
                { id: 'black_foul', label: 'Hitam / Bau', icon: faCircle, iconColor: 'text-zinc-900', desc: 'Dasar kolam busuk / amonia' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setWaterColor(opt.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all min-h-[54px] ${
                    waterColor === opt.id
                      ? 'bg-cyan-50 border-cyan-500 font-bold text-cyan-950 shadow-subtle'
                      : 'bg-farm-surface border-farm-border text-farm-text hover:bg-farm-bg'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <FontAwesomeIcon icon={opt.icon} className={`w-3 h-3 ${opt.iconColor}`} />
                    <span>{opt.label}</span>
                  </span>
                  <span className="block text-[10px] text-farm-muted font-normal mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tingkah Laku Ikan */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Gerakan &amp; Nafsu Makan Ikan
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'active', label: 'Lincah & Lahap', icon: faBolt, iconColor: 'text-amber-500', desc: 'Kondisi sehat normal' },
                { id: 'gasping_surface', label: 'Menggantung di Atas', icon: faTriangleExclamation, iconColor: 'text-red-600', desc: 'Kurang oksigen / mangap' },
                { id: 'sluggish', label: 'Lemas & Tak Nafsu', icon: faBed, iconColor: 'text-slate-500', desc: 'Stres / suhu dingin' },
                { id: 'flashing', label: 'Miring / Gesek Tubuh', icon: faArrowsRotate, iconColor: 'text-amber-600', desc: 'Tanda parasit / pH drop' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setFishBehavior(opt.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all min-h-[54px] ${
                    fishBehavior === opt.id
                      ? 'bg-amber-50 border-amber-500 font-bold text-amber-950 shadow-subtle'
                      : 'bg-farm-surface border-farm-border text-farm-text hover:bg-farm-bg'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <FontAwesomeIcon icon={opt.icon} className={`w-3.5 h-3.5 ${opt.iconColor}`} />
                    <span>{opt.label}</span>
                  </span>
                  <span className="block text-[10px] text-farm-muted font-normal mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Cuaca Saat Ini */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Cuaca Sekitar Kolam
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { id: 'sunny', label: 'Cerah', icon: Sun },
                { id: 'cloudy', label: 'Mendung', icon: Cloud },
                { id: 'heavy_rain', label: 'Hujan Deras', icon: CloudRain },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => setWeather(opt.id as any)}
                    className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all min-h-[48px] ${
                      weather === opt.id
                        ? 'bg-primary text-white border-primary font-bold shadow-subtle'
                        : 'bg-farm-surface border-farm-border text-farm-text hover:bg-farm-bg'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Diagnosis & Saran Tindakan Otomatis */}
          <div className="p-3.5 rounded-xl bg-farm-bg border border-farm-border space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-farm-text">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>Saran Tindakan: {analysis.diagnosisTitle}</span>
            </div>
            <ul className="space-y-1 text-xs text-farm-muted pl-1">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-snug">
                  <span className="text-primary font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Catatan Bebas */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1">
              Catatan Peternak (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Sudah ditambah aerasi 1 titik"
              className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-xs text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || batches.length === 0}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-subtle min-h-[48px] transition-colors flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Menyimpan...' : 'Simpan Catatan Pengamatan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
