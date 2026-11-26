import type { Metadata } from 'next';
import PageLegale from '@/components/PageLegale';

export const metadata: Metadata = { title: 'Mentions légales — Créno' };

export default function Mentions() {
  return (
    <PageLegale titre="Mentions légales" maj="26 novembre 2026">
      <h2>Éditeur</h2>
      <p>
        [À COMPLÉTER : nom et prénom ou dénomination sociale, forme juridique, adresse,
        numéro SIREN/RCS, numéro de TVA intracommunautaire le cas échéant]<br />
        Contact : [À COMPLÉTER : adresse e-mail]
      </p>
      <h2>Responsable de la publication</h2>
      <p>[À COMPLÉTER : nom du responsable de la publication]</p>
      <h2>Hébergement</h2>
      <p>
        Application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com.<br />
        Base de données : Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992 — supabase.com
        (région d’hébergement : [À COMPLÉTER]).
      </p>
      <h2>Pages des garages</h2>
      <p>
        Chaque page de prise de rendez-vous (créno…/nom-du-garage) présente un garage
        indépendant. Ses informations (nom, adresse, prestations, prix) sont publiées sous la
        responsabilité de ce garage.
      </p>
    </PageLegale>
  );
}
