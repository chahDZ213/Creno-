'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRESTATIONS_DEFAUT } from '@/lib/defauts';
import { duree as formatDuree } from '@/lib/format';
import { slugifier } from '@/lib/slug';
import { JOURS, type Gabarit, type Horaires, type Jour } from '@/lib/types';
import { terminerInstallation } from './actions';

/* Une prestation du catalogue proposé, telle que le garage la façonne ici. */
type Ligne = {
  libelle: string;
  duree_minutes: number;
  prix: string;        // saisi, donc texte : « 69,90 » doit survivre à la frappe
  retenue: boolean;
};

type Reponses = {
  nom: string; slug: string; slugTouche: boolean;
  adresse: string; telephone: string; email: string;
  jours: Record<Jour, { ouvert: boolean; ouverture: string; fermeture: string;
    pause: boolean; pauseDebut: string; pauseFin: string }>;
  nb_postes: number;
  delai_min_heures: number;
  horizon_jours: number;
  lignes: Ligne[];
  sur_mesure: string;
  affiche_prix: boolean;
  taux: string;
  couleur: string;
  gabarit: Gabarit;
};

const jourDefaut = (ouvert: boolean) => ({
  ouvert, ouverture: '08:00', fermeture: '18:00',
  pause: true, pauseDebut: '12:00', pauseFin: '14:00',
});

const COULEURS = [
  { hex: '#1D4E89', nom: 'Bleu atelier' },
  { hex: '#15616D', nom: 'Bleu canard' },
  { hex: '#1B5E3A', nom: 'Vert' },
  { hex: '#8A1C1C', nom: 'Rouge' },
  { hex: '#2B2D42', nom: 'Anthracite' },
  { hex: '#A35A00', nom: 'Orange brûlé' },
];

const GABARITS: Array<{ id: Gabarit; nom: string; detail: string }> = [
  { id: 'etapes', nom: 'En étapes', detail: 'Quatre écrans qui se suivent, avec une barre de progression. Le plus simple sur un téléphone.' },
  { id: 'compact', nom: 'Tout d\'un bloc', detail: 'Une seule page qui défile. Le client voit tout d\'un coup.' },
  { id: 'colonnes', nom: 'Deux colonnes', detail: 'Formulaire à gauche, calendrier à droite. Repasse en étapes sur un téléphone.' },
];

