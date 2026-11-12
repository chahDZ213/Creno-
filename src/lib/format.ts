import { FUSEAU } from './disponibilites';

export const heure = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU, hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso)).replace(':', 'h');

export const jourLong = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU, weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(iso));

export const jourCourt = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: FUSEAU, weekday: 'short', day: 'numeric', month: 'short',
  }).format(new Date(iso));

export const creneauLisible = (c: { debut: string; fin: string }) =>
  `${jourLong(c.debut)} à ${heure(c.debut)}`;

export const prix = (v: number | null | undefined) =>
  v == null ? 'Sur devis'
    : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
      .format(Number(v));

export const duree = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
};

export const depuis = (iso: string, maintenant = new Date()) => {
  const heures = (maintenant.getTime() - new Date(iso).getTime()) / 3_600_000;
  if (heures < 1) return 'il y a moins d\'une heure';
  if (heures < 24) return `il y a ${Math.floor(heures)} h`;
  const j = Math.floor(heures / 24);
  return j === 1 ? 'hier' : `il y a ${j} jours`;
};

/**
 * « 2026-04-08 » → « mercredi 8 avril ».
 *
 * Midi UTC plutôt que minuit : à minuit, un décalage d'une heure suffit à
 * faire basculer la date d'un jour, et la restitution annoncée au client
 * tomberait la veille.
 */
export const jourLisible = (iso: string) => {
  const [a, m, j] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris',
  }).format(new Date(Date.UTC(a, m - 1, j, 12)));
};
