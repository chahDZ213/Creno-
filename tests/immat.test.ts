import { describe, expect, it } from 'vitest';
import { immatValide, normaliserImmat } from '../src/lib/immat';

describe('immatriculations', () => {
  it('normalise le SIV quelle que soit la saisie', () => {
    for (const saisie of ['ab123cd', 'AB 123 CD', 'ab-123-cd', ' Ab123Cd ']) {
      expect(normaliserImmat(saisie)).toBe('AB-123-CD');
    }
  });
  it('normalise l’ancien format FNI', () => {
    expect(normaliserImmat('1234ab56')).toBe('1234 AB 56');
    expect(normaliserImmat('789-cd-33')).toBe('789 CD 33');
  });
  it('accepte les deux formats français', () => {
    expect(immatValide('AB-123-CD')).toBe(true);
    expect(immatValide('1234 AB 56')).toBe(true);
  });
  it('refuse ce qui n’en est pas une', () => {
    for (const faux of ['', 'BONJOUR', 'AB-12-CD', '12345 AB 6', 'AB-123-C']) {
      expect(immatValide(faux)).toBe(false);
    }
  });
  it('écarte les lettres interdites du SIV (I, O, U)', () => {
    expect(immatValide('IO-123-CD')).toBe(false);
  });
});
