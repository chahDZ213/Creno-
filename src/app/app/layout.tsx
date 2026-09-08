import Link from 'next/link';
import BarreOnglets from '@/components/BarreOnglets';
import Deconnexion from '@/components/Deconnexion';
import { variables } from '@/lib/couleur';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { garage } = await monGarage();
  const db = await serveur();

  // Le compte des demandes en attente vit dans la barre du bas : c'est la
  // première chose qu'on veut savoir en ouvrant l'application.
  const { count } = await db.from('demandes')
    .select('id', { count: 'exact', head: true })
    .eq('garage_id', garage.id).eq('statut', 'nouvelle');

  return (
    <div style={variables(garage.couleur_primaire)}
      className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 border-b border-ardoise-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {garage.logo_url
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={garage.logo_url} alt="" className="h-9 w-9 rounded-lg object-contain" />
            : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-atelier font-bold text-white">
                {garage.nom.slice(0, 1)}
              </span>}
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight text-ardoise-950">
              {garage.nom}
            </p>
            <Link href={`/${garage.slug}`}
              className="text-[0.8125rem] font-semibold text-atelier">
              Voir ma page publique
            </Link>
          </div>
          <Deconnexion />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>

      <BarreOnglets enAttente={count ?? 0} />
    </div>
  );
}
