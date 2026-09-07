'use client';

import { useEffect, useMemo, useState } from 'react';
import { immatValide, normaliserImmat } from '@/lib/immat';
import { duree as formatDuree, heure, jourLong, prix as formatPrix } from '@/lib/format';
import { DUREE_DEPOT_MINUTES, LIBELLE_DEPOT, type Creneau, type Prestation } from '@/lib/types';

export type GaragePublic = {
  id: string; slug: string; nom: string; adresse: string | null;
  telephone: string | null; logo_url: string | null; couleur_primaire: string;
  affiche_prix: boolean; delai_min_heures: number;
};

export type Brouillon = {
  prestationIds: string[];
  description: string;
  immat: string; marque: string; modele: string; annee: string; km: string;
  creneaux: Creneau[];
  nom: string; tel: string; email: string; prefereTelephone: boolean;
};

export const brouillonVide = (): Brouillon => ({
  prestationIds: [], description: '',
  immat: '', marque: '', modele: '', annee: '', km: '',
  creneaux: [], nom: '', tel: '', email: '', prefereTelephone: false,
});

export const dureeTotale = (p: Prestation[], ids: string[]) => {
  const t = p.filter((x) => ids.includes(x.id))
    .reduce((s, x) => s + x.duree_minutes, 0);
  return t > 0 ? t : DUREE_DEPOT_MINUTES;
};

/* ----------------------------------------------------------- 1. Le besoin */

