import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('IRON NEST: Connexion Supabase initialisée.');
  } catch (error) {
    console.error('IRON NEST: Échec initialisation Supabase client:', error);
  }
} else {
  console.warn('IRON NEST: Clés Supabase absentes (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Utilisation du localStorage comme fallback.');
}

export { supabase };
