-- Le créneau devient une dépose de véhicule.
--
-- Jusqu'ici, un créneau durait la somme des prestations et devait tenir
-- entièrement dans une plage d'ouverture. Conséquence observée en production :
-- chez un garage ouvert 9h-18h avec pause 12h-14h, la journée vaut deux blocs
-- de 3 h et 4 h — et un embrayage de 5 h ne proposait AUCUN créneau. Le client
-- lisait « aucun créneau libre sur les prochaines semaines » alors que le
-- planning était vide, et partait téléphoner.
--
-- Le client ne réserve pas un atelier pendant cinq heures : il DÉPOSE sa
-- voiture. Le créneau redevient ce qu'il est, un rendez-vous de remise des
-- clés. La durée du travail ne contraint plus l'heure ; elle alimente deux
-- plafonds que le garage règle lui-même.
--
-- À appliquer dans Supabase -> SQL Editor. Rejouable sans dommage.

alter table public.garages
  add column if not exists duree_depot_minutes int not null default 30
    check (duree_depot_minutes between 5 and 120),
  -- NULL = pas de limite ; sinon, nombre de voitures acceptées par jour.
  add column if not exists max_depots_jour int
    check (max_depots_jour is null or max_depots_jour >= 1),
  -- NULL = calcule nb_postes x minutes ouvrees du jour.
  add column if not exists charge_max_minutes_jour int
    check (charge_max_minutes_jour is null or charge_max_minutes_jour >= 30);

comment on column public.garages.max_depots_jour is
  'Nombre de vehicules acceptes par jour. NULL = pas de limite.';
comment on column public.garages.charge_max_minutes_jour is
  'Charge de travail acceptee par jour, en minutes. NULL = nb_postes x minutes ouvrees. Trois jeux de plaquettes passent, trois embrayages non.';

-- La charge que represente un rendez-vous, figee a la confirmation : le
-- catalogue peut changer de duree ensuite sans deformer le passe.
alter table public.rendez_vous
  add column if not exists charge_minutes int;

comment on column public.rendez_vous.charge_minutes is
  'Duree de travail estimee, en minutes. Distincte de (fin - debut), qui est la fenetre de depose.';

-- Date de restitution annoncee au client, proposee automatiquement a la
-- confirmation puis corrigeable par le garage.
alter table public.demandes
  add column if not exists restitution_prevue date;

comment on column public.demandes.restitution_prevue is
  'Date de restitution annoncee au client. NULL tant que rien n''a ete annonce.';

-- La page de suivi doit pouvoir annoncer la date de restitution. La fonction
-- liste ses colonnes une a une : il faut la redefinir pour en ajouter une.
-- `create or replace` refuse de changer le type de retour, d'ou le drop.
drop function if exists public.demande_par_token(text);

create function public.demande_par_token(p_token text)
returns table (
  reference text, statut text, motif_refus text, message_garage text,
  creneaux_souhaites jsonb, alternative jsonb, description_libre text,
  vehicule_immat text, prestation_ids uuid[], created_at timestamptz,
  repondu_at timestamptz, restitution_prevue date, garage_nom text,
  garage_telephone text, garage_couleur text, garage_slug text
)
language sql
stable
security definer
set search_path = public
as $$
  select d.reference, d.statut, d.motif_refus, d.message_garage,
         d.creneaux_souhaites, d.alternative, d.description_libre,
         d.vehicule_immat, d.prestation_ids, d.created_at, d.repondu_at,
         d.restitution_prevue,
         g.nom, g.telephone, g.couleur_primaire, g.slug
  from public.demandes d
  join public.garages g on g.id = d.garage_id
  where d.token_suivi = p_token
$$;

revoke all on function public.demande_par_token(text) from public;
grant execute on function public.demande_par_token(text) to anon, authenticated;
