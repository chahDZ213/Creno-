import Link from 'next/link';
import { jourCourt } from '@/lib/format';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
import type { Demande } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Fiche = {
  tel: string; nom: string; passages: number;
  immats: string[]; dernier: string;
};

/** Le carnet du garage : qui est passé, avec quoi, et quand. */
export default async function Clients(
  { searchParams }: { searchParams: Promise<{ q?: string }> },
) {
  const { q } = await searchParams;
  const recherche = (q ?? '').trim().toLowerCase();
  const { garage } = await monGarage();
  const db = await serveur();

  const { data } = await db.from('demandes')
    .select('client_nom, client_tel, vehicule_immat, created_at, statut')
    .eq('garage_id', garage.id)
    .order('created_at', { ascending: false })
    .limit(500);

  // Le téléphone fait office d'identité : c'est ce que le garagiste connaît
  // d'un client, et ça ne change pas quand il change de voiture.
  const carte = new Map<string, Fiche>();
  for (const d of (data as Demande[]) ?? []) {
    const cle = d.client_tel.replace(/\s+/g, '');
    const f = carte.get(cle);
    if (f) {
      f.passages += 1;
      if (!f.immats.includes(d.vehicule_immat)) f.immats.push(d.vehicule_immat);
    } else {
      carte.set(cle, {
        tel: cle, nom: d.client_nom, passages: 1,
        immats: [d.vehicule_immat], dernier: d.created_at,
      });
    }
  }

  let clients = [...carte.values()]
    .sort((a, b) => b.dernier.localeCompare(a.dernier));

  if (recherche) {
    clients = clients.filter((c) =>
      c.nom.toLowerCase().includes(recherche)
      || c.tel.includes(recherche.replace(/\s+/g, ''))
      || c.immats.some((i) => i.toLowerCase().includes(recherche)));
  }

  return (
    <div className="space-y-4">
      <h1 className="titre-ecran">Clients</h1>

      <form action="/app/clients" className="flex gap-2">
        <input name="q" defaultValue={q ?? ''} className="champ flex-1"
          placeholder="Nom, téléphone, plaque…"
          aria-label="Rechercher un client" autoComplete="off" enterKeyHint="search" />
        <button className="bouton-principal px-4" aria-label="Rechercher">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" />
          </svg>
        </button>
      </form>

      {clients.length === 0 && (
        <p className="carte p-8 text-center text-ardoise-600">
          {recherche ? 'Personne ne correspond.' : 'Aucun client pour l’instant.'}
        </p>
      )}

      <ul className="space-y-3">
        {clients.map((c) => (
          <li key={c.tel}>
            <Link href={`/app/clients/${encodeURIComponent(c.tel)}`}
              className="flex carte items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-atelier/10 text-lg font-bold text-atelier">
                {c.nom.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-ardoise-950">{c.nom}</span>
                <span className="block truncate font-mono text-[0.9375rem] text-ardoise-600">
                  {c.immats.join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-bold text-ardoise-950">
                  {c.passages} passage{c.passages > 1 ? 's' : ''}
                </span>
                <span className="block text-[0.8125rem] text-ardoise-600">
                  dernier {jourCourt(c.dernier)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
