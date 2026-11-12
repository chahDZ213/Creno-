/**
 * Identifiant de la page publique d'un garage : la fin de l'adresse qu'on
 * imprime sur le QR code de la vitrine. Il se lit à voix haute au téléphone,
 * donc pas d'accents, pas de majuscules, pas d'espaces.
 */
export function slugifier(valeur: string): string {
  return valeur
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // é -> e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    || 'mon-garage';
}
