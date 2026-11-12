# Créno

**Vos clients demandent un rendez-vous à 3 h du matin. Vous répondez au café.**

Prise de rendez-vous en ligne pour les garages automobiles indépendants qui
n'ont aucun logiciel de planning. Rien d'autre : pas de devis, pas d'ordre de
réparation, pas de facturation, pas de stock.

Next.js 15 (App Router) · Supabase (Postgres, Auth, RLS) · Tailwind ·
Resend et Twilio derrière `lib/notifications.ts`.

---

## Les trois surfaces

**`/[slug]` — la page publique.** Sans compte, sans connexion : le lien du QR
code sur la vitrine. Le client dit ce qu'il faut faire (prestations cochées,
panne décrite, ou les deux), donne son immatriculation, choisit jusqu'à trois
créneaux par ordre de préférence, laisse ses coordonnées. Il ne réserve pas :
il demande — le bouton dit « Envoyer ma demande », l'écran de fin dit
« Demande envoyée », et donne un numéro de suivi court.

**`/app` — l'atelier.** Derrière authentification, pensé pour un téléphone
tenu d'une main. Les demandes à traiter en premier, un liseré jaune passé
douze heures sans réponse. Sur une fiche : confirmer l'un des créneaux
souhaités, proposer autre chose, ou refuser avec un motif. Plus le planning
de la semaine avec ses blocages manuels, et les réglages.

**`/suivi/[token]` — le client.** Un lien unique, pas de compte. L'état de la
demande et, si le garage a proposé un autre créneau, deux boutons.

## Le créneau est une dépose

Un client ne réserve pas l'atelier pendant cinq heures : il **dépose** sa
voiture et repart. Le créneau est donc un rendez-vous de remise des clés — 30
minutes par défaut, réglable — et la durée du travail ne décide plus de l'heure.

La version précédente faisait l'inverse, et ça s'est vu en production : chez un
garage ouvert 9h-18h avec pause 12h-14h, la journée vaut deux blocs de 3 h et
4 h. Un embrayage de 5 h ne tenait dans aucun des deux et ne proposait **aucun
créneau**. Le client lisait « aucun créneau libre sur les prochaines semaines »
devant un planning vide, et partait téléphoner — en emportant le chantier le
plus rentable de la semaine.

Le travail n'a pas disparu du calcul : il alimente deux plafonds par journée,
que le garage règle lui-même.

| Plafond | Colonne | Défaut | Protège |
|---|---|---|---|
| Véhicules acceptés | `max_depots_jour` | aucun | l'accueil |
| Heures de travail acceptées | `charge_max_minutes_jour` | `nb_postes` × minutes ouvrées | l'atelier |

Deux plafonds et pas un seul, parce que trois jeux de plaquettes et trois
embrayages, c'est le même nombre de voitures et pas du tout la même journée.

**La règle de charge s'écrit `charge déjà posée < plafond`, et non
`charge + travail <= plafond`.** Le plafond empêche l'**accumulation** ; il
n'interdit pas les gros chantiers. Avec la règle inverse, un
embrayage-distribution-freins étalé sur trois jours n'aurait jamais trouvé de
place — alors que c'est précisément le travail qu'un garage veut prendre. Tant
qu'une journée n'a pas atteint son plafond, elle accepte une voiture de plus,
fût-elle là pour trois jours.

`rendez_vous.charge_minutes` porte le travail, figé à la confirmation : le
catalogue peut changer de durée ensuite sans déformer le passé. Les lignes
antérieures à ce modèle n'ont pas cette colonne — leur fenêtre *valait* la
durée du travail, elle est donc relue comme telle plutôt que comptée pour zéro.

### La date de restitution

`restitutionEstimee()` avance jour ouvré par jour ouvré en épuisant le travail,
en sautant les jours fermés et les congés. La capacité qui compte est celle
d'**un** poste, pas de tous : une voiture est traitée par un mécanicien. Le
premier jour ne compte que depuis l'heure de la dépose — une voiture déposée à
17 h n'a pas la journée devant elle.

