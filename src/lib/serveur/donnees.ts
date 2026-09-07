import { admin } from '@/lib/supabase/admin';
import type { Garage, Prestation, RendezVous } from '@/lib/types';

export async function garageParSlug(slug: string): Promise<Garage | null> {
  const { data } = await admin()
    .from('garages').select('*').eq('slug', slug).maybeSingle();
  return (data as Garage | null) ?? null;
}

export async function prestationsActives(garageId: string): Promise<Prestation[]> {
  const { data } = await admin()
    .from('prestations').select('*')
    .eq('garage_id', garageId).eq('active', true).order('ordre');
  return (data as Prestation[]) ?? [];
}

/** Occupation de l'atelier sur une fenêtre. Jamais exposée telle quelle. */
export async function occupation(
  garageId: string, debut: Date, fin: Date,
): Promise<RendezVous[]> {
  const { data } = await admin()
    .from('rendez_vous').select('*')
    .eq('garage_id', garageId)
    .lt('debut', fin.toISOString())
    .gt('fin', debut.toISOString());
  return (data as RendezVous[]) ?? [];
}
