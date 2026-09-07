import { NextResponse } from 'next/server';
import { notifierConfirmation } from '@/lib/notifications';
import { admin } from '@/lib/supabase/admin';
import type { Creneau, Demande, Garage } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Le client accepte ou refuse le créneau proposé par le garage. */
export async function POST(
  requete: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const { reponse } = await requete.json().catch(() => ({ reponse: null }));
  if (reponse !== 'accepte' && reponse !== 'refuse') {
    return NextResponse.json({ erreur: 'Réponse inattendue.' }, { status: 400 });
  }

  const db = admin();
  const { data } = await db.from('demandes').select('*')
    .eq('token_suivi', token).maybeSingle();
  const demande = data as Demande | null;
  if (!demande) return NextResponse.json({ erreur: 'Lien inconnu.' }, { status: 404 });
  if (demande.statut !== 'alternative_proposee') {
    return NextResponse.json({ erreur: 'Plus rien à décider ici.' }, { status: 409 });
  }

  if (reponse === 'refuse') {
    await db.from('demandes').update({ statut: 'annulee' }).eq('id', demande.id);
    return NextResponse.json({ statut: 'annulee' });
  }

  const creneau = demande.alternative as Creneau;
  await db.from('rendez_vous').insert({
    garage_id: demande.garage_id, demande_id: demande.id,
    debut: creneau.debut, fin: creneau.fin, type: 'rdv',
    libelle: `${demande.vehicule_immat} — ${demande.client_nom}`,
  });
  await db.from('demandes').update({ statut: 'confirmee' }).eq('id', demande.id);

  const { data: g } = await db.from('garages').select('*')
    .eq('id', demande.garage_id).single();
  await notifierConfirmation(g as Garage, demande, creneau);
  return NextResponse.json({ statut: 'confirmee' });
}
