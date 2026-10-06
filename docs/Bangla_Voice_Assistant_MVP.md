# Bangla Voice Assistant: MVP Decisions

**Date:** 6 October 2026  
**Status:** Web proof of concept  
**Selected voice model:** Gemini Live (`gemini-3.8-live`)  
**Design principle:** YAGNI. Build the smallest complete demonstration; add components only when an observed requirement justifies them.

## 1. Goal and scope

Create a Bangla voice assistant for older adults who live alone. Demonstrate three capabilities:

1. Hold a comfortable spoken conversation in Bangla.
2. Answer questions using a small, structured personal and medical profile.
3. Request help from one enrolled caregiver and report the actual call status.

Assume Bangladeshi Bangla initially. Use one synthetic profile and a consenting test contact for the proof of concept. The first version runs during an explicitly started browser session. Continuous monitoring, diagnosis, and public emergency-service integration are outside this version.

**Definition of a complete demo:** Start a conversation, retrieve a correct fact from the profile, request a caregiver call, and show the resulting status without inventing success or making duplicate calls.

## 2. Decision: use Gemini Live now

Gemini Live combines native audio conversation, reasoning, and function calling. The current `gemini-3.8-live` model supports asynchronous tools, so a conversation can continue while a backend task runs. Bengali is explicitly listed as `bn`; this does not establish accuracy for Bangladeshi accents, quiet speech, or medication names. Validate those with intended users. [1][2]

Use one built-in voice, short Bangla instructions, and a small set of tools. Choose the voice by listening to sample conversations. Keep replies brief, allow pauses, and ask for clarification when a critical detail is unclear.

GPT-Live-1 remains a future option if testing exposes a specific conversation problem. Its separate voice and backend architecture was a useful alternative in the comparison, but implementing a second provider, provider routing, or automatic failover adds no value to this first demo. [8]

## 3. Minimal stack

| Layer | Choice | Responsibility |
| --- | --- | --- |
| Application | **Next.js + TypeScript** | Voice screen, minimal profile screen, authenticated server routes, tool execution, and provider callbacks. |
| Voice and language | **Gemini Live** through Google's JavaScript SDK | Listen, converse in Bangla, produce speech, and request application tools. |
| Browser connection | **Direct Gemini WebSocket** | Stream audio using short-lived credentials issued by the application's server. |
| Storage | **PostgreSQL** | Store profiles, enrolled contacts, and help-request state. |
| Caregiver calling | **Twilio Programmable Voice** for one verified test destination | Make an ordinary outbound call and return provider status. Begin development with simulated responses. |
| Hosting | **One application deployment with HTTPS**, plus PostgreSQL | Support the web app, server routes, and incoming call-status callbacks. Use familiar hosting. |

This intentionally reduces the earlier Next.js/Django proposal to one application. A separate Python backend is unnecessary for these few endpoints unless an existing backend is already being reused.

Google documents direct client WebSocket connections and recommends ephemeral tokens for production clients. Keep the permanent Gemini key and telephony credentials on the server. [3]

### Request flow

1. A signed-in tester opens the voice screen and starts a session.
2. The server resolves the permitted profile and issues a short-lived Gemini credential.
3. The browser streams microphone audio directly to Gemini and plays returned audio.
4. When Gemini requests a tool, the browser relays the request to an authenticated server route.
5. The server validates the request, reads or updates PostgreSQL, and returns the result to the conversation.
6. For calls, provider callbacks update the stored status; the screen can poll while the conversation is active.

The browser and model never determine which records or destinations the server is allowed to access.

## 4. Build only these features

### A. One accessible conversation screen

- Large Start, Stop, and Get help controls.
- Clear listening, speaking, reconnecting, and call-status indicators.
- Optional visible transcript and a Repeat response control.
- A plain-language message when the connection fails.
- Short responses and one question at a time.

Retain transcripts only for the active session by default. Add recording or persistent transcript storage only when a defined evaluation need requires it.

### B. A small, structured profile

Store only the fields needed by the demonstration:

- Preferred name, language, and form of address.
- Address and relevant personal preferences.
- Recorded conditions, allergies, and medication schedule.
- Source and last-reviewed date for medical information.
- One enrolled caregiver's name, relationship, and phone number.

Keep current records separate from unverified statements made during conversation. The assistant can read back a recorded schedule; it should not invent doses, alter prescriptions, or silently turn a user statement into a verified medical fact.

Use a seeded profile or one basic edit form. Defer document upload, OCR, medical-record integrations, embeddings, and vector search. A small profile fits ordinary database retrieval and does not need RAG.

### C. Three application tools

| Tool | Required behavior |
| --- | --- |
| **Read current profile** | Fetch the permitted user's current structured information. |
| **Request caregiver call** | Resolve the stored contact, check authorization and confirmation, create a durable request, and start one call. |
| **Check help-request status** | Return the stored provider status and any explicitly recorded acknowledgement. |

The Get help button uses the same server workflow as the voice tool. Require a brief explicit confirmation for an ordinary caregiver call, and accept one already given clearly in the conversation instead of asking repeatedly.

Persist a request before initiating the call. Use a unique request identifier to prevent a repeated model event from creating another call. Validate provider callbacks and keep the request after a browser disconnect. Mark ambiguous outcomes for review instead of blindly retrying.

