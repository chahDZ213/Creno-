import type { Garage } from './types';

/**
 * Catégories de véhicule.
 *
 * Un embrayage de Clio 3 et un d'Audi A6 ne sont ni le même temps ni le même
 * prix. Plutôt qu'une grille prix × catégorie à remplir à la main — des
 * dizaines de cases qu'aucun garage ne tiendra à jour — un coefficient par
 * catégorie multiplie le tarif de base ET la durée. Une voiture plus chère à
 * réparer l'est parce qu'elle prend plus de temps : un seul coefficient dit
 * les deux.
 *
 * C'est le client qui choisit sa catégorie. Déduire de la marque semblait plus
 * fluide, mais une Clio 1.2 et une Clio RS tombent dans la même case, et le
 * garage se retrouve avec un prix annoncé qu'il n'a pas voulu.
 */
export type Categorie = { cle: string; libelle: string; coefficient: number };

export const CATEGORIES_DEFAUT: Categorie[] = [
  { cle: 'citadine', libelle: 'Citadine', coefficient: 1 },
  { cle: 'berline', libelle: 'Berline ou break', coefficient: 1.25 },
  { cle: 'suv', libelle: 'SUV ou 4x4', coefficient: 1.45 },
  { cle: 'premium', libelle: 'Premium (Audi, BMW, Mercedes…)', coefficient: 1.6 },
  { cle: 'utilitaire', libelle: 'Utilitaire', coefficient: 1.4 },
];

/** Les catégories d'un garage, ou celles de départ s'il n'y a pas touché. */
export function categoriesDe(garage: Pick<Garage, 'categories_vehicule'>): Categorie[] {
  const l = garage.categories_vehicule;
  if (!Array.isArray(l) || l.length === 0) return CATEGORIES_DEFAUT;
  return l.filter((c): c is Categorie =>
    !!c && typeof c.cle === 'string' && typeof c.libelle === 'string'
    && Number.isFinite(c.coefficient) && c.coefficient > 0);
}

/**
 * Le coefficient d'une catégorie. 1 quand rien n'est choisi — une demande
 * sans catégorie doit afficher le tarif de base, jamais zéro ni une erreur.
 */
export function coefficientDe(
  garage: Pick<Garage, 'categories_vehicule'>, cle: string | null | undefined,
): number {
  if (!cle) return 1;
  return categoriesDe(garage).find((c) => c.cle === cle)?.coefficient ?? 1;
}

/** Prix de base ajusté. Null reste null : « sur devis » n'a pas de coefficient. */
export function prixAjuste(base: number | null, coefficient: number): number | null {
  if (base == null) return null;
  // Au franc supérieur : un « à partir de 1 112,50 € » ne se lit pas.
  return Math.ceil(Number(base) * coefficient);
}

/** Durée ajustée, arrondie au pas de cinq minutes du planning. */
export function dureeAjustee(base: number, coefficient: number): number {
  return Math.max(5, Math.round((base * coefficient) / 5) * 5);
}