export default function Parcours({ email }: { email: string }) {
  const router = useRouter();
  const [etape, setEtape] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [slugFinal, setSlugFinal] = useState<string | null>(null);

  const [r, setR] = useState<Reponses>({
    nom: '', slug: '', slugTouche: false,
    adresse: '', telephone: '', email,
    jours: {
      lundi: jourDefaut(true), mardi: jourDefaut(true), mercredi: jourDefaut(true),
      jeudi: jourDefaut(true), vendredi: jourDefaut(true),
      samedi: jourDefaut(false), dimanche: jourDefaut(false),
    },
    nb_postes: 2,
    delai_min_heures: 24,
    horizon_jours: 21,
    lignes: PRESTATIONS_DEFAUT.map((p) => ({
      libelle: p.libelle, duree_minutes: p.duree_minutes, prix: '', retenue: true,
    })),
    sur_mesure: '',
    affiche_prix: false,
    taux: '',
    couleur: '#1D4E89',
    gabarit: 'etapes',
  });

  const set = (p: Partial<Reponses>) => setR((v) => ({ ...v, ...p }));

  // Le slug suit le nom tant que le garage ne l'a pas modifié lui-même.
  const majNom = (nom: string) =>
    set({ nom, slug: r.slugTouche ? r.slug : slugifier(nom) });

  const retenues = useMemo(() => r.lignes.filter((l) => l.retenue), [r.lignes]);
  const majLigne = (i: number, p: Partial<Ligne>) =>
    set({ lignes: r.lignes.map((l, k) => (k === i ? { ...l, ...p } : l)) });

  const ajouterSurMesure = () => {
    const libelle = r.sur_mesure.trim();
    if (!libelle) return;
    set({
      sur_mesure: '',
      lignes: [...r.lignes, { libelle, duree_minutes: 60, prix: '', retenue: true }],
    });
  };

  const envoyer = async () => {
    setEnvoi(true); setErreur(null);
    const horaires: Horaires = {};
    for (const j of JOURS) {
      const d = r.jours[j];
      horaires[j] = d.ouvert ? {
        ouverture: d.ouverture, fermeture: d.fermeture,
        pause: d.pause ? { debut: d.pauseDebut, fin: d.pauseFin } : null,
      } : null;
    }
    const nombre = (v: string) => {
      const n = Number(v.replace(',', '.').trim());
      return v.trim() && Number.isFinite(n) && n >= 0 ? n : null;
    };
    const res = await terminerInstallation({
      nom: r.nom, slug: r.slug, adresse: r.adresse,
      telephone: r.telephone, email: r.email,
      horaires,
      nb_postes: r.nb_postes,
      delai_min_heures: r.delai_min_heures,
      horizon_jours: r.horizon_jours,
      prestations: retenues.map((l) => ({
        libelle: l.libelle, duree_minutes: l.duree_minutes,
        prix_ttc: r.affiche_prix ? nombre(l.prix) : null,
      })),
      affiche_prix: r.affiche_prix,
      taux_horaire_ttc: nombre(r.taux),
      couleur_primaire: r.couleur,
      gabarit: r.gabarit,
    });
    setEnvoi(false);
    if ('erreur' in res && res.erreur) { setErreur(res.erreur); return; }
    if ('slug' in res && res.slug) { setSlugFinal(res.slug); setEtape(etapes.length - 1); }
  };

  /* ------------------------------------------------------------- écrans */

  const etapes: Array<{
    titre: string; sous?: string; prete: boolean; contenu: React.ReactNode;
  }> = [
    {
      titre: 'Comment s’appelle votre garage ?',
      sous: 'C’est le nom que vos clients verront en haut de la page de réservation.',
      prete: r.nom.trim().length >= 2,
      contenu: (
        <div className="space-y-5">
          <Champ label="Nom du garage" autoFocus value={r.nom}
            onChange={majNom} placeholder="Garage Dupont" />
          <div>
            <Champ label="Adresse de votre page de réservation"
              value={r.slug}
              onChange={(v) => set({ slug: slugifier(v), slugTouche: true })}
              prefixe="creno.app/" placeholder="garage-dupont" />
            <p className="mt-2 text-sm text-ardoise-600">
              C’est l’adresse derrière le QR code de votre vitrine. Elle se lit
              au téléphone, donc sans accent ni majuscule.
            </p>
          </div>
        </div>
      ),
    },
    {
      titre: 'Où vous trouve-t-on ?',
      sous: 'L’adresse apparaît sur la page de réservation et dans l’e-mail de confirmation du client.',
      prete: true,
      contenu: (
        <div className="space-y-5">
          <Champ label="Adresse de l’atelier" value={r.adresse}
            onChange={(v) => set({ adresse: v })}
            placeholder="12 rue des Artisans, 74300 Cluses" />
          <div>
            <Champ label="Téléphone de l’atelier" type="tel" value={r.telephone}
              onChange={(v) => set({ telephone: v })} placeholder="+33 6 12 34 56 78" />
            <p className="mt-2 text-sm text-ardoise-600">
              C’est sur ce numéro qu’arrive le SMS quand un client demande un
              rendez-vous. Sans lui, vous ne serez prévenu que par e-mail.
            </p>
          </div>
          <Champ label="E-mail de l’atelier" type="email" value={r.email}
            onChange={(v) => set({ email: v })} placeholder="contact@garage-dupont.fr" />
        </div>
      ),
    },
    {
      titre: 'Quand êtes-vous ouvert ?',
      sous: 'Décochez un jour pour le fermer. Aucun créneau ne sera proposé en dehors.',
      prete: JOURS.some((j) => r.jours[j].ouvert),
      contenu: (
        <div className="space-y-3">
          {JOURS.map((j) => {
            const d = r.jours[j];
            const maj = (p: Partial<typeof d>) =>
              set({ jours: { ...r.jours, [j]: { ...d, ...p } } });
            return (
              <div key={j} className={`rounded-xl border p-3 ${d.ouvert
                ? 'border-ardoise-200 bg-white' : 'border-ardoise-100 bg-ardoise-50'}`}>
                <label className="flex min-h-tactile items-center gap-3">
                  <input type="checkbox" checked={d.ouvert}
                    onChange={(e) => maj({ ouvert: e.target.checked })}
                    className="h-5 w-5 accent-[var(--creno-primaire)]" />
                  <span className="flex-1 font-semibold capitalize text-ardoise-950">{j}</span>
                  {!d.ouvert && <span className="text-sm text-ardoise-400">Fermé</span>}
                </label>
                {d.ouvert && (
                  <div className="mt-3 space-y-3 border-t border-ardoise-100 pt-3">
                    <div className="flex items-center gap-2">
                      <Heure value={d.ouverture} onChange={(v) => maj({ ouverture: v })} />
                      <span className="text-ardoise-400">→</span>
                      <Heure value={d.fermeture} onChange={(v) => maj({ fermeture: v })} />
                    </div>
                    <label className="flex items-center gap-3 text-sm">
                      <input type="checkbox" checked={d.pause}
                        onChange={(e) => maj({ pause: e.target.checked })}
                        className="h-4 w-4 accent-[var(--creno-primaire)]" />
                      <span className="text-ardoise-600">Pause déjeuner</span>
                      {d.pause && (
                        <span className="flex items-center gap-2">
                          <Heure value={d.pauseDebut} onChange={(v) => maj({ pauseDebut: v })} />
                          <span className="text-ardoise-400">→</span>
                          <Heure value={d.pauseFin} onChange={(v) => maj({ pauseFin: v })} />
                        </span>
                      )}
                    </label>
                  </div>
                )}
              </div>
            );
          })}
          <button type="button" onClick={() => {
            const l = r.jours.lundi;
            const copie = { ...r.jours };
            for (const j of ['mardi', 'mercredi', 'jeudi', 'vendredi'] as Jour[]) {
              copie[j] = { ...l };
            }
            set({ jours: copie });
          }}
            className="min-h-tactile w-full rounded-xl border border-ardoise-200 px-4 font-semibold text-atelier">
            Appliquer le lundi à toute la semaine
          </button>
        </div>
      ),
    },
    {
      titre: 'Combien de voitures en même temps ?',
      sous: 'Le nombre de postes de travail. Deux postes, c’est deux rendez-vous possibles à la même heure.',
      prete: true,
      contenu: (
        <Choix value={r.nb_postes} onChange={(v) => set({ nb_postes: v })}
          options={[
            { v: 1, nom: 'Une seule', detail: 'Un pont, ou je travaille seul.' },
            { v: 2, nom: 'Deux', detail: 'Le cas le plus courant.' },
            { v: 3, nom: 'Trois' },
            { v: 4, nom: 'Quatre ou plus', detail: 'Ajustable ensuite dans les réglages.' },
          ]} />
      ),
    },
    {
      titre: 'À partir de quand peut-on réserver ?',
      sous: 'Le temps qu’il vous faut avant d’accueillir une voiture.',
      prete: true,
      contenu: (
        <Choix value={r.delai_min_heures} onChange={(v) => set({ delai_min_heures: v })}
          options={[
            { v: 2, nom: 'Dans deux heures', detail: 'Je peux prendre quelqu’un dans la foulée.' },
            { v: 24, nom: 'Demain', detail: 'Il me faut la journée pour m’organiser.' },
            { v: 48, nom: 'Dans deux jours' },
            { v: 72, nom: 'Dans trois jours', detail: 'Mon planning est chargé.' },
          ]} />
      ),
    },
    {
      titre: 'Jusqu’à quand ?',
      sous: 'Au-delà, le client ne voit plus de créneaux. Mieux vaut court que de s’engager trop loin.',
      prete: true,
      contenu: (
        <Choix value={r.horizon_jours} onChange={(v) => set({ horizon_jours: v })}
          options={[
            { v: 14, nom: 'Deux semaines' },
            { v: 21, nom: 'Trois semaines', detail: 'Le réglage de départ.' },
            { v: 30, nom: 'Un mois' },
            { v: 60, nom: 'Deux mois', detail: 'Pour un atelier qui planifie loin.' },
          ]} />
      ),
    },
    {
      titre: 'Qu’est-ce que vous faites ?',
      sous: 'Cochez vos prestations et corrigez les durées. C’est la durée qui décide des créneaux proposés.',
      prete: retenues.length > 0,
      contenu: (
        <div className="space-y-2">
          {r.lignes.map((l, i) => (
            <div key={`${l.libelle}-${i}`}
              className={`rounded-xl border p-3 ${l.retenue
                ? 'border-ardoise-200 bg-white' : 'border-ardoise-100 bg-ardoise-50'}`}>
              <label className="flex min-h-tactile items-center gap-3">
                <input type="checkbox" checked={l.retenue}
                  onChange={(e) => majLigne(i, { retenue: e.target.checked })}
                  className="h-5 w-5 accent-[var(--creno-primaire)]" />
                <span className={`flex-1 font-semibold ${l.retenue
                  ? 'text-ardoise-950' : 'text-ardoise-400 line-through'}`}>
                  {l.libelle}
                </span>
                {l.retenue && (
                  <span className="flex items-center gap-2">
                    <input type="number" min={5} step={5} value={l.duree_minutes}
                      onChange={(e) => majLigne(i, { duree_minutes: Number(e.target.value) })}
                      aria-label={`Durée de ${l.libelle} en minutes`}
                      className="w-20 rounded-lg border border-ardoise-200 px-2 py-2 text-right" />
                    <span className="w-16 text-sm text-ardoise-600">
                      {formatDuree(l.duree_minutes)}
                    </span>
                  </span>
                )}
              </label>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <input value={r.sur_mesure}
              onChange={(e) => set({ sur_mesure: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ajouterSurMesure(); } }}
              placeholder="Une prestation qui manque…"
              className="min-h-tactile flex-1 rounded-xl border border-ardoise-200 px-4" />
            <button type="button" onClick={ajouterSurMesure}
              className="min-h-tactile rounded-xl bg-ardoise-100 px-4 font-semibold text-ardoise-800">
              Ajouter
            </button>
          </div>
          <p className="pt-1 text-sm text-ardoise-600">
            Un client qui ne coche rien dépose sa voiture pour diagnostic :
            trente minutes sont réservées, jamais une durée inventée.
          </p>
        </div>
      ),
    },
    {
      titre: 'Affichez-vous vos prix ?',
      sous: 'Beaucoup de garages préfèrent que non. Vous pourrez changer d’avis à tout moment.',
      prete: true,
      contenu: (
        <div className="space-y-5">
          <Choix value={r.affiche_prix ? 1 : 0}
            onChange={(v) => set({ affiche_prix: v === 1 })}
            options={[
              { v: 0, nom: 'Non', detail: 'Le client voit ce qu’il demande et sa durée, sans montant.' },
              { v: 1, nom: 'Oui', detail: 'Chaque prestation affiche son prix, avec un total marqué « estimation ».' },
            ]} />
          {r.affiche_prix && (
            <div className="space-y-3 rounded-xl border border-ardoise-200 bg-white p-4">
              <p className="font-semibold text-ardoise-950">Vos prix TTC</p>
              <p className="text-sm text-ardoise-600">
                Laissez vide ce qui ne se chiffre pas d’avance : le client lira
                « Sur devis ».
              </p>
              {r.lignes.map((l, i) => (l.retenue ? (
                <label key={`${l.libelle}-prix-${i}`} className="flex items-center gap-3">
                  <span className="flex-1 text-ardoise-800">{l.libelle}</span>
                  <input inputMode="decimal" value={l.prix}
                    onChange={(e) => majLigne(i, { prix: e.target.value })}
                    placeholder="—" aria-label={`Prix de ${l.libelle}`}
                    className="w-24 rounded-lg border border-ardoise-200 px-2 py-2 text-right" />
                  <span className="w-6 text-ardoise-600">€</span>
                </label>
              ) : null))}
              <div className="border-t border-ardoise-100 pt-3">
                <Champ label="Taux horaire TTC (optionnel)" value={r.taux}
                  onChange={(v) => set({ taux: v })} placeholder="75" suffixe="€/h" />
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      titre: 'À quoi ressemble votre page ?',
      sous: 'La couleur habille la page que voient vos clients.',
      prete: true,
      contenu: (
        <div className="space-y-6">
          <div>
            <p className="mb-3 font-semibold text-ardoise-950">Couleur</p>
            <div className="grid grid-cols-3 gap-2">
              {COULEURS.map((c) => (
                <button key={c.hex} type="button" onClick={() => set({ couleur: c.hex })}
                  aria-pressed={r.couleur === c.hex}
                  className={`min-h-tactile rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold ${
                    r.couleur === c.hex ? 'border-ardoise-950' : 'border-ardoise-200'}`}>
                  <span className="mb-2 block h-6 w-full rounded"
                    style={{ background: c.hex }} />
                  {c.nom}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 font-semibold text-ardoise-950">Mise en page</p>
            <Choix value={GABARITS.findIndex((g) => g.id === r.gabarit)}
              onChange={(i) => set({ gabarit: GABARITS[i].id })}
              options={GABARITS.map((g, i) => ({ v: i, nom: g.nom, detail: g.detail }))} />
          </div>
        </div>
      ),
    },
    {
      titre: 'Votre garage est prêt',
      prete: true,
      contenu: (
        <div className="space-y-5">
          <p className="text-ardoise-800">
            Voici l’adresse à mettre sur votre vitrine. Vos clients y demandent
            un rendez-vous sans compte et sans installer quoi que ce soit.
          </p>
          <div className="rounded-xl border-2 border-atelier bg-white p-4">
            <p className="break-all text-lg font-bold text-atelier">
              {typeof window !== 'undefined' ? window.location.origin : ''}/{slugFinal}
            </p>
          </div>
          <ul className="space-y-2 text-ardoise-800">
            <li>• Une demande arrive : vous recevez un SMS et un e-mail.</li>
            <li>• Sans réponse de votre part après douze heures, un rappel part.</li>
            <li>• La veille du rendez-vous, le client reçoit un SMS.</li>
            <li>• Tout se modifie dans Réglages, rien n’est figé.</li>
          </ul>
        </div>
      ),
    },
  ];

  const fin = etape === etapes.length - 1;
  const e = etapes[etape];
  const progression = Math.round(((etape + 1) / etapes.length) * 100);

  return (
    <div className="min-h-screen bg-ardoise-50 pb-28"
      style={{ ['--creno-primaire' as string]: r.couleur }}>
      <div className="h-1.5 w-full bg-ardoise-200">
        <div className="h-full bg-atelier transition-all duration-300"
          style={{ width: `${progression}%` }} />
      </div>

      <main className="mx-auto max-w-xl px-4 py-7">
        {!fin && (
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-ardoise-400">
            Question {etape + 1} sur {etapes.length - 1}
          </p>
        )}
        <h1 className="text-2xl font-bold leading-tight text-ardoise-950">{e.titre}</h1>
        {e.sous && <p className="mt-2 text-ardoise-600">{e.sous}</p>}
        <div className="mt-6">{e.contenu}</div>
        {erreur && (
          <p role="alert" className="mt-5 rounded-xl bg-refus/10 p-3 text-refus">
            L’enregistrement a échoué : {erreur}
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-ardoise-200 bg-white">
        <div className="mx-auto flex max-w-xl gap-3 px-4 py-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          {etape > 0 && !fin && (
            <button type="button" onClick={() => setEtape(etape - 1)}
              className="min-h-tactile rounded-xl border border-ardoise-200 px-5 font-semibold text-ardoise-800">
              Retour
            </button>
          )}
          {fin ? (
            <button type="button" onClick={() => router.push('/app')}
              className="min-h-tactile flex-1 rounded-xl bg-atelier px-5 font-bold text-white">
              Entrer dans mon tableau de bord
            </button>
          ) : etape === etapes.length - 2 ? (
            <button type="button" onClick={envoyer} disabled={!e.prete || envoi}
              className="min-h-tactile flex-1 rounded-xl bg-atelier px-5 font-bold text-white disabled:opacity-40">
              {envoi ? 'Enregistrement…' : 'Terminer'}
            </button>
          ) : (
            <button type="button" onClick={() => setEtape(etape + 1)} disabled={!e.prete}
              className="min-h-tactile flex-1 rounded-xl bg-atelier px-5 font-bold text-white disabled:opacity-40">
              Continuer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- petits éléments */

function Champ({ label, value, onChange, placeholder, type = 'text', prefixe, suffixe, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; prefixe?: string; suffixe?: string; autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-semibold text-ardoise-950">{label}</span>
      <span className="flex min-h-tactile items-center rounded-xl border border-ardoise-200 bg-white px-3
        focus-within:border-atelier focus-within:ring-2 focus-within:ring-atelier/30">
        {prefixe && <span className="shrink-0 text-ardoise-400">{prefixe}</span>}
        <input type={type} value={value} placeholder={placeholder}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          autoCapitalize={type === 'email' ? 'off' : 'sentences'}
          autoCorrect="off"
          onChange={(ev) => onChange(ev.target.value)}
          className="min-w-0 flex-1 bg-transparent py-3 outline-none" />
        {suffixe && <span className="shrink-0 text-ardoise-600">{suffixe}</span>}
      </span>
    </label>
  );
}

function Heure({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="time" value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-ardoise-200 bg-white px-2 py-2" />
  );
}

function Choix<T extends number>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void;
  options: Array<{ v: T; nom: string; detail?: string }>;
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
          className={`flex w-full min-h-tactile items-start gap-3 rounded-xl border-2 p-4 text-left ${
            value === o.v ? 'border-atelier bg-atelier/5' : 'border-ardoise-200 bg-white'}`}>
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            value === o.v ? 'border-atelier' : 'border-ardoise-200'}`}>
            {value === o.v && <span className="h-2.5 w-2.5 rounded-full bg-atelier" />}
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-ardoise-950">{o.nom}</span>
            {o.detail && <span className="mt-0.5 block text-sm text-ardoise-600">{o.detail}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}
