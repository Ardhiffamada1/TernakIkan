'use client';

import React, { useState } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import { Pond } from '@/types';
import { repository } from '@/lib/data/repository';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pond: Pond) => void;
  initialPond?: Pond | null;
}

export function AddPondModal({ isOpen, onClose, onSuccess, initialPond }: Props) {
  const isEditing = Boolean(initialPond);
  const [name, setName] = useState(initialPond?.name || '');
  const [location, setLocation] = useState(initialPond?.location || '');
  const [volumeLiters, setVolumeLiters] = useState(initialPond?.volume_liters ? String(initialPond.volume_liters) : '4000');
  const [notes, setNotes] = useState(initialPond?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama kolam wajib diisi.');
      return;
    }
    const vol = parseFloat(volumeLiters);
    if (isNaN(vol) || vol <= 0) {
      setError('Volume air kolam harus lebih besar dari 0 liter.');
      return;
    }

    try {
      setLoading(true);
      if (isEditing && initialPond) {
        const updated = await repository.updatePond(initialPond.id, {
          name: name.trim(),
          location: location.trim() || null,
          volume_liters: vol,
          notes: notes.trim() || null,
        });
        onSuccess(updated);
      } else {
        const created = await repository.createPond({
          name: name.trim(),
          location: location.trim() || undefined,
          volume_liters: vol,
          notes: notes.trim() || undefined,
        });
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan data kolam.');
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
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base text-farm-text">
                {isEditing ? 'Edit Kolam' : 'Tambah Kolam Baru'}
              </h3>
              <p className="text-xs text-farm-muted">Kapasitas air &amp; lokasi kolam</p>
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

          {/* Nama Kolam */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Nama Kolam <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Kolam Terpal A1"
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
            />
          </div>

          {/* Volume Air */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Volume Air (Liter) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                value={volumeLiters}
                onChange={(e) => setVolumeLiters(e.target.value)}
                placeholder="4000"
                className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary pr-14 min-h-[48px]"
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-farm-muted">Liter</span>
            </div>
            <p className="mt-1 text-[11px] text-farm-muted">
              *Penting: Volume ini dipakai otomatis untuk menghitung dosis obat/vitamin kolam.
            </p>
          </div>

          {/* Lokasi */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1">
              Lokasi Kolam (Opsional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Contoh: Halaman belakang timur"
              className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-xs font-medium text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1">
              Catatan Ukuran / Bahan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Terpal bundar D3 tinggi 1m"
              className="w-full px-3 py-2 bg-farm-surface border border-farm-border rounded-xl text-xs text-farm-text focus:outline-none focus:border-primary min-h-[44px]"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-subtle min-h-[48px] transition-colors"
            >
              {loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Kolam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
