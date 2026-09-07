import type { Horaires, Jour } from './types';

/**
 * Catalogue proposé à la création d'un compte. Valeurs de départ : le
 * garage les renomme, les retarife et les supprime depuis ses réglages.
 * Rien ici n'est lu ailleurs dans l'application.
 */
export const PRESTATIONS_DEFAUT: Array<{ libelle: string; duree_minutes: number }> = [
  { libelle: 'Vidange + filtres', duree_minutes: 45 },
  { libelle: 'Révision complète', duree_minutes: 120 },
  { libelle: 'Plaquettes avant', duree_minutes: 60 },
  { libelle: 'Plaquettes + disques avant', duree_minutes: 90 },
  { libelle: 'Montage 4 pneus', duree_minutes: 60 },
  { libelle: 'Géométrie / parallélisme', duree_minutes: 60 },
  { libelle: 'Recharge climatisation', duree_minutes: 60 },
  { libelle: 'Distribution', duree_minutes: 240 },
  { libelle: 'Embrayage', duree_minutes: 300 },
  { libelle: 'Préparation contrôle technique', duree_minutes: 60 },
  { libelle: 'Diagnostic électronique', duree_minutes: 60 },
];

const SEMAINE: Jour[] = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

export const HORAIRES_DEFAUT: Horaires = {
  ...Object.fromEntries(SEMAINE.map((j) => [j, {
    ouverture: '08:00', fermeture: '18:00',
    pause: { debut: '12:00', fin: '14:00' },
  }])),
  samedi: null,
  dimanche: null,
};

export const MOTIFS_REFUS = [
  'Atelier complet sur la période',
  'Prestation non réalisée ici',
  'Véhicule non pris en charge',
];
