import { NextResponse } from 'next/server';
import { coefficientDe, dureeAjustee } from '@/lib/categories';
import { disponibilites, parJour } from '@/lib/disponibilites';
import { garageParSlug, occupation, prestationsActives } from '@/lib/serveur/donnees';

export const dynamic = 'force-dynamic';

/**
 * Créneaux libres d'un garage. On ne renvoie que des créneaux : ni les
 * rendez-vous existants, ni ce qu'ils contiennent.
 */
export async function GET(
  requete: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const garage = await garageParSlug(slug);
  if (!garage) return NextResponse.json({ erreur: 'Garage inconnu' }, { status: 404 });

  const parametres = new URL(requete.url).searchParams;
  const ids = parametres.get('prestations');
  /* La catégorie allonge le travail autant qu'elle en augmente le prix : un
     embrayage d'A6 ne tient pas dans le temps d'un embrayage de Clio. Sans
     elle ici, la charge de la journée serait sous-estimée et le garage
     accepterait plus de voitures qu'il ne peut en traiter. */
  const coefficient = coefficientDe(garage, parametres.get('categorie'));
  const choisies = (await prestationsActives(garage.id))
    .filter((p) => (ids ? ids.split(',').includes(p.id) : false))
    .map((p) => ({ ...p, duree_minutes: dureeAjustee(p.duree_minutes, coefficient) }));

  const maintenant = new Date();
  const debut = new Date(maintenant.getTime() + garage.delai_min_heures * 3_600_000);
  const fin = new Date(maintenant.getTime() + garage.horizon_jours * 86_400_000);
  const existants = await occupation(garage.id, debut, fin);

  const creneaux = disponibilites(garage, choisies, existants, debut, fin, { maintenant });
  return NextResponse.json({ jours: parJour(creneaux) });
}
