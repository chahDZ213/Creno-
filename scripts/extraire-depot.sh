#!/usr/bin/env bash
# Sort Créno du dépôt Kcalcul et lui donne le sien.
#
# À lancer depuis n'importe où, une fois le dépôt `creno` créé sur GitHub
# (vide, sans README). Dix minutes maintenant plutôt qu'une demi-journée
# dans six mois.
#
#   ./creno/scripts/extraire-depot.sh git@github.com:chahDZ213/creno.git
#
# Deuxième argument facultatif : où poser le nouveau dépôt.
set -euo pipefail

REMOTE="${1:?Usage: extraire-depot.sh <url-du-depot-creno> [dossier-cible]}"
SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
CIBLE="${2:-$(dirname "$(dirname "$SOURCE")")/creno}"

if [ -e "$CIBLE" ]; then
  echo "✗ $CIBLE existe déjà. Donnez un autre dossier en deuxième argument." >&2
  exit 1
fi

mkdir -p "$CIBLE"
# Tout sauf ce qui se régénère : node_modules, .next, les env locales.
tar -c -C "$SOURCE" \
  --exclude=node_modules --exclude=.next --exclude='.env*.local' \
  . | tar -x -C "$CIBLE"

cd "$CIBLE"
git init -q -b main
git add .
git commit -q -m "Créno — prise de rendez-vous pour garages indépendants

Page publique sans compte, dashboard mobile pour l'atelier, suivi client
par lien unique. Le calcul des disponibilités est une fonction pure, ses
règles sont couvertes par vingt tests."
git remote add origin "$REMOTE"
git push -u origin main

echo
echo "✓ Créno vit dans $CIBLE, poussé sur $REMOTE"
echo "  Il reste à le retirer de Kcalcul :"
echo "    cd $(dirname "$SOURCE") && git rm -r --cached creno && rm -rf creno && git commit -m 'Créno a son dépôt'"
