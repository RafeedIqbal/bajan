// On-screen text in Bangla and English, chosen by the `lang` cookie (the toggle at the top of every page).
// Bhaijaan's spoken language is separate: he answers in whatever language the user speaks.

export type Lang = 'bn' | 'en'

export function langFrom(cookie: string | undefined): Lang {
  return cookie === 'en' ? 'en' : 'bn'
}

// Which language Bhaijaan speaks (a profile setting, separate from the screen language), as a 5-point scale.
export const SPEECH = ['bangla_only', 'bangla_preferred', 'mix', 'english_preferred', 'english_only'] as const
export type Speech = (typeof SPEECH)[number]
export const DEFAULT_SPEECH: Speech = 'mix'

const bn = {
  title: 'ভাইজান',

  // conversation
  connecting: 'সংযোগ হচ্ছে…',
  listening: 'শুনছি…',
  speaking: 'বলছি…',
  reconnecting: 'আবার সংযোগ হচ্ছে…',
  idleStopped: 'কথা না হওয়ায় বন্ধ হলো',
  start: 'শুরু করুন',
  stop: 'থামুন',
  help: 'সাহায্য চাই',
  repeat: 'আবার বলুন',
  continueAudio: 'চালিয়ে যেতে চাপুন',

  // help request
  confirmCall: (who: string) => `${who}-কে ফোন করবো?`,
  yesCall: 'হ্যাঁ, ফোন করুন',
  no: 'না',
  callStatus: 'ফোনের অবস্থা',
  noRequest: 'কোনো অনুরোধ নেই',
  testCall: 'পরীক্ষামূলক কল — আসল ফোন যাবে না।',
  noCaregiverNote: 'ফোন করার জন্য কেউ যোগ করা নেই —',
  addCaregiver: 'পরিবারের কাউকে যোগ করুন',
  sending: 'অনুরোধ পাঠানো হচ্ছে…',
  requested: 'অনুরোধ নেওয়া হয়েছে',
  dialing: (who: string) => `${who}-কে ফোন করা হচ্ছে…`,
  answered: (who: string) => `${who} ফোন ধরেছেন (সাহায্য নিশ্চিত নয়)`,
  ended: 'কল শেষ।',
  failedNoAnswer: 'কল হয়নি — কেউ ধরেননি।',
  failedError: 'কল হয়নি — সমস্যা হয়েছে।',
  needsReview: 'কল হয়েছে কিনা নিশ্চিত নয় — নিজে ফোন করুন, জরুরি হলে ৯৯৯।',
  unknown: 'অবস্থা জানা যাচ্ছে না, দেখছি… দরকার হলে নিজে ফোন করুন, জরুরি হলে ৯৯৯।',
  reused: ' একটু আগেই চেষ্টা হয়েছে, নতুন কল হয়নি; এক মিনিট পরে আবার চেষ্টা করুন।',

  // wake word
  wakeToggle: '"ভাইজান" ডাক শুনুন',
  wakeNote: 'চালু থাকলে মাইকের শব্দ নাম শোনার জন্য Google-এ যায়; নাম শুনলে কথা শুরু হবে।',

  errors: {
    offline: 'সংযোগ হয়নি। ইন্টারনেট দেখে আবার "শুরু করুন" চাপুন।',
    mic_denied: 'মাইক্রোফোন চালুর অনুমতি দিন, তারপর আবার "শুরু করুন" চাপুন।',
    mic_missing: 'কোনো মাইক্রোফোন পাওয়া যায়নি।',
    mic_busy: 'মাইক্রোফোন এখন অন্য কোথাও ব্যবহার হচ্ছে।',
    mic_ended: 'মাইক্রোফোন বন্ধ হয়ে গেছে। আবার "শুরু করুন" চাপুন।',
    signed_out: 'আপনি সাইন আউট হয়ে গেছেন। পাতাটি নতুন করে খুলে আবার সাইন ইন করুন।',
    no_profile: 'প্রোফাইল পাওয়া যায়নি। পাতাটি নতুন করে খুলুন।',
    unavailable: 'ভাইজান এখন সাড়া দিচ্ছেন না। একটু পরে আবার "শুরু করুন" চাপুন।',
    help_signed_out: 'আপনি সাইন আউট হয়ে গেছেন। পাতাটি নতুন করে খুলে আবার সাইন ইন করুন। দরকার হলে নিজে ফোন করুন, জরুরি হলে ৯৯৯।',
    help_not_sent: 'অনুরোধ পাঠানো যায়নি। দরকার হলে নিজে ফোন করুন, জরুরি হলে ৯৯৯।',
    help_unsent: 'অনুরোধটি পৌঁছায়নি। আবার "সাহায্য চাই" চাপুন। দরকার হলে নিজে ফোন করুন, জরুরি হলে ৯৯৯।',
    no_caregiver: 'ফোন করার জন্য কোনো পরিবারের সদস্য যোগ করা নেই — "প্রোফাইল বদলান" থেকে যোগ করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
    wake_not_allowed: 'নাম শোনার জন্য মাইক্রোফোনের অনুমতি দিন।',
    wake_no_bangla: 'এই ব্রাউজারে বাংলা শোনার সুবিধা নেই।',
    wake_failed: 'এই ব্রাউজারে নাম শোনার সুবিধা কাজ করছে না।',
  },

  // home
  demoNote: 'আপনি অ্যাকাউন্ট ছাড়া ডেমো ব্যবহার করছেন। নমুনা প্রোফাইলটি যেকোনো সময় বদলাতে পারেন; সাইন আউট করলে ডেমো শেষ হবে।',
  profile: 'প্রোফাইল',
  editProfile: 'প্রোফাইল বদলান',
  signOut: 'সাইন আউট',
  field: {
    name: 'নাম',
    formOfAddress: 'সম্বোধন',
    speech: 'কথার ভাষা',
    address: 'ঠিকানা',
    preferences: 'পছন্দ',
    conditions: 'রোগ',
    allergies: 'অ্যালার্জি',
    medications: 'ওষুধ',
    medicalSource: 'চিকিৎসা তথ্যের উৎস',
    updated: 'সর্বশেষ হালনাগাদ',
    caregiver: 'পরিবারের সদস্য',
  },

  // profile form
  setupTitle: 'আপনার প্রোফাইল',
  intro: 'সব ঘর ঐচ্ছিক — যা জানাতে চান শুধু তা লিখুন। ভাইজান এই তথ্য দেখে উত্তর দেবেন।',
  madeUp: 'পরীক্ষার সময় কাল্পনিক তথ্য দিন, আসল চিকিৎসা তথ্য নয়।',
  saveError: 'সংরক্ষণ হয়নি, আবার চেষ্টা করুন।',
  useSample: 'নমুনা প্রোফাইল দিয়ে শুরু করুন',
  speechScale: ['শুধু বাংলা', 'বাংলা বেশি', 'মিশিয়ে (আমার মতো)', 'ইংরেজি বেশি', 'শুধু ইংরেজি'],
  label: {
    name: 'যে নামে ডাকবে',
    speech: 'ভাইজান কোন ভাষায় কথা বলবেন',
    formOfAddress: 'সম্বোধন, যেমন নানু, চাচা, আপা',
    address: 'ঠিকানা',
    preferences: 'পছন্দ — প্রতি লাইনে একটি',
    conditions: 'রোগ — প্রতি লাইনে একটি',
    allergies: 'অ্যালার্জি — প্রতি লাইনে একটি',
    medications: 'ওষুধ, ডোজ ও সময় — প্রতি লাইনে একটি, সর্বোচ্চ ২০টি',
    caregiver: 'পরিবারের যাঁকে ফোন করা হবে',
    caregiverName: 'নাম',
    caregiverRelationship: 'সম্পর্ক, যেমন ছেলে, মেয়ে',
    caregiverPhone: 'ফোন নম্বর (পরীক্ষামূলক কলে এই নম্বরে ফোন যায় না)',
  },
  medicationsPlaceholder: 'Metformin 500 mg — সকাল ৮টা ও রাত ৮টা',
  save: 'সংরক্ষণ করুন',
  back: '← ফিরে যান',

  // login
  email: 'ইমেইল',
  password: 'পাসওয়ার্ড',
  newPassword: 'নতুন পাসওয়ার্ড',
  signIn: 'সাইন ইন',
  createAccount: 'অ্যাকাউন্ট খুলুন',
  emailLink: 'ইমেইলে সাইন-ইন লিংক পাঠান',
  forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন',
  savePassword: 'পাসওয়ার্ড সংরক্ষণ করুন',
  demoTitle: 'শুধু একবার দেখতে চান?',
  demoText: 'নমুনা প্রোফাইল দিয়ে ডেমো ব্যবহার করুন — অ্যাকাউন্ট বা ইমেইল লাগবে না।',
  tryDemo: 'ডেমো ব্যবহার করুন',
  loginErrors: {
    missing: 'ইমেইল (ও পাসওয়ার্ড) লিখুন।',
    bad_login: 'ইমেইল বা পাসওয়ার্ড ভুল, অথবা ইমেইল এখনো নিশ্চিত করা হয়নি।',
    signup: 'অ্যাকাউন্ট খোলা যায়নি। অন্তত ৬ অক্ষরের পাসওয়ার্ড দিন।',
    email: 'এখন ইমেইল পাঠানো যাচ্ছে না। এক মিনিট পরে আবার চেষ্টা করুন।',
    link: 'লিংকটি কাজ করেনি। একই ব্রাউজারে সবচেয়ে নতুন ইমেইলটি খুলুন, অথবা নতুন লিংক চান।',
    password: 'পাসওয়ার্ড বদলানো যায়নি। অন্তত ৬ অক্ষর দিন।',
    demo: 'এখন ডেমো শুরু করা যাচ্ছে না। এক মিনিট পরে আবার চেষ্টা করুন।',
  } as Record<string, string>,
  checkEmail: 'লিংকের জন্য আপনার ইমেইল দেখুন।',
}

