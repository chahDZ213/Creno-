'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { instant } from '@/lib/disponibilites';
import {
  notifierAlternative, notifierConfirmation, notifierRefus,
} from '@/lib/notifications';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
import type { Creneau, Demande } from '@/lib/types';

/** « 2026-04-07T09:30 » (heure de l'atelier) → instant. */
export async function instantLocal(valeur: string): Promise<Date> {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valeur);
  if (!m) throw new Error('Date illisible');
  return instant(+m[1], +m[2], +m[3], +m[4], +m[5]);
}

async function chargerDemande(id: string) {
  const { garage } = await monGarage();
  const db = await serveur();
  const { data } = await db.from('demandes').select('*')
    .eq('id', id).eq('garage_id', garage.id).maybeSingle();
  if (!data) throw new Error('Demande introuvable');
  return { garage, db, demande: data as Demande };
}

export async function confirmer(formData: FormData) {
  const id = String(formData.get('id'));
  const debut = String(formData.get('debut'));
  const minutes = Number(formData.get('duree_minutes')) || 60;
  const { garage, db, demande } = await chargerDemande(id);

  const creneau: Creneau = {
    debut: new Date(debut).toISOString(),
    fin: new Date(+new Date(debut) + minutes * 60_000).toISOString(),
  };

  await db.from('rendez_vous').insert({
    garage_id: garage.id, demande_id: demande.id,
    debut: creneau.debut, fin: creneau.fin, type: 'rdv',
    libelle: `${demande.vehicule_immat} — ${demande.client_nom}`,
  });
  await db.from('demandes').update({
    statut: 'confirmee', repondu_at: new Date().toISOString(),
  }).eq('id', demande.id);

  await notifierConfirmation(garage, demande, creneau);
  revalidatePath('/app');
  redirect('/app');
}

export async function proposerAlternative(formData: FormData) {
  const id = String(formData.get('id'));
  const minutes = Number(formData.get('duree_minutes')) || 60;
  const message = String(formData.get('message') ?? '').trim();
  const debut = await instantLocal(String(formData.get('creneau')));
  const { garage, db, demande } = await chargerDemande(id);

  const creneau: Creneau = {
    debut: debut.toISOString(),
    fin: new Date(debut.getTime() + minutes * 60_000).toISOString(),
  };
  await db.from('demandes').update({
    statut: 'alternative_proposee', alternative: creneau,
    message_garage: message || null, repondu_at: new Date().toISOString(),
  }).eq('id', demande.id);

  await notifierAlternative(garage, demande, creneau, message || null);
  revalidatePath('/app');
  redirect('/app');
}

export async function refuser(formData: FormData) {
  const id = String(formData.get('id'));
  const motif = String(formData.get('motif') ?? '').trim();
  const { garage, db, demande } = await chargerDemande(id);

  await db.from('demandes').update({
    statut: 'refusee', motif_refus: motif || null,
    repondu_at: new Date().toISOString(),
  }).eq('id', demande.id);

  await notifierRefus(garage, demande, motif || null);
  revalidatePath('/app');
  redirect('/app');
}
