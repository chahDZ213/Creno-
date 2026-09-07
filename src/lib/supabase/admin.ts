import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE, SUPABASE_URL } from './config';

/**
 * Contourne RLS. Réservé aux routes serveur qui doivent écrire pour un
 * visiteur sans compte : dépôt d'une demande, suivi par token.
 */
export const admin = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
