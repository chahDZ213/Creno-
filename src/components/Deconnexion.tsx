'use client';
import { useRouter } from 'next/navigation';
import { navigateur } from '@/lib/supabase/client';

export default function Deconnexion() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await navigateur().auth.signOut();
        router.replace('/connexion');
        router.refresh();
      }}
      className="text-sm font-semibold text-ardoise-600 underline">
      Quitter
    </button>
  );
}
