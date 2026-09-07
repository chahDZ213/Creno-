import Link from 'next/link';
import { ajouterBlocage, supprimerBlocage } from './actions';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
import { FUSEAU, instant, parties } from '@/lib/disponibilites';
import { heure, jourLong } from '@/lib/format';
import type { RendezVous } from '@/lib/types';

export const dynamic = 'force-dynamic';

const pad = (n: number) => String(n).padStart(2, '0');
const cle = (d: Date) => {
  const p = parties(d, FUSEAU);
  return `${p.annee}-${pad(p.mois)}-${pad(p.jour)}`;
};

export default async function Planning(
  { searchParams }: { searchParams: Promise<{ semaine?: string }> },
) {
  const { semaine } = await searchParams;
  const { garage } = await monGarage();
  const db = await serveur();

  const decalage = Number(semaine ?? 0) || 0;
  const p = parties(new Date(), FUSEAU);
  const lundi = new Date(
    instant(p.annee, p.mois, p.jour, 0, 0).getTime()
    + (decalage * 7 - p.jourSemaine) * 86_400_000,
  );
  const dimancheSoir = new Date(lundi.getTime() + 7 * 86_400_000);

  const { data } = await db.from('rendez_vous').select('*')
    .eq('garage_id', garage.id)
    .gte('debut', lundi.toISOString())
    .lt('debut', dimancheSoir.toISOString())
    .order('debut');
  const evenements = (data as RendezVous[]) ?? [];

  const jours = Array.from({ length: 7 }, (_, i) => {
    const j = new Date(lundi.getTime() + i * 86_400_000 + 12 * 3_600_000);
    return { cle: cle(j), date: j };
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href={`/app/planning?semaine=${decalage - 1}`} className="bouton-sobre">
          Semaine précédente
        </Link>
        <Link href={`/app/planning?semaine=${decalage + 1}`} className="bouton-sobre ml-auto">
          Suivante
        </Link>
      </div>

      <ul className="space-y-3">
        {jours.map((j) => {
          const duJour = evenements.filter((e) => cle(new Date(e.debut)) === j.cle);
          return (
            <li key={j.cle} className="bloc p-4">
              <h2 className="font-bold capitalize text-ardoise-950">
                {jourLong(j.date.toISOString())}
              </h2>
              {duJour.length === 0 && (
                <p className="mt-1 text-ardoise-600">Rien de prévu.</p>
              )}
              <ul className="mt-2 space-y-2">
                {duJour.map((e) => (
                  <li key={e.id}
                    className={`flex items-center gap-3 border-l-4 py-1 pl-3 ${
                      e.type === 'blocage' ? 'border-ardoise-400' : 'border-atelier'}`}>
                    <span className="font-mono font-semibold text-ardoise-950">
                      {heure(e.debut)}–{heure(e.fin)}
                    </span>
                    <span className="flex-1 text-ardoise-800">{e.libelle}</span>
                    {e.type === 'blocage' && (
                      <form action={supprimerBlocage}>
                        <input type="hidden" name="id" value={e.id} />
                        <button className="min-h-tactile px-2 text-sm font-semibold text-ardoise-600 underline">
                          Retirer
                        </button>
                      </form>
                    )}
                    {e.demande_id && (
                      <Link href={`/app/demandes/${e.demande_id}`}
                        className="text-sm font-semibold text-atelier underline">
                        Fiche
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>

      <form action={ajouterBlocage} className="bloc space-y-4 p-4">
        <h2 className="font-bold text-ardoise-950">Bloquer du temps</h2>
        <p className="text-ardoise-600">
          Congés, véhicule déjà à l’atelier, rendez-vous pris au téléphone.
        </p>
        <div>
          <label className="etiquette" htmlFor="libelle">Quoi</label>
          <input id="libelle" name="libelle" className="champ"
            placeholder="Fourgon Mercier — immobilisé" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiquette" htmlFor="debut">Du</label>
            <input id="debut" name="debut" type="datetime-local" required
              className="champ" step={900} />
          </div>
          <div>
            <label className="etiquette" htmlFor="fin">Au</label>
            <input id="fin" name="fin" type="datetime-local" required
              className="champ" step={900} />
          </div>
        </div>
        <button className="bouton-principal w-full">Bloquer</button>
      </form>
    </div>
  );
}
