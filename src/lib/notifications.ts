/**
 * Envoi d'emails (Resend) et de SMS (Twilio).
 *
 * Sans clés, les deux transports écrivent en console : l'application
 * fonctionne de bout en bout en développement, et le message envoyé est
 * exactement celui qui partira en production.
 */
import { creneauLisible } from './format';
import type { Creneau, Demande, Garage } from './types';

const RESEND = process.env.RESEND_API_KEY;
const EXPEDITEUR = process.env.CRENO_EMAIL_EXPEDITEUR ?? 'Créno <bonjour@creno.fr>';
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_NUMERO;
const BASE = process.env.NEXT_PUBLIC_URL_BASE ?? 'http://localhost:3000';

type Email = { a: string; sujet: string; texte: string };
type Sms = { a: string; texte: string };

export async function envoyerEmail({ a, sujet, texte }: Email): Promise<void> {
  if (!RESEND) {
    console.info(`[email → ${a}] ${sujet}\n${texte}\n`);
    return;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EXPEDITEUR, to: [a], subject: sujet, text: texte }),
  });
  if (!r.ok) console.error('[email] échec', r.status, await r.text());
}

export async function envoyerSms({ a, texte }: Sms): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.info(`[sms → ${a}] ${texte}\n`);
    return;
  }
  const r = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: TWILIO_FROM, To: a, Body: texte }),
    },
  );
  if (!r.ok) console.error('[sms] échec', r.status, await r.text());
}

const lienFiche = (id: string) => `${BASE}/app/demandes/${id}`;
const lienSuivi = (token: string) => `${BASE}/suivi/${token}`;

/** Motif en cinq mots, pour tenir dans un SMS. */
export function motifCourt(
  libelles: string[], descriptionLibre: string | null,
): string {
  const source = libelles.length ? libelles.join(', ')
    : (descriptionLibre ?? 'dépôt diagnostic');
  return source.split(/\s+/).slice(0, 5).join(' ');
}

/* ------------------------------------------------------- vers le garage */

/** Non optionnel : sans ce SMS, le garagiste répond en 48 h. */
export async function notifierNouvelleDemande(
  garage: Garage, demande: Demande, libelles: string[],
): Promise<void> {
  const motif = motifCourt(libelles, demande.description_libre);
  const sms =
    `Créno — nouvelle demande ${demande.vehicule_immat} : ${motif}. ${lienFiche(demande.id)}`;
  const taches: Promise<void>[] = [];
  if (garage.telephone) taches.push(envoyerSms({ a: garage.telephone, texte: sms }));
  if (garage.email) {
    taches.push(envoyerEmail({
      a: garage.email,
      sujet: `Nouvelle demande ${demande.reference} — ${demande.vehicule_immat}`,
      texte: [
        `${demande.client_nom} · ${demande.client_tel}`,
        `Véhicule : ${demande.vehicule_immat} ${[demande.vehicule_marque, demande.vehicule_modele].filter(Boolean).join(' ')}`,
        `Demande : ${libelles.join(', ') || 'Dépôt du véhicule pour diagnostic'}`,
        demande.description_libre ? `« ${demande.description_libre} »` : '',
        '',
        'Créneaux souhaités :',
        ...demande.creneaux_souhaites.map((c, i) => `  ${i + 1}. ${creneauLisible(c)}`),
        '',
        `Répondre : ${lienFiche(demande.id)}`,
      ].filter(Boolean).join('\n'),
    }));
  }
  await Promise.all(taches);
}

export async function relancerGarage(
  garage: Garage, demande: Demande,
): Promise<void> {
  if (!garage.telephone) return;
  await envoyerSms({
    a: garage.telephone,
    texte: `Créno — demande ${demande.reference} (${demande.vehicule_immat}) sans réponse depuis 12 h. ${lienFiche(demande.id)}`,
  });
}

/* ------------------------------------------------------- vers le client */

export async function notifierConfirmation(
  garage: Garage, demande: Demande, creneau: Creneau,
): Promise<void> {
  if (!demande.client_email) return;
  await envoyerEmail({
    a: demande.client_email,
    sujet: `Rendez-vous confirmé — ${garage.nom}`,
    texte: [
      `Bonjour ${demande.client_nom},`,
      '',
      `${garage.nom} confirme votre rendez-vous :`,
      `  ${creneauLisible(creneau)}`,
      `  Véhicule ${demande.vehicule_immat}`,
      garage.adresse ? `  ${garage.adresse}` : '',
      '',
      `Suivi : ${lienSuivi(demande.token_suivi)}`,
      `Référence ${demande.reference}`,
    ].filter(Boolean).join('\n'),
  });
}

export async function notifierAlternative(
  garage: Garage, demande: Demande, creneau: Creneau, message: string | null,
): Promise<void> {
  const lien = lienSuivi(demande.token_suivi);
  const taches: Promise<void>[] = [];
  if (demande.client_email) {
    taches.push(envoyerEmail({
      a: demande.client_email,
      sujet: `Autre créneau proposé — ${garage.nom}`,
      texte: [
        `Bonjour ${demande.client_nom},`,
        '',
        `${garage.nom} ne peut pas retenir les créneaux demandés et vous propose :`,
        `  ${creneauLisible(creneau)}`,
        message ? `\n« ${message} »` : '',
        '',
        `Accepter ou refuser en un clic : ${lien}`,
      ].filter(Boolean).join('\n'),
    }));
  }
  if (demande.client_tel) {
    taches.push(envoyerSms({
      a: demande.client_tel,
      texte: `${garage.nom} vous propose ${creneauLisible(creneau)} pour ${demande.vehicule_immat}. Répondre : ${lien}`,
    }));
  }
  await Promise.all(taches);
}

export async function notifierRefus(
  garage: Garage, demande: Demande, motif: string | null,
): Promise<void> {
  if (!demande.client_email) return;
  await envoyerEmail({
    a: demande.client_email,
    sujet: `Demande ${demande.reference} — ${garage.nom}`,
    texte: [
      `Bonjour ${demande.client_nom},`,
      '',
      `${garage.nom} ne peut pas donner suite à votre demande.`,
      motif ? `Motif : ${motif}` : '',
      garage.telephone ? `\nPour en parler : ${garage.telephone}` : '',
    ].filter(Boolean).join('\n'),
  });
}

export async function rappelVeille(
  garage: Garage, demande: Demande, creneau: Creneau,
): Promise<void> {
  if (!demande.client_tel) return;
  await envoyerSms({
    a: demande.client_tel,
    texte: `Rappel : demain ${creneauLisible(creneau).split(' à ')[1]} chez ${garage.nom}, véhicule ${demande.vehicule_immat}.`,
  });
}
