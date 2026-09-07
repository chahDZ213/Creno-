import Link from 'next/link';
import { monGarage } from '@/lib/serveur/session';
import { variables } from '@/lib/couleur';
import Deconnexion from '@/components/Deconnexion';

export const dynamic = 'force-dynamic';

const ONGLETS = [
  { href: '/app', libelle: 'Demandes' },
  { href: '/app/planning', libelle: 'Planning' },
  { href: '/app/reglages', libelle: 'Réglages' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { garage } = await monGarage();
  return (
    <div style={variables(garage.couleur_primaire)} className="min-h-screen pb-24">
      <header className="border-b border-ardoise-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <h1 className="flex-1 truncate text-lg font-bold text-ardoise-950">
            {garage.nom}
          </h1>
          <Link href={`/${garage.slug}`} className="text-sm font-semibold text-atelier underline">
            Ma page
          </Link>
          <Deconnexion />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>

      {/* Barre du pouce : le garagiste tient son téléphone d'une main. */}
      <nav className="fixed inset-x-0 bottom-0 border-t border-ardoise-200 bg-white">
        <ul className="mx-auto flex max-w-3xl">
          {ONGLETS.map((o) => (
            <li key={o.href} className="flex-1">
              <Link href={o.href}
                className="flex min-h-tactile items-center justify-center py-3 font-semibold text-ardoise-800">
                {o.libelle}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
