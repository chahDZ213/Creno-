import type { Metadata } from 'next';
import Link from 'next/link';
import PageLegale from '@/components/PageLegale';

export const metadata: Metadata = { title: 'Conditions d’utilisation — Créno' };

export default function Cgu() {
  return (
    <PageLegale titre="Conditions d’utilisation" maj="26 novembre 2026">
      <p>[À FAIRE RELIRE PAR UN AVOCAT]</p>

      <h2>Le service</h2>
      <p>
        Créno permet aux clients d’un garage de lui adresser une demande de rendez-vous en
        ligne, et au garage d’y répondre. L’utilisation est gratuite pour les clients.
      </p>

      <h2>Une demande n’est pas une réservation</h2>
      <p>
        Envoyer une demande n’engage ni le client ni le garage. Le rendez-vous n’existe qu’une
        fois confirmé par le garage. Le garage peut proposer un autre créneau ou refuser.
        Le contrat de réparation est conclu directement entre le client et le garage : Créno
        n’y est pas partie, et les prix affichés sont ceux communiqués par le garage.
      </p>

      <h2>Engagements de l’utilisateur</h2>
      <ul>
        <li>donner des coordonnées exactes et les siennes (ou celles d’une personne qui l’y a autorisé) ;</li>
        <li>ne pas envoyer de demandes fictives ou abusives ;</li>
        <li>pour les garages : publier des informations exactes (horaires, prix, prestations) et traiter les données de leurs clients dans le respect du RGPD.</li>
      </ul>

      <h2>Abonnement des garages</h2>
      <p>
        L’abonnement garage est mensuel, sans engagement, à <strong>renouvellement
        automatique</strong> chaque mois jusqu’à résiliation. Il se résilie à tout moment en
        ligne ; l’accès reste ouvert jusqu’à la fin du mois payé. Les frais de mise en service
        éventuels sont annoncés avant tout paiement. [À COMPLÉTER : prix en vigueur]
      </p>

      <h2>Responsabilité</h2>
      <p>
        Créno fait de son mieux pour que le service fonctionne en permanence, sans pouvoir le
        garantir. Créno n’est pas responsable des prestations réalisées par les garages.
      </p>

      <h2>Données personnelles</h2>
      <p>Voir la <Link className="underline" href="/confidentialite">politique de confidentialité</Link>.</p>

      <h2>Droit applicable</h2>
      <p>
        Droit français. En cas de litige, un client consommateur peut recourir gratuitement à un
        médiateur de la consommation : [À COMPLÉTER : nom et site du médiateur].
      </p>
    </PageLegale>
  );
}
