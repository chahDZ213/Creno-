import { describe, expect, it } from 'vitest';
import {
  CATEGORIES_DEFAUT, categoriesDe, coefficientDe, dureeAjustee, prixAjuste,
} from '../src/lib/categories';
import type { Garage } from '../src/lib/types';

const g = (categories: unknown = undefined) =>
  ({ categories_vehicule: categories } as unknown as Garage);

describe('categoriesDe', () => {
  it('rend celles de départ quand le garage n’y a pas touché', () => {
    expect(categoriesDe(g())).toBe(CATEGORIES_DEFAUT);
    expect(categoriesDe(g(null))).toBe(CATEGORIES_DEFAUT);
    expect(categoriesDe(g([]))).toBe(CATEGORIES_DEFAUT);
  });

  it('écarte les lignes inexploitables plutôt que de planter', () => {
    const l = categoriesDe(g([
      { cle: 'citadine', libelle: 'Citadine', coefficient: 1 },
      { cle: 'cassee', libelle: 'Sans coefficient' },
      { cle: 'negative', libelle: 'Négatif', coefficient: -2 },
      null,
    ]));
    expect(l).toHaveLength(1);
    expect(l[0].cle).toBe('citadine');
  });
});

describe('coefficientDe', () => {
  it('vaut 1 sans catégorie : le tarif de base, jamais zéro', () => {
    expect(coefficientDe(g(), null)).toBe(1);
    expect(coefficientDe(g(), '')).toBe(1);
  });

  it('vaut 1 pour une catégorie inconnue', () => {
    // Une demande enregistrée avant qu'une catégorie soit supprimée des
    // réglages ne doit pas faire disparaître son prix.
    expect(coefficientDe(g(), 'formule-1')).toBe(1);
  });

  it('applique le coefficient de la catégorie choisie', () => {
    expect(coefficientDe(g(), 'premium')).toBe(1.6);
    expect(coefficientDe(g(), 'citadine')).toBe(1);
  });
});

describe('prixAjuste', () => {
  it('garde « sur devis » sur devis', () => {
    expect(prixAjuste(null, 1.6)).toBeNull();
  });

  it('arrondit à l’euro supérieur', () => {
    // 695 x 1,6 = 1112 ; 890 x 1,25 = 1112,5 -> 1113.
    expect(prixAjuste(695, 1.6)).toBe(1112);
    expect(prixAjuste(890, 1.25)).toBe(1113);
  });

  it('laisse un prix inchangé en catégorie de référence', () => {
    expect(prixAjuste(890, 1)).toBe(890);
  });
});

describe('dureeAjustee', () => {
  it('arrondit au pas de cinq minutes du planning', () => {
    // 300 x 1,6 = 480 ; 45 x 1,25 = 56,25 -> 55.
    expect(dureeAjustee(300, 1.6)).toBe(480);
    expect(dureeAjustee(45, 1.25)).toBe(55);
  });

  it('ne descend jamais sous cinq minutes', () => {
    expect(dureeAjustee(5, 0.1)).toBe(5);
  });
});

describe('un embrayage de Clio contre un embrayage d’A6', () => {
  it('ni le même prix ni le même temps', () => {
    const clio = coefficientDe(g(), 'citadine');
    const a6 = coefficientDe(g(), 'premium');
    expect(prixAjuste(890, clio)).toBe(890);
    expect(prixAjuste(890, a6)).toBe(1424);
    expect(dureeAjustee(300, clio)).toBe(300);
    expect(dureeAjustee(300, a6)).toBe(480);
  });
});
