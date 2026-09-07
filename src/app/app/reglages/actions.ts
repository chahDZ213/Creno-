'use server';

import { revalidatePath } from 'next/cache';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
import { JOURS, type Fermeture, type Horaires, type Prestation } from '@/lib/types';

const nombre = (v: FormDataEntryValue | null, defaut: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : defaut;
};
const texte = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s || null;
};

/** Horaires et fermetures. Un jour décoché est un jour fermé. */
export async function enregistrerHoraires(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();

  const horaires: Horaires = {};
  for (const jour of JOURS) {
    if (!formData.get(`${jour}_ouvert`)) { horaires[jour] = null; continue; }
    const pause = Boolean(formData.get(`${jour}_pause`));
    horaires[jour] = {
      ouverture: String(formData.get(`${jour}_ouverture`) || '08:00'),
      fermeture: String(formData.get(`${jour}_fermeture`) || '18:00'),
      pause: pause ? {
        debut: String(formData.get(`${jour}_pause_debut`) || '12:00'),
        fin: String(formData.get(`${jour}_pause_fin`) || '14:00'),
      } : null,
    };
  }

  await db.from('garages').update({
    horaires,
    nb_postes: Math.max(1, nombre(formData.get('nb_postes'), 1)),
    delai_min_heures: nombre(formData.get('delai_min_heures'), 24),
    horizon_jours: Math.min(90, Math.max(1, nombre(formData.get('horizon_jours'), 21))),
  }).eq('id', garage.id);
  revalidatePath('/app/reglages');
}

export async function ajouterFermeture(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();
  const debut = String(formData.get('debut') ?? '');
  const fin = String(formData.get('fin') ?? '') || debut;
  if (!debut) return;
  const fermetures: Fermeture[] = [
    ...(garage.fermetures ?? []),
    { debut, fin, motif: texte(formData.get('motif')) ?? undefined },
  ].sort((a, b) => a.debut.localeCompare(b.debut));
  await db.from('garages').update({ fermetures }).eq('id', garage.id);
  revalidatePath('/app/reglages');
}

export async function retirerFermeture(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();
  const index = Number(formData.get('index'));
  const fermetures = (garage.fermetures ?? []).filter((_, i) => i !== index);
  await db.from('garages').update({ fermetures }).eq('id', garage.id);
  revalidatePath('/app/reglages');
}

/** Tarifs, apparence, gabarit. */
export async function enregistrerVitrine(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();
  const taux = texte(formData.get('taux_horaire_ttc'));
  await db.from('garages').update({
    nom: texte(formData.get('nom')) ?? garage.nom,
    adresse: texte(formData.get('adresse')),
    telephone: texte(formData.get('telephone')),
    email: texte(formData.get('email')),
    logo_url: texte(formData.get('logo_url')),
    couleur_primaire: String(formData.get('couleur_primaire') || garage.couleur_primaire),
    gabarit: String(formData.get('gabarit') || garage.gabarit),
    taux_horaire_ttc: taux ? Number(taux.replace(',', '.')) : null,
    affiche_prix: Boolean(formData.get('affiche_prix')),
  }).eq('id', garage.id);
  revalidatePath('/app/reglages');
  revalidatePath(`/${garage.slug}`);
}

/* ------------------------------------------------------------ catalogue */

export async function ajouterPrestation(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();
  const libelle = texte(formData.get('libelle'));
  if (!libelle) return;
  const { data } = await db.from('prestations').select('ordre')
    .eq('garage_id', garage.id).order('ordre', { ascending: false }).limit(1);
  const prix = texte(formData.get('prix_ttc'));
  await db.from('prestations').insert({
    garage_id: garage.id, libelle,
    duree_minutes: Math.max(5, nombre(formData.get('duree_minutes'), 60)),
    prix_ttc: prix ? Number(prix.replace(',', '.')) : null,
    ordre: ((data?.[0]?.ordre as number) ?? -1) + 1,
    active: true,
  });
  revalidatePath('/app/reglages');
}

export async function modifierPrestation(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();
  const prix = texte(formData.get('prix_ttc'));
  await db.from('prestations').update({
    libelle: texte(formData.get('libelle')) ?? 'Prestation',
    duree_minutes: Math.max(5, nombre(formData.get('duree_minutes'), 60)),
    prix_ttc: prix ? Number(prix.replace(',', '.')) : null,
  }).eq('id', String(formData.get('id'))).eq('garage_id', garage.id);
  revalidatePath('/app/reglages');
}

export async function basculerPrestation(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();
  await db.from('prestations')
    .update({ active: formData.get('active') === '1' })
    .eq('id', String(formData.get('id'))).eq('garage_id', garage.id);
  revalidatePath('/app/reglages');
}

export async function supprimerPrestation(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();
  await db.from('prestations').delete()
    .eq('id', String(formData.get('id'))).eq('garage_id', garage.id);
  revalidatePath('/app/reglages');
}

/** Échange l'ordre avec la prestation voisine. */
export async function deplacerPrestation(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();
  const id = String(formData.get('id'));
  const sens = formData.get('sens') === 'bas' ? 1 : -1;

  const { data } = await db.from('prestations').select('*')
    .eq('garage_id', garage.id).order('ordre');
  const liste = (data as Prestation[]) ?? [];
  const i = liste.findIndex((p) => p.id === id);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= liste.length) return;

  await db.from('prestations').update({ ordre: liste[j].ordre }).eq('id', liste[i].id);
  await db.from('prestations').update({ ordre: liste[i].ordre }).eq('id', liste[j].id);
  revalidatePath('/app/reglages');
}
