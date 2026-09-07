import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SUPABASE_ANON, SUPABASE_URL } from './config';

/** Client lié à la session de l'utilisateur : les policies RLS s'appliquent. */
export async function serveur() {
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (liste: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          liste.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Appelé depuis un Server Component : le middleware rafraîchit.
        }
      },
    },
  });
}
