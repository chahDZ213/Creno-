import { redirect } from 'next/navigation';
import { monGarage } from '@/lib/serveur/session';
import Parcours from './Parcours';

export const dynamic = 'force-dynamic';

/**
 * Le parcours d'installation, hors de `/app` : pas de barre d'onglets, pas de
 * compteur de demandes en attente. Un garage qui n'a pas encore répondu aux
 * questions n'a rien à faire dans un tableau de bord vide.
 */
export default async function PageInstallation() {
  const { garage, email } = await monGarage();
  // Déjà installé : on n'oblige personne à repasser par les questions.
  if (Object.keys(garage.horaires ?? {}).length > 0) redirect('/app');
  return <Parcours email={email} />;
}
