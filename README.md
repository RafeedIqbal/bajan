# বাজান (Bajan)

A Bangla voice assistant proof of concept for older adults who live alone. It is built from
[`docs/Bangla_Voice_Assistant_MVP.md`](docs/Bangla_Voice_Assistant_MVP.md). It does three things:

- holds a spoken conversation (Gemini Live, `gemini-3.8-live`) in Bangla, English or a mix: Bajan replies in whatever language he's spoken to
- also takes typed messages and recorded voice messages, always answers out loud, and writes both sides on screen
- answers from a small structured profile that each tester fills in when they first sign in
- requests a call to one enrolled caregiver and shows the real status

Caregiver calls are **simulated**: no phone rings. Testers are asked to use made-up profile details.

## Ways to try it

- **Try the demo** (login page): one click and no account. Each visitor gets a private anonymous account with a sample profile (রহিমা খাতুন, caregiver করিম).
- **Create an account** with email + password or an emailed link. On first sign-in, an onboarding form asks for the profile; every field is optional, and **Use the sample profile** fills it in one click. Edit it later with the **Edit profile** (প্রোফাইল বদলান) button on the home page.

Without a family member on the profile, Get help explains that nobody can be called and points to 999, and no call is placed.

Three ways to talk to him, all on the home page:

- **Start** (শুরু করুন): a live conversation with the mic open. Gemini decides when you have finished speaking.
- **Type a message** (লিখে পাঠান): no mic needed. Works during a live conversation too.
- **Record a voice message** (ভয়েস মেসেজ): like a WhatsApp voice note, up to 2 minutes, sent as one message however long you pause. Not shown during a live conversation (just speak).

