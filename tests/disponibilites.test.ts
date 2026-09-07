import { describe, expect, it } from 'vitest';
import {
  disponibilites, dureeDemandee, instant, parJour,
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

const rdv = (debut: Date, fin: Date, id = 'r'): RendezVous => ({
  id, garage_id: 'g1', demande_id: null,
  debut: debut.toISOString(), fin: fin.toISOString(), type: 'rdv', libelle: null,
});

// Lundi 6 avril 2026.
const LUNDI = (h: number, m = 0) => instant(2026, 4, 6, h, m);
const MARDI = (h: number, m = 0) => instant(2026, 4, 7, h, m);
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
    // Rien ne peut commencer à 11h30 (déborderait sur la pause) ni pendant.
    expect(heures).not.toContain(LUNDI(11, 30).toISOString());
    expect(heures).not.toContain(LUNDI(12).toISOString());
    expect(heures).not.toContain(LUNDI(13).toISOString());
    expect(heures).toContain(LUNDI(14).toISOString());
    // Le dernier créneau d'1h doit tenir avant 18h.
    expect(heures.at(-1)).toBe(LUNDI(17).toISOString());
  });

  it('exclut les créneaux qui chevauchent un rendez-vous existant', () => {
    const c = creneauxDu(garage(), [presta(60)], [
      rdv(LUNDI(9), LUNDI(10, 30)),
    ]);
    const heures = c.map((x) => x.debut);
    expect(heures).toContain(LUNDI(8).toISOString());
    expect(heures).not.toContain(LUNDI(8, 30).toISOString());
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

  it('place une prestation plus longue qu\'une demi-journée', () => {
    // 5 h : ne tient dans aucune des deux demi-journées (4 h le matin,
    // 4 h l'après-midi) — aucun créneau le lundi.
    const c = creneauxDu(garage(), [presta(300)], []);
    expect(c).toHaveLength(0);
    // Sans pause déjeuner, 8h-18h laisse la place.
    const continu = garage({
      horaires: {
        ...garage().horaires,
        lundi: { ouverture: '08:00', fermeture: '18:00', pause: null },
      },
    });
    const c2 = creneauxDu(continu, [presta(300)], []);
    expect(c2[0].debut).toBe(LUNDI(8).toISOString());
    expect(c2.at(-1)!.debut).toBe(LUNDI(13).toISOString());
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
