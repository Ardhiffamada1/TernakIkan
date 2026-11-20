// BMKG Weather API Integration & Aquaculture Advisory Engine for TernakIkan

export interface BmkgLocation {
  adm1: string;
  adm2: string;
  adm3: string;
  adm4: string;
  desa: string;
  kecamatan: string;
  kotkab: string;
  provinsi: string;
  timezone: string;
}

export interface BmkgForecastItem {
  datetime: string;
  local_datetime: string;
  t: number; // Suhu (°C)
  hu: number; // Kelembaban (%)
  ws: number; // Kecepatan angin (km/h)
  wd: string; // Arah angin
  weather: number; // Kode cuaca
  weather_desc: string; // Deskripsi (Bahasa Indonesia)
  weather_desc_en: string;
  image: string; // URL ikon cuaca BMKG
  tp?: number; // Presipitasi / curah hujan perkiraan (mm)
  tcc?: number; // Tutupan awan (%)
}

export interface BmkgWeatherData {
  lokasi: BmkgLocation;
  current: BmkgForecastItem;
  forecasts: BmkgForecastItem[]; // Flattened or next 24-48 hours
  fetchedAt: string;
}

export interface AquacultureAdvice {
  level: 'optimal' | 'info' | 'caution' | 'warning';
  title: string;
  feedingAdvice: string;
  waterAdvice: string;
  iconName: 'sun' | 'cloud' | 'cloud-sun' | 'cloud-rain' | 'cloud-bolt' | 'temperature-high' | 'temperature-low';
}

export interface BmkgLocationOption {
  code: string;
  city: string;
  province: string;
  label: string;
}

// Wilayah & Kecamatan di Kabupaten Kotawaringin Barat (Kalimantan Tengah)
export const BMKG_LOCATIONS: BmkgLocationOption[] = [
  { code: '62.01.02.1003', city: 'Kotawaringin Barat', province: 'Kalimantan Tengah', label: 'Pangkalan Bun (Arut Selatan)' },
  { code: '62.01.01.2001', city: 'Kotawaringin Barat', province: 'Kalimantan Tengah', label: 'Kumai' },
  { code: '62.01.05.2001', city: 'Kotawaringin Barat', province: 'Kalimantan Tengah', label: 'Pangkalan Lada' },
  { code: '62.01.06.2001', city: 'Kotawaringin Barat', province: 'Kalimantan Tengah', label: 'Pangkalan Banteng' },
  { code: '62.01.03.2001', city: 'Kotawaringin Barat', province: 'Kalimantan Tengah', label: 'Kotawaringin Lama' },
  { code: '62.01.04.2001', city: 'Kotawaringin Barat', province: 'Kalimantan Tengah', label: 'Arut Utara' },
];

export const DEFAULT_BMKG_LOCATION = '62.01.02.1003'; // Pangkalan Bun (Arut Selatan, Kotawaringin Barat)

const CACHE_KEY_PREFIX = 'ternakikan_bmkg_weather_';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 Menit

/**
 * Logika Rekomendasi Budidaya Ikan Berdasarkan Cuaca BMKG
 */
