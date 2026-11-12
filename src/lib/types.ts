export type Gabarit = 'compact' | 'etapes' | 'colonnes';

export type Statut =
  | 'nouvelle'
  | 'confirmee'
  | 'alternative_proposee'
  | 'refusee'
  | 'annulee'
  | 'terminee';

export type Jour =
  | 'lundi' | 'mardi' | 'mercredi' | 'jeudi'
  | 'vendredi' | 'samedi' | 'dimanche';

export const JOURS: Jour[] = [
  'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
];

/** Horaires d'un jour. `null` (ou absent) = garage fermé ce jour-là. */
export type HoraireJour = {
  ouverture: string; // "08:00"
  fermeture: string; // "18:00"
  pause?: { debut: string; fin: string } | null;
} | null;

export type Horaires = Partial<Record<Jour, HoraireJour>>;

export type Fermeture = { debut: string; fin: string; motif?: string };

export type Garage = {
  id: string;
  slug: string;
  nom: string;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  logo_url: string | null;
  couleur_primaire: string;
  gabarit: Gabarit;
  horaires: Horaires;
  fermetures: Fermeture[];
  nb_postes: number;
  delai_min_heures: number;
  horizon_jours: number;
  taux_horaire_ttc: number | null;
  affiche_prix: boolean;
  /** Longueur du rendez-vous de remise des clés. Le travail dure plus longtemps. */
  duree_depot_minutes?: number;
  /** Véhicules acceptés par jour. Null = pas de limite. */
  max_depots_jour?: number | null;
  /** Charge de travail acceptée par jour. Null = nb_postes × minutes ouvrées. */
  charge_max_minutes_jour?: number | null;
  /** Catégories de véhicule et leur coefficient. Vide = celles de départ. */
  categories_vehicule?: Array<{ cle: string; libelle: string; coefficient: number }> | null;
  created_at?: string;
};

export type Prestation = {
  id: string;
  garage_id: string;
  libelle: string;
  duree_minutes: number;
  prix_ttc: number | null;
  ordre: number;
  active: boolean;
};

export type Creneau = { debut: string; fin: string };

export type RendezVous = {
  id: string;
  garage_id: string;
  demande_id: string | null;
  debut: string;
  fin: string;
  type: 'rdv' | 'blocage';
  libelle: string | null;
  /**
   * Travail que représente ce rendez-vous, en minutes — distinct de
   * `fin - debut`, qui n'est que la fenêtre de dépose. Figé à la
   * confirmation : le catalogue peut changer de durée ensuite sans
   * déformer le passé.
   */
  charge_minutes?: number | null;
  /** Date d'envoi du rappel de la veille au client. Null tant qu'il n'est pas parti. */
  rappel_veille_at?: string | null;
};

export type Demande = {
  id: string;
  garage_id: string;
  reference: string;
  client_nom: string;
  client_tel: string;
  client_email: string | null;
  prefere_telephone: boolean;
  vehicule_immat: string;
  vehicule_marque: string | null;
  vehicule_modele: string | null;
  vehicule_annee: number | null;
  vehicule_km: number | null;
  /** Catégorie choisie par le client, qui ajuste prix et durée. */
  categorie_vehicule?: string | null;
  prestation_ids: string[];
  description_libre: string | null;
  creneaux_souhaites: Creneau[];
  statut: Statut;
  motif_refus: string | null;
  alternative: Creneau | null;
  message_garage: string | null;
  token_suivi: string;
  /** Date de restitution annoncée au client. Null tant que rien n'est annoncé. */
  restitution_prevue?: string | null;
  created_at: string;
  repondu_at: string | null;
};

/** Un dépôt sans prestation cochée : 30 min de travail, et on le dit au client. */
export const DUREE_DEPOT_MINUTES = 30;
/** Longueur par défaut du rendez-vous de remise des clés. */
export const DUREE_CRENEAU_DEPOSE = 30;
export const LIBELLE_DEPOT = 'Dépôt du véhicule pour diagnostic';
export const PAS_MINUTES = 30;
