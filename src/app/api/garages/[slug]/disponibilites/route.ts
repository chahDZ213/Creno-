import { NextResponse } from 'next/server';
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

  const ids = new URL(requete.url).searchParams.get('prestations');
  const choisies = (await prestationsActives(garage.id))
    .filter((p) => (ids ? ids.split(',').includes(p.id) : false));

  const maintenant = new Date();
  const debut = new Date(maintenant.getTime() + garage.delai_min_heures * 3_600_000);
  const fin = new Date(maintenant.getTime() + garage.horizon_jours * 86_400_000);
  const existants = await occupation(garage.id, debut, fin);

  const creneaux = disponibilites(garage, choisies, existants, debut, fin, { maintenant });
  return NextResponse.json({ jours: parJour(creneaux) });
}
