import type { Metadata } from 'next';
import PageLegale from '@/components/PageLegale';
import { CONTACT } from '@/lib/editeur';

export const metadata: Metadata = { title: 'Mentions légales — Créno' };

export default function Mentions() {
  return (
    <PageLegale titre="Mentions légales" maj="26 novembre 2026">
      <h2>Éditeur</h2>
      <p>
        Créno est édité par <strong>Chahine Meftout</strong>, entrepreneur individuel
        (sole trader), Royaume-Uni. Un sole trader n’est pas inscrit à la Companies House et
        n’a donc pas de numéro de société.<br />
        Contact : <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
      <h2>Responsable de la publication</h2>
      <p>Chahine Meftout.</p>
      <h2>Hébergement</h2>
      <p>
        Application : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com.<br />
        Base de données : Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992 — supabase.com.
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
