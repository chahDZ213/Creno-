import Link from 'next/link';
import PastilleStatut from '@/components/Statut';
import { depuis, heure, jourCourt } from '@/lib/format';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
import type { Demande } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ListeDemandes(
  { searchParams }: { searchParams: Promise<{ vue?: string; q?: string }> },
) {
  const { vue, q } = await searchParams;
  const recherche = (q ?? '').trim();
  const { garage } = await monGarage();
  const db = await serveur();

  const traitees = vue === 'traitees';
  let requete = db.from('demandes').select('*').eq('garage_id', garage.id);

  if (recherche) {
    // Le code de suivi dicté au téléphone, la plaque relevée sur le pare-brise,
    // le nom du client : une seule barre, elle cherche dans les quatre.
    const m = `%${recherche}%`;
    requete = requete.or(
      `reference.ilike.${m},vehicule_immat.ilike.${m},client_nom.ilike.${m},client_tel.ilike.${m}`,
    ).order('created_at', { ascending: false });
  } else {
    requete = requete
      .filter('statut', traitees ? 'neq' : 'eq', 'nouvelle')
      .order('created_at', { ascending: !traitees });
  }

  const { data } = await requete;
  const demandes = (data as Demande[]) ?? [];

  return (
    <div className="space-y-4">
      <h1 className="titre-ecran">Demandes</h1>

      <form action="/app" className="flex gap-2">
        <input
          name="q" defaultValue={recherche} className="champ flex-1"
          placeholder="Code de suivi, plaque, nom…"
          aria-label="Rechercher une demande"
          autoComplete="off" enterKeyHint="search"
        />
        <button className="bouton-principal px-4" aria-label="Rechercher">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
          </svg>
        </button>
      </form>

      {recherche ? (
        <p className="text-ardoise-600">
          {demandes.length} résultat{demandes.length > 1 ? 's' : ''} pour
          <strong className="text-ardoise-950"> « {recherche} »</strong>
          {' · '}
          <Link href="/app" className="font-semibold text-atelier">Effacer</Link>
        </p>
      ) : (
        <div className="flex gap-2">
          <Onglet actif={!traitees} href="/app">À traiter</Onglet>
          <Onglet actif={traitees} href="/app?vue=traitees">Traitées</Onglet>
        </div>
      )}

      {demandes.length === 0 && (
        <p className="carte p-8 text-center text-ardoise-600">
          {recherche ? 'Rien ne correspond à cette recherche.'
            : traitees ? 'Rien encore.'
            : 'Aucune demande en attente. L’atelier est à jour.'}
        </p>
      )}

      <ul className="space-y-3">
        {demandes.map((d) => {
          const heures = (Date.now() - +new Date(d.created_at)) / 3_600_000;
          const urgent = d.statut === 'nouvelle' && heures >= 12;
          return (
            <li key={d.id}>
              <Link href={`/app/demandes/${d.id}`}
                className={`block carte overflow-hidden p-4 ${
                  urgent ? 'border-l-[6px] border-l-alerte' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-lg font-bold tracking-wide text-ardoise-950">
                      {d.vehicule_immat}
                    </p>
                    <p className="truncate text-ardoise-800">
                      {d.description_libre
                        ?? `${d.prestation_ids.length} prestation${d.prestation_ids.length > 1 ? 's' : ''}`}
                    </p>
                    <p className="mt-0.5 text-[0.9375rem] text-ardoise-600">
                      {d.client_nom} · {depuis(d.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <PastilleStatut statut={d.statut} />
                    <span className="font-mono text-[0.8125rem] text-ardoise-400">
                      {d.reference}
                    </span>
                  </div>
                </div>

                {(urgent || d.creneaux_souhaites[0]) && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ardoise-100 pt-2.5 text-[0.9375rem]">
                    {urgent && (
                      <span className="font-bold text-[#6b4f00]">
                        Sans réponse depuis {Math.floor(heures)} h
                      </span>
                    )}
                    {d.creneaux_souhaites[0] && (
                      <span className="text-ardoise-600">
                        souhaite {jourCourt(d.creneaux_souhaites[0].debut)} à {heure(d.creneaux_souhaites[0].debut)}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Onglet({ href, actif, children }: {
  href: string; actif: boolean; children: React.ReactNode;
}) {
  return (
    <Link href={href} aria-current={actif ? 'page' : undefined}
      className={`bouton flex-1 ${actif
        ? 'bg-ardoise-950 text-white' : 'bouton-sobre'}`}>
      {children}
    </Link>
  );
}