Track requested, dialing, answered, failed, and ended states. Record caregiver acknowledgement separately if implemented. A provider's completed-call status can include voicemail; it is not proof that a caregiver accepted responsibility or that help arrived. [7]

During development, simulate outcomes. For the end-to-end demo, connect one consenting test recipient, disclose that it is an automated test call, and share only the information needed for the request. Public emergency numbers and automatic contact escalation remain deferred.

## 5. Context and session handling

Supply a concise profile summary when a session starts. Retrieve current information again when answering a question that depends on it. Keep confirmed actions and medical records in PostgreSQL rather than relying on conversational memory.

Enable Gemini's context compression and implement reconnection/session resumption using the documented mechanisms. These are necessary for a coherent extended conversation, not a reason to introduce a separate memory system. Google documents periodic connection resets and limited session duration without compression. [4]

Use one clearly defined session at a time. Close it when the user stops. Preserve an accepted call request independently of the voice connection.

## 6. Cost: measure full conversations

Current **Gemini Developer API** list prices for the selected model are: [5]

| Component | USD per million tokens |
| --- | ---: |
| Audio input | $3.00 |
| Audio output | $12.00 |
| Text input | $0.75 |
| Text output, including thinking | $4.50 |

The advertised approximate audio rates are $0.005 per input minute and $0.018 per output minute. They are not an all-inclusive conversation rate. Google documents billing retained context again each turn, including historical audio; transcription adds text-output charges. Gemini 3.8 charges input throughout listening. [4][5]

Record usage for representative 15-minute sessions and include hosting, telephony, retries, and failed sessions. Do not use the earlier $63/month illustration as a budget: it omitted repeated historical-audio charges. If the deployment later moves to Google Cloud, check that service's pricing separately.

## 7. Data and medical scope

Use synthetic medical data for the proof of concept. Before a real-data pilot, confirm that the chosen service agreement and data configuration fit the intended functions.

Gemini Developer API terms prohibit clinical practice, medical advice, and uses requiring medical-device regulatory clearance. Paid access does not remove those restrictions. Unpaid-service terms also say not to submit sensitive, confidential, or personal information. Direct Google Cloud services have separate terms; they require a separate assessment. [6]

For this version, the assistant provides companionship, retrieves recorded information, and helps contact a person. It does not provide clinical triage or make treatment decisions.

## 8. Deliberately deferred

| Defer | Add only when… |
| --- | --- |
| Django/FastAPI, microservices | A concrete backend requirement or existing service makes them useful. |
| LiveKit or another media platform | Direct streaming fails a measured media requirement, or conferencing/telephony bridging becomes necessary. |
| Separate STT/TTS providers | Gemini fails the Bangla speech-quality acceptance check. |
| GPT-Live-1 integration and provider routing | A demonstrated quality, capability, or cost issue justifies another provider. |
| RAG, vector databases, document ingestion | The product actually needs a document collection beyond the structured profile. |
| Redis, Celery, job queues | Durable scheduled work or automatic retries enter the scope. |
| Medication reminders and missed-check-in alerts | Reminder delivery and escalation are explicitly part of the next release. |
| Long-term conversational memory | A specific user benefit requires information beyond the stored profile. |
| Camera/video, custom voices, fine-tuning | Real user testing demonstrates the need. |
| Multiple-contact escalation, emergency-service calls | The contact workflow has been validated and the required local service integration is established. |

## 9. Build order and acceptance check

1. **Voice:** demonstrate a Bangla conversation, pauses, interruptions, and reconnecting.
2. **Context:** add one synthetic profile and verify accurate retrieval.
3. **Actions:** simulate the caregiver workflow, then test one ordinary outbound call.
4. **Evaluate:** run the same short scenarios with intended Bangla speakers and measure a full session's cost.

Use a small manual checklist initially:

- The user can complete the flow with the large controls and voice.
- Bangla names, dates, numbers, and mixed English terms remain understandable.
- The assistant preserves negation, such as having taken the morning medicine but not the evening medicine.
- A correction to the requested contact is handled before execution.
- Repeated tool events do not create duplicate calls.
- A failed call or dropped connection produces an honest status.
- The assistant never reports help as acknowledged without evidence.
- A 15-minute conversation remains coherent and its full cost is recorded.

Choose acceptable response time and Bangla comprehension targets from these trials. There is no need to build a benchmarking platform before the basic experience works.

## Sources

Provider capabilities and prices were checked on 6 October 2026. Architectural choices and scope limits above are recommendations for this proof of concept.

1. [Gemini 3.8 Live model reference](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live)
2. [Gemini Live capabilities and supported languages](https://ai.google.dev/gemini-api/docs/live-api/capabilities)
3. [Gemini Live API overview and connection approaches](https://ai.google.dev/gemini-api/docs/live-api)
4. [Gemini Live best practices, sessions, and billing](https://ai.google.dev/gemini-api/docs/live-api/best-practices)
5. [Gemini Developer API pricing](https://ai.google.dev/gemini-api/docs/pricing)
6. [Gemini API additional terms](https://ai.google.dev/gemini-api/terms)
7. [Twilio Call resource and status semantics](https://www.twilio.com/docs/voice/api/call-resource)
8. [GPT-Live architecture and delegation](https://developers.openai.com/api/docs/guides/live)