export type Text = typeof bn

// `Text` makes the compiler check that English has exactly the same entries as Bangla.
const en: Text = {
  title: 'Bhaijaan',

  connecting: 'Connecting…',
  listening: 'Listening…',
  speaking: 'Speaking…',
  reconnecting: 'Reconnecting…',
  idleStopped: 'Stopped because nobody spoke',
  start: 'Start',
  stop: 'Stop',
  help: 'Get help',
  repeat: 'Repeat',
  continueAudio: 'Tap to continue',

  confirmCall: (who: string) => `Call ${who}?`,
  yesCall: 'Yes, call',
  no: 'No',
  callStatus: 'Call status',
  noRequest: 'No request',
  testCall: 'Test call — no real phone will ring.',
  noCaregiverNote: 'Nobody has been added to call —',
  addCaregiver: 'add a family member',
  sending: 'Sending the request…',
  requested: 'Request received',
  dialing: (who: string) => `Calling ${who}…`,
  answered: (who: string) => `${who} answered (help is not confirmed)`,
  ended: 'Call ended.',
  failedNoAnswer: 'The call did not go through — nobody answered.',
  failedError: 'The call did not go through — something went wrong.',
  needsReview: 'Not sure whether the call went through — please call your family member yourself, or 999 in an emergency.',
  unknown: 'Status unknown, checking… If needed, call your family member yourself, or 999 in an emergency.',
  reused: ' A call was just tried, so no new call was made; try again in a minute.',

  wakeToggle: 'Listen for "Bhaijaan"',
  wakeNote: 'While this is on, mic audio goes to Google to listen for the name; hearing it starts a conversation.',

  errors: {
    offline: 'Could not connect. Check the internet and press Start again.',
    mic_denied: 'Please allow the microphone, then press Start again.',
    mic_missing: 'No microphone was found.',
    mic_busy: 'The microphone is being used by something else.',
    mic_ended: 'The microphone turned off. Press Start again.',
    signed_out: 'You have been signed out. Reload the page and sign in again.',
    no_profile: 'No profile was found. Please reload the page.',
    unavailable: 'Bhaijaan is not responding right now. Press Start again in a moment.',
    help_signed_out: 'You have been signed out. Reload the page and sign in again. If needed, call your family member yourself, or 999 in an emergency.',
    help_not_sent: 'The request could not be sent. If needed, call your family member yourself, or 999 in an emergency.',
    help_unsent: 'The request did not get through. Press Get help again. If needed, call your family member yourself, or 999 in an emergency.',
    no_caregiver: 'No family member has been added to call — add one under "Edit profile". In an emergency, call 999.',
    wake_not_allowed: 'Please allow the microphone so Bhaijaan can listen for his name.',
    wake_no_bangla: 'This browser cannot listen for Bangla.',
    wake_failed: 'Listening for the name does not work in this browser.',
  },

  demoNote: 'You are trying the demo without an account. You can edit the sample profile any time; signing out ends the demo.',
  profile: 'Profile',
  editProfile: 'Edit profile',
  signOut: 'Sign out',
  field: {
    name: 'Name',
    formOfAddress: 'Form of address',
    speech: 'Spoken language',
    address: 'Address',
    preferences: 'Preferences',
    conditions: 'Conditions',
    allergies: 'Allergies',
    medications: 'Medicines',
    medicalSource: 'Source of medical details',
    updated: 'Last updated',
    caregiver: 'Family member',
  },

  setupTitle: 'Your profile',
  intro: 'Every field is optional — fill in only what you want. Bhaijaan answers from these details.',
  madeUp: 'Please use made-up details while testing, not real medical information.',
  saveError: 'Could not save; please try again.',
  useSample: 'Start with the sample profile',
  speechScale: ['Bangla only', 'Bangla preferred', 'Mix (follow me)', 'English preferred', 'English only'],
  label: {
    name: 'Name to call you by',
    speech: 'Which language Bhaijaan speaks',
    formOfAddress: 'How to address you, e.g. Nanu, Chacha, Apa',
    address: 'Address',
    preferences: 'Preferences — one per line',
    conditions: 'Conditions — one per line',
    allergies: 'Allergies — one per line',
    medications: 'Medicines with dose and time — one per line, up to 20',
    caregiver: 'Family member to call',
    caregiverName: 'Name',
    caregiverRelationship: 'Relationship, e.g. son, daughter',
    caregiverPhone: 'Phone number (test calls never dial it)',
  },
  medicationsPlaceholder: 'Metformin 500 mg — 8 am and 8 pm',
  save: 'Save',
  back: '← Back',

  email: 'Email',
  password: 'Password',
  newPassword: 'New password',
  signIn: 'Sign in',
  createAccount: 'Create account',
  emailLink: 'Email me a sign-in link',
  forgotPassword: 'Forgot password',
  savePassword: 'Save password',
  demoTitle: 'Just trying it out?',
  demoText: 'Use a demo with a sample profile. No account or email needed.',
  tryDemo: 'Try the demo',
  loginErrors: {
    missing: 'Enter your email (and password).',
    bad_login: 'Email or password is incorrect, or the email is not confirmed yet.',
    signup: 'Could not create the account. Use a password of at least 6 characters.',
    email: 'Could not send the email right now. Wait a minute and try again.',
    link: 'That link did not work. Open the newest email in this same browser, or request a new one.',
    password: 'Could not update the password. Use at least 6 characters.',
    demo: 'Could not start the demo right now. Wait a minute and try again.',
  },
  checkEmail: 'Check your email for the link.',
}

export function text(lang: Lang): Text {
  return lang === 'en' ? en : bn
}

export type ErrorKey = keyof Text['errors']