export function ChoixBesoin({
  garage, prestations, brouillon, modifier,
}: {
  garage: GaragePublic; prestations: Prestation[];
  brouillon: Brouillon; modifier: (p: Partial<Brouillon>) => void;
}) {
  const bascule = (id: string) => modifier({
    prestationIds: brouillon.prestationIds.includes(id)
      ? brouillon.prestationIds.filter((x) => x !== id)
      : [...brouillon.prestationIds, id],
  });
  const choisies = prestations.filter((p) => brouillon.prestationIds.includes(p.id));
  const total = choisies.reduce(
    (s, p) => (p.prix_ttc == null ? s : s + Number(p.prix_ttc)), 0);
  const surDevis = choisies.some((p) => p.prix_ttc == null);

  return (
    <section aria-labelledby="t-besoin">
      <h2 id="t-besoin" className="text-2xl font-bold text-ardoise-950">
        Qu’est-ce qu’il faut faire ?
      </h2>
      <p className="mt-1 text-ardoise-600">
        Cochez ce que vous savez, décrivez le reste. Les deux sont possibles.
      </p>

      <ul className="mt-5 divide-y divide-ardoise-200 border-y border-ardoise-200">
        {prestations.map((p) => {
          const coche = brouillon.prestationIds.includes(p.id);
          return (
            <li key={p.id}>
              <label className={`flex min-h-tactile cursor-pointer items-center gap-3 px-1 py-3 ${coche ? 'bg-atelier/5' : ''}`}>
                <input
                  type="checkbox" checked={coche} onChange={() => bascule(p.id)}
                  className="h-6 w-6 shrink-0 accent-atelier"
                />
                <span className="flex-1 font-semibold text-ardoise-950">{p.libelle}</span>
                <span className="text-sm text-ardoise-600">{formatDuree(p.duree_minutes)}</span>
                {garage.affiche_prix && (
                  <span className="w-24 text-right font-semibold text-ardoise-800">
                    {formatPrix(p.prix_ttc)}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      {garage.affiche_prix && choisies.length > 0 && (
        <p className="mt-3 text-right text-ardoise-800">
          <span className="font-bold">
            Total {surDevis && total === 0 ? 'sur devis' : formatPrix(total)}
            {surDevis && total > 0 ? ' + devis' : ''}
          </span>
          <br />
          <span className="text-sm text-ardoise-600">
            Estimation, à confirmer par le garage.
          </span>
        </p>
      )}

      <div className="mt-6">
        <label className="etiquette" htmlFor="description">
          Ou décrivez la panne avec vos mots
        </label>
        <textarea
          id="description" rows={3} className="champ"
          placeholder="Elle démarre plus, bruit à l’avant droit…"
          value={brouillon.description}
          onChange={(e) => modifier({ description: e.target.value })}
        />
        {brouillon.prestationIds.length === 0 && brouillon.description.trim() && (
          <p className="mt-2 rounded-md bg-ardoise-100 p-3 text-ardoise-800">
            Sans prestation cochée, le garage prévoit un créneau de 30 minutes :
            <strong> {LIBELLE_DEPOT}</strong>.
          </p>
        )}
      </div>
    </section>
  );
}

/* --------------------------------------------------------- 2. Le véhicule */

export function ChampsVehicule({
  brouillon, modifier,
}: { brouillon: Brouillon; modifier: (p: Partial<Brouillon>) => void }) {
  const [touche, setTouche] = useState(false);
  const invalide = touche && brouillon.immat.trim() !== ''
    && !immatValide(brouillon.immat);
  return (
    <section aria-labelledby="t-vehicule">
      <h2 id="t-vehicule" className="text-2xl font-bold text-ardoise-950">
        Quel véhicule ?
      </h2>
      <p className="mt-1 text-ardoise-600">
        L’immatriculation suffit. Le reste aide le garage à préparer les pièces.
      </p>
      <div className="mt-5 space-y-4">
        <div>
          <label className="etiquette" htmlFor="immat">Immatriculation</label>
          <input
            id="immat" className="champ font-mono text-xl tracking-wider uppercase"
            inputMode="text" autoCapitalize="characters" placeholder="AB-123-CD"
            value={brouillon.immat}
            onBlur={() => { setTouche(true); modifier({ immat: normaliserImmat(brouillon.immat) }); }}
            onChange={(e) => modifier({ immat: e.target.value.toUpperCase() })}
            aria-invalid={invalide}
          />
          {invalide && (
            <p className="mt-2 font-semibold text-refus">
              Format attendu : AB-123-CD ou 1234 AB 56.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="etiquette" htmlFor="marque">Marque</label>
            <input id="marque" className="champ" value={brouillon.marque}
              onChange={(e) => modifier({ marque: e.target.value })} />
          </div>
          <div>
            <label className="etiquette" htmlFor="modele">Modèle</label>
            <input id="modele" className="champ" value={brouillon.modele}
              onChange={(e) => modifier({ modele: e.target.value })} />
          </div>
          <div>
            <label className="etiquette" htmlFor="annee">Année</label>
            <input id="annee" className="champ" inputMode="numeric" placeholder="2016"
              value={brouillon.annee}
              onChange={(e) => modifier({ annee: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
          </div>
          <div>
            <label className="etiquette" htmlFor="km">Kilométrage</label>
            <input id="km" className="champ" inputMode="numeric" placeholder="120 000"
              value={brouillon.km}
              onChange={(e) => modifier({ km: e.target.value.replace(/\D/g, '').slice(0, 7) })} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- 3. Les créneaux */

export function ChoixCreneaux({
  garage, brouillon, modifier, compact = false,
}: {
  garage: GaragePublic; brouillon: Brouillon;
  modifier: (p: Partial<Brouillon>) => void; compact?: boolean;
}) {
  const [jours, setJours] = useState<Array<{ jour: string; creneaux: Creneau[] }>>([]);
  const [chargement, setChargement] = useState(true);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const cle = brouillon.prestationIds.join(',');

  useEffect(() => {
    let vivant = true;
    setChargement(true);
    const url = `/api/garages/${garage.slug}/disponibilites`
      + (cle ? `?prestations=${encodeURIComponent(cle)}` : '');
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (vivant) { setJours(d.jours ?? []); setOuvert(d.jours?.[0]?.jour ?? null); } })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [garage.slug, cle]);

  const choisi = (c: Creneau) => brouillon.creneaux.some((x) => x.debut === c.debut);
  const bascule = (c: Creneau) => {
    if (choisi(c)) {
      modifier({ creneaux: brouillon.creneaux.filter((x) => x.debut !== c.debut) });
    } else if (brouillon.creneaux.length < 3) {
      modifier({ creneaux: [...brouillon.creneaux, c] });
    }
  };

  return (
    <section aria-labelledby="t-creneaux">
      <h2 id="t-creneaux" className="text-2xl font-bold text-ardoise-950">
        Quand pouvez-vous passer ?
      </h2>
      <p className="mt-1 text-ardoise-600">
        Choisissez jusqu’à trois créneaux, du plus arrangeant au moins.
        Le garage en retiendra un.
      </p>

      {brouillon.creneaux.length > 0 && (
        <ol className="mt-4 space-y-2">
          {brouillon.creneaux.map((c, i) => (
            <li key={c.debut}
              className="flex min-h-tactile items-center gap-3 border-l-4 border-atelier bg-white px-3 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-atelier text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="flex-1 font-semibold">
                {jourLong(c.debut)} à {heure(c.debut)}
              </span>
              <button type="button" onClick={() => bascule(c)}
                className="min-h-tactile px-3 font-semibold text-ardoise-600 underline">
                Retirer
              </button>
            </li>
          ))}
        </ol>
      )}

      {chargement && <p className="mt-5 text-ardoise-600">Recherche des disponibilités…</p>}

      {!chargement && jours.length === 0 && (
        <p className="mt-5 rounded-md bg-ardoise-100 p-4 text-ardoise-800">
          Aucun créneau libre sur les prochaines semaines.
          {garage.telephone && <> Appelez le garage au <strong>{garage.telephone}</strong>.</>}
        </p>
      )}

      <div className={`mt-5 ${compact ? 'max-h-[28rem] overflow-y-auto pr-1' : ''}`}>
        {jours.map(({ jour, creneaux }) => (
          <div key={jour} className="border-b border-ardoise-200">
            <button type="button"
              onClick={() => setOuvert(ouvert === jour ? null : jour)}
              aria-expanded={ouvert === jour}
              className="flex min-h-tactile w-full items-center justify-between py-3 text-left">
              <span className="font-semibold capitalize text-ardoise-950">
                {jourLong(creneaux[0].debut)}
              </span>
              <span className="text-sm text-ardoise-600">
                {creneaux.length} créneau{creneaux.length > 1 ? 'x' : ''}
              </span>
            </button>
            {ouvert === jour && (
              <div className="grid grid-cols-3 gap-2 pb-4 sm:grid-cols-4">
                {creneaux.map((c) => {
                  const actif = choisi(c);
                  const plein = !actif && brouillon.creneaux.length >= 3;
                  return (
                    <button key={c.debut} type="button" disabled={plein}
                      onClick={() => bascule(c)} aria-pressed={actif}
                      className={`min-h-tactile rounded-md border-2 font-semibold ${
                        actif ? 'border-atelier bg-atelier text-white'
                          : 'border-ardoise-200 bg-white text-ardoise-950 disabled:opacity-40'
                      }`}>
                      {heure(c.debut)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- 4. Le contact */

export function ChampsContact({
  brouillon, modifier,
}: { brouillon: Brouillon; modifier: (p: Partial<Brouillon>) => void }) {
  return (
    <section aria-labelledby="t-contact">
      <h2 id="t-contact" className="text-2xl font-bold text-ardoise-950">
        Comment vous joindre ?
      </h2>
      <div className="mt-5 space-y-4">
        <div>
          <label className="etiquette" htmlFor="nom">Nom</label>
          <input id="nom" className="champ" autoComplete="name"
            value={brouillon.nom} onChange={(e) => modifier({ nom: e.target.value })} />
        </div>
        <div>
          <label className="etiquette" htmlFor="tel">Téléphone</label>
          <input id="tel" className="champ" inputMode="tel" autoComplete="tel"
            placeholder="06 12 34 56 78"
            value={brouillon.tel} onChange={(e) => modifier({ tel: e.target.value })} />
        </div>
        <div>
          <label className="etiquette" htmlFor="email">Email</label>
          <input id="email" className="champ" inputMode="email" autoComplete="email"
            value={brouillon.email} onChange={(e) => modifier({ email: e.target.value })} />
          <p className="mt-1 text-sm text-ardoise-600">
            C’est là qu’arrive la réponse du garage.
          </p>
        </div>
        <label className="flex min-h-tactile cursor-pointer items-center gap-3">
          <input type="checkbox" className="h-6 w-6 accent-atelier"
            checked={brouillon.prefereTelephone}
            onChange={(e) => modifier({ prefereTelephone: e.target.checked })} />
          <span className="font-semibold text-ardoise-950">
            Je préfère être rappelé par téléphone
          </span>
        </label>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ validations */

export function manquesDe(b: Brouillon): Record<number, string> {
  const m: Record<number, string> = {};
  if (b.prestationIds.length === 0 && !b.description.trim()) {
    m[1] = 'Cochez une prestation ou décrivez la panne.';
  }
  if (!b.immat.trim()) m[2] = 'L’immatriculation est obligatoire.';
  else if (!immatValide(b.immat)) m[2] = 'Immatriculation non reconnue.';
  if (b.creneaux.length === 0) m[3] = 'Choisissez au moins un créneau.';
  if (!b.nom.trim()) m[4] = 'Votre nom, s’il vous plaît.';
  else if (!b.tel.trim()) m[4] = 'Un numéro pour vous joindre.';
  else if (!b.prefereTelephone && !b.email.trim()) {
    m[4] = 'Un email pour recevoir la réponse, ou cochez « me rappeler ».';
  }
  return m;
}

export function Recapitulatif({
  garage, prestations, brouillon,
}: { garage: GaragePublic; prestations: Prestation[]; brouillon: Brouillon }) {
  const choisies = useMemo(
    () => prestations.filter((p) => brouillon.prestationIds.includes(p.id)),
    [prestations, brouillon.prestationIds],
  );
  const minutes = dureeTotale(prestations, brouillon.prestationIds);
  const total = choisies.reduce(
    (s, p) => (p.prix_ttc == null ? s : s + Number(p.prix_ttc)), 0);
  const surDevis = choisies.some((p) => p.prix_ttc == null);
  const depot = choisies.length === 0;

  return (
    <div className="bloc p-4">
      <h3 className="font-bold text-ardoise-950">Votre demande</h3>
      <p className="mt-2 text-ardoise-800">
        {depot ? LIBELLE_DEPOT : choisies.map((p) => p.libelle).join(', ')}
        <span className="text-ardoise-600"> · {formatDuree(minutes)}</span>
      </p>
      {brouillon.immat && (
        <p className="mt-1 font-mono text-ardoise-800">{brouillon.immat}</p>
      )}
      {garage.affiche_prix && !depot && (
        <p className="mt-3 border-t border-ardoise-200 pt-3">
          <span className="font-bold">
            Total {surDevis && total === 0 ? 'sur devis' : formatPrix(total)}
            {surDevis && total > 0 ? ' + devis' : ''}
          </span>
          <br />
          <span className="text-sm text-ardoise-600">
            Estimation, à confirmer par le garage.
          </span>
        </p>
      )}
    </div>
  );
}
