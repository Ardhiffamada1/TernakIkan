'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHouse, 
  faLayerGroup, 
  faCalculator, 
  faClockRotateLeft, 
  faGear, 
  faFish, 
  faDroplet, 
  faPlus 
} from '@fortawesome/free-solid-svg-icons';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { formatIndonesianDate, getGreeting, getTodayJakartaString } from '@/lib/timezone';
import { RecordWaterCheckModal } from './modals/RecordWaterCheckModal';
import { RecordFeedModal } from './modals/RecordFeedModal';

const NAV_ITEMS = [
  { href: '/', label: 'Beranda', icon: faHouse },
  { href: '/kolam', label: 'Kolam', icon: faLayerGroup },
  { href: '/kalkulator', label: 'Kalkulator', icon: faCalculator },
  { href: '/riwayat', label: 'Riwayat', icon: faClockRotateLeft },
  { href: '/pengaturan', label: 'Pengaturan', icon: faGear },
];

export function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isConfigured, setIsConfigured] = useState(false);
  const [todayString, setTodayString] = useState('');
  const [mobileDateString, setMobileDateString] = useState('');
  const [greeting, setGreeting] = useState('Selamat beraktivitas');
  const [waterCheckOpen, setWaterCheckOpen] = useState(false);
  const [quickFeedOpen, setQuickFeedOpen] = useState(false);

  useEffect(() => {
    setIsConfigured(isSupabaseConfigured());
    const today = getTodayJakartaString();
    setTodayString(formatIndonesianDate(today, { includeDayName: true }));
    setMobileDateString(formatIndonesianDate(today, { long: false }));
    setGreeting(getGreeting());

    // Register PWA service worker in browser
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-farm-bg flex antialiased text-farm-text">
      {/* ================================================================ */}
      {/* 1. DESKTOP SIDEBAR NAVIGATION (~240px wide, visible on md: up)   */}
      {/* ================================================================ */}
      <aside className="hidden md:flex flex-col w-60 lg:w-64 shrink-0 bg-farm-surface border-r border-farm-border sticky top-0 h-screen p-4 z-30 justify-between select-none shadow-subtle">
        <div className="space-y-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 px-1.5 pt-1">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-subtle shrink-0">
              <FontAwesomeIcon icon={faFish} className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-base text-farm-text tracking-tight leading-none block">
                TernakIkan
              </span>
              <span className="text-xs text-farm-muted font-medium mt-1 block truncate">
                Manajemen Kolam Ikan
              </span>
            </div>
          </div>

          {/* Quick Action Buttons on Sidebar */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => setQuickFeedOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-subtle"
            >
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
              <span>Catat Pakan Baru</span>
            </button>

            <button
              onClick={() => setWaterCheckOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faDroplet} className="w-3.5 h-3.5 text-cyan-700" />
              <span>Cek Air &amp; Kesehatan</span>
            </button>
          </div>

          {/* Main Navigation Items */}
          <nav className="space-y-1">
            <span className="text-[11px] font-bold text-farm-muted uppercase tracking-wider px-2 block mb-2">
              Menu Aplikasi
            </span>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    active
                      ? 'bg-primary text-white shadow-subtle'
                      : 'text-farm-muted hover:text-farm-text hover:bg-farm-bg'
                  }`}
                >
                  <FontAwesomeIcon 
                    icon={item.icon} 
                    className={`w-4 h-4 ${active ? 'text-white' : 'text-farm-muted'}`} 
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom Footer Info */}
        <div className="pt-4 border-t border-farm-border space-y-1 px-1 text-xs text-farm-muted">
          <span className="font-bold text-farm-text block">TernakIkan App</span>
          <p className="text-[11px] text-farm-muted/80 truncate">
            {todayString || 'Hari ini'}
          </p>
        </div>
      </aside>

      {/* ================================================================ */}
      {/* 2. MAIN APPLICATION COLUMN                                       */}
      {/* ================================================================ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile App Header Bar (ONLY on mobile < md:) */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-farm-border px-4 py-3 sm:px-6 flex items-center justify-between gap-4 shadow-subtle pt-[calc(0.75rem+env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-subtle shrink-0">
              <FontAwesomeIcon icon={faFish} className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col min-w-0 justify-center">
              <span className="font-extrabold text-[15px] text-farm-text tracking-tight truncate leading-tight block">
                TernakIkan
              </span>
              <span className="text-[11px] text-farm-muted font-medium mt-0.5 truncate block">
                {mobileDateString || todayString || 'Hari ini'}
              </span>
            </div>
          </div>

          {/* Quick Action Buttons on Mobile Header */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setWaterCheckOpen(true)}
              className="h-8 px-2.5 rounded-xl bg-cyan-50/90 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
              title="Cek Kondisi Air & Ikan"
              aria-label="Cek Air"
            >
              <FontAwesomeIcon icon={faDroplet} className="w-3.5 h-3.5 text-cyan-700" />
              <span>Cek Air</span>
            </button>

            <button
              onClick={() => setQuickFeedOpen(true)}
              className="h-8 px-3 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-subtle"
            >
              <FontAwesomeIcon icon={faPlus} className="w-3 h-3" />
              <span>Pakan</span>
            </button>
          </div>
        </header>

        {/* Desktop Top Header Bar (ONLY on desktop md: and up) */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-farm-surface border-b border-farm-border sticky top-0 z-20">
          <div>
            <span className="text-sm font-bold text-farm-text">
              {greeting}
            </span>
            <span className="text-xs text-farm-muted ml-2">
              • {todayString}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setWaterCheckOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <FontAwesomeIcon icon={faDroplet} className="w-3.5 h-3.5 text-cyan-700" />
              <span>Cek Kondisi Air</span>
            </button>

            <button
              onClick={() => setQuickFeedOpen(true)}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold flex items-center gap-2 shadow-subtle transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
              <span>Beri Pakan</span>
            </button>
          </div>
        </header>

        {/* Page Content: full width on mobile, comfortable max-w-5xl on desktop */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 md:px-8 md:py-6 pb-24 md:pb-12 overflow-y-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar (ONLY on mobile < md:) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-farm-border/80 z-40 flex items-center justify-around h-[58px] px-1 pb-1 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center py-1 min-h-[46px] relative transition-transform active:scale-90"
              >
                <div
                  className={`w-11 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                    active
                      ? 'bg-primary/10 text-primary scale-105'
                      : 'text-farm-muted/70 hover:text-farm-text'
                  }`}
                >
                  <FontAwesomeIcon
                    icon={item.icon}
                    className={`text-sm ${active ? 'text-primary' : 'text-farm-muted/80'}`}
                  />
                </div>
                <span
                  className={`text-[10px] tracking-tight transition-colors mt-0.5 leading-tight ${
                    active ? 'font-extrabold text-primary' : 'font-medium text-farm-muted'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Global Quick Modals */}
      <RecordWaterCheckModal
        isOpen={waterCheckOpen}
        onClose={() => setWaterCheckOpen(false)}
        onSuccess={() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }}
      />

      <RecordFeedModal
        isOpen={quickFeedOpen}
        onClose={() => setQuickFeedOpen(false)}
        onSuccess={() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }}
      />
    </div>
  );
}
