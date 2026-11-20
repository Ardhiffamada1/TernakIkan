'use client';

import React, { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { VitaminProduct, DosageBasis } from '@/types';
import { repository } from '@/lib/data/repository';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product?: VitaminProduct) => void;
  initialProduct?: VitaminProduct | null;
}

export function AddVitaminProductModal({ isOpen, onClose, onSuccess, initialProduct }: Props) {
  const isEditing = Boolean(initialProduct);

  const [name, setName] = useState(initialProduct?.name || '');
  const [brand, setBrand] = useState(initialProduct?.brand || '');
  const [applicationMethod, setApplicationMethod] = useState(initialProduct?.application_method || 'Campur Pakan (Bibis)');
  const [dosageBasis, setDosageBasis] = useState<DosageBasis>(initialProduct?.dosage_basis || 'water_volume');
  const [dosageValue, setDosageValue] = useState(initialProduct?.dosage_value ? String(initialProduct.dosage_value) : '10');
  const [dosageUnit, setDosageUnit] = useState(initialProduct?.dosage_unit || 'ml');
  const [refQuantity, setRefQuantity] = useState(initialProduct?.reference_quantity ? String(initialProduct.reference_quantity) : '1000');
  const [refUnit, setRefUnit] = useState(initialProduct?.reference_unit || 'liter');
  const [instructions, setInstructions] = useState(initialProduct?.instructions || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBasisChange = (basis: DosageBasis) => {
    setDosageBasis(basis);
    if (basis === 'water_volume') {
      setRefQuantity('1000');
      setRefUnit('liter');
      setDosageUnit('ml');
      setApplicationMethod('Larutkan ke Air Kolam');
    } else if (basis === 'fish_count') {
      setRefQuantity('1000');
      setRefUnit('ekor');
      setDosageUnit('gram');
      setApplicationMethod('Campur Pakan (Bibis)');
    } else if (basis === 'fish_biomass') {
      setRefQuantity('10');
      setRefUnit('kg');
      setDosageUnit('gram');
      setApplicationMethod('Campur Pakan (Bibis)');
    } else if (basis === 'feed_weight') {
      setRefQuantity('1');
      setRefUnit('kg');
      setDosageUnit('gram');
      setApplicationMethod('Campur Pakan (Bibis)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama produk vitamin wajib diisi.');
      return;
    }
    const dVal = parseFloat(dosageValue);
    if (isNaN(dVal) || dVal <= 0) {
      setError('Nilai dosis harus lebih dari 0.');
      return;
    }
    const rQty = parseFloat(refQuantity);
    if (isNaN(rQty) || rQty <= 0) {
      setError('Jumlah acuan harus lebih dari 0.');
      return;
    }

    try {
      setLoading(true);
      if (isEditing && initialProduct) {
        await repository.updateVitaminProduct(initialProduct.id, {
          name: name.trim(),
          brand: brand.trim() || null,
          application_method: applicationMethod.trim() || null,
          dosage_basis: dosageBasis,
          dosage_value: dVal,
          dosage_unit: dosageUnit.trim(),
          reference_quantity: rQty,
          reference_unit: refUnit.trim(),
          instructions: instructions.trim() || null,
        });
        onSuccess();
      } else {
        const created = await repository.createVitaminProduct({
          name: name.trim(),
          brand: brand.trim() || undefined,
          application_method: applicationMethod.trim() || undefined,
          dosage_basis: dosageBasis,
          dosage_value: dVal,
          dosage_unit: dosageUnit.trim(),
          reference_quantity: rQty,
          reference_unit: refUnit.trim(),
          instructions: instructions.trim() || undefined,
        });
        onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan produk vitamin.');
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
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-base text-farm-text">
                {isEditing ? 'Edit Produk Vitamin' : 'Tambah Produk Vitamin'}
              </h3>
              <p className="text-xs text-farm-muted">Isi sesuai label resmi kemasan</p>
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

          {/* Nama & Merek */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
                Nama Produk <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Inapro-V"
                className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-bold text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
                Merek / Pabrik
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Indovet"
                className="w-full px-3 py-2.5 bg-farm-surface border border-farm-border rounded-xl text-sm font-medium text-farm-text focus:outline-none focus:border-primary min-h-[48px]"
              />
            </div>
          </div>

          {/* Dasar Hitungan Label */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1.5">
              Dasar Takaran pada Kemasan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: 'water_volume', label: '1. Per Volume Air', desc: '10 ml / 1.000 liter' },
                { id: 'feed_weight', label: '2. Per Kg Pakan', desc: '5 gr / 1 kg pelet' },
                { id: 'fish_count', label: '3. Per Ekor Ikan', desc: '5 gr / 1.000 ekor' },
                { id: 'fish_biomass', label: '4. Per Kg Ikan', desc: '2 gr / 10 kg ikan' },
              ].map((b) => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => handleBasisChange(b.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all min-h-[50px] ${
                    dosageBasis === b.id
                      ? 'bg-primary text-white border-primary font-bold shadow-subtle'
                      : 'bg-farm-surface border-farm-border text-farm-text hover:bg-farm-bg'
                  }`}
                >
                  <span className="block text-xs">{b.label}</span>
                  <span className={`block text-[10px] ${dosageBasis === b.id ? 'text-white/80' : 'text-farm-muted'}`}>{b.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Takaran Label */}
          <div className="p-3.5 rounded-2xl bg-farm-bg border border-farm-border space-y-2 text-xs">
            <span className="font-bold text-farm-text block">Takaran Resmi pada Label:</span>
            <div className="grid grid-cols-4 gap-2 items-center">
              <div>
                <label className="text-[10px] font-bold text-farm-muted block mb-1">Dosis</label>
                <input
                  type="number"
                  step="any"
                  value={dosageValue}
                  onChange={(e) => setDosageValue(e.target.value)}
                  className="w-full px-2 py-2 bg-white border border-farm-border rounded-lg text-sm font-bold text-farm-text text-center focus:outline-none focus:border-primary min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-farm-muted block mb-1">Satuan</label>
                <input
                  type="text"
                  value={dosageUnit}
                  onChange={(e) => setDosageUnit(e.target.value)}
                  placeholder="gram/ml"
                  className="w-full px-2 py-2 bg-white border border-farm-border rounded-lg text-xs font-bold text-farm-text text-center focus:outline-none focus:border-primary min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-farm-muted block mb-1">Untuk</label>
                <input
                  type="number"
                  step="any"
                  value={refQuantity}
                  onChange={(e) => setRefQuantity(e.target.value)}
                  className="w-full px-2 py-2 bg-white border border-farm-border rounded-lg text-sm font-bold text-farm-text text-center focus:outline-none focus:border-primary min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-farm-muted block mb-1">Acuan</label>
                <input
                  type="text"
                  value={refUnit}
                  onChange={(e) => setRefUnit(e.target.value)}
                  placeholder="liter/kg"
                  className="w-full px-2 py-2 bg-white border border-farm-border rounded-lg text-xs font-bold text-farm-text text-center focus:outline-none focus:border-primary min-h-[44px]"
                />
              </div>
            </div>
          </div>

          {/* Petunjuk Aplikasi */}
          <div>
            <label className="block text-xs font-bold text-farm-text uppercase tracking-wider mb-1">
              Petunjuk Aplikasi Peternak
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Contoh: Larutkan air 100ml, semprot pelet, diamkan 10 menit"
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
              {loading ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Simpan Produk Vitamin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