Bajan always answers out loud, and the **Conversation** box shows both sides as text (Gemini's own transcription). Switching between messages and Start keeps the conversation going; Stop ends it, and the next one starts fresh.

On Android, Chrome's **Add to Home screen** installs it with Bajan's face as the app icon.

**How to use** (ব্যবহারের নিয়ম) in the header, and on the home and sign-in pages, opens a step-by-step guide at `/guide`: the three ways to talk, calling family, language settings, the wake word, installing on a phone, troubleshooting and privacy. It is public, so testers can read it before signing in. The guide quotes on-screen labels from `lib/i18n.ts` (`{start}` → the Start button's words), and `npm test` checks each one exists.

The [Bangla UI audit](docs/Bangla_UI_Audit.md) records wording decisions across the interface and guide, including the simulated-call and privacy clarifications.

The layout adapts to the screen: one column on phones (avatar, Start, Get help and Repeat fit the first screen), and on computers the avatar and controls sit beside the conversation.

Every page has **বাংলা / English** buttons at the top. They switch the on-screen text only (remembered in a cookie). Everyone, demo users included, can change their profile with the **Edit profile** button on the home page.

Bajan's *spoken* language is a profile setting: a 5-point slider from **Bangla only** through **Bangla preferred**, **Mix (follow me)** and **English preferred** to **English only**. New profiles default to Mix and the demo sample to Bangla preferred. The "preferred" settings switch only on whole sentences in the other language, never on a quick "OK" or "thank you". Bajan never answers in a third language such as Hindi or Urdu. His first greeting follows the setting (Mix uses the screen language).

## Stack

- **App:** Next.js 16 (App Router) on Vercel, with Supabase (Postgres + Auth).
- **Audio:** the browser streams audio straight to Gemini using a short-lived token from `/api/token`.
- **Tools:** the model's tools run on the server in `/api/tools`, which calls Postgres functions in `supabase/migrations`.
- **Wake word (optional):** Chrome's speech recognition. It runs in Google's cloud, so mic audio goes to Google while the toggle is on.

## Local setup

Prerequisites: Node 24, Docker, and a Gemini API key from a **billing-enabled** Google Cloud project. The free tier's terms forbid personal data, and testers' voices count as personal data.

```bash
npm install
npx -y supabase@2.119.0 start        # local Postgres + Auth + Mailpit; applies migrations
npx -y supabase@2.119.0 status       # copy API_URL and PUBLISHABLE_KEY into .env.local
cp .env.example .env.local           # then fill in the values
npm run dev                          # http://localhost:3000
```

Open http://localhost:3000 and use **Try the demo**, or create an account. Locally, confirmation emails go to Mailpit at http://127.0.0.1:54324.

### Checks

```bash
npm test          # wake-word matcher, cost maths, transcript lines, AAA colour contrast, guide labels (node:test)
npm run test:db   # duplicate-call guard, call timeline, profile ownership (pgTAP, needs `supabase start`)
npm run build     # type-check + production build
```

### Simulated calls

`SIMULATED_CALL_OUTCOME` sets how a call ends. Time is measured from the request.

| Outcome | What happens |
| --- | --- |
| `answered` (default) | dialing, then answered at 6 s, then ended at 26 s |
| `no_answer` | dialing, then failed (no answer) at 20 s |
| `error` | failed at once (provider error) |
| `timeout` | needs_review: an ambiguous outcome, never retried automatically |

A request in `needs_review` blocks new calls for that profile until someone reviews it. After checking, resolve it with:

```sql
update public.help_requests set status = 'failed', updated_at = now()
 where status = 'needs_review' and id = '<request id>';
```

The duplicate guard returns the existing request, and places no new call, when an event repeats with the same id, when a request is still unresolved, or when the last request is less than a minute old.

## Deploy (Vercel + Supabase)

### Supabase

1. Create a project in a region near your Vercel function region, e.g. Singapore or Mumbai for Bangladesh.
2. Push the schema:

   ```bash
   npx -y supabase@2.119.0 login
   npx -y supabase@2.119.0 link --project-ref <ref>
   npx -y supabase@2.119.0 db push
   ```

3. Under **Auth → URL Configuration**:
   - Set Site URL to `https://<prod-domain>`.
   - Add redirect URLs `https://<prod-domain>/auth/callback**`, `https://<project>.vercel.app/auth/callback**` (every hostname testers use) and `http://localhost:3000/**`. Email links that point to any other host lose their sign-in code.
   - Under **Auth → Providers → Email**, turn on **Secure password change**, so a borrowed session can't set a new password. The repo sets the same option for local runs in `supabase/config.toml`.
4. Under **Auth → SMTP**, set up custom SMTP, e.g. Resend: `smtp.resend.com`, port 465, user `resend`, your API key as the password, and a verified domain. The built-in sender only mails project members, so open sign-up can't work without this. Keep the default email rate limit (30/h). With no CAPTCHA, that limit is the abuse ceiling.
5. Under **Auth → Sign In / Providers**, turn on **Allow anonymous sign-ins** for the demo button. Anonymous sign-ins are capped per IP (30/h by default, under **Auth → Rate Limits**). Every demo visitor is signed in from Vercel's server, so they all share one IP. Raise the cap if testers see "Could not start the demo".
6. Demo accounts pile up. Every so often, clear out old ones; their profiles and help requests are deleted with them:

   ```sql
   delete from auth.users where is_anonymous and created_at < now() - interval '30 days';
   ```

### Vercel

1. Run `npx vercel link`.
2. Set these env vars for Production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `GEMINI_API_KEY`
   - `SIMULATED_CALL_OUTCOME`
3. Set the function region to match Supabase (Project → Settings → Functions).
4. Deploy with `npx vercel deploy --prod`. Previews sit behind Vercel's login, so testers need the production URL.
5. In Google Cloud, add a **budget alert** on the Gemini project. Anyone who signs up, or uses the demo, can start Gemini sessions, and nothing in the app caps spending, so this alert is the cap. Sessions stop by themselves after 3 silent minutes. If the demo URL gets shared widely, turn off anonymous sign-ins, or rotate `GEMINI_API_KEY`, to stop spending at once. CAPTCHA (Supabase Auth → Bot and Abuse Protection) would also need a widget on the login page, plus its token passed to every auth call, before it can be switched on.

### Testing on a phone

The mic and the wake word need HTTPS (or `localhost`). Use either:

- the production URL, or
- a USB-connected Android phone with `adb reverse tcp:3000 tcp:3000`, then open `http://localhost:3000` on the phone.

For wake-word tests, set the phone's screen timeout to its maximum. Chrome stops listening when the screen sleeps.

## Data and scope

- Testers type their own profile, and the form asks for made-up details. Medical details entered there are labelled "self-reported, not verified", and the assistant reads them back as such. Gemini receives the profile through `get_profile` (name, address, conditions, allergies, medications, caregiver name and relationship), but never the caregiver's phone number.
- Typed messages and voice messages go to Gemini like speech does. The transcript is shown on screen only: it is not saved, and a reload clears it.
- With the wake-word toggle on, Chrome streams mic audio to Google's speech service to listen for the name. This is a separate data flow from Gemini, and it is opt-in.
- The assistant offers companionship, reads back recorded information, and requests a caregiver call. It gives no medical advice and does no triage.
- **Before any pilot with real data**, re-assess both data flows above, the Gemini service agreement and data configuration (spec §7), and the open sign-up and demo settings.

## Acceptance checklist (spec §9)

Run these in Chrome on desktop and on Android, with the phone on loudspeaker about 1 m away. Use **Try the demo**, or **Use the sample profile** at onboarding: the expected answers below come from that sample.

- [ ] The flow works with the large controls alone and with voice alone. Get help also works with no conversation running, and after Gemini fails (block `generativelanguage.googleapis.com` in DevTools).
- [ ] Bangla names, dates, numbers and English terms stay understandable. Ask for the address, the last-reviewed date and "আমার রাতের ওষুধ কী?" (expect Metformin 500 mg, রাত ৮টা).
- [ ] Doses are read back exactly. "মেটফরমিন কতটুকু?" gives the recorded dose. "ডোজ বাড়াবো?" gets a refusal and an offer to call the caregiver.
- [ ] Negation is preserved. "সকালের ওষুধ খেয়েছি, রাতেরটা খাইনি" → only the night medicine is mentioned, and nothing is stored.
- [ ] A contact correction is handled before anything runs. "মেয়েকে ফোন করো" → the assistant names করিম (ছেলে). "না, থাক" → no request is created.
- [ ] Repeated tool events never create duplicate calls. Ask twice, use the button and voice together, or go offline and come back: there is still one row, and a repeat says no new call was placed.
- [ ] Failures and drops get an honest status.
  - With `no_answer`, `error` and `timeout`, the wording matches the outcome.
  - Going offline right after "yes" shows "checking" and then the real status.
  - Going offline for 5 s mid-talk shows reconnecting, then the conversation continues.
- [ ] Help is never reported as acknowledged. After "answered", ask "ছেলে কি আসছে?" → the assistant says only that the call connected.
- [ ] The spoken-language setting holds by voice. Try each slider position; under the "preferred" and "only" settings, answering "OK" or "Thank you" must not switch the language.
- [ ] The male voice greets you after Start and after the wake word. Three silent minutes stop the session by itself. Repeat replays the last answer.
- [ ] Typed and voice messages. With nothing running, type "আমার রাতের ওষুধ কী?" → a spoken answer, with both lines in the Conversation box. Record a voice message with a long pause in the middle → one answer that covers all of it. Then press Start and ask what you typed earlier → he remembers.
- [ ] Accessibility: a keyboard-only run, TalkBack announcing call-status changes, 200% zoom, and a contrast check. With the phone's "reduce motion" setting on (or Data Saver), the avatar stays a still picture.
- [ ] Add to Home screen on Android: the icon is Bajan's face and the app opens full screen.
- [ ] A 15-minute conversation, including at least one reconnect, stays coherent and its full cost is recorded below.

## Calibration notes (spec §9.4)

Fill these in on a real phone with intended speakers:

| Item | Value / result |
| --- | --- |
| VAD `silenceDurationMs` (800 vs 1200): is the setting honored, are pauses cut? | |
| Self-interruption on loudspeaker during long answers | |
| Quiet speech detected? Playback loud enough? | |
| Wake word: hits out of 20 tries (older Bangladeshi speaker) | |
| Wake word: false triggers in 10 min of TV and family talk (`?debug` logs transcripts). বাজান is also the polite "play", so "গান বাজান" ("play a song") will trigger it | |
| Voice choice (Achird / Schedar / Algieba / Iapetus / Charon) | Achird — approved by ear on Bangla samples (2026-10-06); confirm with older listeners |
| Response latency and comprehension targets chosen | |
| Transcripts: is Bangla speech written in Bengali letters? (A synthetic Indian-accent test voice came out in Latin letters in the browser, and Bajan's side once showed one word in Hindi script; a `bn-BD` transcription hint made no difference.) | |

## Cost record (spec §6)

Fill in after a representative 15-minute session. Open the app as `/?debug` to see the token and cost readout under the controls; `console.info` on Stop gives the same totals. The readout leaves out transcripts: Gemini bills them as text output but doesn't report them (about $0.001 per minute of speech, measured 2026-10-07).

| Item | Value |
| --- | --- |
| Readout: audio in / text in / audio out / text out tokens | |
| Readout: estimated Gemini USD | |
| Gemini project spend that day (Cloud Billing / AI Studio, checked next day) | |
| Gap explained (retries, failed sessions, usage not reported) | |
| Hosting: Vercel plan / Supabase plan | |
| Telephony | $0 (simulated) |

## Avatar

Bajan's face was made with Higgsfield on 2026-10-07, for 36 credits in total.

- **Still** (`app/avatar.webp`; the icons are crops of it): `gpt_image_2_5`, quality high, 2k, 1:1, opaque background, 4 variants at 2.75 credits each. Job `77c26d7e-0bbe-498a-9f89-f41cb3a500d3` was picked. Prompt: *"A cute, soft 3D animated-film-style character portrait of "Bhaijaan", a kind and gentle young Bangladeshi man who is a friendly big-brother figure … off-white cotton panjabi with a red-and-green checked gamchha scarf … head and shoulders, centred … plain solid flat pale mint background, colour #E6F2EC … no text, no logo, no religious symbols, no hat."*
- **Loops** (`public/avatar/idle.mp4`, `public/avatar/talking.mp4`): `minimax_h3_max`, 1:1, 5 s, 768p, with the still as both start and end frame, so each loop joins seamlessly and rests on the still. 12.5 credits each. Jobs: idle `456c6750-5afa-4ed4-ab5e-2a3955bee58f` ("gentle breathing, one natural slow blink, a very slight warm head tilt … mouth closed"), talking `c20efd8f-771a-4916-af79-644de55e4f80` ("speaks warmly … natural mouth movement, small friendly nods").
- **Processing:** `ffmpeg -an -vf scale=480:480:flags=lanczos -c:v libx264 -crf 21 -preset slow -pix_fmt yuv420p -movflags +faststart` (178 KB and 251 KB). The still is converted with `cwebp -q 82` at 512 px. The icons are face crops of the 2048 px still: `app/icon.png` 48 px, `app/apple-icon.png` 180 px, and `public/icon-192.png`, `icon-512.png` and `icon-maskable-512.png`.
- **Behaviour** (`app/avatar.tsx`): the talking loop plays while he speaks. Otherwise the idle loop plays once and stops on the still, so nothing moves for long. Reduced motion or Data Saver shows only the still.
