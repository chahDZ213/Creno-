'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Les quatre écrans de l'atelier, à portée de pouce. */
const ONGLETS = [
  { href: '/app', libelle: 'Demandes', icone: 'demandes' },
  { href: '/app/planning', libelle: 'Planning', icone: 'planning' },
  { href: '/app/clients', libelle: 'Clients', icone: 'clients' },
  { href: '/app/reglages', libelle: 'Réglages', icone: 'reglages' },
] as const;

function Icone({ nom, actif }: { nom: string; actif: boolean }) {
  const commun = {
    width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: actif ? 2.4 : 1.9,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (nom === 'demandes') {
    return (
      <svg {...commun}>
        <path d="M4 7h16M4 12h16M4 17h9" />
      </svg>
    );
  }
  if (nom === 'planning') {
    return (
      <svg {...commun}>
        <rect x="3" y="5" width="18" height="16" rx="2.5" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    );
  }
  if (nom === 'clients') {
    return (
      <svg {...commun}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
      </svg>
    );
  }
  return (
    <svg {...commun}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.6M12 18.6v2.6M21.2 12h-2.6M5.4 12H2.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8M18.5 18.5l-1.8-1.8M7.3 7.3L5.5 5.5" />
    </svg>
  );
}

export default function BarreOnglets({ enAttente }: { enAttente: number }) {
  const chemin = usePathname();

  return (
    <nav
      aria-label="Navigation de l’atelier"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-ardoise-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-3xl">
        {ONGLETS.map((o) => {
          const actif = o.href === '/app'
            ? chemin === '/app' || chemin.startsWith('/app/demandes')
            : chemin.startsWith(o.href);
          return (
            <li key={o.href} className="flex-1">
              <Link
                href={o.href}
                aria-current={actif ? 'page' : undefined}
                className={`relative flex min-h-tactile flex-col items-center justify-center gap-0.5 py-2 ${
                  actif ? 'text-atelier' : 'text-ardoise-600'
                }`}
              >
                <span className="relative">
                  <Icone nom={o.icone} actif={actif} />
                  {o.icone === 'demandes' && enAttente > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-alerte px-1 text-[0.75rem] font-bold text-ardoise-950">
                      {enAttente > 9 ? '9+' : enAttente}
                    </span>
                  )}
                </span>
                <span className={`text-[0.75rem] ${actif ? 'font-bold' : 'font-semibold'}`}>
                  {o.libelle}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
