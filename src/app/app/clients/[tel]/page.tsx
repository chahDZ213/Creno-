import Link from 'next/link';
import { notFound } from 'next/navigation';
import PastilleStatut from '@/components/Statut';
import { creneauLisible, duree as formatDuree, jourLong } from '@/lib/format';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
import {
  LIBELLE_DEPOT, type Demande, type Prestation, type RendezVous,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

/** L'historique d'un client : ses véhicules, ses passages, ce qui a été fait. */
export default async function FicheClient(
  { params }: { params: Promise<{ tel: string }> },
) {
  const { tel } = await params;
  const telephone = decodeURIComponent(tel);
  const { garage } = await monGarage();
  const db = await serveur();

  const { data } = await db.from('demandes').select('*')
    .eq('garage_id', garage.id)
    .eq('client_tel', telephone)
    .order('created_at', { ascending: false });
  const demandes = (data as Demande[]) ?? [];
  if (demandes.length === 0) notFound();

  const { data: p } = await db.from('prestations').select('*')
    .eq('garage_id', garage.id);
  const catalogue = new Map(
    ((p as Prestation[]) ?? []).map((x) => [x.id, x]),
  );

  const { data: r } = await db.from('rendez_vous').select('*')
    .eq('garage_id', garage.id)
    .in('demande_id', demandes.map((d) => d.id));
  const rdvParDemande = new Map(
    ((r as RendezVous[]) ?? []).map((x) => [x.demande_id, x]),
  );

  const client = demandes[0];
  const immats = [...new Set(demandes.map((d) => d.vehicule_immat))];
  const venues = demandes.filter(
    (d) => d.statut === 'confirmee' || d.statut === 'terminee',
  ).length;

  return (
    <div className="space-y-5">
      <Link href="/app/clients" className="inline-flex items-center gap-1 font-semibold text-atelier">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
        Clients
      </Link>

      <div className="carte p-5">
        <h1 className="titre-ecran">{client.client_nom}</h1>
        <a href={`tel:${client.client_tel}`}
          className="mt-1 inline-block font-semibold text-atelier">
          {client.client_tel}
        </a>
        {client.client_email && (
          <p className="mt-1 break-all text-ardoise-600">{client.client_email}</p>
        )}
        <div className="mt-4 flex gap-6 border-t border-ardoise-100 pt-3">
          <span>
            <span className="block text-2xl font-bold text-ardoise-950">{demandes.length}</span>
            <span className="text-[0.9375rem] text-ardoise-600">demande{demandes.length > 1 ? 's' : ''}</span>
          </span>
          <span>
            <span className="block text-2xl font-bold text-ardoise-950">{venues}</span>
            <span className="text-[0.9375rem] text-ardoise-600">passage{venues > 1 ? 's' : ''} à l’atelier</span>
          </span>
        </div>
      </div>

      <section>
        <h2 className="mb-2 font-bold text-ardoise-950">
          Véhicule{immats.length > 1 ? 's' : ''}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {immats.map((i) => {
            const d = demandes.find((x) => x.vehicule_immat === i)!;
            return (
              <li key={i} className="carte px-3 py-2">
                <span className="font-mono font-bold text-ardoise-950">{i}</span>
                <span className="ml-2 text-[0.9375rem] text-ardoise-600">
                  {[d.vehicule_marque, d.vehicule_modele, d.vehicule_annee]
                    .filter(Boolean).join(' ') || '—'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-bold text-ardoise-950">Historique</h2>
        <ol className="space-y-3">
          {demandes.map((d) => {
            const rdv = rdvParDemande.get(d.id);
            const libelles = d.prestation_ids
              .map((id) => catalogue.get(id)?.libelle)
              .filter(Boolean) as string[];
            const minutes = d.prestation_ids
              .reduce((s, id) => s + (catalogue.get(id)?.duree_minutes ?? 0), 0);
            return (
              <li key={d.id}>
                <Link href={`/app/demandes/${d.id}`} className="block carte p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold capitalize text-ardoise-950">
                      {rdv ? jourLong(rdv.debut) : jourLong(d.created_at)}
                    </span>
                    <PastilleStatut statut={d.statut} />
                  </div>
                  <p className="mt-1 text-ardoise-800">
                    {libelles.length ? libelles.join(', ') : LIBELLE_DEPOT}
                    {minutes > 0 && (
                      <span className="text-ardoise-600"> · {formatDuree(minutes)}</span>
                    )}
                  </p>
                  {d.description_libre && (
                    <p className="mt-1 border-l-2 border-ardoise-200 pl-2 italic text-ardoise-600">
                      « {d.description_libre} »
                    </p>
                  )}
                  <p className="mt-2 flex flex-wrap gap-x-3 text-[0.875rem] text-ardoise-600">
                    <span className="font-mono">{d.vehicule_immat}</span>
                    <span className="font-mono">{d.reference}</span>
                    {rdv && <span>rendez-vous {creneauLisible(rdv)}</span>}
                    {d.motif_refus && <span>{d.motif_refus}</span>}
                  </p>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