Le garage la corrige avant de confirmer : lui sait que la pièce arrive jeudi.
Elle part dans l'e-mail de confirmation et s'affiche sur la page de suivi,
présentée comme une estimation. Le message « votre véhicule est prêt » reste
le seul signal ferme.

## Le calcul des disponibilités

`src/lib/disponibilites.ts` est une fonction pure : on lui passe le garage,
les prestations choisies, les rendez-vous existants et une fenêtre, elle rend
des créneaux. Durée = somme des prestations ; sans prestation cochée, un dépôt
de trente minutes, jamais une durée inventée. Capacité = `nb_postes` en
parallèle. Pas de 30 minutes, à l'intérieur des horaires, pauses et fermetures
retirées, le créneau doit tenir entièrement avant la fermeture, rien avant
`now + delai_min_heures`, rien au-delà de l'horizon.

Vingt tests couvrent les chevauchements, les postes multiples, la pause
déjeuner, une prestation plus longue qu'une demi-journée, les jours fermés,
les congés, le délai minimum et l'horizon.

    npm test

## Réglages : le garage se débrouille seul

Horaires jour par jour avec pause, fermetures, nombre de postes, délai
minimum, horizon, catalogue de prestations (ajout, renommage, durée, prix,
ordre, activation, suppression), taux horaire, affichage des prix,
logo, couleur, gabarit. Le seed ne pose que des **valeurs de départ** : rien
n'est codé en dur dans l'application, et personne n'a besoin d'ouvrir la base.

Prix affichés seulement si l'interrupteur est armé (il ne l'est pas par
défaut) : chaque prestation avec son prix, un total marqué « Estimation, à
confirmer par le garage », « Sur devis » quand le prix manque — et jamais de
prix sur un dépôt en diagnostic.

## Les trois gabarits

Même parcours, même code, trois mises en page. `etapes` : quatre écrans avec
barre de progression. `compact` : tout sur une page qui défile. `colonnes` :
formulaire à gauche, calendrier persistant à droite, qui repasse en `etapes`
sous 768 px. La couleur et le logo du garage s'appliquent par-dessus, via des
variables CSS.

## Direction visuelle

Un mécanicien de 45 ans, sur un téléphone, les mains sales. Typographie
système — celle que son téléphone rend déjà le mieux, et rien à télécharger
sur la 4G de l'atelier — à 17 px, sur une palette de deux couleurs : le bleu
d'atelier des plaques et des panneaux de service, et le jaune de
signalisation, réservé à l'urgence. Zones tactiles à 48 px minimum, contrastes
forts, focus visible en plein soleil.

## Notifications

| Événement | Destinataire | Canal |
|---|---|---|
| Nouvelle demande | Garage | SMS + email |
| Demande confirmée | Client | Email |
| Autre créneau proposé | Client | Email + SMS |
| Demande refusée | Client | Email |
| Rappel J-1 | Client | SMS |
| **Véhicule prêt** | **Client** | **SMS + email** |
| Sans réponse depuis 12 h | Garage | SMS |

Le message « véhicule prêt » ferme le parcours. Il manquait : le garage
prenait la voiture, la réparait, et le client n'apprenait jamais qu'elle était
finie autrement qu'en téléphonant. Le statut `terminee` existait en base et
dans l'affichage, mais rien ne le posait. Le bouton vit sur la fiche d'une
demande confirmée, demande confirmation avant d'envoyer — un SMS parti ne se
reprend pas — et refuse d'agir sur une demande qui n'est pas confirmée, pour
qu'un double envoi du formulaire ne prévienne pas le client deux fois.

Sans clés Resend ni Twilio, les deux transports écrivent en console : le
message affiché est exactement celui qui partira en production. Le SMS de
nouvelle demande porte la plaque, le motif en cinq mots et le lien direct vers
la fiche.

Les deux tâches périodiques passent par `/api/taches/rappels`, appelée toutes
les heures et protégée par `CRENO_CLE_CRON`. Voir « Mise en ligne » pour le
déclencheur.

## Ce dépôt est provisoire

