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
| Sans réponse depuis 12 h | Garage | SMS |

Sans clés Resend ni Twilio, les deux transports écrivent en console : le
message affiché est exactement celui qui partira en production. Le SMS de
nouvelle demande porte la plaque, le motif en cinq mots et le lien direct vers
la fiche.

Les deux tâches périodiques passent par `/api/taches/rappels`, appelée toutes
les heures par un cron Vercel et protégée par `CRENO_CLE_CRON`.

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

La clé `service_role` sert à deux choses seulement, toutes deux côté serveur :
lire l'occupation de l'atelier pour calculer les créneaux, et enregistrer une
demande déposée par un visiteur sans compte. Le reste passe par la clé `anon`
et la RLS.

Sans clés Resend ni Twilio, le déploiement fonctionne : les notifications
partent dans les logs Vercel plutôt que chez le garagiste.

## Sécurité

RLS sur les cinq tables. `garages` et `prestations` sont lisibles
publiquement — la page `/[slug]` en a besoin. Les `demandes` ne le sont
jamais : le client y accède par `token_suivi` exact, via une fonction
`SECURITY DEFINER` qui n'autorise aucune énumération. L'équipe ne voit que les
lignes de son `garage_id`. Les créneaux libres sont calculés côté serveur :
l'API publique ne renvoie jamais les rendez-vous existants.
