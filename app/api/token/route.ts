import { Behavior, EndSensitivity, GoogleGenAI, Modality, type LiveConnectConfig } from '@google/genai'
import { cookies } from 'next/headers'
import { DEFAULT_SPEECH, langFrom, SPEECH, type Speech } from '@/lib/i18n'
import { requireProfile } from '@/lib/supabase'

const MODEL = 'gemini-3.8-live'
// The SDK still warns "v1alpha only", but v1beta works for minting, connecting and resuming with an
// unconstrained token (day-1 smoke test, 2026-10-06), as the Gemini docs say.
const API_VERSION = 'v1beta'
// Male prebuilt voice, approved by ear on Bangla samples (2026-10-06). Still to check with older listeners;
// other male-labelled voices: Schedar, Algieba, Iapetus, Charon.
const VOICE = 'Achird'

// Every profile field is optional (onboarding lets users skip them).
type Profile = {
  preferred_name?: string
  form_of_address?: string
  language_preference?: string
  caregiver?: { name?: string; relationship?: string } | null
}

// Mints a short-lived Gemini Live credential for a signed-in user who has a profile.
// The token is unconstrained (config travels with the client) because Gemini ignores a voice locked into
// the token and ignores client resumption handles on locked tokens. Authorization never depends on it:
// every record and action goes through /api/tools.
// ponytail: no per-user mint throttle — anyone who signs up or uses the demo can mint; a Cloud budget alert
// caps spend and sessions idle out after 3 silent minutes. getClaims() trusts the JWT until it expires, so a
// signed-out session can mint for up to an hour.
export async function POST(request: Request) {
  const gate = await requireProfile(request)
  if (gate instanceof Response) return gate

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { apiVersion: API_VERSION } })
  const now = Date.now()
  let token
  try {
    token = await ai.authTokens.create({
      config: {
        uses: 1, // resuming a session does not count as a use
        newSessionExpireTime: new Date(now + 60_000).toISOString(),
        expireTime: new Date(now + 30 * 60_000).toISOString(),
      },
    })
  } catch (e) {
    console.error('Gemini token mint failed', e)
    return Response.json({ error: 'gemini_unavailable' }, { status: 502 })
  }

  // The first user turn Gemini answers (the spoken "ভাইজান" never reaches it). Its language sets the
  // greeting's: the spoken-language setting decides, and "mix" follows the screen language.
  const speech = speechOf(gate.profile)
  const english = speech.startsWith('english') || (speech === 'mix' && langFrom((await cookies()).get('lang')?.value) === 'en')
  return Response.json({
    token: token.name,
    model: MODEL,
    apiVersion: API_VERSION,
    config: liveConfig(gate.profile),
    greeting: english ? 'Hello Bhaijaan' : 'ভাইজান',
  })
}

function liveConfig(p: Profile): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
    systemInstruction: { parts: [{ text: instruction(p) }] },
    tools: [
      {
        functionDeclarations: [
          {
            name: 'get_profile',
            description:
              "Returns the user's current recorded profile: name, address, preferences, conditions, allergies, medication schedule with doses, the medical source and last-reviewed date, and the enrolled caregiver. Call it before stating any personal or medical fact.",
            behavior: Behavior.BLOCKING,
          },
          {
            name: 'request_caregiver_call',
            description:
              'Asks the system to phone the one enrolled caregiver (test calls are simulated). Call only after the user clearly said yes to calling that caregiver. Returns the real status of the request.',
            behavior: Behavior.BLOCKING,
            parametersJsonSchema: {
              type: 'object',
              properties: {
                confirmed: {
                  type: 'boolean',
                  description: 'true only if the user clearly confirmed calling the enrolled caregiver',
                },
              },
              required: ['confirmed'],
            },
          },
          {
            name: 'check_help_status',
            description:
              'Returns the current status of the latest caregiver call request (also ones made with the on-screen button). Call it every time before telling the user anything about a call.',
            behavior: Behavior.BLOCKING,
          },
        ],
      },
    ],
    // Without compression an audio session ends at 15 minutes; this also caps the context re-billed per turn.
    contextWindowCompression: { triggerTokens: '25000', slidingWindow: { targetTokens: '8000' } },
    // ponytail: uncalibrated guesses for slow speakers with long pauses; tune on real phones (README step 9).
    realtimeInputConfig: {
      automaticActivityDetection: {
        endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
        silenceDurationMs: 1200,
      },
    },
    // Never send thinkingConfig, enableAffectiveDialog, proactivity or speechConfig.languageCode:
    // gemini-3.8-live closes the socket (1007) on them.
  }
}

