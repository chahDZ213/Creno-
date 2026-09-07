import {
  ajouterFermeture, ajouterPrestation, basculerPrestation, deplacerPrestation,
  enregistrerHoraires, enregistrerVitrine, modifierPrestation, retirerFermeture,
  supprimerPrestation,
} from './actions';
import { monGarage } from '@/lib/serveur/session';
import { serveur } from '@/lib/supabase/server';
import { JOURS, type Prestation } from '@/lib/types';

export const dynamic = 'force-dynamic';

const GABARITS = [
  ['etapes', 'Étapes', 'Quatre écrans successifs avec barre de progression.'],
  ['compact', 'Compact', 'Tout le formulaire sur une page qui défile.'],
  ['colonnes', 'Colonnes', 'Formulaire à gauche, calendrier à droite sur grand écran.'],
] as const;

export default async function Reglages() {
  const { garage } = await monGarage();
  const db = await serveur();
  const { data } = await db.from('prestations').select('*')
    .eq('garage_id', garage.id).order('ordre');
  const prestations = (data as Prestation[]) ?? [];

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------- horaires */}
      <form action={enregistrerHoraires} className="bloc p-4">
        <h2 className="text-xl font-bold text-ardoise-950">Horaires d’ouverture</h2>
        <ul className="mt-4 divide-y divide-ardoise-200">
          {JOURS.map((jour) => {
            const h = garage.horaires?.[jour] ?? null;
            return (
              <li key={jour} className="py-3">
                <label className="flex min-h-tactile items-center gap-3">
                  <input type="checkbox" name={`${jour}_ouvert`} defaultChecked={!!h}
                    className="h-6 w-6 accent-atelier" />
                  <span className="w-28 font-semibold capitalize text-ardoise-950">{jour}</span>
                </label>
                <div className="ml-9 mt-2 flex flex-wrap items-center gap-2">
                  <input type="time" name={`${jour}_ouverture`} className="champ w-32"
                    defaultValue={h?.ouverture ?? '08:00'} aria-label={`Ouverture ${jour}`} />
                  <span className="text-ardoise-600">→</span>
                  <input type="time" name={`${jour}_fermeture`} className="champ w-32"
                    defaultValue={h?.fermeture ?? '18:00'} aria-label={`Fermeture ${jour}`} />
                </div>
                <div className="ml-9 mt-2 flex flex-wrap items-center gap-2">
                  <label className="flex min-h-tactile items-center gap-2">
                    <input type="checkbox" name={`${jour}_pause`} defaultChecked={!!h?.pause}
                      className="h-6 w-6 accent-atelier" />
                    <span className="text-ardoise-800">Pause déjeuner</span>
                  </label>
                  <input type="time" name={`${jour}_pause_debut`} className="champ w-32"
                    defaultValue={h?.pause?.debut ?? '12:00'} aria-label={`Début de pause ${jour}`} />
                  <input type="time" name={`${jour}_pause_fin`} className="champ w-32"
                    defaultValue={h?.pause?.fin ?? '14:00'} aria-label={`Fin de pause ${jour}`} />
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="etiquette" htmlFor="nb_postes">Postes de travail</label>
            <input id="nb_postes" name="nb_postes" type="number" min={1} className="champ"
              defaultValue={garage.nb_postes} inputMode="numeric" />
          </div>
          <div>
            <label className="etiquette" htmlFor="delai">Délai minimum (heures)</label>
            <input id="delai" name="delai_min_heures" type="number" min={0} className="champ"
              defaultValue={garage.delai_min_heures} inputMode="numeric" />
          </div>
          <div>
            <label className="etiquette" htmlFor="horizon">Horizon (jours)</label>
            <input id="horizon" name="horizon_jours" type="number" min={1} max={90}
              className="champ" defaultValue={garage.horizon_jours} inputMode="numeric" />
          </div>
        </div>
        <button className="bouton-principal mt-5 w-full">Enregistrer les horaires</button>
      </form>

      {/* ----------------------------------------------------- fermetures */}
      <section className="bloc p-4">
        <h2 className="text-xl font-bold text-ardoise-950">Fermetures</h2>
        <ul className="mt-3 space-y-2">
          {(garage.fermetures ?? []).map((f, i) => (
            <li key={`${f.debut}-${i}`} className="flex items-center gap-3">
              <span className="flex-1 text-ardoise-800">
                {f.debut === f.fin ? f.debut : `${f.debut} → ${f.fin}`}
                {f.motif ? ` · ${f.motif}` : ''}
              </span>
              <form action={retirerFermeture}>
                <input type="hidden" name="index" value={i} />
                <button className="min-h-tactile px-2 font-semibold text-ardoise-600 underline">
                  Retirer
                </button>
              </form>
            </li>
          ))}
          {(garage.fermetures ?? []).length === 0 && (
            <li className="text-ardoise-600">Aucune période de fermeture.</li>
          )}
        </ul>
        <form action={ajouterFermeture} className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="etiquette" htmlFor="f_debut">Du</label>
            <input id="f_debut" name="debut" type="date" className="champ" required />
          </div>
          <div>
            <label className="etiquette" htmlFor="f_fin">Au</label>
            <input id="f_fin" name="fin" type="date" className="champ" />
          </div>
          <div>
            <label className="etiquette" htmlFor="f_motif">Motif</label>
            <input id="f_motif" name="motif" className="champ" placeholder="Congés" />
          </div>
          <button className="bouton-second sm:col-span-3">Ajouter la fermeture</button>
        </form>
      </section>

      {/* ------------------------------------------------------ catalogue */}
      <section className="bloc p-4">
        <h2 className="text-xl font-bold text-ardoise-950">Mes prestations</h2>
        <p className="mt-1 text-ardoise-600">
          Durée et prix vous appartiennent : ce que vous mettez ici est ce que
          voit le client.
        </p>

        <ul className="mt-4 space-y-3">
          {prestations.map((p, i) => (
            <li key={p.id} className={`border p-3 ${p.active ? 'border-ardoise-200' : 'border-dashed border-ardoise-400 bg-ardoise-50'}`}>
              <form action={modifierPrestation} className="space-y-3">
                <input type="hidden" name="id" value={p.id} />
                <input name="libelle" className="champ font-semibold"
                  defaultValue={p.libelle} aria-label="Libellé" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="etiquette" htmlFor={`d-${p.id}`}>Durée (min)</label>
                    <input id={`d-${p.id}`} name="duree_minutes" type="number" min={5} step={5}
                      className="champ" defaultValue={p.duree_minutes} inputMode="numeric" />
                  </div>
                  <div>
                    <label className="etiquette" htmlFor={`p-${p.id}`}>Prix TTC (€)</label>
                    <input id={`p-${p.id}`} name="prix_ttc" className="champ"
                      inputMode="decimal" placeholder="Sur devis"
                      defaultValue={p.prix_ttc ?? ''} />
                  </div>
                </div>
                <button className="bouton-sobre w-full">Enregistrer</button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                <BoutonForm action={deplacerPrestation} champs={{ id: p.id, sens: 'haut' }}
                  disabled={i === 0}>Monter</BoutonForm>
                <BoutonForm action={deplacerPrestation} champs={{ id: p.id, sens: 'bas' }}
                  disabled={i === prestations.length - 1}>Descendre</BoutonForm>
                <BoutonForm action={basculerPrestation}
                  champs={{ id: p.id, active: p.active ? '0' : '1' }}>
                  {p.active ? 'Désactiver' : 'Activer'}
                </BoutonForm>
                <BoutonForm action={supprimerPrestation} champs={{ id: p.id }} danger>
                  Supprimer
                </BoutonForm>
              </div>
            </li>
          ))}
        </ul>

        <form action={ajouterPrestation} className="mt-5 space-y-3 border-t border-ardoise-200 pt-5">
          <h3 className="font-bold text-ardoise-950">Ajouter une prestation</h3>
          <input name="libelle" className="champ" placeholder="Remplacement batterie"
            aria-label="Libellé de la nouvelle prestation" required />
          <div className="grid grid-cols-2 gap-3">
            <input name="duree_minutes" type="number" min={5} step={5} className="champ"
              defaultValue={60} aria-label="Durée en minutes" inputMode="numeric" />
            <input name="prix_ttc" className="champ" placeholder="Prix TTC (facultatif)"
              aria-label="Prix TTC" inputMode="decimal" />
          </div>
          <button className="bouton-principal w-full">Ajouter</button>
        </form>
      </section>

      {/* -------------------------------------------------------- vitrine */}
      <form action={enregistrerVitrine} className="bloc space-y-4 p-4">
        <h2 className="text-xl font-bold text-ardoise-950">Ma page publique</h2>
        <p className="text-ardoise-600">creno.fr/{garage.slug}</p>

        <div>
          <label className="etiquette" htmlFor="nom">Nom du garage</label>
          <input id="nom" name="nom" className="champ" defaultValue={garage.nom} />
        </div>
        <div>
          <label className="etiquette" htmlFor="adresse">Adresse</label>
          <input id="adresse" name="adresse" className="champ" defaultValue={garage.adresse ?? ''} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiquette" htmlFor="telephone">Téléphone</label>
            <input id="telephone" name="telephone" className="champ" inputMode="tel"
              defaultValue={garage.telephone ?? ''} />
            <p className="mt-1 text-sm text-ardoise-600">
              C’est là qu’arrivent les SMS de nouvelle demande.
            </p>
          </div>
          <div>
            <label className="etiquette" htmlFor="email">Email</label>
            <input id="email" name="email" className="champ" inputMode="email"
              defaultValue={garage.email ?? ''} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiquette" htmlFor="logo">Logo (URL)</label>
            <input id="logo" name="logo_url" className="champ" defaultValue={garage.logo_url ?? ''} />
          </div>
          <div>
            <label className="etiquette" htmlFor="couleur">Couleur</label>
            <input id="couleur" name="couleur_primaire" type="color"
              className="champ h-14 p-1" defaultValue={garage.couleur_primaire} />
          </div>
        </div>

        <fieldset>
          <legend className="etiquette">Disposition de la page</legend>
          <div className="space-y-2">
            {GABARITS.map(([valeur, titre, explication]) => (
              <label key={valeur}
                className="flex cursor-pointer items-start gap-3 border-2 border-ardoise-200 p-3 has-[:checked]:border-atelier">
                <input type="radio" name="gabarit" value={valeur} className="mt-1 h-6 w-6 accent-atelier"
                  defaultChecked={garage.gabarit === valeur} />
                <span>
                  <span className="block font-semibold text-ardoise-950">{titre}</span>
                  <span className="text-sm text-ardoise-600">{explication}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="etiquette" htmlFor="taux">Taux horaire main-d’œuvre TTC (€)</label>
          <input id="taux" name="taux_horaire_ttc" className="champ" inputMode="decimal"
            defaultValue={garage.taux_horaire_ttc ?? ''} />
        </div>

        <label className="flex min-h-tactile cursor-pointer items-center gap-3">
          <input type="checkbox" name="affiche_prix" className="h-6 w-6 accent-atelier"
            defaultChecked={garage.affiche_prix} />
          <span className="font-semibold text-ardoise-950">
            Afficher les prix sur ma page publique
          </span>
        </label>

        <button className="bouton-principal w-full">Enregistrer ma page</button>
      </form>
    </div>
  );
}

function BoutonForm({
  action, champs, children, danger, disabled,
}: {
  action: (f: FormData) => Promise<void>;
  champs: Record<string, string>; children: React.ReactNode;
  danger?: boolean; disabled?: boolean;
}) {
  return (
    <form action={action}>
      {Object.entries(champs).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button disabled={disabled}
        className={`bouton px-4 ${danger
          ? 'border-2 border-refus bg-white text-refus'
          : 'border border-ardoise-200 bg-white text-ardoise-800'}`}>
        {children}
      </button>
    </form>
  );
}
