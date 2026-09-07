'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { navigateur } from '@/lib/supabase/client';

function Formulaire() {
  const router = useRouter();
  const suite = useSearchParams().get('suite') ?? '/app';
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  async function entrer(e: React.FormEvent) {
    e.preventDefault();
    setOccupe(true); setErreur(null);
    const { error } = await navigateur().auth
      .signInWithPassword({ email, password: motDePasse });
    setOccupe(false);
    if (error) { setErreur('Email ou mot de passe incorrect.'); return; }
    router.replace(suite);
    router.refresh();
  }

  return (
    <form onSubmit={entrer} className="bloc mx-auto mt-12 max-w-sm p-6">
      <h1 className="text-2xl font-bold text-ardoise-950">Votre atelier</h1>
      <div className="mt-6 space-y-4">
        <div>
          <label className="etiquette" htmlFor="email">Email</label>
          <input id="email" type="email" className="champ" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="etiquette" htmlFor="mdp">Mot de passe</label>
          <input id="mdp" type="password" className="champ" autoComplete="current-password"
            value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
        </div>
        {erreur && <p role="alert" className="font-semibold text-refus">{erreur}</p>}
        <button className="bouton-principal w-full" disabled={occupe}>
          {occupe ? 'Connexion…' : 'Entrer'}
        </button>
      </div>
    </form>
  );
}

export default function Connexion() {
  return (
    <main className="px-5">
      <Suspense><Formulaire /></Suspense>
    </main>
  );
}
