'use client';

import { useState } from 'react';
import {
  Brouillon, ChampsContact, ChampsVehicule, ChoixBesoin, ChoixCreneaux,
  GaragePublic, Recapitulatif, brouillonVide, manquesDe,
} from './etapes';
import type { Gabarit, Prestation } from '@/lib/types';

const TITRES = ['Le besoin', 'Le véhicule', 'Les créneaux', 'Vos coordonnées'];

export default function PriseRendezVous({
  garage, prestations, gabarit,
}: { garage: GaragePublic; prestations: Prestation[]; gabarit: Gabarit }) {
  const [brouillon, setBrouillon] = useState<Brouillon>(brouillonVide);
  const [etape, setEtape] = useState(1);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const modifier = (p: Partial<Brouillon>) => setBrouillon((b) => ({ ...b, ...p }));
  const manques = manquesDe(brouillon);

  async function envoyer() {
    if (Object.keys(manques).length) {
      setEtape(Number(Object.keys(manques)[0]));
      setErreur(Object.values(manques)[0]);
      return;
    }
    setEnvoi(true); setErreur(null);
    try {
      const r = await fetch('/api/demandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: garage.slug, ...brouillon }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.erreur ?? 'Envoi impossible.');
      setReference(d.reference);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Envoi impossible.');
    } finally {
      setEnvoi(false);
    }
  }

  if (reference) return <Envoyee garage={garage} reference={reference} />;

  const besoin = (
    <ChoixBesoin garage={garage} prestations={prestations}
      brouillon={brouillon} modifier={modifier} />
  );
  const vehicule = <ChampsVehicule brouillon={brouillon} modifier={modifier} />;
  const creneaux = (
    <ChoixCreneaux garage={garage} brouillon={brouillon} modifier={modifier} />
  );
  const contact = <ChampsContact brouillon={brouillon} modifier={modifier} />;

  const bandeauErreur = erreur && (
    <p role="alert" className="border-l-4 border-refus bg-white p-4 font-semibold text-refus">
      {erreur}
    </p>
  );

  const envoiFinal = (
    <div className="space-y-4">
      <Recapitulatif garage={garage} prestations={prestations} brouillon={brouillon} />
      {bandeauErreur}
      <button type="button" onClick={envoyer} disabled={envoi}
        className="bouton-principal w-full">
        {envoi ? 'Envoi…' : 'Envoyer ma demande'}
      </button>
      <p className="text-center text-sm text-ardoise-600">
        Vous ne réservez pas encore : le garage confirme le créneau retenu.
      </p>
    </div>
  );

  /* ------------------------------------------------------------ compact */
  if (gabarit === 'compact') {
    return (
      <div className="space-y-10">
        {besoin}{vehicule}{creneaux}{contact}
        {envoiFinal}
      </div>
    );
  }

  /* ----------------------------------------------------------- colonnes */
  if (gabarit === 'colonnes') {
    return (
      <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:gap-10">
        {/* Sous 768 px, la colonne calendrier disparaît : on repasse en étapes. */}
        <div className="md:hidden">
          <Etapes {...{ brouillon, etape, setEtape, manques, besoin, vehicule, creneaux, contact, envoiFinal }} />
        </div>
        <div className="hidden space-y-10 md:block">
          {besoin}{vehicule}{contact}
        </div>
        <aside className="hidden md:block">
          <div className="lg:sticky lg:top-6 space-y-5">
            <ChoixCreneaux garage={garage} brouillon={brouillon}
              modifier={modifier} compact />
            {envoiFinal}
          </div>
        </aside>
      </div>
    );
  }

  /* ------------------------------------------------------------- etapes */
  return (
    <Etapes {...{ brouillon, etape, setEtape, manques, besoin, vehicule, creneaux, contact, envoiFinal }} />
  );
}

function Etapes({
  etape, setEtape, manques, besoin, vehicule, creneaux, contact, envoiFinal,
}: {
  brouillon: Brouillon; etape: number; setEtape: (n: number) => void;
  manques: Record<number, string>;
  besoin: React.ReactNode; vehicule: React.ReactNode;
  creneaux: React.ReactNode; contact: React.ReactNode; envoiFinal: React.ReactNode;
}) {
  const [tente, setTente] = useState(false);
  const ecrans = [besoin, vehicule, creneaux, contact];
  const bloque = manques[etape];

  return (
    <div>
      <ol className="mb-6 flex gap-1" aria-label="Progression">
        {TITRES.map((t, i) => (
          <li key={t} className="flex-1">
            <div className={`h-2 rounded-full ${i + 1 <= etape ? 'bg-atelier' : 'bg-ardoise-200'}`} />
            <span className={`mt-1 block text-xs ${i + 1 === etape ? 'font-bold text-ardoise-950' : 'text-ardoise-600'}`}>
              {t}
            </span>
          </li>
        ))}
      </ol>

      {ecrans[etape - 1]}

      {tente && bloque && (
        <p role="alert" className="mt-5 border-l-4 border-refus bg-white p-4 font-semibold text-refus">
          {bloque}
        </p>
      )}

      <div className="mt-8 flex gap-3">
        {etape > 1 && (
          <button type="button" className="bouton-sobre"
            onClick={() => { setTente(false); setEtape(etape - 1); }}>
            Retour
          </button>
        )}
        {etape < 4 && (
          <button type="button" className="bouton-principal flex-1"
            onClick={() => {
              if (bloque) { setTente(true); return; }
              setTente(false); setEtape(etape + 1);
            }}>
            Continuer
          </button>
        )}
      </div>

      {etape === 4 && <div className="mt-6">{envoiFinal}</div>}
    </div>
  );
}

function Envoyee({
  garage, reference,
}: { garage: GaragePublic; reference: string }) {
  return (
    <div className="bloc border-t-8 border-t-atelier p-6 text-center">
      <h2 className="text-3xl font-bold text-ardoise-950">Demande envoyée</h2>
      <p className="mt-3 text-lg text-ardoise-800">
        {garage.nom} a reçu votre demande et répond sous 24 h ouvrées.
        Vous recevrez un email dès que le créneau est fixé.
      </p>
      <p className="mt-6 text-ardoise-600">Numéro de suivi</p>
      <p className="font-mono text-3xl font-bold tracking-widest text-atelier">
        {reference}
      </p>
      <p className="mt-6 text-sm text-ardoise-600">
        Le rendez-vous n’est pas encore confirmé : c’est le garage qui retient
        l’un de vos créneaux.
      </p>
      {garage.telephone && (
        <p className="mt-4 text-ardoise-800">
          Urgent ? Appelez le <a className="font-semibold underline"
            href={`tel:${garage.telephone}`}>{garage.telephone}</a>.
        </p>
      )}
    </div>
  );
}
