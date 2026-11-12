import { describe, expect, it } from 'vitest';
import {
  disponibilites, dureeDemandee, instant, parJour, restitutionEstimee,
} from '../src/lib/disponibilites';
import type { Garage, Prestation, RendezVous } from '../src/lib/types';

const horaireStandard = {
  ouverture: '08:00', fermeture: '18:00',
  pause: { debut: '12:00', fin: '14:00' },
};

const garage = (over: Partial<Garage> = {}): Garage => ({
  id: 'g1', slug: 'test', nom: 'Garage test', adresse: null, telephone: null,
  email: null, logo_url: null, couleur_primaire: '#000', gabarit: 'etapes',
  horaires: {
    lundi: horaireStandard, mardi: horaireStandard, mercredi: horaireStandard,
    jeudi: horaireStandard, vendredi: horaireStandard,
    samedi: { ouverture: '09:00', fermeture: '12:00', pause: null },
    dimanche: null,
  },
  fermetures: [], nb_postes: 1, delai_min_heures: 24, horizon_jours: 21,
  taux_horaire_ttc: 70, affiche_prix: false, ...over,
});

const presta = (duree: number, id = 'p'): Prestation => ({
  id, garage_id: 'g1', libelle: `P${duree}`, duree_minutes: duree,
  prix_ttc: null, ordre: 0, active: true,
});

/** Une dépose déjà acceptée : une fenêtre courte, et le travail qu'elle apporte. */
const rdv = (
  debut: Date, fin: Date, id = 'r', charge_minutes: number | null = null,
): RendezVous => ({
  id, garage_id: 'g1', demande_id: null,
  debut: debut.toISOString(), fin: fin.toISOString(), type: 'rdv', libelle: null,
  charge_minutes,
});

// Lundi 6 avril 2026.
const LUNDI = (h: number, m = 0) => instant(2026, 4, 6, h, m);
const MARDI = (h: number, m = 0) => instant(2026, 4, 7, h, m);
const MERCREDI = (h: number, m = 0) => instant(2026, 4, 8, h, m);
const MAINTENANT = instant(2026, 4, 3, 10, 0); // vendredi

const jourDe = (iso: string) =>
  parJour([{ debut: iso, fin: iso }])[0].jour;

function creneauxDu(
  g: Garage, prestations: Prestation[], existants: RendezVous[],
  debut = LUNDI(0), fin = MARDI(0),
) {
  return disponibilites(g, prestations, existants, debut, fin, {
    maintenant: MAINTENANT,
  });
}

describe('dureeDemandee', () => {
  it('somme les prestations choisies', () => {
    expect(dureeDemandee([presta(45, 'a'), presta(60, 'b')])).toBe(105);
  });
  it('retombe sur un dépôt de 30 min sans prestation', () => {
    expect(dureeDemandee([])).toBe(30);
  });
});

