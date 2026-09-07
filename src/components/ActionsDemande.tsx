'use client';

import { useState } from 'react';
import { confirmer, proposerAlternative, refuser } from '@/app/app/demandes/actions';
import { MOTIFS_REFUS } from '@/lib/defauts';
import { creneauLisible, duree as formatDuree } from '@/lib/format';
import type { Creneau } from '@/lib/types';

type Action = 'confirmer' | 'proposer' | 'refuser' | null;

export default function ActionsDemande({
  id, creneaux, dureeEstimee,
}: { id: string; creneaux: Creneau[]; dureeEstimee: number }) {
  const [action, setAction] = useState<Action>(null);
  const [retenu, setRetenu] = useState(creneaux[0]?.debut ?? '');

  if (action === null) {
    return (
      <div className="space-y-3">
        <button className="bouton-principal w-full" onClick={() => setAction('confirmer')}>
          Confirmer un créneau
        </button>
        <button className="bouton-second w-full" onClick={() => setAction('proposer')}>
          Proposer un autre créneau
        </button>
        <button
          className="bouton w-full border-2 border-refus bg-white text-refus"
          onClick={() => setAction('refuser')}>
          Refuser
        </button>
      </div>
    );
  }

  const retour = (
    <button type="button" className="bouton-sobre w-full" onClick={() => setAction(null)}>
      Annuler
    </button>
  );

  if (action === 'confirmer') {
    return (
      <form action={confirmer} className="bloc space-y-4 p-4">
        <input type="hidden" name="id" value={id} />
        <h3 className="font-bold text-ardoise-950">Quel créneau retenez-vous ?</h3>
        <ul className="space-y-2">
          {creneaux.map((c, i) => (
            <li key={c.debut}>
              <label className="flex min-h-tactile cursor-pointer items-center gap-3 border-2 border-ardoise-200 px-3 py-2 has-[:checked]:border-atelier">
                <input type="radio" name="debut" value={c.debut} required
                  className="h-6 w-6 accent-atelier"
                  checked={retenu === c.debut}
                  onChange={() => setRetenu(c.debut)} />
                <span className="font-semibold">{i + 1}. {creneauLisible(c)}</span>
              </label>
            </li>
          ))}
        </ul>
        <ChampDuree defaut={dureeEstimee} />
        <button className="bouton-principal w-full">Confirmer le rendez-vous</button>
        {retour}
      </form>
    );
  }

  if (action === 'proposer') {
    return (
      <form action={proposerAlternative} className="bloc space-y-4 p-4">
        <input type="hidden" name="id" value={id} />
        <h3 className="font-bold text-ardoise-950">Quand pouvez-vous le prendre ?</h3>
        <div>
          <label className="etiquette" htmlFor="creneau">Date et heure</label>
          <input id="creneau" name="creneau" type="datetime-local" required
            className="champ" step={900} />
        </div>
        <ChampDuree defaut={dureeEstimee} />
        <div>
          <label className="etiquette" htmlFor="message">Mot pour le client (facultatif)</label>
          <input id="message" name="message" className="champ" maxLength={140}
            placeholder="Le pont est pris demain matin." />
        </div>
        <button className="bouton-principal w-full">Envoyer la proposition</button>
        {retour}
      </form>
    );
  }

  return (
    <form action={refuser} className="bloc space-y-4 p-4">
      <input type="hidden" name="id" value={id} />
      <h3 className="font-bold text-ardoise-950">Pourquoi ?</h3>
      <ul className="space-y-2">
        {MOTIFS_REFUS.map((m) => (
          <li key={m}>
            <label className="flex min-h-tactile cursor-pointer items-center gap-3 border-2 border-ardoise-200 px-3 py-2 has-[:checked]:border-refus">
              <input type="radio" name="motif" value={m} required
                className="h-6 w-6 accent-refus" />
              <span className="font-semibold">{m}</span>
            </label>
          </li>
        ))}
      </ul>
      <button className="bouton w-full bg-refus text-white">
        Refuser et prévenir le client
      </button>
      {retour}
    </form>
  );
}

function ChampDuree({ defaut }: { defaut: number }) {
  return (
    <div>
      <label className="etiquette" htmlFor="duree">
        Durée à bloquer — estimée {formatDuree(defaut)}
      </label>
      <input id="duree" name="duree_minutes" type="number" min={15} step={15}
        defaultValue={defaut} className="champ" inputMode="numeric" />
    </div>
  );
}
