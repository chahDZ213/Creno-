import Link from 'next/link';
import { serveur } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Le second bouton montrait `/garage-ducret`, écrit en dur : le garage du jeu
 * de démonstration. Une remise à zéro, un renommage, un premier vrai client, et
 * le lien pointait vers une page qui n'existe plus — sur la page d'accueil,
 * c'est-à-dire le premier écran que voit un visiteur.
 *
 * On va donc chercher un garage réellement installé. S'il n'y en a aucun, le
 * bouton disparaît plutôt que de promettre une démonstration absente.
 */
async function garageAMontrer(): Promise<{ slug: string; nom: string } | null> {
  try {
    // Clé anon, pas service_role : `garages` est lisible publiquement par la
    // RLS — la page `/[slug]` en dépend. Rien ici ne justifie de contourner.
    const db = await serveur();
    const { data } = await db
      .from('garages').select('slug, nom')
      .neq('horaires', '{}')
      .order('created_at', { ascending: true })
      .limit(1).maybeSingle();
    return data ?? null;
  } catch {
    return null;   // sans base, la page d'accueil doit rester affichable
  }
}

export default async function Accueil() {
  const vitrine = await garageAMontrer();

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-sm font-bold uppercase tracking-wide text-atelier">Créno</p>
      <h1 className="mt-3 text-4xl font-bold leading-tight text-ardoise-950">
        Vos clients demandent un rendez-vous à 3 h du matin.
        <br />Vous répondez au café.
      </h1>
      <p className="mt-5 text-lg text-ardoise-800">
        Une page de prise de rendez-vous pour votre garage, un lien à coller sur
        votre vitrine, et une demande qui vous arrive par SMS avec la plaque et
        le motif. Vous validez en dix secondes depuis votre téléphone.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/app" className="bouton-principal">Accéder à mon atelier</Link>
        {vitrine && (
          <Link href={`/${vitrine.slug}`} className="bouton-second">
            Voir la page de {vitrine.nom}
          </Link>
        )}
      </div>
    </main>
  );
}