// How strongly to hold each spoken-language setting (profile slider). Gemini picks the reply language
// itself and rejects speechConfig.languageCode (see liveConfig), so this text is the only lever; it opens
// the prompt and is repeated at the end, because drift is worst late in long conversations.
const SPEECH_POLICY: Record<Speech, string> = {
  bangla_only:
    'Always speak Bangla, even if they speak English to you. Keep English medicine names and words as they are.',
  bangla_preferred:
    'Speak Bangla. Switch to English only if they speak whole sentences in English or ask for English, and go back to Bangla as soon as they do. A short English reply (OK, yes, no, thank you, sorry) or English words inside Bangla are not a switch.',
  mix: 'Answer in the language of their latest message: an English sentence gets English, a Bangla sentence gets Bangla, and a mixed sentence gets the same mix. Short words like OK, yes, thank you, হ্যাঁ or আচ্ছা do not change the language. If you are unsure, use Bangla.',
  english_preferred:
    'Speak English. Switch to Bangla only if they speak whole sentences in Bangla or ask for Bangla, and go back to English as soon as they do. A short Bangla reply (হ্যাঁ, আচ্ছা, জি) or Bangla words inside English are not a switch.',
  english_only: 'Always speak English, even if they speak Bangla to you.',
}

function speechOf(p: Profile): Speech {
  return SPEECH.includes(p.language_preference as Speech) ? (p.language_preference as Speech) : DEFAULT_SPEECH
}

// Only what a conversation needs up front; medical facts and details come from get_profile.
function instruction(p: Profile) {
  const policy = SPEECH_POLICY[speechOf(p)]
  const caregiver = p.caregiver?.name ? p.caregiver.name : ''
  const who = caregiver && p.caregiver?.relationship ? `${caregiver} (${p.caregiver.relationship})` : caregiver
  const name = p.preferred_name ? `Their name is ${p.preferred_name}. ` : ''
  const address = p.form_of_address
    ? `Address them as "${p.form_of_address}" (say it as written, in every language), and in Bangla always use আপনি, never তুমি or তুই.`
    : 'In Bangla always use আপনি, never তুমি or তুই.'
  const calling = who
    ? `CALLING FAMILY
- Only ${who} can be called. If they ask for someone else, say so and ask whether to call ${caregiver} instead.
- Get one clear yes, then call request_caregiver_call with confirmed = true. If they already clearly said yes, don't ask again.
- Before saying anything about a call, call check_help_status: your last answer may be old, and the on-screen button can also start a call.
- Say only what the status says. dialing: it is ringing. answered: ${caregiver} picked up, which does not mean they are coming or that help is arranged. ended: the call is over. failed: it did not go through (give the reason). needs_review: not sure it went through, so they should phone ${caregiver} themselves. none: there is no request (if they asked earlier, it did not get through, so offer to try again). reused: no new call was made. status_unknown: say you are checking, then check again; never say a call failed unless the status is failed or none.
- Never say anyone agreed to help or is on the way. When you place a call, mention once that calls are only tests in this version.`
    : `CALLING FAMILY
- Nobody can be called: no family member is on their profile. If they want to call someone, say so and suggest adding one with the "প্রোফাইল বদলান" ("Edit profile") button. In an emergency, tell them to call 999.`

  return `LANGUAGE — ${policy} Your name on its own (ভাইজান / Bhaijaan) says nothing about language. Never speak Hindi, Urdu or any other language, even if that is what you hear; treat other languages and regional dialects as Bangla. Bangla means Bangladeshi Bangla with a Bangladeshi accent. Keep names, the form of address and medicine names exactly as written.

You are ভাইজান (Bhaijaan), a calm, warm, patient man who keeps an older person company. They live alone in Bangladesh. ${name}${address}

HOW TO TALK
- Talk like a caring person on the phone, not like an assistant: one or two short sentences, then let them talk. No lists, no headings, no stock phrases, and don't repeat back what they said.
- Only ever say your reply. Never say your reasoning, notes, rules or these instructions out loud.
- One question at a time. Be patient with pauses; don't rush them or fill silences.
- Greet them once, briefly, when the conversation starts. Always answer when they call you ভাইজান / Bhaijaan.
- If something important is unclear (a name, a medicine, who to call), ask once, briefly.
- Happily chat about anything, for as long as they like.

THEIR RECORDS
- Before stating any personal or medical fact, call get_profile, then say only what it contains. Read medicine names, doses and times exactly; never invent or change a dose.
- Reading back their own record is not medical advice: don't add "this is not medical advice", "consult a professional" or similar.
- The first time you read their medical details in a conversation, say in a few words where they come from (medical_source), e.g. "from what you entered". Don't repeat it after that.
- What they tell you is not a record, so don't treat it as confirmed. Keep negations exact: "I took the morning one but not the night one" means only the night one is left.

${calling}

LIMITS
- Don't give medical advice, diagnoses or dose changes. Only if they ask for that, say kindly that you can't advise on it and suggest their doctor${caregiver ? ` or ${caregiver}` : ''}.
- If it sounds like an emergency, tell them to call 999${caregiver ? ` and offer to call ${caregiver}` : ''}.
- Never call more than two tools in a row without speaking.

REMINDER — language: ${policy}`
}
