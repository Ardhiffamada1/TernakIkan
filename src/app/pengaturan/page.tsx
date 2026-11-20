'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  Clock, 
  Download, 
  RotateCcw, 
  Copy, 
  Check, 
  AlertTriangle, 
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { repository } from '@/lib/data/repository';
import { APP_TIMEZONE, getTodayJakartaString } from '@/lib/timezone';

export default function PengaturanPage() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
  }, []);

  const envSample = `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_TIMEZONE=Asia/Jakarta`;

  const copyEnvText = () => {
    navigator.clipboard.writeText(envSample);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleExportData = async () => {
    try {
      const [ponds, batches, feeds, vitamins, activities] = await Promise.all([
        repository.getPonds(),
        repository.getBatches(),
        repository.getFeedLogs(),
        repository.getVitaminProducts(),
        repository.getActivityLogs(),
      ]);

      const backup = {
        exported_at: new Date().toISOString(),
        version: '1.2.0',
        timezone: APP_TIMEZONE,
        data: { ponds, batches, feed_logs: feeds, vitamin_products: vitamins, activity_logs: activities },
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `ternakikan-backup-${getTodayJakartaString()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Gagal mengekspor data: ' + err);
    }
  };

  const handleResetData = () => {
    if (!window.confirm('Reset data contoh? Seluruh perubahan di HP akan dikembalikan ke data awal demonstrasi.')) return;
    repository.resetDemo();
    setResetDone(true);
    setTimeout(() => {
      setResetDone(false);
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-farm-border pb-3">
        <h1 className="text-xl font-bold tracking-tight text-farm-text">
          Pengaturan
        </h1>
        <p className="text-xs text-farm-muted mt-0.5">
          Basis data, instalasi HP, dan cadangan data
        </p>
      </div>

      {/* 1. Status Supabase */}
      <div className="bg-farm-surface border border-farm-border rounded-2xl p-4 shadow-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isConfigured ? 'bg-blue-100 text-primary' : 'bg-slate-100 text-slate-700'
            }`}>
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-farm-text">Status Database</h2>
              <span className={`text-xs font-bold ${isConfigured ? 'text-primary' : 'text-farm-muted'}`}>
                {isConfigured ? 'Terhubung Supabase Cloud' : 'Penyimpanan Lokal'}
              </span>
            </div>
          </div>
          <span className={`w-2.5 h-2.5 rounded-full ${isConfigured ? 'bg-primary animate-pulse' : 'bg-slate-400'}`} />
        </div>

        {!isConfigured && (
          <div className="p-3 rounded-xl bg-slate-50 border border-farm-border text-xs space-y-2 text-farm-text">
            <p className="font-bold">Konfigurasi Supabase Cloud:</p>
            <ol className="list-decimal list-inside space-y-1 text-farm-muted leading-relaxed text-[11px]">
              <li>Buka proyek di <strong>supabase.com/dashboard</strong>.</li>
              <li>Jalankan skrip <strong>supabase/schema.sql</strong> di SQL Editor.</li>
              <li>Salin URL &amp; anon key ke file <strong>.env.local</strong>.</li>
            </ol>
            <div className="relative mt-1">
              <pre className="p-2.5 bg-gray-900 text-gray-100 rounded-lg text-[10px] font-mono overflow-x-auto">
                {envSample}
              </pre>
              <button
                onClick={copyEnvText}
                className="absolute right-2 top-2 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-[10px] font-bold flex items-center gap-1"
              >
                {copiedEnv ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEnv ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Petunjuk Pasang di Layar Utama HP (PWA) */}
      <div className="bg-farm-surface border border-farm-border rounded-2xl p-4 shadow-subtle space-y-2 text-xs">
        <div className="flex items-center gap-2 font-bold text-farm-text">
          <Smartphone className="w-4 h-4 text-primary" />
          <span>Pasang di Layar Utama HP (Aplikasi)</span>
        </div>
        <p className="text-farm-muted leading-relaxed text-[11px]">
          Buka menu browser Chrome/Safari di HP Anda, lalu pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (Add to Home screen). TernakIkan akan terbuka seperti aplikasi HP sungguhan tanpa bilah alamat browser.
        </p>
      </div>

      {/* 3. Zona Waktu */}
      <div className="bg-farm-surface border border-farm-border rounded-2xl p-4 shadow-subtle flex items-center justify-between text-xs">
        <div>
          <span className="text-[11px] font-bold text-farm-muted uppercase block">Zona Waktu</span>
          <span className="font-extrabold text-farm-text text-sm">{APP_TIMEZONE} (WIB)</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-primary-soft text-primary font-bold text-xs">
          UTC+7
        </span>
      </div>

      {/* 4. Ekspor Data & Reset */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          onClick={handleExportData}
          className="p-3 bg-farm-surface border border-farm-border hover:bg-farm-bg rounded-2xl font-bold text-farm-text shadow-subtle flex flex-col items-center justify-center gap-1 min-h-[64px]"
        >
          <Download className="w-4 h-4 text-primary" />
          <span>Cadangan (JSON)</span>
        </button>

        <button
          onClick={handleResetData}
          disabled={resetDone}
          className="p-3 bg-farm-surface border border-red-200 hover:bg-red-50 rounded-2xl font-bold text-red-700 shadow-subtle flex flex-col items-center justify-center gap-1 min-h-[64px]"
        >
          <RotateCcw className="w-4 h-4 text-red-600" />
          <span>{resetDone ? 'Mengatur ulang...' : 'Reset Data'}</span>
        </button>
      </div>

      <div className="text-center text-xs text-farm-muted pt-2 space-y-0.5">
        <p className="font-bold text-farm-text">TernakIkan Mobile v1.2.0</p>
        <p className="text-[11px]">Khusus Budidaya Ikan Peternak Indonesia</p>
      </div>
    </div>
  );
}
