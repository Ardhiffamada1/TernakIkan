'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLocationDot,
  faRotate,
  faDroplet,
  faWind,
  faSun,
  faCloud,
  faCloudSun,
  faCloudRain,
  faCloudBolt,
  faTemperatureHigh,
  faTemperatureLow,
  faUtensils,
  faTriangleExclamation,
  faCircleInfo,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import {
  BMKG_LOCATIONS,
  DEFAULT_BMKG_LOCATION,
  fetchBmkgWeather,
  getAquacultureWeatherAdvice,
  BmkgWeatherData,
  AquacultureAdvice
} from '@/lib/bmkg';

const STORAGE_LOCATION_KEY = 'ternakikan_selected_location';
const LEGACY_STORAGE_LOCATION_KEY = 'fishtrack_selected_location';

export function WeatherWidget() {
  const [selectedCode, setSelectedCode] = useState<string>(DEFAULT_BMKG_LOCATION);
  const [weatherData, setWeatherData] = useState<BmkgWeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [hasMounted, setHasMounted] = useState<boolean>(false);

  // Inisialisasi lokasi dari storage browser
  useEffect(() => {
    setHasMounted(true);
    try {
      const savedCode = localStorage.getItem(STORAGE_LOCATION_KEY) || localStorage.getItem(LEGACY_STORAGE_LOCATION_KEY);
      if (savedCode && BMKG_LOCATIONS.some(l => l.code === savedCode)) {
        setSelectedCode(savedCode);
      } else {
        // Otomatis arahkan ke default Kotawaringin Barat
        setSelectedCode(DEFAULT_BMKG_LOCATION);
        localStorage.setItem(STORAGE_LOCATION_KEY, DEFAULT_BMKG_LOCATION);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadWeather = async (code: string, force = false) => {
    try {
      if (force) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await fetchBmkgWeather(code, force);
      setWeatherData(data);
    } catch (err) {
      console.error('Error fetching BMKG weather:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!hasMounted) return;
    loadWeather(selectedCode);
  }, [selectedCode, hasMounted]);

  const handleLocationChange = (newCode: string) => {
    setSelectedCode(newCode);
    try {
      localStorage.setItem(STORAGE_LOCATION_KEY, newCode);
    } catch {
      // ignore
    }
  };

  const handleRefresh = () => {
    if (refreshing) return;
    loadWeather(selectedCode, true);
  };

  // Helper formatting jam
  const formatTimeSlot = (datetimeStr: string) => {
    try {
      const d = new Date(datetimeStr);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return datetimeStr.substring(11, 16);
    }
  };

  const advice: AquacultureAdvice | null = weatherData
    ? getAquacultureWeatherAdvice(weatherData.current.weather_desc, weatherData.current.t)
    : null;

  const renderWeatherIcon = (iconName: AquacultureAdvice['iconName'], className = 'w-5 h-5') => {
    switch (iconName) {
      case 'cloud-bolt':
        return <FontAwesomeIcon icon={faCloudBolt} className={className} />;
      case 'cloud-rain':
        return <FontAwesomeIcon icon={faCloudRain} className={className} />;
      case 'cloud':
        return <FontAwesomeIcon icon={faCloud} className={className} />;
      case 'cloud-sun':
        return <FontAwesomeIcon icon={faCloudSun} className={className} />;
      case 'temperature-high':
        return <FontAwesomeIcon icon={faTemperatureHigh} className={className} />;
      case 'temperature-low':
        return <FontAwesomeIcon icon={faTemperatureLow} className={className} />;
      case 'sun':
      default:
        return <FontAwesomeIcon icon={faSun} className={className} />;
    }
  };

  if (!hasMounted) {
    return (
      <div className="bg-farm-surface border border-farm-border rounded-2xl p-4 shadow-subtle animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
        <div className="h-14 bg-slate-100 rounded mb-2"></div>
      </div>
    );
  }

  return (
    <div className="bg-farm-surface border border-farm-border rounded-2xl p-3.5 shadow-subtle space-y-3">
      {/* 1. Header: Lokasi Kobar, Badge BMKG & Refresh */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <FontAwesomeIcon icon={faLocationDot} className="w-3.5 h-3.5 text-primary shrink-0" />
          <div className="min-w-0 flex-1 flex items-center gap-1">
            <span className="text-[10px] font-bold text-farm-muted uppercase tracking-wider shrink-0">
              Kobar:
            </span>
            <select
              value={selectedCode}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-farm-text border-b border-dashed border-farm-border hover:border-primary focus:outline-none focus:border-primary truncate max-w-full cursor-pointer py-0.5"
              title="Pilih Kecamatan di Kotawaringin Barat"
            >
              {BMKG_LOCATIONS.map((loc) => (
                <option key={loc.code} value={loc.code} className="bg-white text-farm-text">
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-primary bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            BMKG
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Perbarui Data Cuaca"
            className="w-7 h-7 rounded-lg bg-farm-surface hover:bg-blue-50 border border-farm-border flex items-center justify-center text-farm-muted hover:text-primary transition-all active:scale-95 disabled:opacity-50"
          >
            <FontAwesomeIcon
              icon={faRotate}
              className={`w-3 h-3 ${refreshing ? 'animate-spin text-primary' : ''}`}
            />
          </button>
        </div>
      </div>

      {loading && !weatherData ? (
        <div className="py-6 text-center text-xs text-farm-muted">
          <FontAwesomeIcon icon={faRotate} className="w-4 h-4 animate-spin text-primary mb-1.5" />
          <p>Memuat data cuaca BMKG...</p>
        </div>
      ) : weatherData ? (
        <>
          {/* 2. Suhu Saat Ini & Kondisi Cuaca */}
          <div className="bg-gradient-to-r from-blue-50/70 to-slate-50 border border-blue-100/80 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {weatherData.current.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={weatherData.current.image}
                  alt={weatherData.current.weather_desc}
                  className="w-12 h-12 object-contain shrink-0 drop-shadow-sm"
                  onError={(e) => {
                    // Fallback to fontawesome icon if image fails
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-primary flex items-center justify-center shrink-0">
                  {renderWeatherIcon(advice?.iconName || 'sun', 'w-6 h-6')}
                </div>
              )}

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-farm-text leading-none">
                    {weatherData.current.t}°
                  </span>
                  <span className="text-xs font-semibold text-farm-muted">C</span>
                </div>
                <span className="text-xs font-bold text-farm-text block mt-0.5">
                  {weatherData.current.weather_desc}
                </span>
                <span className="text-[10px] text-farm-muted block">
                  {weatherData.lokasi.desa ? `${weatherData.lokasi.desa}, ` : ''}{weatherData.lokasi.kotkab || 'Kotawaringin Barat'}
                </span>
              </div>
            </div>

            {/* Indikator Kelembapan & Angin */}
            <div className="flex flex-col gap-1 text-right shrink-0">
              <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-farm-text">
                <FontAwesomeIcon icon={faDroplet} className="w-3 h-3 text-cyan-600" />
                <span>{weatherData.current.hu}%</span>
              </div>
              <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-farm-text">
                <FontAwesomeIcon icon={faWind} className="w-3 h-3 text-slate-500" />
                <span>{weatherData.current.ws} km/j</span>
              </div>
              <div className="flex items-center justify-end gap-1 text-[10px] text-farm-muted">
                <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5" />
                <span>{formatTimeSlot(weatherData.current.datetime)} WIB</span>
              </div>
            </div>
          </div>

          {/* 3. PANDUAN BUDIDAYA IKAN (Actionable Aquaculture Advice) */}
          {advice && (
            <div
              className={`p-2.5 rounded-xl border transition-all space-y-1.5 ${
                advice.level === 'warning'
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : advice.level === 'caution'
                  ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                  : advice.level === 'info'
                  ? 'bg-sky-50/70 border-sky-200 text-sky-950'
                  : 'bg-blue-50/70 border-blue-200 text-blue-950'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    advice.level === 'warning'
                      ? 'bg-amber-200 text-amber-900'
                      : advice.level === 'caution'
                      ? 'bg-amber-100 text-amber-800'
                      : advice.level === 'info'
                      ? 'bg-sky-200 text-sky-900'
                      : 'bg-blue-200 text-blue-900'
                  }`}
                >
                  {advice.level === 'warning' ? (
                    <FontAwesomeIcon icon={faTriangleExclamation} className="w-3 h-3" />
                  ) : advice.level === 'info' ? (
                    <FontAwesomeIcon icon={faCircleInfo} className="w-3 h-3" />
                  ) : (
                    <FontAwesomeIcon icon={faUtensils} className="w-3 h-3" />
                  )}
                </div>
                <span className="text-xs font-bold leading-tight">
                  {advice.title}
                </span>
              </div>

              <div className="text-[11px] leading-relaxed space-y-1 pl-8">
                <p>
                  <strong className="font-semibold">Pakan:</strong> {advice.feedingAdvice}
                </p>
                <p className="text-slate-600">
                  <strong className="font-semibold text-slate-700">Kualitas Air:</strong> {advice.waterAdvice}
                </p>
              </div>
            </div>
          )}

          {/* 4. Timeline Prakiraan Tiap 3 Jam (Scrollable) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-farm-muted uppercase tracking-wider block">
              Prakiraan 24 Jam Ke Depan
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-farm-border">
              {weatherData.forecasts.slice(0, 8).map((item, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-16 bg-farm-surface border border-farm-border rounded-xl p-2 text-center flex flex-col items-center justify-between hover:border-primary/50 transition-colors"
                >
                  <span className="text-[10px] font-semibold text-farm-muted block">
                    {formatTimeSlot(item.datetime)}
                  </span>
                  
                  <div className="my-1">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.weather_desc}
                        className="w-7 h-7 object-contain mx-auto"
                      />
                    ) : (
                      <FontAwesomeIcon icon={faCloudSun} className="w-5 h-5 text-farm-muted" />
                    )}
                  </div>

                  <span className="text-xs font-bold text-farm-text block">
                    {item.t}°
                  </span>
                  <span className="text-[9px] text-farm-muted truncate w-full block leading-tight mt-0.5" title={item.weather_desc}>
                    {item.weather_desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Footer Atribusi Resmi BMKG */}
          <div className="flex items-center justify-between text-[10px] text-farm-muted border-t border-farm-divider pt-2">
            <span>Data Terbuka BMKG Indonesia</span>
            <span>Diperbarui otomatis</span>
          </div>
        </>
      ) : (
        <div className="py-4 text-center text-xs text-farm-muted">
          Gagal memuat prakiraan cuaca.
        </div>
      )}
    </div>
  );
}
