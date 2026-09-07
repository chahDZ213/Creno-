'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { creneauLisible } from '@/lib/format';
import type { Creneau } from '@/lib/types';

export default function ReponseAlternative({
  token, creneau, message,
}: { token: string; creneau: Creneau; message: string | null }) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function repondre(reponse: 'accepte' | 'refuse') {
    setOccupe(true); setErreur(null);
    const r = await fetch(`/api/suivi/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reponse }),
    });
    setOccupe(false);
    if (!r.ok) { setErreur((await r.json()).erreur ?? 'Impossible.'); return; }
    router.refresh();
  }

  return (
    <div className="bloc border-t-8 border-t-atelier p-5">
      <h2 className="text-xl font-bold text-ardoise-950">
        Le garage vous propose un autre créneau
      </h2>
      <p className="mt-2 text-lg font-semibold text-ardoise-950">
        {creneauLisible(creneau)}
      </p>
      {message && <p className="mt-2 italic text-ardoise-800">« {message} »</p>}
      {erreur && <p role="alert" className="mt-3 font-semibold text-refus">{erreur}</p>}
      <div className="mt-5 space-y-3">
        <button className="bouton-principal w-full" disabled={occupe}
          onClick={() => repondre('accepte')}>
          Ça me va, je prends
        </button>
        <button className="bouton-second w-full" disabled={occupe}
          onClick={() => repondre('refuse')}>
          Ça ne m’arrange pas
        </button>
      </div>
    </div>
  );
}
