'use server';

import { revalidatePath } from 'next/cache';
import { slugifier } from '@/lib/slug';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
import type { Gabarit, Horaires } from '@/lib/types';

export type Installation = {
  nom: string; slug: string;
  adresse: string; telephone: string; email: string;
  horaires: Horaires;
  nb_postes: number; delai_min_heures: number; horizon_jours: number;
  prestations: Array<{ libelle: string; duree_minutes: number; prix_ttc: number | null }>;
  affiche_prix: boolean; taux_horaire_ttc: number | null;
  couleur_primaire: string; gabarit: Gabarit;
};

const texte = (v: string) => { const s = (v ?? '').trim(); return s || null; };

/**
 * Enregistre les réponses du parcours, en une fois.
 *
 * En une fois, et pas question par question : un garage à demi configuré est
 * pire que pas configuré du tout. Sa page publique serait en ligne avec des
 * horaires mais sans prestations, et un client pourrait y déposer une demande
 * que le garage ne verrait jamais puisqu'il n'a pas fini de s'installer.
 *
 * Les horaires font aussi office de marqueur de fin : tant qu'ils valent `{}`,
 * l'application renvoie ici. Pas de colonne supplémentaire pour ça — un garage
 * qui ferme tous ses jours écrit `{"lundi":null,…}`, ce qui n'est pas `{}`.
 * Les deux situations restent donc distinctes.
 */
export async function terminerInstallation(reponses: Installation) {
  const { garage } = await monGarage();
  const db = await serveur();

  const nom = texte(reponses.nom) ?? 'Mon garage';
  const voulu = slugifier(reponses.slug || nom);

  /* Le slug est unique en base. Plutôt que de renvoyer le garagiste à son
     clavier avec « cette adresse est prise », on suffixe : mon-garage,
     mon-garage-2, mon-garage-3. */
  let slug = voulu;
  for (let n = 2; n < 60; n++) {
    const { data } = await db.from('garages')
      .select('id').eq('slug', slug).maybeSingle();
    if (!data || data.id === garage.id) break;
    slug = `${voulu}-${n}`;
  }

  const { error } = await db.from('garages').update({
    nom,
    slug,
    adresse: texte(reponses.adresse),
    telephone: texte(reponses.telephone),
    email: texte(reponses.email),
    horaires: reponses.horaires,
    nb_postes: Math.max(1, Math.round(reponses.nb_postes)),
    delai_min_heures: Math.max(0, Math.round(reponses.delai_min_heures)),
    horizon_jours: Math.min(90, Math.max(1, Math.round(reponses.horizon_jours))),
    affiche_prix: reponses.affiche_prix,
    taux_horaire_ttc: reponses.taux_horaire_ttc,
    couleur_primaire: reponses.couleur_primaire,
    gabarit: reponses.gabarit,
  }).eq('id', garage.id);
  if (error) return { erreur: error.message };

  /* Le catalogue est réécrit : le parcours ne sert qu'une fois, et le garage
     n'a encore rien à conserver. Les retouches passeront par les réglages. */
  await db.from('prestations').delete().eq('garage_id', garage.id);
  if (reponses.prestations.length) {
    const { error: e2 } = await db.from('prestations').insert(
      reponses.prestations.map((p, i) => ({
        garage_id: garage.id,
        libelle: p.libelle,
        duree_minutes: Math.max(5, Math.round(p.duree_minutes)),
        prix_ttc: p.prix_ttc,
        ordre: i,
        active: true,
      })),
    );
    if (e2) return { erreur: e2.message };
  }

  revalidatePath('/app', 'layout');
  revalidatePath(`/${slug}`);
  return { slug };
}