Créno vit pour l'instant dans un sous-dossier de Kcalcul, le temps de la
première démo. C'est un produit à part — ses déploiements, ses versions, ses
bugs clients — et il doit sortir d'ici avant le premier client payant :

    ./scripts/extraire-depot.sh git@github.com:<compte>/creno.git

En attendant, Vercel se règle avec **Root Directory = `creno`**.

## Mise en route

```bash
npm install
cp .env.example .env.local        # puis remplir les clés Supabase
# appliquer supabase/migrations/0001_creno.sql sur le projet Supabase
npm run seed                      # le garage, son catalogue, dix demandes
npm run dev
```

Le seed crée aussi le compte de connexion et sa ligne `profils` — il n'y a
rien à faire à la main dans Supabase, et une remise à zéro ne le redemande
pas. Identifiants par défaut, surchargeables par `CRENO_DEMO_EMAIL` et
`CRENO_DEMO_MOTDEPASSE` :

    patron@garage-ducret.fr · creno-demo-2026

## Les données de démonstration

Un seul garage, plausible : **Garage Ducret**, 142 avenue de Genève à Cluses,
deux postes, ouvert 7h30–18h30 avec la pause de midi et le samedi matin. Son
catalogue est celui d'un atelier de vallée — la permutation été/hiver et la
contre-visite y figurent au même titre que la distribution. Dix demandes dans
des statuts variés, dont quatre à traiter et une qui dort depuis plus de douze
heures, pour que le dashboard montre son liseré d'urgence.

## Mise en ligne

Vercel, projet lié à ce dépôt, branche `main`, racine du dépôt (le code n'est
plus dans un sous-dossier). Quatre variables à poser dans Settings →
Environment Variables, sur les trois environnements :

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem, clé `anon` — publique par nature |
| `SUPABASE_SERVICE_ROLE_KEY` | idem, clé `service_role` — **accès total, jamais côté navigateur** |
| `NEXT_PUBLIC_URL_BASE` | l'URL du déploiement, pour les liens des emails et SMS |
| `SMTP_UTILISATEUR` / `SMTP_MOTDEPASSE` | l'adresse d'envoi et son mot de passe d'application |

La clé `service_role` sert à deux choses seulement, toutes deux côté serveur :
lire l'occupation de l'atelier pour calculer les créneaux, et enregistrer une
demande déposée par un visiteur sans compte. Le reste passe par la clé `anon`
et la RLS.

### Par où partent les emails

Trois transports, essayés dans cet ordre :

**SMTP**, dès que `SMTP_UTILISATEUR` et `SMTP_MOTDEPASSE` sont posés. L'expéditeur
est alors une vraie boîte — une adresse Gmail avec un mot de passe
d'application, par exemple. C'est la voie la plus courte pour démarrer :
aucun nom de domaine à posséder, et les messages arrivent partout, parce
qu'ils partent d'une adresse que les serveurs de réception connaissent déjà.
Gmail plafonne autour de 500 messages par jour, ce qui laisse de la marge.

**Resend**, si aucune adresse SMTP n'est configurée. À préférer le jour où
Créno a son domaine : meilleure délivrabilité à volume, pas de quota de
messagerie, et un expéditeur qui porte le nom du produit plutôt qu'une
adresse personnelle. Attention : sans domaine vérifié, Resend n'envoie qu'à
l'adresse du titulaire du compte, et depuis un domaine partagé dont la
réputation ne dépend pas de vous.

**La console**, sans aucune clé. Le message écrit est mot pour mot celui qui
partira en production.

Un envoi qui échoue est enregistré dans les logs sans faire échouer la
réponse du garage : le rendez-vous est déjà en base, c'est lui qui compte.

Sans clés SMS, les SMS partent dans les logs Vercel plutôt que chez le
garagiste.

**La tâche planifiée tourne toutes les heures**, déclenchée par le workflow
GitHub Actions `.github/workflows/rappels.yml`. Le plan Hobby de Vercel
n'autorise qu'un passage par jour et une expression plus fréquente y fait
échouer le déploiement : son cron reste donc en place, à 6 h UTC, mais
seulement comme filet. Deux secrets à poser dans le dépôt, sous
Settings → Secrets and variables → Actions :

