import { NextResponse } from 'next/server';
import { rappelVeille, relancerGarage } from '@/lib/notifications';
import { admin } from '@/lib/supabase/admin';
import type { Demande, Garage, RendezVous } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Tâche planifiée : rappel de la veille au client, relance au garage après
 * 12 h sans réponse.
 *
 * Appelée toutes les heures par le workflow GitHub Actions `rappels.yml`, et
 * une fois par jour par le cron Vercel qui sert de filet. Les deux peuvent
 * tomber en même temps sans dommage : chaque envoi est marqué en base, donc
 * un passage de plus ne renvoie rien.
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

  /*
   * Rappel de la veille : les rendez-vous qui commencent dans moins de
   * 26 heures et pas encore rappelés.
   *
   * L'unicité tient à `rappel_veille_at`, pas à la largeur de la fenêtre.
   * Auparavant la fenêtre faisait tout le travail (entre 23 et 25 heures
   * avant), ce qui supposait un passage toutes les deux heures : avec le cron
   * quotidien, seuls les rendez-vous du petit matin y tombaient et presque
   * personne n'était rappelé ; avec un passage horaire, le même client en
   * aurait reçu deux. Désormais le rappel part une fois, et un passage
   * manqué est rattrapé au suivant.
   *
   * La borne basse écarte les rendez-vous déjà passés ; celle du haut tient
   * le rappel à moins de 26 heures, c'est-à-dire la veille.
   */
  const { data: rdvs } = await db.from('rendez_vous').select('*')
    .eq('type', 'rdv')
    .is('rappel_veille_at', null)
    .gte('debut', new Date(maintenant).toISOString())
    .lt('debut', new Date(maintenant + 26 * 3_600_000).toISOString());

  for (const rdv of (rdvs as RendezVous[]) ?? []) {
    if (!rdv.demande_id) continue;
    const { data: d } = await db.from('demandes').select('*')
      .eq('id', rdv.demande_id).maybeSingle();
    const { data: g } = await db.from('garages').select('*')
      .eq('id', rdv.garage_id).maybeSingle();
    if (!d || !g) continue;
    await rappelVeille(g as Garage, d as Demande, { debut: rdv.debut, fin: rdv.fin });
    // Marqué même si l'envoi a échoué : mieux vaut un rappel manquant qu'une
    // boucle qui retente à chaque passage et finit par en envoyer dix.
    await db.from('rendez_vous')
      .update({ rappel_veille_at: new Date().toISOString() }).eq('id', rdv.id);
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
