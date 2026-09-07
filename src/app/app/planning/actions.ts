'use server';

import { revalidatePath } from 'next/cache';
import { instant } from '@/lib/disponibilites';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';

function local(valeur: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valeur);
  if (!m) throw new Error('Date illisible');
  return instant(+m[1], +m[2], +m[3], +m[4], +m[5]);
}

/** Congés, véhicule immobilisé, rendez-vous pris au téléphone. */
export async function ajouterBlocage(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();
  const debut = local(String(formData.get('debut')));
  const fin = local(String(formData.get('fin')));
  if (fin <= debut) return;

  await db.from('rendez_vous').insert({
    garage_id: garage.id, demande_id: null,
    debut: debut.toISOString(), fin: fin.toISOString(),
    type: 'blocage',
    libelle: String(formData.get('libelle') ?? '').trim() || 'Indisponible',
  });
  revalidatePath('/app/planning');
}

export async function supprimerBlocage(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();
  await db.from('rendez_vous').delete()
    .eq('id', String(formData.get('id')))
    .eq('garage_id', garage.id)
    .eq('type', 'blocage');
  revalidatePath('/app/planning');
}
