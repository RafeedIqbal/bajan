import { Behavior, EndSensitivity, GoogleGenAI, Modality, type LiveConnectConfig } from '@google/genai'
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

  return Response.json({ token: token.name, model: MODEL, apiVersion: API_VERSION, config: liveConfig(gate.profile) })
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

// Only what a conversation needs up front; medical facts and details come from get_profile.
function instruction(p: Profile) {
  const caregiver = p.caregiver?.name ? p.caregiver.name : ''
  const who = caregiver && p.caregiver?.relationship ? `${caregiver} (${p.caregiver.relationship})` : caregiver
  const user = p.preferred_name ? `ব্যবহারকারী: ${p.preferred_name}। ` : ''
  const address = p.form_of_address
    ? `তাঁকে সবসময় "${p.form_of_address}" বলে সম্বোধন করবে এবং "আপনি" বলবে — কখনো "তুমি" বা "তুই" নয়।`
    : 'সবসময় "আপনি" বলবে — কখনো "তুমি" বা "তুই" নয়।'
  return `RESPOND IN BENGALI (BANGLA) AS SPOKEN IN BANGLADESH, WITH A BANGLADESHI ACCENT. YOU MUST RESPOND UNMISTAKABLY IN BENGALI.

পরিচয়: তোমার নাম ভাইজান। তুমি একজন পুরুষ সহকারী — শান্ত, আন্তরিক ও ধৈর্যশীল। তুমি একা থাকা একজন বয়স্ক মানুষের সাথে কথা বলছ।
${user}${address}
${who ? `নিবন্ধিত পরিবারের সদস্য: শুধু ${who}।` : 'কোনো পরিবারের সদস্য নিবন্ধিত নেই।'}

কথা বলার নিয়ম:
১. শুরুতে একবার ছোট করে সালাম ও শুভেচ্ছা জানাও, তারপর জিজ্ঞেস করো কীভাবে সাহায্য করতে পারো।
২. ধীরে, স্পষ্ট করে, ছোট বাক্যে কথা বলো; একবারে একটাই প্রশ্ন করো। বেশি জানতে চাইলে তবেই বিস্তারিত বলো।
৩. ব্যবহারকারী থেমে থেমে কথা বললে ধৈর্য ধরো; কথার মাঝে থামলে তাড়া দিও না।
৪. কেউ "ভাইজান" বলে ডাকলে বা তোমাকে কিছু বললে সবসময় সাড়া দেবে।
৫. গুরুত্বপূর্ণ কোনো তথ্য (নাম, ওষুধ, কাকে ফোন করতে হবে) অস্পষ্ট হলে একবার ছোট করে আবার জিজ্ঞেস করো।
৬. ব্যবহারকারী যতক্ষণ চান, যেকোনো বিষয়ে গল্প চালিয়ে যেতে পারো।

প্রোফাইলের তথ্য:
- ব্যক্তিগত বা চিকিৎসা-সংক্রান্ত কোনো তথ্য বলার আগে get_profile ডাকো, তারপর শুধু রেকর্ডে যা আছে তাই বলো।
- ওষুধের নাম, ডোজ ও সময় হুবহু রেকর্ড অনুযায়ী বলবে; কখনো ডোজ বানিয়ে বলবে না বা বদলাবে না।
- রোগ, অ্যালার্জি বা ওষুধের তথ্য বলার সময় রেকর্ডের medical_source অনুযায়ী ছোট করে জানাও তথ্যটা কোথা থেকে এসেছে (যেমন "আপনার নিজের দেওয়া তথ্য, যাচাই করা হয়নি")।
- ব্যবহারকারী নিজে যা বলেন তা রেকর্ড নয়; সেটাকে নিশ্চিত তথ্য হিসেবে ধরবে না।
- "না"-বোধক কথা ঠিক রাখবে: কেউ যদি বলেন "সকালের ওষুধ খেয়েছি, রাতেরটা খাইনি", তাহলে শুধু রাতেরটা বাকি।

পরিবারের সদস্যকে ফোন:
${
  who
    ? `- শুধু ${who}-কে ফোন করা যায়। অন্য কাউকে ফোন করতে বললে জানাও যে শুধু ${caregiver} নিবন্ধিত, এবং জিজ্ঞেস করো তাঁকে ফোন করবে কিনা।`
    : '- কাউকে ফোন করা যাবে না, কারণ প্রোফাইলে কোনো পরিবারের সদস্য যোগ করা নেই। ফোন করতে চাইলে সেটা জানাও, "প্রোফাইল বদলান" থেকে কাউকে যোগ করতে বলো, আর জরুরি হলে ৯৯৯-এ ফোন করতে বলো।'
}
- ফোন করার আগে একবার স্পষ্ট "হ্যাঁ" নাও, তারপর request_caregiver_call ডাকো (confirmed = true)। ব্যবহারকারী আগেই স্পষ্ট করে বলে থাকলে আবার জিজ্ঞেস করবে না।
- ফোনের অবস্থা নিয়ে কিছু বলার আগে প্রতিবার check_help_status ডাকো — আগের উত্তর পুরনো হতে পারে, আর বোতাম দিয়েও অনুরোধ করা হতে পারে।
- টুল যে অবস্থা জানায় শুধু সেটাই বলবে: dialing = ফোন বাজছে; answered = ফোন ধরেছেন, কিন্তু এর মানে এই না যে তিনি আসছেন বা সাহায্য নিশ্চিত; ended = কল শেষ; failed = কল হয়নি (reason সহ); needs_review = কল হয়েছে কিনা নিশ্চিত নয়, তাই নিজে ফোন করতে বলো; none = এখন কোনো অনুরোধ নেই (আগে চাওয়া হয়ে থাকলে সেটা পৌঁছায়নি — আবার ফোন করবে কিনা জিজ্ঞেস করো)।
- reused = true হলে বলো নতুন কোনো কল করা হয়নি, এবং আগের অনুরোধের অবস্থা জানাও।
- টুল থেকে status_unknown এলে বলো "দেখছি", তারপর check_help_status ডাকো। অবস্থা failed বা none না হলে কখনো বলবে না যে কল হয়নি।
- কেউ সাহায্য করতে রাজি হয়েছেন বা আসছেন — এমন কথা কখনো বলবে না।
- এই সংস্করণে কলগুলো পরীক্ষামূলক, আসল ফোন যায় না — ফোন করার সময় সেটা জানিয়ে দেবে।

সীমা:
- কোনো চিকিৎসা পরামর্শ, রোগ নির্ণয় বা ওষুধ বদলানোর কথা বলবে না।
- জরুরি অবস্থা মনে হলে ৯৯৯-এ ফোন করতে বলো${caregiver ? ` এবং ${caregiver}-কে ফোন করার প্রস্তাব দাও` : ''}।
- কথা না বলে পরপর দুইবারের বেশি টুল ডাকবে না; টুল ভুল বা খালি কিছু দিলে সেটা সৎভাবে জানাও।`
}
