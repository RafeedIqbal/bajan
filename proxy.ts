import { createServerClient } from '@supabase/ssr'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

// Refreshes the Supabase session on every request (official updateSession, inlined).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          // Cache-Control etc., so a CDN never serves one user's refreshed session to another.
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    }
  )

  // Do not run code between createServerClient and getClaims (refresh tokens are single-use).
  const { data, error } = await supabase.auth.getClaims()

  const path = request.nextUrl.pathname
  // A network blip reaching Supabase Auth is not "signed out": let the page decide (it shows an error).
  const signedOut = !data?.claims && !isAuthRetryableFetchError(error)
  // The guide is public, so people can read how it works before signing in.
  if (signedOut && !['/login', '/auth', '/api', '/guide'].some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url) // API routes answer 401 themselves
  }

  return response
}

// Static files skip the session refresh. The manifest is fetched without cookies, so it must never redirect.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)'],
}
