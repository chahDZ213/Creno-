-- Créno — schéma initial
-- Prise de rendez-vous pour garages indépendants. Rien d'autre :
-- pas de devis, pas d'ordre de réparation, pas de facturation.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- garages
create table if not exists public.garages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nom text not null,
  adresse text,
  telephone text,
  email text,
  logo_url text,
  couleur_primaire text not null default '#1D4E89',
  gabarit text not null default 'etapes'
    check (gabarit in ('compact', 'etapes', 'colonnes')),
  -- horaires : { "lundi": { "ouverture": "08:00", "fermeture": "18:00",
  --                         "pause": { "debut": "12:00", "fin": "14:00" } },
  --              "dimanche": null }  -- null = fermé
  horaires jsonb not null default '{}'::jsonb,
  -- fermetures : [{ "debut": "2026-08-01", "fin": "2026-08-22", "motif": "Congés" }]
  fermetures jsonb not null default '[]'::jsonb,
  nb_postes int not null default 1 check (nb_postes >= 1),
  delai_min_heures int not null default 24 check (delai_min_heures >= 0),
  horizon_jours int not null default 21 check (horizon_jours between 1 and 90),
  taux_horaire_ttc numeric(8,2),
  affiche_prix boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ prestations
create table if not exists public.prestations (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  libelle text not null,
  duree_minutes int not null check (duree_minutes > 0),
  prix_ttc numeric(8,2),
  ordre int not null default 0,
  active boolean not null default true
);
create index if not exists prestations_garage_idx
  on public.prestations (garage_id, ordre);

-- --------------------------------------------------------------- demandes
create table if not exists public.demandes (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  reference text not null unique,
  client_nom text not null,
  client_tel text not null,
  client_email text,
  prefere_telephone boolean not null default false,
  vehicule_immat text not null,
  vehicule_marque text,
  vehicule_modele text,
  vehicule_annee int,
  vehicule_km int,
  prestation_ids uuid[] not null default '{}',
  description_libre text,
  -- creneaux_souhaites : [{ "debut": iso, "fin": iso }] — max 3, par préférence
  creneaux_souhaites jsonb not null default '[]'::jsonb,
  statut text not null default 'nouvelle'
    check (statut in ('nouvelle','confirmee','alternative_proposee',
                      'refusee','annulee','terminee')),
  motif_refus text,
  -- créneau proposé par le garage quand statut = 'alternative_proposee'
  alternative jsonb,
  message_garage text,
  token_suivi text not null unique,
  created_at timestamptz not null default now(),
  repondu_at timestamptz,
  relance_12h_at timestamptz
);
create index if not exists demandes_garage_idx
  on public.demandes (garage_id, statut, created_at desc);

-- ------------------------------------------------------------ rendez_vous
create table if not exists public.rendez_vous (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  demande_id uuid references public.demandes(id) on delete cascade,
  debut timestamptz not null,
  fin timestamptz not null,
  type text not null default 'rdv' check (type in ('rdv','blocage')),
  libelle text,
  created_at timestamptz not null default now(),
  check (fin > debut)
);
create index if not exists rendez_vous_garage_idx
  on public.rendez_vous (garage_id, debut);

-- ---------------------------------------------------------------- profils
create table if not exists public.profils (
  id uuid primary key references auth.users(id) on delete cascade,
  garage_id uuid not null references public.garages(id) on delete cascade,
  role text not null default 'proprietaire' check (role in ('proprietaire','employe'))
);
create index if not exists profils_garage_idx on public.profils (garage_id);

-- ------------------------------------------------------------------- RLS
alter table public.garages     enable row level security;
alter table public.prestations enable row level security;
alter table public.demandes    enable row level security;
alter table public.rendez_vous enable row level security;
alter table public.profils     enable row level security;

-- Le garage de l'utilisateur courant. SECURITY DEFINER pour éviter la
-- récursion : les policies de profils interrogeraient profils.
create or replace function public.mon_garage()
returns uuid
language sql
stable
security definer
set search_path = public
as $$ select garage_id from public.profils where id = auth.uid() $$;

-- garages : lecture publique (page /[slug]), écriture réservée au propriétaire
drop policy if exists garages_lecture_publique on public.garages;
create policy garages_lecture_publique on public.garages
  for select using (true);

drop policy if exists garages_maj_equipe on public.garages;
create policy garages_maj_equipe on public.garages
  for update to authenticated
  using (id = public.mon_garage()) with check (id = public.mon_garage());

-- prestations : lecture publique, écriture par l'équipe du garage
drop policy if exists prestations_lecture_publique on public.prestations;
create policy prestations_lecture_publique on public.prestations
  for select using (true);

drop policy if exists prestations_ecriture_equipe on public.prestations;
create policy prestations_ecriture_equipe on public.prestations
  for all to authenticated
  using (garage_id = public.mon_garage())
  with check (garage_id = public.mon_garage());

-- demandes : jamais lisibles publiquement. L'accès client passe par le
-- token de suivi, via une fonction SECURITY DEFINER (voir plus bas), et
-- la création publique passe par la route serveur (clé service).
drop policy if exists demandes_equipe on public.demandes;
create policy demandes_equipe on public.demandes
  for all to authenticated
  using (garage_id = public.mon_garage())
  with check (garage_id = public.mon_garage());

-- rendez_vous : l'équipe gère les siens. La disponibilité publique est
-- calculée côté serveur, qui ne renvoie que des créneaux, jamais les RDV.
drop policy if exists rendez_vous_equipe on public.rendez_vous;
create policy rendez_vous_equipe on public.rendez_vous
  for all to authenticated
  using (garage_id = public.mon_garage())
  with check (garage_id = public.mon_garage());

drop policy if exists profils_soi on public.profils;
create policy profils_soi on public.profils
  for select to authenticated using (id = auth.uid());

-- Suivi client : une seule demande, par token exact. Aucune énumération
-- possible, la fonction exige l'égalité stricte sur un token aléatoire.
create or replace function public.demande_par_token(p_token text)
returns table (
  reference text, statut text, motif_refus text, message_garage text,
  creneaux_souhaites jsonb, alternative jsonb, description_libre text,
  vehicule_immat text, prestation_ids uuid[], created_at timestamptz,
  repondu_at timestamptz, garage_nom text, garage_telephone text,
  garage_couleur text, garage_slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select d.reference, d.statut, d.motif_refus, d.message_garage,
         d.creneaux_souhaites, d.alternative, d.description_libre,
         d.vehicule_immat, d.prestation_ids, d.created_at, d.repondu_at,
         g.nom, g.telephone, g.couleur_primaire, g.slug
  from public.demandes d
  join public.garages g on g.id = d.garage_id
  where d.token_suivi = p_token
$$;

revoke all on function public.demande_par_token(text) from public;
grant execute on function public.demande_par_token(text) to anon, authenticated;
