import { NextResponse } from 'next/server';
import { disponibilites } from '@/lib/disponibilites';
import { immatValide, normaliserImmat } from '@/lib/immat';
import { notifierNouvelleDemande } from '@/lib/notifications';
import { referenceCourte, tokenSuivi } from '@/lib/reference';
import { admin } from '@/lib/supabase/admin';
import { garageParSlug, occupation, prestationsActives } from '@/lib/serveur/donnees';
import type { Creneau, Demande } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Dépôt d'une demande par un visiteur sans compte. */
export async function POST(requete: Request) {
  const corps = await requete.json().catch(() => null);
  if (!corps?.slug) return erreur('Requête incomplète.');

  const garage = await garageParSlug(String(corps.slug));
  if (!garage) return erreur('Garage inconnu.', 404);

  const immat = normaliserImmat(String(corps.immat ?? ''));
  if (!immatValide(immat)) return erreur('Immatriculation non reconnue.');

  const nom = String(corps.nom ?? '').trim();
  const tel = String(corps.tel ?? '').trim();
  const email = String(corps.email ?? '').trim();
  const prefereTelephone = Boolean(corps.prefereTelephone);
  if (!nom || !tel) return erreur('Nom et téléphone sont nécessaires.');
  if (!email && !prefereTelephone) return erreur('Un email, ou demandez à être rappelé.');

  const description = String(corps.description ?? '').trim();
  const demandees: string[] = Array.isArray(corps.prestationIds)
    ? corps.prestationIds.map(String) : [];
  const catalogue = await prestationsActives(garage.id);
  const choisies = catalogue.filter((p) => demandees.includes(p.id));
  if (choisies.length === 0 && !description) {
    return erreur('Cochez une prestation ou décrivez la panne.');
  }

  const souhaites: Creneau[] = (Array.isArray(corps.creneaux) ? corps.creneaux : [])
    .slice(0, 3)
    .map((c: Creneau) => ({ debut: String(c.debut), fin: String(c.fin) }));
  if (souhaites.length === 0) return erreur('Choisissez au moins un créneau.');

  // Le client a pu garder la page ouverte : on revérifie que les créneaux
  // demandés sont encore libres au moment de l'envoi.
  const fenetreDebut = new Date(Math.min(...souhaites.map((c) => +new Date(c.debut))));
  const fenetreFin = new Date(Math.max(...souhaites.map((c) => +new Date(c.fin))));
  const libres = disponibilites(
    garage, choisies, await occupation(garage.id, fenetreDebut, fenetreFin),
    fenetreDebut, new Date(fenetreFin.getTime() + 60_000),
  );
  const retenus = souhaites.filter((c) => libres.some((l) => l.debut === c.debut));
  if (retenus.length === 0) {
    return erreur('Ces créneaux viennent d’être pris. Choisissez-en d’autres.', 409);
  }

  const db = admin();
  const { data, error } = await db.from('demandes').insert({
    garage_id: garage.id,
    reference: referenceCourte(),
    client_nom: nom, client_tel: tel, client_email: email || null,
    prefere_telephone: prefereTelephone,
    vehicule_immat: immat,
    vehicule_marque: texte(corps.marque), vehicule_modele: texte(corps.modele),
    vehicule_annee: nombre(corps.annee), vehicule_km: nombre(corps.km),
    prestation_ids: choisies.map((p) => p.id),
    description_libre: description || null,
    creneaux_souhaites: retenus,
    statut: 'nouvelle',
    token_suivi: tokenSuivi(),
  }).select().single();

  if (error) {
    console.error('[demandes] insertion', error);
    return erreur('Enregistrement impossible.', 500);
  }

  // Le SMS au garage n'est pas optionnel : sans lui, la demande dort.
  await notifierNouvelleDemande(
    garage, data as Demande, choisies.map((p) => p.libelle),
  );

  return NextResponse.json({
    reference: (data as Demande).reference,
    suivi: `/suivi/${(data as Demande).token_suivi}`,
  });
}

const erreur = (message: string, statut = 400) =>
  NextResponse.json({ erreur: message }, { status: statut });
const texte = (v: unknown) => {
  const s = String(v ?? '').trim();
  return s || null;
};
const nombre = (v: unknown) => {
  const n = Number(String(v ?? '').replace(/\D/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
