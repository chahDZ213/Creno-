import type { Statut } from '@/lib/types';

const LIBELLE: Record<Statut, string> = {
  nouvelle: 'À traiter',
  confirmee: 'Confirmée',
  alternative_proposee: 'Autre créneau proposé',
  refusee: 'Refusée',
  annulee: 'Annulée',
  terminee: 'Terminée',
};

const CLASSE: Record<Statut, string> = {
  nouvelle: 'badge-attente',
  confirmee: 'badge-ok',
  alternative_proposee: 'badge-neutre',
  refusee: 'badge-refus',
  annulee: 'badge-neutre',
  terminee: 'badge-neutre',
};

export const libelleStatut = (s: Statut) => LIBELLE[s];

export default function PastilleStatut({ statut }: { statut: Statut }) {
  return <span className={CLASSE[statut]}>{LIBELLE[statut]}</span>;
}
