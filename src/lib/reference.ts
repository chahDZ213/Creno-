const LETTRES = 'ACDEFGHJKLMNPRTVWXY'; // sans I, O, Q, S, U, B : lues de travers
const CHIFFRES = '0123456789';

function tirer(alphabet: string, n: number): string {
  const octets = new Uint8Array(n);
  crypto.getRandomValues(octets);
  return [...octets].map((o) => alphabet[o % alphabet.length]).join('');
}

/** Numéro de suivi court, dicté au téléphone sans ambiguïté : DR-4F92. */
export function referenceCourte(): string {
  return `${tirer(LETTRES, 2)}-${tirer(LETTRES + CHIFFRES, 4)}`;
}

/** Token de suivi client : long, aléatoire, non devinable. */
export function tokenSuivi(): string {
  const octets = new Uint8Array(24);
  crypto.getRandomValues(octets);
  return [...octets].map((o) => o.toString(16).padStart(2, '0')).join('');
}
