import Link from 'next/link';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
import { depuis, heure, jourCourt } from '@/lib/format';
import type { Demande, Statut } from '@/lib/types';

export const dynamic = 'force-dynamic';

const LIBELLE_STATUT: Record<Statut, string> = {
  nouvelle: 'À traiter',
  confirmee: 'Confirmée',
  alternative_proposee: 'Autre créneau proposé',
  refusee: 'Refusée',
  annulee: 'Annulée',
  terminee: 'Terminée',
};

export default async function ListeDemandes(
  { searchParams }: { searchParams: Promise<{ vue?: string }> },
) {
  const { vue } = await searchParams;
  const { garage } = await monGarage();
  const db = await serveur();

  const traitees = vue === 'traitees';
  const { data } = await db.from('demandes').select('*')
    .eq('garage_id', garage.id)
    .filter('statut', traitees ? 'neq' : 'eq', 'nouvelle')
    .order('created_at', { ascending: traitees ? false : true });
  const demandes = (data as Demande[]) ?? [];

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <Lien actif={!traitees} href="/app">À traiter</Lien>
        <Lien actif={traitees} href="/app?vue=traitees">Traitées</Lien>
      </div>

      {demandes.length === 0 && (
        <p className="bloc p-6 text-center text-ardoise-600">
          {traitees ? 'Rien encore.' : 'Aucune demande en attente. L’atelier est à jour.'}
        </p>
      )}

      <ul className="space-y-3">
        {demandes.map((d) => {
          const heures = (Date.now() - +new Date(d.created_at)) / 3_600_000;
          const urgent = d.statut === 'nouvelle' && heures >= 12;
          return (
            <li key={d.id}>
              <Link href={`/app/demandes/${d.id}`}
                className={`block bg-white p-4 ${urgent
                  ? 'border-l-8 border-alerte shadow-[0_0_0_1px_#e4e9ee]'
                  : 'border border-ardoise-200'}`}>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-lg font-bold text-ardoise-950">
                    {d.vehicule_immat}
                  </span>
                  <span className="text-sm text-ardoise-600">{d.client_nom}</span>
                  <span className="ml-auto text-sm text-ardoise-600">
                    {depuis(d.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-ardoise-800">
                  {d.description_libre
                    ?? `${d.prestation_ids.length} prestation${d.prestation_ids.length > 1 ? 's' : ''}`}
                </p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  {urgent && (
                    <span className="bg-alerte px-2 py-1 font-bold text-ardoise-950">
                      Sans réponse depuis {Math.floor(heures)} h
                    </span>
                  )}
                  {d.statut !== 'nouvelle' && (
                    <span className="font-semibold text-ardoise-600">
                      {LIBELLE_STATUT[d.statut]}
                    </span>
                  )}
                  {d.creneaux_souhaites[0] && (
                    <span className="text-ardoise-600">
                      souhaité {jourCourt(d.creneaux_souhaites[0].debut)} {heure(d.creneaux_souhaites[0].debut)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Lien({ href, actif, children }: {
  href: string; actif: boolean; children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-current={actif ? 'page' : undefined}
      className={`bouton ${actif ? 'bg-ardoise-950 text-white' : 'bouton-sobre'}`}>
      {children}
    </Link>
  );
}
