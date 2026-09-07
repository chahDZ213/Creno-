import { describe, expect, it } from 'vitest';
import { motifCourt } from '../src/lib/notifications';

describe('motifCourt', () => {
  it('tient en cinq mots à partir des prestations', () => {
    expect(motifCourt(['Plaquettes avant', 'Géométrie / parallélisme'], null))
      .toBe('Plaquettes avant, Géométrie / parallélisme');
  });
  it('coupe une description bavarde', () => {
    expect(motifCourt([], 'elle démarre plus le matin quand il fait froid'))
      .toBe('elle démarre plus le matin');
  });
  it('retombe sur le dépôt quand rien n’est dit', () => {
    expect(motifCourt([], null)).toBe('dépôt diagnostic');
  });
});
