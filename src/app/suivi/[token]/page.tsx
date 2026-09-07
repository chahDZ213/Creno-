import { notFound } from 'next/navigation';
import ReponseAlternative from '@/components/ReponseAlternative';
import { variables } from '@/lib/couleur';
import { creneauLisible, depuis } from '@/lib/format';
import { admin } from '@/lib/supabase/admin';
import type { Creneau, Statut } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Suivi de ma demande — Créno' };

type Suivi = {
  reference: string; statut: Statut; motif_refus: string | null;
  message_garage: string | null; creneaux_souhaites: Creneau[];
  alternative: Creneau | null; description_libre: string | null;
  vehicule_immat: string; created_at: string; repondu_at: string | null;
  garage_nom: string; garage_telephone: string | null;
  garage_couleur: string; garage_slug: string;
};

const MESSAGE: Record<Statut, string> = {
  nouvelle: 'Votre demande est arrivée au garage. Réponse sous 24 h ouvrées.',
  confirmee: 'Votre rendez-vous est confirmé.',
  alternative_proposee: 'Le garage vous propose un autre créneau.',
  refusee: 'Le garage ne peut pas donner suite.',
  annulee: 'Cette demande est annulée.',
  terminee: 'Le passage à l’atelier est terminé.',
};

export default async function Suivi(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { data } = await admin().rpc('demande_par_token', { p_token: token });
  const d = (data as Suivi[] | null)?.[0];
  if (!d) notFound();

  const rdv = d.statut === 'confirmee'
    ? (d.alternative ?? d.creneaux_souhaites[0]) : null;

  return (
    <div style={variables(d.garage_couleur)} className="mx-auto max-w-lg px-5 py-8">
      <p className="text-sm text-ardoise-600">{d.garage_nom}</p>
      <h1 className="mt-1 text-2xl font-bold text-ardoise-950">
        Demande {d.reference}
      </h1>
      <p className="font-mono text-lg text-ardoise-800">{d.vehicule_immat}</p>

      <p className="mt-5 border-l-4 border-atelier bg-white p-4 text-lg text-ardoise-950">
        {MESSAGE[d.statut]}
      </p>

      {rdv && (
        <p className="mt-4 bloc p-4 text-lg font-semibold text-ardoise-950">
          {creneauLisible(rdv)}
        </p>
      )}

      {d.statut === 'alternative_proposee' && d.alternative && (
        <div className="mt-5">
          <ReponseAlternative token={token} creneau={d.alternative}
            message={d.message_garage} />
        </div>
      )}

      {d.statut === 'refusee' && d.motif_refus && (
        <p className="mt-4 text-ardoise-800">Motif : {d.motif_refus}</p>
      )}

      {d.statut === 'nouvelle' && (
        <div className="mt-5">
          <h2 className="font-bold text-ardoise-950">Créneaux demandés</h2>
          <ol className="mt-2 space-y-1 text-ardoise-800">
            {d.creneaux_souhaites.map((c, i) => (
              <li key={c.debut}>{i + 1}. {creneauLisible(c)}</li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-6 text-sm text-ardoise-600">
        Demande envoyée {depuis(d.created_at)}.
      </p>
      {d.garage_telephone && (
        <p className="mt-2 text-ardoise-800">
          Une question ? <a className="font-semibold underline"
            href={`tel:${d.garage_telephone}`}>{d.garage_telephone}</a>
        </p>
      )}
    </div>
  );
}
