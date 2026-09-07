/** Immatriculations françaises : SIV (AB-123-CD) et FNI (1234 AB 56). */

const SIV = /^[A-HJ-NP-TV-Z]{2}-[0-9]{3}-[A-HJ-NP-TV-Z]{2}$/;
const FNI = /^[0-9]{1,4} [A-Z]{2,3} [0-9]{2,3}$/;

/** Majuscules, espaces et tirets normalisés. Ne devine rien. */
export function normaliserImmat(brut: string): string {
  const s = brut.toUpperCase().replace(/[\s\-_.]+/g, '');
  const siv = s.match(/^([A-Z]{2})([0-9]{3})([A-Z]{2})$/);
  if (siv) return `${siv[1]}-${siv[2]}-${siv[3]}`;
  const fni = s.match(/^([0-9]{1,4})([A-Z]{2,3})([0-9]{2,3})$/);
  if (fni) return `${fni[1]} ${fni[2]} ${fni[3]}`;
  return brut.toUpperCase().trim();
}

export function immatValide(valeur: string): boolean {
  const v = normaliserImmat(valeur);
  return SIV.test(v) || FNI.test(v);
}
