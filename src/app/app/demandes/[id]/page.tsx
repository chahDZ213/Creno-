import Link from 'next/link';
import { notFound } from 'next/navigation';
import ActionsDemande from '@/components/ActionsDemande';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
import { creneauLisible, depuis, duree as formatDuree } from '@/lib/format';
import {
  DUREE_DEPOT_MINUTES, LIBELLE_DEPOT, type Demande, type Prestation,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Fiche(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { garage } = await monGarage();
  const db = await serveur();

  const { data } = await db.from('demandes').select('*')
    .eq('id', id).eq('garage_id', garage.id).maybeSingle();
  if (!data) notFound();
  const demande = data as Demande;

  const { data: toutes } = await db.from('prestations').select('*')
    .eq('garage_id', garage.id);
  const choisies = ((toutes as Prestation[]) ?? [])
    .filter((p) => demande.prestation_ids.includes(p.id));
  const minutes = choisies.reduce((s, p) => s + p.duree_minutes, 0)
    || DUREE_DEPOT_MINUTES;

  const enAttente = demande.statut === 'nouvelle';

  return (
    <div className="space-y-5">
      <Link href="/app" className="inline-block font-semibold text-atelier underline">
        Retour aux demandes
      </Link>

      <div className="bloc p-4">
        <p className="font-mono text-2xl font-bold text-ardoise-950">
          {demande.vehicule_immat}
        </p>
        <p className="text-ardoise-800">
          {[demande.vehicule_marque, demande.vehicule_modele, demande.vehicule_annee]
            .filter(Boolean).join(' ')}
          {demande.vehicule_km ? ` · ${demande.vehicule_km.toLocaleString('fr-FR')} km` : ''}
        </p>
        <p className="mt-1 text-sm text-ardoise-600">
          Demande {demande.reference} · reçue {depuis(demande.created_at)}
        </p>
      </div>

      <div className="bloc p-4">
        <h2 className="font-bold text-ardoise-950">Ce qu’il faut faire</h2>
        {choisies.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {choisies.map((p) => (
              <li key={p.id} className="flex justify-between text-ardoise-800">
                <span>{p.libelle}</span>
                <span className="text-ardoise-600">{formatDuree(p.duree_minutes)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ardoise-800">{LIBELLE_DEPOT}</p>
        )}
        {demande.description_libre && (
          <p className="mt-3 border-l-4 border-ardoise-200 pl-3 italic text-ardoise-800">
            « {demande.description_libre} »
          </p>
        )}
        <p className="mt-3 font-semibold text-ardoise-950">
          Durée estimée {formatDuree(minutes)}
        </p>
      </div>

      <div className="bloc p-4">
        <h2 className="font-bold text-ardoise-950">Créneaux souhaités</h2>
        <ol className="mt-2 space-y-1">
          {demande.creneaux_souhaites.map((c, i) => (
            <li key={c.debut} className="text-ardoise-800">
              {i + 1}. {creneauLisible(c)}
            </li>
          ))}
        </ol>
      </div>

      <div className="bloc p-4">
        <h2 className="font-bold text-ardoise-950">{demande.client_nom}</h2>
        <p className="mt-2">
          <a href={`tel:${demande.client_tel}`}
            className="bouton-second w-full">Appeler {demande.client_tel}</a>
        </p>
        {demande.client_email && (
          <p className="mt-2 text-ardoise-800">{demande.client_email}</p>
        )}
        {demande.prefere_telephone && (
          <p className="mt-2 bg-alerte px-2 py-1 font-bold text-ardoise-950">
            Demande à être rappelé par téléphone
          </p>
        )}
      </div>

      {enAttente ? (
        <ActionsDemande id={demande.id}
          creneaux={demande.creneaux_souhaites} dureeEstimee={minutes} />
      ) : (
        <div className="bloc p-4">
          <p className="font-semibold text-ardoise-950">
            Déjà traitée : {demande.statut.replace('_', ' ')}
            {demande.motif_refus ? ` — ${demande.motif_refus}` : ''}
          </p>
          {demande.alternative && (
            <p className="mt-2 text-ardoise-800">
              Créneau proposé : {creneauLisible(demande.alternative)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
