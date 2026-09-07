import { redirect } from 'next/navigation';
import { serveur } from '@/lib/supabase/server';
import type { Garage } from '@/lib/types';

/** Le garage de l'utilisateur connecté, ou la page de connexion. */
export async function monGarage(): Promise<{ garage: Garage; email: string }> {
  const db = await serveur();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/connexion');

  const { data: profil } = await db
    .from('profils').select('garage_id').eq('id', user.id).maybeSingle();
  if (!profil) redirect('/connexion?compte=sans-garage');

  const { data: garage } = await db
    .from('garages').select('*').eq('id', profil.garage_id).single();
  return { garage: garage as Garage, email: user.email ?? '' };
}
