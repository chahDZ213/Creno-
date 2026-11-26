import type { Metadata } from 'next';
import PageLegale from '@/components/PageLegale';

export const metadata: Metadata = { title: 'Politique de confidentialité — Créno' };

export default function Confidentialite() {
  return (
    <PageLegale titre="Politique de confidentialité" maj="26 novembre 2026">
      <p>
        Créno est un outil de prise de rendez-vous pour les garages. Cette page explique quelles
        données passent par Créno, pourquoi, combien de temps elles sont gardées et quels sont
        vos droits. [À FAIRE RELIRE PAR UN AVOCAT]
      </p>

      <h2>Qui est responsable de vos données ?</h2>
      <ul>
        <li>
          <strong>Vous demandez un rendez-vous à un garage</strong> : le garage est responsable
          du traitement. Créno agit pour son compte, en tant que sous-traitant (article 28 du
          RGPD). Pour exercer vos droits, adressez-vous au garage ou à Créno, qui transmettra.
        </li>
        <li>
          <strong>Vous êtes un garage qui utilise Créno</strong> : l’éditeur de Créno (voir les
          mentions légales) est responsable du traitement de vos données de compte.
        </li>
      </ul>

      <h2>Données collectées</h2>
      <p>Quand vous envoyez une demande de rendez-vous :</p>
      <ul>
        <li>nom, numéro de téléphone, adresse e-mail (facultative), préférence de contact ;</li>
        <li>véhicule : immatriculation, marque, modèle, année, kilométrage (facultatifs sauf la plaque) ;</li>
        <li>prestations demandées, description libre du problème et créneaux souhaités ;</li>
        <li>suivi de la demande : statut, réponse et messages du garage, date de restitution.</li>
      </ul>
      <p>
        Pour les garages : nom, adresse, téléphone et e-mail du garage, réglages de l’agenda,
        prestations et tarifs, et l’adresse e-mail de connexion.
      </p>
      <p>
        Créno n’utilise <strong>aucun cookie publicitaire ni outil de statistiques</strong>. Le
        seul cookie déposé sert à garder un garage connecté à son espace : il est strictement
        nécessaire et ne demande pas de consentement.
      </p>

      <h2>Pourquoi</h2>
      <ul>
        <li>transmettre votre demande au garage et lui permettre d’y répondre (exécution de mesures précontractuelles à votre demande) ;</li>
        <li>vous envoyer par SMS ou e-mail la confirmation, la réponse du garage, le rappel de la veille et l’annonce de la restitution du véhicule (messages de service, jamais de publicité) ;</li>
        <li>fournir le service aux garages abonnés (exécution du contrat).</li>
      </ul>

      <h2>Combien de temps</h2>
      <p>
        Les demandes et rendez-vous sont conservés pendant la durée nécessaire au garage pour
        suivre ses clients, et au plus [À COMPLÉTER : 3 ans] après le dernier rendez-vous. Les
        données d’un garage sont supprimées [À COMPLÉTER : 3 mois] après la fin de son
        abonnement, sauf obligation légale de conservation (factures : 10 ans).
      </p>

      <h2>Qui y a accès</h2>
      <ul>
        <li>le garage auquel vous avez adressé votre demande, et lui seul ;</li>
        <li>nos prestataires techniques : Vercel (hébergement), Supabase (base de données), Twilio (envoi des SMS), et le fournisseur d’e-mails (Google/Gmail ou Resend selon la configuration).</li>
      </ul>
      <p>
        Certains de ces prestataires sont établis aux États-Unis. Les transferts sont encadrés
        par le Data Privacy Framework UE–États-Unis ou par les clauses contractuelles types de
        la Commission européenne. Vos données ne sont jamais vendues.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, leur
        portabilité, la limitation du traitement ou vous y opposer, en écrivant à
        [À COMPLÉTER : adresse e-mail de contact]. Réponse sous un mois. Vous pouvez aussi
        introduire une réclamation auprès de la CNIL (cnil.fr).
      </p>
    </PageLegale>
  );
}
