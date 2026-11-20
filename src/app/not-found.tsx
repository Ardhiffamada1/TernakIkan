import Link from 'next/link';
import { ArrowLeft, Fish } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center shadow-subtle">
        <Fish className="w-7 h-7" />
      </div>
      <div>
        <h2 className="text-xl font-extrabold text-farm-text">Halaman Tidak Ditemukan</h2>
        <p className="text-xs text-farm-muted mt-1 max-w-xs">
          Halaman atau rute yang Anda cari tidak tersedia di TernakIkan.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-subtle transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Beranda</span>
      </Link>
    </div>
  );
}
