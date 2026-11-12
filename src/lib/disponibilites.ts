import {
  DUREE_CRENEAU_DEPOSE,
  DUREE_DEPOT_MINUTES,
  JOURS,
  PAS_MINUTES,
  type Creneau,
  type Garage,
  type HoraireJour,
  type Prestation,
  type RendezVous,
} from './types';

export const FUSEAU = 'Europe/Paris';

type Parts = {
  annee: number; mois: number; jour: number;
  heure: number; minute: number; jourSemaine: number; // 0 = lundi
};

const FORMATEURS = new Map<string, Intl.DateTimeFormat>();
function formateur(tz: string) {
  let f = FORMATEURS.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short',
    });
    FORMATEURS.set(tz, f);
  }
  return f;
}

const SEMAINE: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

/** Décompose un instant dans le fuseau donné. */
export function parties(d: Date, tz = FUSEAU): Parts {
  const p = Object.fromEntries(
    formateur(tz).formatToParts(d).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return {
    annee: Number(p.year), mois: Number(p.month), jour: Number(p.day),
    heure: Number(p.hour === '24' ? '00' : p.hour), minute: Number(p.minute),
    jourSemaine: SEMAINE[p.weekday] ?? 0,
  };
}

/** Instant correspondant à une heure murale dans le fuseau donné. */
export function instant(
  annee: number, mois: number, jour: number,
  heure: number, minute: number, tz = FUSEAU,
): Date {
  const naif = Date.UTC(annee, mois - 1, jour, heure, minute);
  // Deux passes suffisent : la seconde corrige un éventuel changement d'heure.
  let d = new Date(naif);
  for (let i = 0; i < 2; i++) {
    const p = parties(d, tz);
    const vu = Date.UTC(p.annee, p.mois - 1, p.jour, p.heure, p.minute);
    d = new Date(d.getTime() + (naif - vu));
  }
  return d;
}

function minutesDe(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function dateISO(p: Parts): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.annee}-${pad(p.mois)}-${pad(p.jour)}`;
}

/** Somme des durées ; 30 min de dépôt si aucune prestation n'est cochée. */
export function dureeDemandee(prestations: Prestation[]): number {
  const total = prestations.reduce((s, p) => s + p.duree_minutes, 0);
  return total > 0 ? total : DUREE_DEPOT_MINUTES;
}

function estFerme(garage: Garage, jourISO: string): boolean {
  return (garage.fermetures ?? []).some(
    (f) => jourISO >= f.debut && jourISO <= f.fin,
  );
}

/** Plages ouvrées d'un jour, en minutes depuis minuit, pause retirée. */
function plagesDuJour(h: HoraireJour): Array<[number, number]> {
  if (!h) return [];
  const ouv = minutesDe(h.ouverture);
  const fer = minutesDe(h.fermeture);
  if (fer <= ouv) return [];
  if (!h.pause) return [[ouv, fer]];
  const pd = minutesDe(h.pause.debut);
  const pf = minutesDe(h.pause.fin);
  if (pf <= pd || pf <= ouv || pd >= fer) return [[ouv, fer]];
  const plages: Array<[number, number]> = [];
  if (pd > ouv) plages.push([ouv, Math.min(pd, fer)]);
  if (pf < fer) plages.push([Math.max(pf, ouv), fer]);
  return plages;
}

function chevauche(aD: number, aF: number, bD: number, bF: number) {
  return aD < bF && bD < aF;
}

/** Minutes réellement ouvrées dans une journée, pause retirée. */
export function minutesOuvrees(h: HoraireJour): number {
  return plagesDuJour(h).reduce((s, [a, b]) => s + (b - a), 0);
}

/**
 * Ce que le garage accepte en une journée.
 *
 * Deux plafonds, parce qu'un seul ne suffit pas : trois jeux de plaquettes et
 * trois embrayages, c'est le même nombre de voitures et pas du tout la même
 * journée. Le compte protège l'accueil, la charge protège l'atelier.
 *
 * La charge par défaut vaut `nb_postes × minutes ouvrées` — la capacité
 * théorique. Un garage qui ne veut pas remplir ses postes à ras bord la
 * baisse dans ses réglages.
 */
export function plafondsDuJour(garage: Garage, horaire: HoraireJour): {
  depots: number | null; charge: number;
} {
  return {
    depots: garage.max_depots_jour ?? null,
    charge: garage.charge_max_minutes_jour
      ?? garage.nb_postes * minutesOuvrees(horaire),
  };
}

/**
 * Le travail qu'un rendez-vous représente.
 *
 * `charge_minutes` est posé à la confirmation. Les lignes antérieures à la
 * dépose n'en ont pas : leur fenêtre VALAIT la durée du travail, on la relit
 * donc comme telle plutôt que de les compter pour zéro.
 */
export function chargeDe(r: RendezVous): number {
  if (typeof r.charge_minutes === 'number') return r.charge_minutes;
  return Math.max(0, (new Date(r.fin).getTime() - new Date(r.debut).getTime()) / 60_000);
}

export type OptionsDisponibilites = {
  /** « maintenant » — injectable pour les tests. */
  maintenant?: Date;
  fuseau?: string;
  /** Pas d'échantillonnage en minutes (défaut 30). */
  pas?: number;
};

/**
 * Créneaux libres d'un garage. Fonction pure : tout ce dont elle a besoin
 * lui est passé, rien n'est lu ailleurs.
 */
export function disponibilites(
  garage: Garage,
  prestationsChoisies: Prestation[],
  rendezVousExistants: RendezVous[],
  dateDebut: Date,
  dateFin: Date,
  options: OptionsDisponibilites = {},
): Creneau[] {
  const tz = options.fuseau ?? FUSEAU;
  const pas = options.pas ?? PAS_MINUTES;
  const maintenant = options.maintenant ?? new Date();
  /* Le travail à faire. Il ne décide plus de la longueur du rendez-vous — on
     dépose une voiture, on ne réserve pas l'atelier pendant cinq heures —
     mais il pèse sur la charge de la journée. */
  const travail = dureeDemandee(prestationsChoisies);
  const depose = Math.max(5, garage.duree_depot_minutes ?? DUREE_CRENEAU_DEPOSE);

  const planchier = maintenant.getTime() + garage.delai_min_heures * 3_600_000;
  const horizon =
    instant(
      parties(maintenant, tz).annee,
      parties(maintenant, tz).mois,
      parties(maintenant, tz).jour,
      0, 0, tz,
    ).getTime() + garage.horizon_jours * 86_400_000;

  const debut = Math.max(dateDebut.getTime(), planchier);
  const fin = Math.min(dateFin.getTime(), horizon);
  if (fin <= debut) return [];

  const occupes = rendezVousExistants
    .map((r) => [new Date(r.debut).getTime(), new Date(r.fin).getTime()] as const)
    .filter(([d, f]) => f > d);

  /* Ce que chaque journée porte déjà : des voitures et des heures de travail.
     Un blocage manuel ne compte pas comme une voiture reçue, mais il mange
     bien du temps d'atelier. */
  const parJourneeDepots = new Map<string, number>();
  const parJourneeCharge = new Map<string, number>();
  for (const r of rendezVousExistants) {
    const jour = dateISO(parties(new Date(r.debut), tz));
    if (r.type === 'rdv') {
      parJourneeDepots.set(jour, (parJourneeDepots.get(jour) ?? 0) + 1);
    }
    parJourneeCharge.set(jour, (parJourneeCharge.get(jour) ?? 0) + chargeDe(r));
  }

  const libres: Creneau[] = [];
  // On balaie jour par jour depuis le jour civil de `dateDebut`.
  let curseur = parties(new Date(dateDebut.getTime()), tz);
  const finParties = parties(new Date(fin), tz);
  const dernierJour = dateISO(finParties);

  for (let garde = 0; garde < 400; garde++) {
    const jourISO = dateISO(curseur);
    if (jourISO > dernierJour) break;

    if (!estFerme(garage, jourISO)) {
      const nomJour = JOURS[curseur.jourSemaine];
      const horaire = (garage.horaires ?? {})[nomJour] ?? null;
      const plafonds = plafondsDuJour(garage, horaire);
      const depotsDuJour = parJourneeDepots.get(jourISO) ?? 0;
      const chargeDuJour = parJourneeCharge.get(jourISO) ?? 0;

      /* Le plafond de charge empêche l'ACCUMULATION, il n'interdit pas les
         gros chantiers. D'où `<` et non `charge + travail <=` : tant que la
         journée n'a pas atteint son plafond, elle accepte une voiture de
         plus, fût-elle là pour trois jours. Avec la règle inverse, un
         embrayage-distribution-freins n'aurait jamais trouvé de place —
         alors que c'est précisément le travail qu'un garage veut prendre. */
      const complet = (plafonds.depots !== null && depotsDuJour >= plafonds.depots)
        || chargeDuJour >= plafonds.charge;

      if (!complet) for (const [ouv, fer] of plagesDuJour(horaire)) {
        for (let m = ouv; m + depose <= fer; m += pas) {
          const d = instant(
            curseur.annee, curseur.mois, curseur.jour,
            Math.floor(m / 60), m % 60, tz,
          ).getTime();
          const f = d + depose * 60_000;
          if (d < debut || f > fin) continue;
          const pris = occupes.filter(([od, of]) => chevauche(d, f, od, of)).length;
          if (pris >= garage.nb_postes) continue;
          libres.push({
            debut: new Date(d).toISOString(),
            fin: new Date(f).toISOString(),
          });
        }
      }
    }

    // Jour suivant, à midi pour ne jamais tomber dans un saut d'heure.
    const suivant = parties(
      new Date(
        instant(curseur.annee, curseur.mois, curseur.jour, 12, 0, tz).getTime()
          + 86_400_000,
      ),
      tz,
    );
    curseur = suivant;
  }

  libres.sort((a, b) => a.debut.localeCompare(b.debut));
  return libres;
}

/** Regroupe des créneaux par journée (clé `AAAA-MM-JJ` locale). */
export function parJour(
  creneaux: Creneau[], tz = FUSEAU,
): Array<{ jour: string; creneaux: Creneau[] }> {
  const carte = new Map<string, Creneau[]>();
  for (const c of creneaux) {
    const k = dateISO(parties(new Date(c.debut), tz));
    const l = carte.get(k);
    if (l) l.push(c); else carte.set(k, [c]);
  }
  return [...carte.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([jour, creneaux]) => ({ jour, creneaux }));
}

/**
 * Le jour où la voiture devrait être rendue.
 *
 * Une voiture est traitée par UN poste, pas par tous : la capacité qui compte
 * ici est celle d'un seul mécanicien, soit les minutes ouvrées de la journée.
 * On avance donc jour ouvré par jour ouvré en épuisant le travail, en sautant
 * les jours fermés et les congés.
 *
 * C'est une estimation, et elle est présentée comme telle. Le garage la
 * corrige avant de l'annoncer : lui sait que la pièce arrive jeudi.
 */
export function restitutionEstimee(
  garage: Garage, depose: Date, travailMinutes: number, tz = FUSEAU,
): string {
  let reste = Math.max(1, travailMinutes);
  let curseur = parties(depose, tz);

  for (let garde = 0; garde < 400; garde++) {
    const jourISO = dateISO(curseur);
    if (!estFerme(garage, jourISO)) {
      const horaire = (garage.horaires ?? {})[JOURS[curseur.jourSemaine]] ?? null;
      const capacite = minutesOuvrees(horaire);
      if (capacite > 0) {
        /* Le premier jour ne compte que depuis l'heure de la dépose : une
           voiture déposée à 17 h n'a pas la journée devant elle. */
        const depuis = garde === 0
          ? Math.max(0, capacite - minutesEcoulees(horaire, curseur))
          : capacite;
        reste -= depuis;
        if (reste <= 0) return jourISO;
      }
    }
    curseur = parties(
      new Date(instant(curseur.annee, curseur.mois, curseur.jour, 12, 0, tz).getTime()
        + 86_400_000),
      tz,
    );
  }
  return dateISO(curseur);
}

/** Minutes ouvrées déjà passées dans la journée à l'heure donnée. */
function minutesEcoulees(h: HoraireJour, p: Parts): number {
  const t = p.heure * 60 + p.minute;
  return plagesDuJour(h).reduce(
    (s, [a, b]) => s + Math.max(0, Math.min(t, b) - a), 0);
}
