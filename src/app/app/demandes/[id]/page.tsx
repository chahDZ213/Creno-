import Link from 'next/link';
import { notFound } from 'next/navigation';
import ActionsDemande from '@/components/ActionsDemande';
import VoiturePrete from '@/components/VoiturePrete';
import PastilleStatut from '@/components/Statut';
import { categoriesDe, coefficientDe, dureeAjustee, prixAjuste } from '@/lib/categories';
import { restitutionEstimee } from '@/lib/disponibilites';
import { creneauLisible, depuis, duree as formatDuree } from '@/lib/format';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
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
  /* Le client a choisi une catégorie : elle allonge le travail autant
     qu'elle en augmente le prix. L'atelier doit voir la durée ajustée, pas le
     tarif de base — c'est elle qui a servi à proposer les créneaux. */
  const coefficient = coefficientDe(garage, demande.categorie_vehicule);
  const categorie = categoriesDe(garage)
    .find((c) => c.cle === demande.categorie_vehicule) ?? null;
  const minutes = choisies.reduce(
    (s, p) => s + dureeAjustee(p.duree_minutes, coefficient), 0,
  ) || DUREE_DEPOT_MINUTES;

  const enAttente = demande.statut === 'nouvelle';
  // Rendez-vous accepté : il reste un geste, dire que la voiture est prête.
  const enAtelier = demande.statut === 'confirmee';

  return (
    <div className="space-y-4">
      <Link href="/app" className="inline-flex items-center gap-1 font-semibold text-atelier">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
        Demandes
      </Link>

      {/* ------------------------------------------------------- le véhicule */}
      <div className="carte p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-3xl font-bold tracking-wide text-ardoise-950">
            {demande.vehicule_immat}
          </p>
          <PastilleStatut statut={demande.statut} />
        </div>
        <p className="mt-1 text-ardoise-800">
          {[demande.vehicule_marque, demande.vehicule_modele, demande.vehicule_annee]
            .filter(Boolean).join(' ') || 'Véhicule non précisé'}
          {demande.vehicule_km
            ? ` · ${demande.vehicule_km.toLocaleString('fr-FR')} km` : ''}
        </p>
        <p className="mt-2 font-mono text-[0.875rem] text-ardoise-400">
          {demande.reference} · reçue {depuis(demande.created_at)}
        </p>
      </div>

      {/* --------------------------------------------------------- le besoin */}
      <div className="carte p-5">
        <h2 className="font-bold text-ardoise-950">Ce qu’il faut faire</h2>
        {choisies.length > 0 ? (
          <ul className="mt-2 divide-y divide-ardoise-100">
            {choisies.map((p) => (
              <li key={p.id} className="flex justify-between py-2 text-ardoise-800">
                <span>{p.libelle}</span>
                <span className="text-ardoise-600">
                  {garage.affiche_prix && p.prix_ttc != null && (
                    <span className="mr-3 font-semibold text-ardoise-800">
                      dès {prixAjuste(p.prix_ttc, coefficient)} €
                    </span>
                  )}
                  {formatDuree(dureeAjustee(p.duree_minutes, coefficient))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-ardoise-800">{LIBELLE_DEPOT}</p>
        )}
        {demande.description_libre && (
          <p className="mt-3 rounded-xl bg-ardoise-50 p-3 italic text-ardoise-800">
            « {demande.description_libre} »
          </p>
        )}
        <div className="mt-3 border-t border-ardoise-100 pt-3">
          <p className="font-bold text-ardoise-950">
            Durée estimée {formatDuree(minutes)}
          </p>
          {categorie && (
            <p className="mt-1 text-[0.9375rem] text-ardoise-600">
              {/* Dire le coefficient, pas seulement la catégorie : sinon le
                  garage voit une durée qui ne correspond à aucune ligne de son
                  catalogue et croit à une erreur. */}
              {categorie.libelle}
              {categorie.coefficient !== 1
                && ` — tarifs et durées × ${categorie.coefficient}`}
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ les créneaux */}
      <div className="carte p-5">
        <h2 className="font-bold text-ardoise-950">Créneaux souhaités</h2>
        <ol className="mt-2 space-y-2">
          {demande.creneaux_souhaites.map((c, i) => (
            <li key={c.debut} className="flex items-center gap-3 text-ardoise-800">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-atelier/10 text-[0.875rem] font-bold text-atelier">
                {i + 1}
              </span>
              <span className="capitalize">{creneauLisible(c)}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* -------------------------------------------------------- le contact */}
      <div className="carte p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-ardoise-950">{demande.client_nom}</h2>
          <Link href={`/app/clients/${encodeURIComponent(demande.client_tel)}`}
            className="shrink-0 text-[0.9375rem] font-semibold text-atelier">
            Son historique
          </Link>
        </div>
        {demande.prefere_telephone && (
          <p className="badge-attente mt-2">Souhaite être rappelé</p>
        )}
        <a href={`tel:${demande.client_tel}`} className="bouton-second mt-3 w-full">
          Appeler {demande.client_tel}
        </a>
        {demande.client_email && (
          <p className="mt-2 break-all text-[0.9375rem] text-ardoise-600">
            {demande.client_email}
          </p>
        )}
      </div>

      {enAttente ? (
        <ActionsDemande id={demande.id}
          creneaux={demande.creneaux_souhaites} dureeEstimee={minutes}
          restitutionProposee={restitutionEstimee(
            garage,
            new Date(demande.creneaux_souhaites[0]?.debut ?? Date.now()),
            minutes,
          )} />
      ) : enAtelier ? (
        <VoiturePrete id={demande.id} immat={demande.vehicule_immat} />
      ) : (
        <div className="carte p-5">
          <p className="font-semibold text-ardoise-950">
            Déjà traitée{demande.motif_refus ? ` — ${demande.motif_refus}` : ''}
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