| Secret | Valeur |
|---|---|
| `CRENO_CLE_CRON` | la même que la variable Vercel du même nom |
| `CRENO_URL_BASE` | `https://creno.montappli.com` |

Un passage quotidien ne suffisait pas, et pas seulement par retard. Le rappel
de la veille cherchait les rendez-vous commençant dans 23 à 25 heures : avec
un seul passage à 6 h UTC, seuls ceux du petit matin tombaient dans cette
fenêtre, et **presque aucun client n'était rappelé**. La fenêtre servait en
même temps de garde-fou contre le double envoi, si bien qu'un passage horaire
aurait envoyé deux SMS au même client.

L'unicité repose désormais sur `rendez_vous.rappel_veille_at`, posé après
l'envoi. La fréquence des passages n'a plus d'effet sur le nombre de
messages : un rappel part une fois, un passage manqué est rattrapé au
suivant, et les deux déclencheurs peuvent se chevaucher sans dommage.

## Sécurité

RLS sur les cinq tables. `garages` et `prestations` sont lisibles
publiquement — la page `/[slug]` en a besoin. Les `demandes` ne le sont
jamais : le client y accède par `token_suivi` exact, via une fonction
`SECURITY DEFINER` qui n'autorise aucune énumération. L'équipe ne voit que les
lignes de son `garage_id`. Les créneaux libres sont calculés côté serveur :
l'API publique ne renvoie jamais les rendez-vous existants.

## L'installation d'un garage

Un garage qui se connecte pour la première fois ne voit pas un tableau de bord
vide : il est envoyé sur `/installation`, neuf questions, une par écran.

| Question | Ce qu'elle règle |
|---|---|
| Nom du garage | `nom`, et le `slug` de la page publique, déduit du nom |
| Où vous trouve-t-on | `adresse`, `telephone`, `email` — le téléphone décide si les SMS partent |
| Quand êtes-vous ouvert | `horaires`, jour par jour, avec pause déjeuner |
| Combien de voitures en même temps | `nb_postes` |
| À partir de quand peut-on réserver | `delai_min_heures` |
| Jusqu'à quand | `horizon_jours` |
| Qu'est-ce que vous faites | le catalogue, coché dans `PRESTATIONS_DEFAUT`, durées corrigées, ajouts libres |
| Affichez-vous vos prix | `affiche_prix`, les prix par prestation, `taux_horaire_ttc` |
| À quoi ressemble votre page | `couleur_primaire`, `gabarit` |

Tout est enregistré **en une seule fois**, à la dernière question. Un garage à
demi configuré est pire que pas configuré du tout : sa page publique serait en
ligne avec des horaires mais sans prestations, et un client pourrait y déposer
une demande que personne ne verrait.

Le marqueur de « déjà installé » est l'existence d'horaires, pas une colonne
dédiée : `horaires = '{}'` ne peut venir que d'un garage qui n'a jamais répondu,
puisqu'un garage fermé tous les jours écrit `{"lundi":null,…}`. Les deux
situations restent distinctes, et il n'y a pas de migration à appliquer.

Rien n'est figé : tout se retouche ensuite dans Réglages, qui reste la seule
page d'édition. Le parcours ne sert qu'une fois.

### Remettre une démonstration à zéro

```sql
delete from rendez_vous;
delete from demandes;
delete from prestations;
update garages set
  slug = 'mon-garage', nom = 'Mon garage',
  adresse = null, telephone = null, email = null, logo_url = null,
  couleur_primaire = '#1D4E89', gabarit = 'etapes',
  horaires = '{}'::jsonb, fermetures = '[]'::jsonb,
  nb_postes = 1, delai_min_heures = 24, horizon_jours = 21,
  taux_horaire_ttc = null, affiche_prix = false;
```

La ligne `garages` est conservée, et avec elle son `id` : c'est lui que
`profils` référence, donc le compte reste connecté. Les horaires repassent à
`{}`, et la prochaine connexion rouvre le questionnaire.
