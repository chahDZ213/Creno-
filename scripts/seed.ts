/**
 * Données de démonstration. `npm run seed`
 *
 * Un seul garage, crédible : c'est ce qu'on montre sur un téléphone à un
 * garagiste de la vallée, et « Garage Test 1 » le ferait décrocher en trois
 * secondes. Le compte de connexion est créé ici aussi — sinon le dashboard
 * n'est pas testable, et il faudrait le refaire à chaque remise à zéro.
 *
 * Exige SUPABASE_SERVICE_ROLE_KEY : le script écrit sous RLS désactivée.
 */
import { createClient } from '@supabase/supabase-js';
import { referenceCourte, tokenSuivi } from '../src/lib/reference';
import { instant } from '../src/lib/disponibilites';
import type { Gabarit, Horaires, Statut } from '../src/lib/types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !cle) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis.');
  process.exit(1);
}
const db = createClient(url, cle, { auth: { persistSession: false } });

const COMPTE = {
  email: process.env.CRENO_DEMO_EMAIL ?? 'patron@garage-ducret.fr',
  motDePasse: process.env.CRENO_DEMO_MOTDEPASSE ?? 'creno-demo-2026',
};

/* ------------------------------------------------------------- le garage */

const semaine = {
  ouverture: '07:30', fermeture: '18:30',
  pause: { debut: '12:00', fin: '13:30' },
};

const GARAGE: {
  slug: string; nom: string; adresse: string; telephone: string; email: string;
  couleur_primaire: string; gabarit: Gabarit; nb_postes: number;
  delai_min_heures: number; horizon_jours: number;
  taux_horaire_ttc: number; affiche_prix: boolean; horaires: Horaires;
} = {
  slug: 'garage-ducret',
  nom: 'Garage Ducret',
  adresse: '142 avenue de Genève, 74300 Cluses',
  telephone: '+33450981472',
  email: 'contact@garage-ducret.fr',
  couleur_primaire: '#1D4E89',
  gabarit: 'etapes',
  nb_postes: 2,
  delai_min_heures: 24,
  horizon_jours: 21,
  taux_horaire_ttc: 68,
  affiche_prix: true,
  horaires: {
    lundi: semaine, mardi: semaine, mercredi: semaine,
    jeudi: semaine, vendredi: semaine,
    samedi: { ouverture: '08:00', fermeture: '12:00', pause: null },
    dimanche: null,
  },
};

/**
 * Le catalogue courant, plus ce qu'on fait vraiment dans une vallée où on
 * roule sur la neige cinq mois par an. Valeurs de départ : le garage les
 * modifie ensuite depuis ses réglages.
 */
const CATALOGUE: Array<{ libelle: string; duree: number; prix: number | null }> = [
  { libelle: 'Vidange + filtres', duree: 45, prix: 89 },
  { libelle: 'Révision complète', duree: 120, prix: 189 },
  { libelle: 'Plaquettes avant', duree: 60, prix: 129 },
  { libelle: 'Plaquettes + disques avant', duree: 90, prix: 249 },
  { libelle: 'Permutation pneus été / hiver', duree: 45, prix: 45 },
  { libelle: 'Montage 4 pneus', duree: 60, prix: 60 },
  { libelle: 'Géométrie / parallélisme', duree: 60, prix: 69 },
  { libelle: 'Recharge climatisation', duree: 60, prix: 89 },
  { libelle: 'Purge liquide de frein', duree: 45, prix: 79 },
  { libelle: 'Remplacement batterie', duree: 30, prix: null },
  { libelle: 'Distribution', duree: 240, prix: 590 },
  { libelle: 'Embrayage', duree: 300, prix: null },
  { libelle: 'Préparation contrôle technique', duree: 60, prix: 49 },
  { libelle: 'Contre-visite', duree: 45, prix: 39 },
  { libelle: 'Diagnostic électronique', duree: 60, prix: 60 },
];

/* ----------------------------------------------------------- les demandes */

const CLIENTS = [
  ['Sophie Marchand', '+33612470118', 'sophie.marchand@exemple.fr', 'FA-421-KP', 'Peugeot', '308 SW', 2019, 87000],
  ['Karim Bensaïd', '+33683120945', 'k.bensaid@exemple.fr', 'DR-118-TV', 'Renault', 'Clio IV', 2016, 143000],
  ['Nathalie Perrin', '+33627583014', 'n.perrin@exemple.fr', '4871 XY 74', 'Citroën', 'Berlingo', 2011, 218000],
  ['Thomas Vuillermoz', '+33645902317', 't.vuillermoz@exemple.fr', 'GH-903-BN', 'Volkswagen', 'Tiguan', 2018, 96000],
  ['Awa Diallo', '+33698214470', 'awa.diallo@exemple.fr', 'HL-227-XC', 'Toyota', 'Yaris Cross', 2022, 31000],
  ['Julien Pastor', '+33607331852', 'j.pastor@exemple.fr', 'CT-664-RM', 'Dacia', 'Duster', 2017, 128000],
  ['Claire Fontaine', '+33632084196', 'claire.fontaine@exemple.fr', 'EN-540-JD', 'Ford', 'Kuga', 2015, 161000],
  ['Marc Ollivier', '+33689417203', 'm.ollivier@exemple.fr', '2094 AH 74', 'Opel', 'Corsa', 2013, 174000],
  ['Léa Chevalier', '+33614772938', 'lea.chevalier@exemple.fr', 'JK-305-WF', 'Fiat', '500', 2020, 44000],
  ['Bruno Teixeira', '+33676203514', 'b.teixeira@exemple.fr', 'BP-782-LQ', 'Skoda', 'Octavia', 2014, 189000],
] as const;

