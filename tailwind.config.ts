import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Bleu d'atelier : la couleur des plaques d'immatriculation et des
        // panneaux de service. Le garage la remplace par la sienne.
        atelier: 'var(--creno-primaire)',
        'atelier-fonce': 'var(--creno-primaire-fonce)',
        ardoise: {
          950: '#10151b', 800: '#26313d', 600: '#4c5c6e', 400: '#8d9baa',
          200: '#ccd4dd', 100: '#e4e9ee', 50: '#f2f5f8',
        },
        // Jaune de signalisation, réservé à l'urgence.
        alerte: '#F2B705',
        refus: '#A32020',
        ok: '#166534',
      },
      fontSize: { base: ['1.0625rem', '1.55'] },
      minHeight: { tactile: '3rem' },
    },
  },
  plugins: [],
} satisfies Config;
