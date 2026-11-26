import Link from 'next/link';
import PiedLegal from './PiedLegal';

export default function PageLegale({ titre, maj, children }: { titre: string; maj: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-ardoise-800">
      <Link href="/" className="text-sm font-bold uppercase tracking-wide text-atelier">Créno</Link>
      <h1 className="mt-3 text-3xl font-bold text-ardoise-950">{titre}</h1>
      <p className="mt-1 text-sm text-ardoise-600">Dernière mise à jour : {maj}</p>
      <div className="mt-8 space-y-4 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ardoise-950 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
      <footer className="mt-12 text-center text-sm text-ardoise-600"><PiedLegal /></footer>
    </main>
  );
}
