'use client';

import { useState } from 'react';
import { terminer } from '@/app/app/demandes/actions';

/**
 * Le dernier geste du garage : dire que la voiture est prête.
 *
 * En deux temps, et pas un bouton qui part au premier contact. Un téléphone
 * dans une poche de combinaison se touche tout seul, et ce bouton envoie un
 * SMS à un client — on ne reprend pas un SMS parti. Le second écran dit
 * exactement ce qui va se passer avant de le faire.
 */
export default function VoiturePrete({ id, immat }: { id: string; immat: string }) {
  const [confirme, setConfirme] = useState(false);

  if (!confirme) {
    return (
      <button type="button" className="bouton-principal w-full"
        onClick={() => setConfirme(true)}>
        La voiture est prête
      </button>
    );
  }

  return (
    <form action={terminer} className="bloc space-y-4 p-4">
      <input type="hidden" name="id" value={id} />
      <p className="font-semibold text-ardoise-950">
        Prévenir le client que sa {immat} est prête ?
      </p>
      <p className="text-[0.9375rem] text-ardoise-600">
        Il reçoit un SMS et un e-mail avec votre adresse et votre numéro.
        La demande passe en « terminée ».
      </p>
      <button className="bouton-principal w-full">Oui, prévenir le client</button>
      <button type="button" className="bouton-sobre w-full"
        onClick={() => setConfirme(false)}>
        Annuler
      </button>
    </form>
  );
}
