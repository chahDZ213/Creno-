import { NextResponse } from 'next/server';
import { rappelVeille, relancerGarage } from '@/lib/notifications';
import { admin } from '@/lib/supabase/admin';
import type { Demande, Garage, RendezVous } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Tâche planifiée (Vercel Cron, une fois par heure) :
 * rappel J-1 au client, relance au garage après 12 h sans réponse.
 */
export async function GET(requete: Request) {
  const cle = process.env.CRENO_CLE_CRON;
  const entete = requete.headers.get('authorization');
  if (cle && entete !== `Bearer ${cle}`) {
    return NextResponse.json({ erreur: 'Refusé' }, { status: 401 });
  }

  const db = admin();
  const maintenant = Date.now();
  let rappels = 0;
  let relances = 0;

  // Rappel J-1 : les rendez-vous qui commencent dans 23 à 25 heures.
  const { data: rdvs } = await db.from('rendez_vous').select('*')
    .eq('type', 'rdv')
    .gte('debut', new Date(maintenant + 23 * 3_600_000).toISOString())
    .lt('debut', new Date(maintenant + 25 * 3_600_000).toISOString());

  for (const rdv of (rdvs as RendezVous[]) ?? []) {
    if (!rdv.demande_id) continue;
    const { data: d } = await db.from('demandes').select('*')
      .eq('id', rdv.demande_id).maybeSingle();
    const { data: g } = await db.from('garages').select('*')
      .eq('id', rdv.garage_id).maybeSingle();
    if (!d || !g) continue;
    await rappelVeille(g as Garage, d as Demande, { debut: rdv.debut, fin: rdv.fin });
    rappels++;
  }

  // Relance : une demande encore « nouvelle » douze heures après son arrivée.
  // `relance_12h_at` garantit qu'on ne harcèle pas le garagiste chaque heure.
  const { data: dormantes } = await db.from('demandes').select('*')
    .eq('statut', 'nouvelle')
    .is('relance_12h_at', null)
    .lt('created_at', new Date(maintenant - 12 * 3_600_000).toISOString());

  for (const d of (dormantes as Demande[]) ?? []) {
    const { data: g } = await db.from('garages').select('*')
      .eq('id', d.garage_id).maybeSingle();
    if (!g) continue;
    await relancerGarage(g as Garage, d);
    await db.from('demandes')
      .update({ relance_12h_at: new Date().toISOString() }).eq('id', d.id);
    relances++;
  }

  return NextResponse.json({ rappels, relances });
}