describe('disponibilites', () => {
  it('respecte les horaires et la pause déjeuner', () => {
    const c = creneauxDu(garage(), [presta(60)], []);
    const heures = c.map((x) => x.debut);
    expect(heures[0]).toBe(LUNDI(8).toISOString());
    // On ne remet pas de clés pendant la pause.
    expect(heures).not.toContain(LUNDI(12).toISOString());
    expect(heures).not.toContain(LUNDI(13, 30).toISOString());
    expect(heures).toContain(LUNDI(14).toISOString());
    // La dépose dure 30 min : la dernière commence à 11h30, puis à 17h30.
    expect(heures).toContain(LUNDI(11, 30).toISOString());
    expect(heures.at(-1)).toBe(LUNDI(17, 30).toISOString());
  });

  it('la longueur du créneau ne dépend pas du travail à faire', () => {
    // Une vidange et un embrayage occupent le comptoir le même temps : celui
    // de se garer et de tendre ses clés.
    const courte = creneauxDu(garage(), [presta(45)], []);
    const longue = creneauxDu(garage(), [presta(300)], []);
    expect(longue).toHaveLength(courte.length);
    const minutes = (c: { debut: string; fin: string }) =>
      (new Date(c.fin).getTime() - new Date(c.debut).getTime()) / 60_000;
    expect(minutes(courte[0])).toBe(30);
    expect(minutes(longue[0])).toBe(30);
  });

  it('suit la durée de dépose réglée par le garage', () => {
    const c = creneauxDu(garage({ duree_depot_minutes: 15 }), [presta(60)], []);
    const minutes = (new Date(c[0].fin).getTime()
      - new Date(c[0].debut).getTime()) / 60_000;
    expect(minutes).toBe(15);
  });

  it('exclut les créneaux qui chevauchent un rendez-vous existant', () => {
    // Une dépose déjà prise de 9h à 10h30 : l'accueil est occupé sur ce
    // qu'elle couvre, pas avant.
    const c = creneauxDu(garage(), [presta(60)], [
      rdv(LUNDI(9), LUNDI(10, 30), 'r', 60),
    ]);
    const heures = c.map((x) => x.debut);
    expect(heures).toContain(LUNDI(8).toISOString());
    expect(heures).toContain(LUNDI(8, 30).toISOString());
    expect(heures).not.toContain(LUNDI(9).toISOString());
    expect(heures).not.toContain(LUNDI(9, 30).toISOString());
    expect(heures).not.toContain(LUNDI(10).toISOString());
    expect(heures).toContain(LUNDI(10, 30).toISOString());
  });

  it('accepte un chevauchement tant qu\'un poste reste libre', () => {
    const deuxPostes = garage({ nb_postes: 2 });
    const occupe = [rdv(LUNDI(9), LUNDI(10))];
    expect(creneauxDu(deuxPostes, [presta(60)], occupe).map((x) => x.debut))
      .toContain(LUNDI(9).toISOString());
    // Les deux postes pris : plus rien à 9h.
    const occupe2 = [...occupe, rdv(LUNDI(9), LUNDI(10), 'r2')];
    expect(creneauxDu(deuxPostes, [presta(60)], occupe2).map((x) => x.debut))
      .not.toContain(LUNDI(9).toISOString());
  });

  it('accepte un chantier plus long que la journée', () => {
    /* Le cas qui a motivé la dépose : chez un garage ouvert 8h-18h avec
       pause, un embrayage de 5 h ne trouvait AUCUN créneau — il ne tenait
       dans aucune des deux demi-journées. Le client lisait « aucun créneau
       libre » devant un planning vide, et partait téléphoner. */
    const c = creneauxDu(garage(), [presta(300)], []);
    expect(c.length).toBeGreaterThan(0);
    expect(c[0].debut).toBe(LUNDI(8).toISOString());

    // Et un chantier de trois jours se dépose comme les autres.
    const troisJours = creneauxDu(
      garage(), [presta(300), presta(240, 'p2'), presta(900, 'p3')], []);
    expect(troisJours.length).toBeGreaterThan(0);
  });

  it('arrête d\'accepter quand la journée a son compte de voitures', () => {
    const g = garage({ max_depots_jour: 3, nb_postes: 3 });
    const deja = [
      rdv(LUNDI(8), LUNDI(8, 30), 'a', 90),
      rdv(LUNDI(9), LUNDI(9, 30), 'b', 90),
    ];
    // Deux voitures reçues : la troisième passe encore.
    expect(jourDe(creneauxDu(g, [presta(90)], deja, LUNDI(0), MERCREDI(0))[0].debut))
      .toBe('2026-04-06');
    // Trois : le lundi disparaît, on bascule sur le mardi.
    const pleine = [...deja, rdv(LUNDI(10), LUNDI(10, 30), 'c', 90)];
    expect(jourDe(creneauxDu(g, [presta(90)], pleine, LUNDI(0), MERCREDI(0))[0].debut))
      .toBe('2026-04-07');
  });

  it('arrête d\'accepter quand la journée a son compte d\'heures', () => {
    /* Trois jeux de plaquettes oui, trois embrayages non : même nombre de
       voitures, pas du tout la même journée. C'est la charge qui tranche. */
    const g = garage({ charge_max_minutes_jour: 480, nb_postes: 3 });
    const plaquettes = [
      rdv(LUNDI(8), LUNDI(8, 30), 'a', 90),
      rdv(LUNDI(9), LUNDI(9, 30), 'b', 90),
    ];
    expect(jourDe(creneauxDu(g, [presta(90)], plaquettes, LUNDI(0), MERCREDI(0))[0].debut))
      .toBe('2026-04-06');

    const embrayages = [
      rdv(LUNDI(8), LUNDI(8, 30), 'a', 300),
      rdv(LUNDI(9), LUNDI(9, 30), 'b', 300),
    ];
    expect(jourDe(creneauxDu(g, [presta(300)], embrayages, LUNDI(0), MERCREDI(0))[0].debut))
      .toBe('2026-04-07');
  });

  it('laisse toujours passer un gros chantier sur une journée encore libre', () => {
    /* Le plafond empêche l'accumulation, il n'interdit pas les gros
       chantiers. Avec la règle inverse — charge déjà posée + travail <=
       plafond — un embrayage-distribution-freins n'aurait jamais trouvé de
       place, alors que c'est le travail qu'un garage veut prendre. */
    const g = garage({ charge_max_minutes_jour: 240 });
    const c = creneauxDu(g, [presta(1800)], []);
    expect(c.length).toBeGreaterThan(0);
    expect(jourDe(c[0].debut)).toBe('2026-04-06');
  });

  it('compte le travail des lignes antérieures à la dépose', () => {
    /* Une ligne sans `charge_minutes` vient d'avant : sa fenêtre VALAIT la
       durée du travail. La relire comme telle évite de compter pour zéro un
       chantier de quatre heures. */
    const g = garage({ charge_max_minutes_jour: 200, nb_postes: 3 });
    const ancienne = [rdv(LUNDI(8), LUNDI(12), 'vieux')];   // 240 min, sans charge
    expect(jourDe(creneauxDu(g, [presta(60)], ancienne, LUNDI(0), MERCREDI(0))[0].debut))
      .toBe('2026-04-07');
  });

  it('ignore un jour de fermeture hebdomadaire', () => {
    // Dimanche 5 avril.
    const c = disponibilites(
      garage(), [presta(60)], [],
      instant(2026, 4, 5, 0, 0), instant(2026, 4, 6, 0, 0),
      { maintenant: MAINTENANT },
    );
    expect(c).toHaveLength(0);
  });

  it('ignore une période de fermeture (congés)', () => {
    const g = garage({
      fermetures: [{ debut: '2026-04-06', fin: '2026-04-10', motif: 'Congés' }],
    });
    expect(creneauxDu(g, [presta(60)], [])).toHaveLength(0);
  });

  it('n\'ouvre rien avant le délai minimum', () => {
    const g = garage({ delai_min_heures: 72 });
    // Délai depuis vendredi 10h → rien avant lundi 10h.
    const c = creneauxDu(g, [presta(60)], []);
    expect(c[0].debut).toBe(LUNDI(10).toISOString());
  });

  it('s\'arrête à l\'horizon de réservation', () => {
    const g = garage({ horizon_jours: 3, delai_min_heures: 0 });
    const c = disponibilites(
      g, [presta(60)], [],
      MAINTENANT, instant(2026, 5, 1, 0, 0), { maintenant: MAINTENANT },
    );
    // Horizon : minuit du 3 avril + 3 jours = 6 avril 00h00.
    expect(c.every((x) => x.debut < instant(2026, 4, 6, 0, 0).toISOString()))
      .toBe(true);
  });

  it('propose des créneaux de 30 min pour un dépôt sans prestation', () => {
    const c = creneauxDu(garage(), [], []);
    expect(c[0].fin).toBe(LUNDI(8, 30).toISOString());
  });

  it('regroupe par journée', () => {
    const c = disponibilites(
      garage(), [presta(60)], [],
      LUNDI(0), instant(2026, 4, 8, 0, 0), { maintenant: MAINTENANT },
    );
    const groupes = parJour(c);
    expect(groupes.map((g) => g.jour)).toEqual(['2026-04-06', '2026-04-07']);
    expect(jourDe(LUNDI(8).toISOString())).toBe('2026-04-06');
  });
});

