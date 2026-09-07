import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SUPABASE_ANON, SUPABASE_URL, supabaseConfigure } from '@/lib/supabase/config';

/** Rafraîchit la session Supabase et ferme /app aux visiteurs. */
export async function middleware(requete: NextRequest) {
  let reponse = NextResponse.next({ request: requete });
  if (!supabaseConfigure) return reponse;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: () => requete.cookies.getAll(),
      setAll: (liste: { name: string; value: string; options: CookieOptions }[]) => {
        liste.forEach(({ name, value }) => requete.cookies.set(name, value));
        reponse = NextResponse.next({ request: requete });
        liste.forEach(({ name, value, options }) =>
          reponse.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user && requete.nextUrl.pathname.startsWith('/app')) {
    const url = requete.nextUrl.clone();
    url.pathname = '/connexion';
    url.searchParams.set('suite', requete.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return reponse;
}

export const config = {
  matcher: ['/app/:path*', '/connexion'],
};