const PLAN: Array<{
  statut: Statut; presta: string[]; libre?: string; age: number;
  motif?: string;
}> = [
  { statut: 'nouvelle', presta: ['Permutation pneus été / hiver'], age: 2 },
  { statut: 'nouvelle', presta: [], libre: 'Elle démarre plus le matin, ça tourne mais ça part pas', age: 5 },
  { statut: 'nouvelle', presta: ['Plaquettes avant'], libre: 'Ça grince à l\'avant droit en descente', age: 14 },
  { statut: 'nouvelle', presta: ['Vidange + filtres', 'Préparation contrôle technique'], age: 31 },
  { statut: 'confirmee', presta: ['Révision complète'], age: 48 },
  { statut: 'confirmee', presta: ['Recharge climatisation'], age: 62 },
  { statut: 'alternative_proposee', presta: ['Distribution'], age: 26 },
  { statut: 'refusee', presta: ['Embrayage'], age: 74, motif: 'Atelier complet sur la période' },
  { statut: 'terminee', presta: ['Contre-visite'], age: 210 },
  { statut: 'annulee', presta: ['Diagnostic électronique'], libre: 'Voyant moteur orange depuis le col', age: 150 },
];

/* ------------------------------------------------------------------ seed */

const heures = (n: number) => new Date(Date.now() + n * 3_600_000);

/** Le lendemain à telle heure d'atelier. */
function demain(h: number): string {
  const d = new Date(Date.now() + 86_400_000);
  return instant(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), h, 0)
    .toISOString();
}

/** Crée le compte de connexion, ou retrouve celui qui existe déjà. */
async function compteDemo(): Promise<string> {
  const { data, error } = await db.auth.admin.createUser({
    email: COMPTE.email,
    password: COMPTE.motDePasse,
    email_confirm: true,
  });
  if (!error && data.user) return data.user.id;

  const { data: liste } = await db.auth.admin.listUsers({ perPage: 1000 });
  const existant = liste?.users.find((u) => u.email === COMPTE.email);
  if (!existant) throw error ?? new Error('Compte de démonstration introuvable');

  // Le mot de passe est réaligné : le seed reste la source de vérité.
  await db.auth.admin.updateUserById(existant.id, { password: COMPTE.motDePasse });
  return existant.id;
}

async function main() {
  // Le slug est unique : on repart d'un état propre à chaque exécution.
  await db.from('garages').delete().eq('slug', GARAGE.slug);

  const { data: garage, error } = await db
    .from('garages').insert(GARAGE).select().single();
  if (error) throw error;

  const { data: prestations, error: e2 } = await db.from('prestations').insert(
    CATALOGUE.map((p, i) => ({
      garage_id: garage.id, libelle: p.libelle, duree_minutes: p.duree,
      prix_ttc: p.prix, ordre: i, active: true,
    })),
  ).select();
  if (e2) throw e2;
  const idDe = (libelle: string) =>
    prestations!.find((p) => p.libelle === libelle)!.id as string;

  for (let i = 0; i < PLAN.length; i++) {
    const p = PLAN[i];
    const c = CLIENTS[i];
    const souhaites = [demain(8), demain(14), demain(16)].map((debut) => ({
      debut,
      fin: new Date(new Date(debut).getTime() + 3_600_000).toISOString(),
    }));

    const { data: demande, error: e3 } = await db.from('demandes').insert({
      garage_id: garage.id,
      reference: referenceCourte(),
      client_nom: c[0], client_tel: c[1], client_email: c[2],
      prefere_telephone: i % 4 === 0,
      vehicule_immat: c[3], vehicule_marque: c[4], vehicule_modele: c[5],
      vehicule_annee: c[6], vehicule_km: c[7],
      prestation_ids: p.presta.map(idDe),
      description_libre: p.libre ?? null,
      creneaux_souhaites: souhaites,
      statut: p.statut,
      motif_refus: p.motif ?? null,
      alternative: p.statut === 'alternative_proposee'
        ? { debut: demain(9), fin: demain(13) } : null,
      message_garage: p.statut === 'alternative_proposee'
        ? 'Le pont est pris demain matin, je peux vous prendre jeudi.' : null,
      token_suivi: tokenSuivi(),
      created_at: heures(-p.age).toISOString(),
      repondu_at: p.statut === 'nouvelle' ? null : heures(-p.age + 1).toISOString(),
    }).select().single();
    if (e3) throw e3;

    if (p.statut === 'confirmee') {
      await db.from('rendez_vous').insert({
        garage_id: garage.id, demande_id: demande.id,
        debut: souhaites[0].debut, fin: souhaites[0].fin, type: 'rdv',
        libelle: `${c[3]} — ${p.presta.join(', ')}`,
      });
    }
  }

  // Un blocage manuel : le fourgon d'un habitué dort au fond de l'atelier.
  await db.from('rendez_vous').insert({
    garage_id: garage.id, demande_id: null,
    debut: demain(14), fin: demain(18),
    type: 'blocage', libelle: 'Fourgon Mercier — immobilisé',
  });

  // Le compte, en dernier : sans lui, le dashboard n'est pas testable.
  const utilisateur = await compteDemo();
  await db.from('profils').delete().eq('id', utilisateur);
  const { error: e4 } = await db.from('profils').insert({
    id: utilisateur, garage_id: garage.id, role: 'proprietaire',
  });
  if (e4) throw e4;

  console.log(`✓ ${GARAGE.nom} — ${prestations!.length} prestations, ${PLAN.length} demandes`);
  console.log(`  Page publique : /${GARAGE.slug}`);
  console.log(`  Connexion /app : ${COMPTE.email} · ${COMPTE.motDePasse}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