export function getAquacultureWeatherAdvice(weatherDesc: string, temp: number): AquacultureAdvice {
  const descLower = (weatherDesc || '').toLowerCase();

  // 1. Hujan Petir / Hujan Lebat
  if (descLower.includes('petir') || descLower.includes('kilat') || descLower.includes('lebat')) {
    return {
      level: 'warning',
      title: 'Peringatan Hujan Lebat / Petir',
      feedingAdvice: 'Tunda pakan / puasakan sementara. Air hujan asam dan suhu dingin mendadak menurunkan nafsu makan secara drastis.',
      waterAdvice: 'Cegah overfeeding agar pelet tidak membusuk. Periksa sirkulasi air dan pastikan pipa pembuangan/limpasan lancar agar kolam tidak meluap.',
      iconName: 'cloud-bolt'
    };
  }

  // 2. Hujan Sedang
  if (descLower.includes('sedang')) {
    return {
      level: 'warning',
      title: 'Hujan Sedang Diprediksi',
      feedingAdvice: 'Kurangi takaran pakan 50%. Ikan cenderung berkumpul di dasar kolam.',
      waterAdvice: 'Waspada penurunan pH air akibat air hujan. Nyalakan aerasi untuk menjaga sirkulasi dan difusi oksigen.',
      iconName: 'cloud-rain'
    };
  }

  // 3. Hujan Ringan / Gerimis
  if (descLower.includes('hujan') || descLower.includes('gerimis') || descLower.includes('rintik')) {
    return {
      level: 'caution',
      title: 'Prakiraan Hujan Ringan',
      feedingAdvice: 'Kurangi pakan sekitar 25-30%. Berikan pakan saat jeda gerimis dan pastikan pakan habis dalam 5 menit.',
      waterAdvice: 'Perhatikan respon nafsu makan ikan. Jangan biarkan pakan tersisa mengotori dasar kolam.',
      iconName: 'cloud-rain'
    };
  }

  // 4. Suhu Ekstrem Panas (> 32°C)
  if (temp >= 33) {
    return {
      level: 'caution',
      title: `Suhu Tinggi (${temp}°C)`,
      feedingAdvice: 'Beri pakan pagi lebih awal (sebelum 08.30) atau sore hari saat suhu mereda. Hindari memberi pakan di puncak terik matahari.',
      waterAdvice: 'Kelarutan oksigen (DO) menurun pada air hangat. Pastikan kincir/aerator aktif dan pasang peneduh bila kolam terpal dangkal.',
      iconName: 'temperature-high'
    };
  }

  // 5. Suhu Dingin (< 24°C)
  if (temp > 0 && temp < 24) {
    return {
      level: 'info',
      title: `Suhu Dingin (${temp}°C)`,
      feedingAdvice: 'Metabolisme dan pencernaan ikan melambat. Kurangi frekuensi makan.',
      waterAdvice: 'Pertahankan kedalaman air agar suhu di dasar kolam tetap stabil dan hangat.',
      iconName: 'temperature-low'
    };
  }

  // 6. Berawan Tebal / Mendung
  if (descLower.includes('tebal') || descLower.includes('gelap') || descLower.includes('kabut') || descLower.includes('asap')) {
    return {
      level: 'info',
      title: 'Cuaca Berawan Tebal / Mendung',
      feedingAdvice: 'Beri pakan porsi normal (100%), amati nafsu makan ikan.',
      waterAdvice: 'Sinar matahari berkurang menekan fotosintesis fitoplankton. Oksigen terlarut berpotensi turun menjelang malam, cek kesiapan aerator.',
      iconName: 'cloud'
    };
  }

  // 7. Berawan biasa
  if (descLower.includes('berawan')) {
    return {
      level: 'optimal',
      title: 'Cuaca Berawan Stabil',
      feedingAdvice: 'Kondisi nyaman bagi ikan. Berikan pakan sesuai jadwal standar.',
      waterAdvice: 'Suhu air kolam stabil dan penguapan normal. Lakukan cek kualitas air rutin.',
      iconName: 'cloud-sun'
    };
  }

  // 8. Cerah / Cerah Berawan Normal
  return {
    level: 'optimal',
    title: 'Kondisi Cuaca Prima',
    feedingAdvice: 'Nafsu makan ikan optimal. Berikan pakan 100% sesuai tabel dosis dan target panen.',
    waterAdvice: 'Fotosintesis fitoplankton berjalan optimal dan suplai oksigen alami melimpah. Pantau ketinggian air dari penguapan.',
    iconName: 'sun'
  };
}

/**
 * Fallback data jika BMKG offline / tidak ada koneksi
 */