describe('restitutionEstimee', () => {
  // Garage ouvert 8h-18h avec pause de 2 h : 8 h de travail par jour.
  it('rend le jour même une intervention qui tient dans la journée', () => {
    expect(restitutionEstimee(garage(), LUNDI(8), 120)).toBe('2026-04-06');
  });

  it('déborde au lendemain quand la journée n’y suffit pas', () => {
    // Déposée à 8 h, 10 h de travail : 8 h le lundi, le reste le mardi.
    expect(restitutionEstimee(garage(), LUNDI(8), 600)).toBe('2026-04-07');
  });

  it('ne donne pas la journée entière à une voiture déposée le soir', () => {
    // 17 h : il ne reste qu'une heure d'atelier. Deux heures de travail
    // débordent donc au lendemain.
    expect(restitutionEstimee(garage(), LUNDI(17), 120)).toBe('2026-04-07');
  });

  it('saute le dimanche', () => {
    // Samedi 11 avril, 9h-12h : 3 h. Huit heures de travail passent le
    // samedi puis le lundi, le dimanche étant fermé.
    expect(restitutionEstimee(garage(), instant(2026, 4, 11, 9, 0), 480))
      .toBe('2026-04-13');
  });

  it('saute une fermeture annuelle', () => {
    const g = garage({
      fermetures: [{ debut: '2026-04-07', fin: '2026-04-10', motif: 'Congés' }],
    });
    /* Lundi 8 h, 10 h de travail : 8 h le lundi, et les congés avalent
       mardi à vendredi. Le reste tombe donc au samedi 11 — ce garage ouvre
       le samedi matin — et non au lundi suivant. */
    expect(restitutionEstimee(g, LUNDI(8), 600)).toBe('2026-04-11');
  });

  it('étale un chantier de trois jours', () => {
    expect(restitutionEstimee(garage(), LUNDI(8), 1440)).toBe('2026-04-08');
  });
});
