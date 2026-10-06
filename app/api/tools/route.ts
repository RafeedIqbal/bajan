import { requireProfile } from '@/lib/supabase'

type HelpRow = { idempotency_key: string; status: string; sim_outcome: string; caregiver_name: string; created_at: string }

const STALE_SECONDS = 600 // a finished call older than this is history, not "the current call"
const OUTCOMES = ['answered', 'no_answer', 'error', 'timeout']

// Executes the assistant's tools for the signed-in tester. Used by Gemini tool calls (relayed by the
// browser) and by the Get help button. The profile always comes from the session, never from the request.
export async function POST(request: Request) {
  const gate = await requireProfile(request)
  if (gate instanceof Response) return gate
  const { supabase, profile } = gate

  const body = await request.json().catch(() => null)
  const id: unknown = body?.id
  const args: unknown = body?.args ?? {}
  if (typeof id !== 'string' || id.length < 1 || id.length > 200 || typeof args !== 'object' || args === null) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }

  // The caregiver's number never goes to Gemini. Profiles may have no caregiver (onboarding is optional).
  const caregiver = profile.caregiver?.name
    ? { name: String(profile.caregiver.name), relationship: String(profile.caregiver.relationship ?? '') }
    : null

  switch (body.name) {
    case 'get_profile':
      return Response.json({ ...profile, caregiver })

    case 'request_caregiver_call': {
      if (!caregiver) return Response.json({ status: 'no_caregiver' })
      if ((args as { confirmed?: unknown }).confirmed !== true) {
        return Response.json({ status: 'needs_confirmation', caregiver })
      }
      const created = await supabase
        .rpc('request_help', { p_key: id, p_sim_outcome: simulatedOutcome() })
        .maybeSingle<HelpRow>()
      if (created.error || !created.data) return failure(created.error)
      // If the status step fails, the stored request is still the honest answer; the next poll advances it.
      const synced = await supabase.rpc('sync_help_request').maybeSingle<HelpRow>()
      const row = synced.data ?? created.data
      return Response.json({ ...view(row), reused: row.idempotency_key !== id })
    }

    case 'check_help_status': {
      const { data, error } = await supabase.rpc('sync_help_request').maybeSingle<HelpRow>()
      if (error) return failure(error)
      const current = data && view(data)
      const settled = current && (current.status === 'ended' || current.status === 'failed')
      return Response.json(current && !(settled && current.age_seconds > STALE_SECONDS) ? current : { status: 'none' })
    }
  }
  return Response.json({ error: 'unknown_tool' }, { status: 400 })
}

// The name stored on the request, not the profile's current caregiver (it may have been edited since).
function view(row: HelpRow) {
  return {
    status: row.status,
    reason: row.status === 'failed' ? (row.sim_outcome === 'no_answer' ? 'no_answer' : 'provider_error') : undefined,
    age_seconds: Math.max(0, Math.round((Date.now() - Date.parse(row.created_at)) / 1000)),
    caregiver_name: row.caregiver_name,
    simulated: true,
  }
}

function simulatedOutcome() {
  const value = process.env.SIMULATED_CALL_OUTCOME?.trim() || 'answered'
  if (OUTCOMES.includes(value)) return value
  console.error(`SIMULATED_CALL_OUTCOME must be one of ${OUTCOMES.join(', ')}; using "answered"`)
  return 'answered'
}

function failure(error: { code?: string } | null) {
  if (error?.code === 'PT403') return Response.json({ error: 'no_profile' }, { status: 403 })
  console.error('help request failed', error)
  return Response.json({ error: 'database_error' }, { status: 500 }) // the client retries with the same key
}
