-- Prix et durée selon la catégorie du véhicule.
--
-- Un embrayage de Clio 3 et un d'Audi A6 ne sont ni le meme temps ni le meme
-- prix, et le client ne demandait son rendez-vous en sachant ni l'un ni
-- l'autre. Plutot qu'une grille prix x categorie a remplir a la main -- des
-- dizaines de cases qu'aucun garage ne tiendra a jour -- un coefficient par
-- categorie multiplie le tarif de base ET la duree.
--
-- A appliquer dans Supabase -> SQL Editor. Rejouable sans dommage.

alter table public.garages
  add column if not exists categories_vehicule jsonb not null default '[
    {"cle":"citadine",  "libelle":"Citadine",                        "coefficient":1},
    {"cle":"berline",   "libelle":"Berline ou break",                "coefficient":1.25},
    {"cle":"suv",       "libelle":"SUV ou 4x4",                      "coefficient":1.45},
    {"cle":"premium",   "libelle":"Premium (Audi, BMW, Mercedes...)","coefficient":1.6},
    {"cle":"utilitaire","libelle":"Utilitaire",                      "coefficient":1.4}
  ]'::jsonb;

comment on column public.garages.categories_vehicule is
  'Categories proposees au client, avec le coefficient applique au prix et a la duree de chaque prestation.';

alter table public.demandes
  add column if not exists categorie_vehicule text;

comment on column public.demandes.categorie_vehicule is
  'Categorie choisie par le client. NULL = demande anterieure, coefficient 1.';

-- La page de suivi n'en a pas besoin ; la fonction demande_par_token reste
-- inchangee.
