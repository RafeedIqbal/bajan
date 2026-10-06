import { createServerClient } from '@supabase/ssr'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Official server client (supabase/examples/auth/nextjs). Create one per request; never keep it global.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component; proxy.ts refreshes the session instead.
          }
        },
      },
    }
  )
}

// Gate shared by the JSON API routes: same-origin request, signed-in user, a saved profile.
// Returns the client and the caller's profile data, or the Response to send instead.
export async function requireProfile(request: Request) {
  // Cookie-authenticated POSTs need a CSRF check of their own (Next.js only checks server actions).
  // Browsers without Fetch Metadata (Safari < 16.4) still send Origin on POST.
  const site = request.headers.get('sec-fetch-site')
  const sameOrigin = site ? site === 'same-origin' : request.headers.get('origin') === new URL(request.url).origin
  if (!sameOrigin) return Response.json({ error: 'forbidden' }, { status: 403 })

  const supabase = await createClient()
  const { data: auth, error: authError } = await supabase.auth.getClaims()
  // A network blip is not "signed out": answer 503 so the client retries instead of giving up.
  if (isAuthRetryableFetchError(authError)) return Response.json({ error: 'unavailable' }, { status: 503 })
  if (!auth?.claims) return Response.json({ error: 'unauthorized' }, { status: 401 })

  // RLS returns only the caller's own profile.
  const { data: profile, error } = await supabase.from('profiles').select('data').maybeSingle()
  if (error) {
    console.error('profile read failed', error)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
  if (!profile) return Response.json({ error: 'no_profile' }, { status: 403 })
  return { supabase, profile: profile.data }
}
