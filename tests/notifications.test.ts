import { describe, expect, it } from 'vitest';
import { motifCourt, notifierVoiturePrete } from '../src/lib/notifications';

describe('motifCourt', () => {
  it('tient en cinq mots à partir des prestations', () => {
    expect(motifCourt(['Plaquettes avant', 'Géométrie / parallélisme'], null))
      .toBe('Plaquettes avant, Géométrie / parallélisme');
  });
  it('coupe une description bavarde', () => {
    expect(motifCourt([], 'elle démarre plus le matin quand il fait froid'))
      .toBe('elle démarre plus le matin');
  });
  it('retombe sur le dépôt quand rien n’est dit', () => {
    expect(motifCourt([], null)).toBe('dépôt diagnostic');
  });
});

describe('notifierVoiturePrete', () => {
  const garage = {
    nom: 'ABRauto', adresse: '31 chemin du Fore', telephone: '0651783434',
  } as unknown as Parameters<typeof notifierVoiturePrete>[0];
  const demande = {
    client_nom: 'Chah Chiron', client_tel: '+33600000000',
    client_email: 'client@exemple.fr', vehicule_immat: 'EP-852-HY',
    reference: 'WC-6NDA', token_suivi: 'jeton',
  } as unknown as Parameters<typeof notifierVoiturePrete>[1];

  /** Sans clés Twilio ni SMTP, les deux transports écrivent en console. */
  async function capturer(g = garage, d = demande) {
    const lignes: string[] = [];
    const vraiInfo = console.info;
    const vraiWarn = console.warn;
    console.info = (...a: unknown[]) => { lignes.push(a.join(' ')); };
    console.warn = () => {};
    try { await notifierVoiturePrete(g, d); }
    finally { console.info = vraiInfo; console.warn = vraiWarn; }
    return lignes.join('\n');
  }

  it('envoie un SMS qui tient en un coup d’œil : garage, plaque, numéro', async () => {
    const sortie = await capturer();
    expect(sortie).toContain('[sms → +33600000000]');
    expect(sortie).toContain('ABRauto : votre EP-852-HY est prête.');
    expect(sortie).toContain('0651783434');
  });

  it('envoie aussi un e-mail avec l’adresse et le lien de suivi', async () => {
    const sortie = await capturer();
    expect(sortie).toContain('[email → client@exemple.fr]');
    expect(sortie).toContain('Votre véhicule est prêt — ABRauto');
    expect(sortie).toContain('31 chemin du Fore');
    expect(sortie).toContain('/suivi/jeton');
    expect(sortie).toContain('WC-6NDA');
  });

  it('ne plante pas quand le client n’a laissé qu’un téléphone', async () => {
    const sortie = await capturer(garage, { ...demande, client_email: null } as typeof demande);
    expect(sortie).toContain('[sms → +33600000000]');
    expect(sortie).not.toContain('[email →');
  });

  it('ne plante pas quand le client n’a laissé qu’un e-mail', async () => {
    const sortie = await capturer(garage, { ...demande, client_tel: null } as typeof demande);
    expect(sortie).toContain('[email → client@exemple.fr]');
    expect(sortie).not.toContain('[sms →');
  });
});
