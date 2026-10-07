# Bangla UI audit — 7 October 2026

Reviewed both language dictionaries in `lib/i18n.ts`, every page that displays them, the sample-profile text in `app/actions.ts`, the manifest, and the fixed Bangla button reference in the voice prompt. This covers home controls, connection and call states, recording, microphone errors, authentication, profile forms, error pages, navigation and all guide sections.

## Wording

Use familiar Bangladeshi Bangla, respectful address and direct instructions. Keep established terms such as প্রোফাইল, সাইন ইন and ভয়েস মেসেজ consistent; explain unfamiliar behavior in complete, short sentences. Preserve medicine names, doses and user-entered names exactly.

| Before | After / reason |
| --- | --- |
| থামুন | থামান — the button stops the conversation; it is not telling the user to stop speaking. |
| চালিয়ে যেতে চাপুন | উত্তর শুনতে চাপুন — identifies what the audio button does. |
| যে নামে ডাকবে | ভাইজান আপনাকে যে নামে ডাকবেন — identifies the speaker and uses respectful language. |
| বাংলা বেশি / মিশিয়ে (আমার মতো) | মূলত বাংলা / আপনার কথার ভাষায় — clarifies the five spoken-language choices. |
| “ভাইজান” ডাক শুনুন | “ভাইজান” বলে ডাকলে চালু হবে — describes what enabling the switch does. |
| সব ঘর ঐচ্ছিক | কোনো ঘর পূরণ করাই বাধ্যতামূলক নয় — explains optional fields in familiar words. |
| চিকিৎসা তথ্য / সর্বশেষ হালনাগাদ | স্বাস্থ্যতথ্যের উৎস / স্বাস্থ্যতথ্য হালনাগাদের তারিখ — identifies what the stored source and date describe. |

Login errors now explain how to reopen an emailed link in the originating browser and clarify password length. Microphone and wake-word errors give a next action. Call errors explicitly identify the family member and spell out the emergency instruction instead of ending with a bare number. The guide uses consistent সঙ্গে, কি না and respectful verbs; UI labels continue to resolve from the dictionary.

## Behavior and claims

- Login feature text, the guide's quick start and family-call section explicitly describe simulated calls. They no longer promise a real call with one press. Confirmation and the absence of a real ringing phone are explained.
- The call-status heading identifies test calls. The guide explains that an active or uncertain request also prevents another call, even after a minute.
- Privacy text distinguishes this app's unsaved transcript from information sent to Google. It includes profile data and the separate, optional wake-word service. The phone-number exclusion applies to the structured profile; a number spoken or typed by the user still goes to Gemini.
- The guide explains automatic sending at the two-minute recording limit, the difference between demo and account onboarding, and stopping before restarting an unrecovered live connection.
- The idle-stop explanation accounts for the wake-word listener restarting when enabled. Model instructions about language and exact readback are no longer presented as guarantees.
- Equivalent factual clarifications are reflected in English.

## Verification boundary

Automated guide-label, contrast, transcript and database checks complement browser checks of the rendered text and controls. This is an editorial and implementation review, not a native-speaker usability study. Real-device microphone quality, screen-reader speech and comprehension with older Bangladeshi speakers still need the acceptance sessions in the README. User-entered profile content, existing saved sample profiles and model-generated conversation text are not rewritten by this audit.
