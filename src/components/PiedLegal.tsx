import Link from 'next/link';

/** Liens vers les pages légales, à mettre en pied de chaque page publique. */
export default function PiedLegal() {
  return (
    <nav aria-label="Informations légales" className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      <Link href="/confidentialite" className="underline">Confidentialité</Link>
      <Link href="/cgu" className="underline">Conditions d’utilisation</Link>
      <Link href="/mentions" className="underline">Mentions légales</Link>
    </nav>
  );
}