export function getFallbackWeatherData(code: string): BmkgWeatherData {
  const loc = BMKG_LOCATIONS.find(l => l.code === code) || BMKG_LOCATIONS[0];
  const now = new Date();
  
  const current: BmkgForecastItem = {
    datetime: now.toISOString(),
    local_datetime: now.toLocaleDateString('sv-SE') + ' ' + now.toTimeString().substring(0, 8),
    t: 29,
    hu: 75,
    ws: 3.5,
    wd: 'E',
    weather: 2,
    weather_desc: 'Cerah Berawan',
    weather_desc_en: 'Partly Cloudy',
    image: 'https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah berawan-am.svg',
    tp: 0.1,
    tcc: 50
  };

  const forecasts: BmkgForecastItem[] = [];
  for (let i = 0; i < 8; i++) {
    const fTime = new Date(now.getTime() + i * 3 * 3600 * 1000);
    forecasts.push({
      datetime: fTime.toISOString(),
      local_datetime: fTime.toLocaleDateString('sv-SE') + ' ' + fTime.toTimeString().substring(0, 8),
      t: 28 + (i % 3),
      hu: 70 + (i % 15),
      ws: 3 + (i % 3),
      wd: 'NE',
      weather: i % 4 === 1 ? 61 : 2,
      weather_desc: i % 4 === 1 ? 'Hujan Ringan' : 'Cerah Berawan',
      weather_desc_en: i % 4 === 1 ? 'Light Rain' : 'Partly Cloudy',
      image: i % 4 === 1 
        ? 'https://api-apps.bmkg.go.id/storage/icon/cuaca/hujan ringan-am.svg'
        : 'https://api-apps.bmkg.go.id/storage/icon/cuaca/cerah berawan-am.svg'
    });
  }

  return {
    lokasi: {
      adm1: '',
      adm2: '',
      adm3: '',
      adm4: loc.code,
      desa: loc.city,
      kecamatan: loc.city,
      kotkab: loc.city,
      provinsi: loc.province,
      timezone: '+0700'
    },
    current,
    forecasts,
    fetchedAt: now.toISOString()
  };
}

/**
 * Fetch Prakiraan Cuaca BMKG Resmi
 */
export async function fetchBmkgWeather(adm4Code: string = DEFAULT_BMKG_LOCATION, forceRefresh = false): Promise<BmkgWeatherData> {
  const cacheKey = `${CACHE_KEY_PREFIX}${adm4Code}`;

  // Cek cache lokal browser bila bukan force refresh
  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { data: BmkgWeatherData; timestamp: number };
        if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
          return parsed.data;
        }
      }
    } catch (e) {
      console.warn('Gagal membaca cache cuaca:', e);
    }
  }

  try {
    const res = await fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${encodeURIComponent(adm4Code)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`BMKG API error: status ${res.status}`);
    }

    const json = await res.json();
    if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
      throw new Error('Data cuaca tidak tersedia untuk kode wilayah ini.');
    }

    const firstResult = json.data[0];
    const lokasi: BmkgLocation = firstResult.lokasi || json.lokasi;
    const cuacaMatrix: BmkgForecastItem[][] = firstResult.cuaca || [];

    // Ratakan array 3 hari cuaca
    const allForecasts: BmkgForecastItem[] = [];
    for (const dayItems of cuacaMatrix) {
      if (Array.isArray(dayItems)) {
        for (const item of dayItems) {
          allForecasts.push(item);
        }
      }
    }

    if (allForecasts.length === 0) {
      throw new Error('Jadwal prakiraan cuaca kosong.');
    }

    // Tentukan prakiraan terdekat dengan waktu saat ini
    const nowUtcMs = Date.now();
    let closestItem = allForecasts[0];
    let minDiff = Infinity;

    for (const item of allForecasts) {
      const itemMs = new Date(item.datetime).getTime();
      const diff = Math.abs(itemMs - nowUtcMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestItem = item;
      }
    }

    const weatherData: BmkgWeatherData = {
      lokasi,
      current: closestItem,
      forecasts: allForecasts.slice(0, 12), // Tampilkan hingga 36 jam ke depan
      fetchedAt: new Date().toISOString()
    };

    // Simpan ke cache
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          data: weatherData,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Gagal menyimpan cache cuaca:', e);
      }
    }

    return weatherData;
  } catch (error) {
    console.warn('Fetch BMKG gagal, menggunakan fallback cache:', error);

    // Coba baca cache kadaluarsa bila ada
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { data: BmkgWeatherData; timestamp: number };
          return parsed.data;
        }
      } catch {
        // no-op
      }
    }

    // Return fallback aman
    return getFallbackWeatherData(adm4Code);
  }
}
