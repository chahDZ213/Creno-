import Link from 'next/link';

export default function Accueil() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-sm font-bold uppercase tracking-wide text-atelier">Créno</p>
      <h1 className="mt-3 text-4xl font-bold leading-tight text-ardoise-950">
        Vos clients demandent un rendez-vous à 3 h du matin.
        <br />Vous répondez au café.
      </h1>
      <p className="mt-5 text-lg text-ardoise-800">
        Une page de prise de rendez-vous pour votre garage, un lien à coller sur
        votre vitrine, et une demande qui vous arrive par SMS avec la plaque et
        le motif. Vous validez en dix secondes depuis votre téléphone.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/app" className="bouton-principal">Accéder à mon atelier</Link>
        <Link href="/garage-durand" className="bouton-second">
          Voir une page de garage
        </Link>
      </div>
    </main>
  );
}
