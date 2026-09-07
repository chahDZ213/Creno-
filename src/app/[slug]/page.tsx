import { notFound } from 'next/navigation';
import PriseRendezVous from '@/components/PriseRendezVous';
import { variables } from '@/lib/couleur';
import { garageParSlug, prestationsActives } from '@/lib/serveur/donnees';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const garage = await garageParSlug(slug);
  return {
    title: garage ? `Rendez-vous — ${garage.nom}` : 'Créno',
    description: garage
      ? `Demandez un rendez-vous chez ${garage.nom}, à toute heure.` : undefined,
  };
}

export default async function PagePublique(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const garage = await garageParSlug(slug);
  if (!garage) notFound();
  const prestations = await prestationsActives(garage.id);

  const large = garage.gabarit === 'colonnes' ? 'max-w-5xl' : 'max-w-2xl';

  return (
    <div style={variables(garage.couleur_primaire)}>
      <header className="border-b-4 border-atelier bg-white">
        <div className={`mx-auto flex ${large} items-center gap-4 px-5 py-4`}>
          {garage.logo_url
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={garage.logo_url} alt="" className="h-12 w-12 object-contain" />
            : <span className="flex h-12 w-12 items-center justify-center rounded bg-atelier text-xl font-bold text-white">
                {garage.nom.slice(0, 1)}
              </span>}
          <div>
            <h1 className="text-xl font-bold leading-tight text-ardoise-950">{garage.nom}</h1>
            {garage.adresse && (
              <p className="text-sm text-ardoise-600">{garage.adresse}</p>
            )}
          </div>
          {garage.telephone && (
            <a href={`tel:${garage.telephone}`}
              className="ml-auto hidden font-semibold text-atelier underline sm:block">
              {garage.telephone}
            </a>
          )}
        </div>
      </header>

      <main className={`mx-auto ${large} px-5 py-6`}>
        <p className="mb-6 text-lg text-ardoise-800">
          Dites ce qu’il faut faire, quand vous pouvez passer, et le garage
          vous répond. Vous ne réservez pas : vous demandez.
        </p>
        <PriseRendezVous
          garage={{
            id: garage.id, slug: garage.slug, nom: garage.nom,
            adresse: garage.adresse, telephone: garage.telephone,
            logo_url: garage.logo_url, couleur_primaire: garage.couleur_primaire,
            affiche_prix: garage.affiche_prix,
            delai_min_heures: garage.delai_min_heures,
          }}
          prestations={prestations}
          gabarit={garage.gabarit}
        />
      </main>

      <footer className="mx-auto max-w-2xl px-5 py-10 text-center text-sm text-ardoise-600">
        Prise de rendez-vous propulsée par Créno.
      </footer>
    </div>
  );
}
