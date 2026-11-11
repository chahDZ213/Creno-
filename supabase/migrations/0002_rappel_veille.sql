-- Marque le rappel de la veille déjà envoyé pour un rendez-vous.
--
-- Jusqu'ici, le seul garde-fou contre un double envoi était la largeur de la
-- fenêtre de recherche (23 à 25 heures avant le rendez-vous), qui supposait un
-- passage toutes les deux heures exactement. Avec le cron quotidien de Vercel
-- Hobby, presque aucun rendez-vous ne tombait dedans et le rappel ne partait
-- pas ; en passant à un passage horaire, le même client en recevait deux.
--
-- Avec cette colonne, la fenêtre ne porte plus la responsabilité de
-- l'unicité : un rappel part une fois, quelle que soit la fréquence des
-- passages, et un passage manqué est rattrapé au suivant.
alter table public.rendez_vous
  add column if not exists rappel_veille_at timestamptz;

comment on column public.rendez_vous.rappel_veille_at is
  'Date d''envoi du rappel de la veille au client. Null tant qu''il n''est pas parti.';

-- Les passages horaires ne lisent que les rendez-vous encore à venir et non
-- rappelés : cet index leur évite de parcourir tout l'historique.
create index if not exists rendez_vous_rappel_a_envoyer
  on public.rendez_vous (debut)
  where rappel_veille_at is null and type = 'rdv';
