import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true jika kredensial Supabase diisi. Jika false, aplikasi berjalan di Mode Demo (localStorage). */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseUrl.startsWith('https://') && supabaseAnonKey && supabaseAnonKey.length > 20);
}

// Hanya anon key (publik) yang dipakai di frontend. Service-role key TIDAK boleh ada di sini.
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
