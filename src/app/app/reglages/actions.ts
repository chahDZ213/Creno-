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

  /* Vide = pas de plafond. `nombre()` rendrait le defaut sur une chaine vide,
     ce qui poserait une limite que le garage n'a pas demandee : on distingue
     donc « rien saisi » de « zero ». */
  const plafond = (v: FormDataEntryValue | null, facteur = 1) => {
    const brut = String(v ?? '').trim().replace(',', '.');
    if (!brut) return null;
    const n = Number(brut) * facteur;
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
  };

  await db.from('garages').update({
    horaires,
    nb_postes: Math.max(1, nombre(formData.get('nb_postes'), 1)),
    delai_min_heures: nombre(formData.get('delai_min_heures'), 24),
    horizon_jours: Math.min(90, Math.max(1, nombre(formData.get('horizon_jours'), 21))),
    max_depots_jour: plafond(formData.get('max_depots_jour')),
    charge_max_minutes_jour: plafond(formData.get('charge_max_heures_jour'), 60),
    duree_depot_minutes: Math.min(120, Math.max(5,
      nombre(formData.get('duree_depot_minutes'), 30))),
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

/**
 * Catégories de véhicule et leurs coefficients.
 *
 * Le libellé vide supprime la ligne : c'est le geste attendu sur un téléphone,
 * et ça évite un bouton « supprimer » par ligne dans une page déjà chargée.
 */
export async function enregistrerCategories(formData: FormData) {
  const { garage } = await monGarage();
  const db = await serveur();

  const categories: Array<{ cle: string; libelle: string; coefficient: number }> = [];
  const vus = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const libelle = texte(formData.get(`cat_${i}_libelle`));
    if (!libelle) continue;
    const brut = String(formData.get(`cat_${i}_coefficient`) ?? '').replace(',', '.');
    const coefficient = Number(brut);
    if (!Number.isFinite(coefficient) || coefficient <= 0) continue;

    /* La clé est l'identité de la catégorie : elle est déjà enregistrée dans
       les demandes passées. On garde celle du champ caché, et on n'en
       fabrique une qu'à l'ajout d'une ligne — sinon renommer « Premium » en
       « Allemandes » ferait perdre son prix à toutes les demandes en cours. */
    let cle = texte(formData.get(`cat_${i}_cle`))
      ?? libelle.normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!cle || vus.has(cle)) cle = `cat-${i}`;
    vus.add(cle);
    categories.push({ cle, libelle, coefficient: Math.round(coefficient * 100) / 100 });
  }

  await db.from('garages')
    .update({ categories_vehicule: categories }).eq('id', garage.id);
  revalidatePath('/app/reglages');
  revalidatePath(`/${garage.slug}`);
}
