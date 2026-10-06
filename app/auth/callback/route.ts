import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase'

// Lands sign-up confirmations, magic links and password resets (PKCE code exchange).
// ponytail: default {{ .ConfirmationURL }} email templates mean links work only in the browser that asked
// for them, and mail scanners can use them up; switch to token_hash templates + a POST confirm page if
// testers hit that.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const target = searchParams.get('next') === 'reset' ? '/login?reset=1' : '/' // fixed targets: no open redirect

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(target, origin))
  }
  return NextResponse.redirect(new URL('/login?e=link', origin))
}
