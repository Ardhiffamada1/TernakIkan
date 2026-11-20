# TernakIkan — Aplikasi Manajemen Budidaya Ikan & Cuaca BMKG

> **TernakIkan** adalah aplikasi web modern, ringan, dan praktis yang dirancang khusus untuk peternak ikan air tawar di Indonesia (difokuskan untuk wilayah **Kabupaten Kotawaringin Barat / Pangkalan Bun, Kalimantan Tengah**). Aplikasi ini memprioritaskan efisiensi operasional harian: pemantauan umur ikan secara akurat, integrasi data cuaca terbuka BMKG untuk rekomendasi pemberian pakan, kalkulator sampling bobot, kalkulator dosis vitamin & obat kolam, serta monitoring target panen.

---

## 🌟 Fitur Utama

### 1. 🌦️ Integrasi Cuaca BMKG & Rekomendasi Budidaya (Kotawaringin Barat)
- **Data Resmi BMKG Terbuka:** Mengambil data prakiraan cuaca 3 harian secara gratis dari API resmi BMKG tanpa API key.
- **Fokus Kotawaringin Barat (Kobar):** Mendukung kecamatan utama:
  - *Pangkalan Bun (Arut Selatan)* — Default
  - *Kumai*
  - *Pangkalan Lada*
  - *Pangkalan Banteng*
  - *Kotawaringin Lama*
  - *Arut Utara*
- **Mesin Rekomendasi Pakan & Oksigen:**
  - **Hujan Lebat / Petir:** Rekomendasi tunda pakan atau puasakan ikan sementara guna mencegah lonjakan amonia dan drop pH air kolam.
  - **Hujan Ringan / Gerimis:** Pengurangan takaran pakan 25%–30% agar pelet tidak terbuang.
  - **Berawan Tebal / Mendung:** Waspada penurunan oksigen terlarut (*Dissolved Oxygen*) saat malam akibat minimnya fotosintesis fitoplankton.
  - **Suhu Tinggi (>32°C):** Anjuran memberi pakan lebih pagi atau sore hari saat suhu air reda.
  - **Cuaca Prima:** Pemberian pakan 100% optimal sesuai takaran FCR.
- **Prakiraan 24 Jam:** Timeline per 3 jam yang dapat digeser (*scrollable*) agar peternak bisa mengantisipasi hujan sebelum jadwal pakan sore.

### 2. 🐟 Manajemen Kolam & Siklus Panen (H-X Target Panen)
- Menampilkan umur budidaya ikan secara dinamis berbasis hari inklusif (WIB).
- Indikator hitung mundur panen (*Countdown H-7 / H-Hari Ini / Selesai*).
- Baris progres visual pertumbuhan dan target waktu panen.
- Menjaga integritas data: 1 kolam hanya memiliki 1 siklus aktif, dengan arsip siklus lama yang tetap tersimpan rapi.

### 3. ⚖️ Kalkulator Sampling Bobot Ikan & Porsi Pakan Harian
- Menghitung **Average Body Weight (ABW)** otomatis dari jumlah sampel timbangan ikan.
- Estimasi biomassa kolam saat ini.
- Rekomendasi porsi pakan harian (% bobot tubuh) dengan pembagian jadwal pagi (45%) dan sore (55%).

### 4. 💊 Kalkulator Dosis Vitamin & Obat Kolam (4 Basis Dosis)
- Perhitungan presisi sesuai petunjuk kemasan produsen:
  1. *Per Volume Air Kolam* (ml per 1.000 Liter air)
  2. *Per Kilogram Pakan* (gram per 1 Kg pelet)
  3. *Per Jumlah Ekor Ikan* (gram per 1.000 ekor)
  4. *Per Biomassa Ikan* (gram per 10 Kg bobot ikan)
- Transparansi rumus perhitungan matematis dan tombol satu-klik simpan ke log kolam.

### 5. 💧 Diagnostik Kualitas Air & Gejala Ikan
- Panduan cepat deteksi dini bau air kolam, warna air, endapan dasar, hingga perilaku ikan menggantung/megap-megap.
- Memberikan solusi operasional cepat (aerasi darurat, sipon dasar, garam krosok, probiotik).

### 6. 📱 Desain Mobile-First & Bebas Gangguan
- **0 Emoji:** Tampilan bersih dan profesional menggunakan ikon resmi **FontAwesome**.
- **Warna Modern:** Mengusung tema *Deep Ocean Blue* (`#1E40AF`), *Sky Blue*, dan *Slate* (bebas dari warna hijau mencolok).
- **Aksi Cepat Layar Utama:** Tombol pintas *Catat Pakan*, *Sampling*, *Cek Air*, dan *Tambah Kolam*.
- **Offline Cache:** Data tersimpan di *localStorage* browser dan dapat disinkronkan ke basis data Supabase PostgreSQL.

---

## 🛠️ Teknologi yang Digunakan

- **Frontend & Framework:** [Next.js 15 (App Router)](https://nextjs.org/) + [React 19](https://react.dev/)
- **Bahasa Pemrograman:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS 3](https://tailwindcss.com/)
- **Ikon:** [FontAwesome 6](https://fontawesome.com/) (`@fortawesome/react-fontawesome`)
- **API Eksternal:** [BMKG Open Weather Data](https://api.bmkg.go.id/)
- **Database & Backend:** [Supabase](https://supabase.com/) (PostgreSQL + RLS) / Mode Penyimpanan Lokal

---

## 🚀 Panduan Memulai Cepat

### 1. Klon Repositori
```bash
git clone https://github.com/username/ternakikan.git
cd ternakikan
```

### 2. Pasang Dependensi
```bash
pnpm install
# atau
npm install
```

### 3. Konfigurasi Lingkungan (Opsional untuk Supabase)
Salin berkas `.env.example` ke `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
*(Jika tidak diisi, aplikasi otomatis berjalan dalam mode penyimpanan lokal browser).*

### 4. Jalankan Server Pengembangan
```bash
pnpm run dev
# atau
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.

### 5. Pengujian & Verifikasi Aturan
```bash
# Uji aturan matematika & logika budidaya ikan (26 tes)
node src/test/verify-rules.mjs

# Uji integrasi BMKG & audit gaya visual (11 tes)
node src/test/verify-bmkg.mjs

# Build produksi
pnpm run build
```

---

## 📜 Lisensi
Proyek ini didistribusikan di bawah lisensi **MIT**. Silakan gunakan dan kembangkan untuk mendukung para pembudidaya ikan di Indonesia.
