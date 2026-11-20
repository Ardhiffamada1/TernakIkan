import { WaterCheckData } from '@/types';

export function analyzeWaterAndFish(input: {
  batchId: string;
  waterColor: WaterCheckData['waterColor'];
  fishBehavior: WaterCheckData['fishBehavior'];
  weather: WaterCheckData['weather'];
  notes?: string;
}): WaterCheckData {
  const recommendations: string[] = [];
  let diagnosisTitle = 'Kondisi Kolam Normal';

  // Analisis Warna Air
  switch (input.waterColor) {
    case 'green_light':
      recommendations.push('Warna air hijau cerah sangat baik: fitoplankton stabil dan oksigen cukup.');
      break;
    case 'green_dark':
      diagnosisTitle = 'Air Terlalu Pekat (Fitoplankton Lebat)';
      recommendations.push('Fitoplankton sangat lebat. Waspadai penurunan oksigen drastis pada malam/dini hari.');
      recommendations.push('Nyalakan aerator/kincir lebih awal malam ini, atau buang 15-20% lapisan air permukaan dan ganti air baru.');
      break;
    case 'brown':
      diagnosisTitle = 'Air Cokelat (Bahan Organik Meningkat)';
      recommendations.push('Kandungan sisa kotoran mulai tinggi. Berikan probiotik pengurai dan kurangi porsi pakan 15%.');
      break;
    case 'black_foul':
      diagnosisTitle = 'PERINGATAN: Dasar Kolam Busuk / Amonia Tinggi';
      recommendations.push('Segera lakukan penyedotan (sipon) kotoran dasar kolam!');
      recommendations.push('Ganti 30-50% air kolam dengan air bersih baru.');
      recommendations.push('Puasakan ikan 1 sesi makan agar sisa pakan tidak menambah racun amonia.');
      break;
    case 'clear':
      recommendations.push('Air terlalu bening. Ikan mudah silau dan stres. Berikan probiotik atau sedikit pupuk organik terfermentasi untuk menumbuhkan plankton pelindung.');
      break;
  }

  // Analisis Tingkah Laku Ikan
  switch (input.fishBehavior) {
    case 'active':
      recommendations.push('Ikan bergerak lincah dan nafsu makan sehat.');
      break;
    case 'gasping_surface':
      diagnosisTitle = 'DARURAT: Ikan Menggantung di Permukaan (Kurang Oksigen)';
      recommendations.push('Ikan kekurangan oksigen terlarut! Segera nyalakan aerasi atau alirkan gemercik air baru.');
      recommendations.push('Hentikan pemberian pakan sampai semua ikan kembali turun ke dasar/tengah kolam.');
      break;
    case 'sluggish':
      diagnosisTitle = 'Nafsu Makan Menurun / Ikan Kurang Lincah';
      recommendations.push('Jangan paksakan pelet jika tidak dimakan (pakan mengendap akan meracuni air).');
      recommendations.push('Campurkan vitamin C atau suplemen anti-stres pada pakan porsi berikutnya.');
      break;
    case 'flashing':
      diagnosisTitle = 'Ikan Gesek Tubuh / Berenang Miring';
      recommendations.push('Waspadai parasit atau fluktuasi pH drastis. Periksa sirip dan insang ikan dari bintik putih atau luka.');
      break;
  }

  // Analisis Cuaca
  if (input.weather === 'heavy_rain') {
    recommendations.push('PENTING: Jangan menebar pelet saat hujan deras atau tepat setelah hujan lebat malam. Suhu air turun drastis membuat pencernaan ikan terhenti dan pelet membusuk di lambung.');
  } else if (input.weather === 'cloudy') {
    recommendations.push('Cuaca mendung mengurangi fotosintesis plankton. Kurangi porsi pakan 10-20% dari biasanya.');
  }

  return {
    batchId: input.batchId,
    waterColor: input.waterColor,
    fishBehavior: input.fishBehavior,
    weather: input.weather,
    notes: input.notes,
    diagnosisTitle,
    recommendations,
  };
}
