// On-screen text in Bangla and English, chosen by the `lang` cookie (the toggle at the top of every page).
// Bhaijaan's spoken language is separate: a profile setting (SPEECH below).

export type Lang = 'bn' | 'en'

export function langFrom(cookie: string | undefined): Lang {
  return cookie === 'en' ? 'en' : 'bn'
}

// Which language Bhaijaan speaks (a profile setting, separate from the screen language), as a 5-point scale.
export const SPEECH = ['bangla_only', 'bangla_preferred', 'mix', 'english_preferred', 'english_only'] as const
export type Speech = (typeof SPEECH)[number]
export const DEFAULT_SPEECH: Speech = 'mix'

// A recording's length against its limit, e.g. 0:07 / 2:00.
const clock = (s: number, max: number) => [s, max].map((n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`).join(' / ')
const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯'

// The usage guide (/guide). In its strings, {key} shows that on-screen label (e.g. {start}, {speechScale.0}), so the
// guide always names the buttons exactly as they read; **text** is other emphasis.
export type GuideSection = {
  id: string
  title: string
  body?: string[]
  steps?: string[]
  lists?: { title?: string; items: string[] }[]
  faq?: { q: string; a: string }[]
  note?: string
}

const bn = {
  title: 'ভাইজান',
  tagline: 'কথা বলুন, প্রশ্ন করুন, দরকারে সাহায্য চান — ভাইজান পাশে আছেন।',

  // conversation
  connecting: 'সংযোগ হচ্ছে…',
  listening: 'শুনছি…',
  ready: 'আপনার বার্তার অপেক্ষায়…',
  thinking: 'ভাবছি…',
  speaking: 'বলছি…',
  reconnecting: 'আবার সংযোগ হচ্ছে…',
  idleStopped: 'কথা না হওয়ায় বন্ধ হলো',
  start: 'শুরু করুন',
  stop: 'থামুন',
  help: 'সাহায্য চাই',
  repeat: 'আবার বলুন',
  continueAudio: 'চালিয়ে যেতে চাপুন',

  // transcript and messages
  conversation: 'কথোপকথন',
  transcriptEmpty: 'আপনি আর ভাইজান যা বলবেন, এখানে লেখা দেখা যাবে।',
  you: 'আপনি',
  voiceMessage: 'ভয়েস মেসেজ',
  typeLabel: 'লিখে পাঠান',
  send: 'পাঠান',
  recordVoice: 'ভয়েস মেসেজ রেকর্ড করুন',
  recording: (s: number, max: number) => `রেকর্ড হচ্ছে… ${clock(s, max).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)])}`,
  sendVoice: 'ভয়েস মেসেজ পাঠান',
  cancel: 'বাতিল',
  messageNote: 'ভাইজান সবসময় মুখে উত্তর দেন; উত্তরটি এখানেও লেখা থাকে।',

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
    offline: 'সংযোগ হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।',
    mic_denied: 'মাইক্রোফোন চালুর অনুমতি দিন, তারপর আবার চেষ্টা করুন।',
    mic_missing: 'কোনো মাইক্রোফোন পাওয়া যায়নি।',
    mic_busy: 'মাইক্রোফোন এখন অন্য কোথাও ব্যবহার হচ্ছে।',
    mic_ended: 'মাইক্রোফোন বন্ধ হয়ে গেছে। আবার চেষ্টা করুন।',
    nothing_recorded: 'কিছু রেকর্ড হয়নি। মাইক্রোফোনের অনুমতি দিয়ে আবার চেষ্টা করুন।',
    message_unsent: 'সংযোগ কেটে গিয়েছিল; আপনার শেষ বার্তাটি হয়তো পৌঁছায়নি। উত্তর না পেলে আবার পাঠান।',
    signed_out: 'আপনি সাইন আউট হয়ে গেছেন। পাতাটি নতুন করে খুলে আবার সাইন ইন করুন।',
    no_profile: 'প্রোফাইল পাওয়া যায়নি। পাতাটি নতুন করে খুলুন।',
    unavailable: 'ভাইজান এখন সাড়া দিচ্ছেন না। একটু পরে আবার চেষ্টা করুন।',
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
  sections: { about: 'আপনার সম্পর্কে', health: 'স্বাস্থ্য ও ওষুধ' },
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
  back: 'ফিরে যান',

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
  orSignIn: 'অথবা অ্যাকাউন্টে সাইন ইন করুন',
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

  // error pages
  errorTitle: 'কিছু একটা গোলমাল হয়েছে',
  errorText: 'ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
  tryAgain: 'আবার চেষ্টা করুন',
  notFound: 'এই পাতাটি পাওয়া যায়নি।',
  goHome: 'শুরুর পাতায় যান',

  // redesign: hints, login welcome, guide
  idleHint: 'কথা বলতে "শুরু করুন" চাপুন',
  features: ['বাংলায়, ইংরেজিতে বা মিশিয়ে কথা বলুন', 'ওষুধ, ঠিকানা ও নিজের তথ্য জিজ্ঞেস করুন', 'দরকারে এক চাপে পরিবারকে ফোন'],
  guideNav: 'ব্যবহারের নিয়ম',
  guideLink: 'ভাইজান কীভাবে ব্যবহার করবেন',
  guide: {
    title: 'ভাইজান ব্যবহারের নিয়ম',
    intro: 'ভাইজানের সাথে কথা বলা সহজ। এখানে ধাপে ধাপে সব লেখা আছে — চাইলে পরিবারের কাউকে সাথে নিয়ে পড়ুন।',
    emergency: 'জরুরি অবস্থায় সরাসরি ৯৯৯-এ ফোন করুন। ভাইজান জরুরি সেবা নন।',
    onThisPage: 'এই পাতায় যা আছে',
    quickTitle: 'তিন ধাপে শুরু',
    quick: [
      { title: '{start} চাপুন', text: 'ভাইজান কথা শুরু না করা পর্যন্ত একটু অপেক্ষা করুন।' },
      { title: 'স্বাভাবিকভাবে কথা বলুন', text: 'বাংলায় বা ইংরেজিতে যা খুশি জিজ্ঞেস করুন। ভাইজান মুখে উত্তর দেবেন।' },
      { title: 'পরিবারকে দরকার?', text: '{help} চাপুন — ভাইজান আপনার পরিবারের সদস্যকে ফোন করবেন।' },
    ],
    sections: [
      {
        id: 'about',
        title: 'ভাইজান কে?',
        body: [
          'ভাইজান একজন বন্ধুর মতো কণ্ঠ-সহকারী, যাঁরা একা থাকেন সেই বয়স্ক মানুষদের জন্য। ছোট ভাই বা নাতির সাথে যেভাবে কথা বলেন, ভাইজানের সাথেও সেভাবেই বলুন — বাংলায়, ইংরেজিতে বা মিশিয়ে। তিনি মুখে উত্তর দেন।',
        ],
        lists: [
          {
            title: 'ভাইজান যা পারেন',
            items: [
              'আপনার সাথে গল্প করেন, সঙ্গ দেন।',
              'আপনার প্রোফাইল দেখে উত্তর দেন — কোন ওষুধ কখন, আপনার ঠিকানা, অ্যালার্জি।',
              'আপনি চাইলে পরিবারের সদস্যকে ফোন করেন।',
            ],
          },
          {
            title: 'ভাইজান যা পারেন না',
            items: [
              'চিকিৎসার পরামর্শ দেন না, ওষুধের ডোজও বদলান না। লেখা তথ্য পড়ে শোনান এবং পরিবারকে ফোন করার কথা বলেন।',
              'অ্যাম্বুলেন্স বা পুলিশ ডাকেন না। জরুরি হলে নিজে ৯৯৯-এ ফোন করুন।',
            ],
          },
        ],
        note: 'এটি পরীক্ষামূলক সংস্করণ: পরিবারকে করা কল আসলে যায় না, কোনো ফোন বাজে না। দয়া করে কাল্পনিক তথ্য ব্যবহার করুন।',
      },
      {
        id: 'start',
        title: 'শুরু করবেন যেভাবে',
        steps: [
          'সাইন-ইন পাতায় {tryDemo} চাপুন — নমুনা প্রোফাইল দিয়ে ঘুরে দেখতে পারবেন। অথবা ইমেইল দিয়ে নিজের অ্যাকাউন্ট খুলুন।',
          'প্রোফাইল পূরণ করুন, অথবা {useSample} চাপুন। সব ঘর ঐচ্ছিক।',
          'ফোন করার জন্য পরিবারের একজনকে যোগ করুন — নাম, সম্পর্ক ও ফোন নম্বর। কেউ যোগ করা না থাকলে {help} চেপে কাউকে ফোন করা যাবে না।',
          'ব্রাউজার মাইক্রোফোন ব্যবহারের অনুমতি চাইলে **Allow** (অনুমতি দিন) চাপুন।',
        ],
        note: 'সবচেয়ে ভালো হয় শান্ত ঘরে, ফোন লাউডস্পিকারে রেখে, মোটামুটি এক হাত দূর থেকে কথা বললে।',
      },
      {
        id: 'talk',
        title: 'ভাইজানের সাথে কথা বলা',
        body: ['কথা বলার তিনটি উপায় আছে। ভাইজান সবসময় মুখে উত্তর দেন, আর দুজনের কথাই {conversation} অংশে লেখা থাকে।'],
        lists: [
          {
            title: 'সরাসরি কথা',
            items: [
              '{start} চাপুন, ভাইজান কথা শুরু করা পর্যন্ত অপেক্ষা করুন।',
              'স্বাভাবিকভাবে কথা বলুন। আপনার কথা শেষ হলে ভাইজান নিজেই বুঝে উত্তর দেবেন — কিছু চাপতে হবে না।',
              'ভাইজান বলার সময় আপনি কথা বললে তিনি থেমে আপনার কথা শোনেন।',
              'শেষ উত্তরটি আবার শুনতে {repeat} চাপুন।',
              'কথা শেষ হলে {stop} চাপুন। ৩ মিনিট কেউ কথা না বললে ভাইজান নিজেই থেমে যান।',
            ],
          },
          {
            title: 'লিখে পাঠানো',
            items: ['{typeLabel} ঘরে লিখে {send} চাপুন। মাইক্রোফোন লাগবে না।', 'সরাসরি কথার মাঝেও লিখে পাঠাতে পারেন।'],
          },
          {
            title: 'ভয়েস মেসেজ',
            items: [
              '{recordVoice} চাপুন, কথা বলুন — মাঝে থামলেও সমস্যা নেই — তারপর {sendVoice} চাপুন।',
              'সর্বোচ্চ ২ মিনিট, পুরোটা একটি বার্তা হিসেবে যায়। বাদ দিতে চাইলে {cancel} চাপুন।',
              'সরাসরি কথার সময় এই বোতাম থাকে না — তখন শুধু কথা বলুন।',
            ],
          },
          {
            title: 'মুখের চারপাশের বৃত্তের মানে',
            items: [
              'সবুজ, ধীরে ধীরে নড়ছে — ভাইজান শুনছেন।',
              'তিনটি বিন্দু — ভাইজান ভাবছেন।',
              'স্থির সবুজ — ভাইজান বলছেন, অথবা আপনার বার্তার অপেক্ষায় আছেন।',
              'ঘুরছে — সংযোগ হচ্ছে।',
              'লাল — আপনার ভয়েস মেসেজ রেকর্ড হচ্ছে।',
            ],
          },
        ],
        note: 'মুখের নিচের লেখাটি সবসময় বলে দেয় ভাইজান এখন কী করছেন।',
      },
      {
        id: 'family',
        title: 'পরিবারকে ফোন করা',
        steps: [
          'লাল {help} বোতাম চাপুন।',
          'নামটি ঠিক আছে কিনা দেখে {yesCall} চাপুন। ভুল করে চাপলে {no} চাপুন।',
          '{callStatus} অংশে দেখুন — ফোন বাজছে, ধরেছেন, নাকি কল শেষ।',
        ],
        lists: [
          {
            title: 'জেনে রাখুন',
            items: [
              'মুখেও বলতে পারেন, যেমন "আমার ছেলেকে ফোন করো"। ফোন করার আগে ভাইজান সবসময় আপনার কাছে নিশ্চিত হয়ে নেন।',
              '"ফোন ধরেছেন" মানে শুধু কলটি লেগেছে — সাহায্য আসছে, তা নিশ্চিত নয়।',
              'কল না হলে নিজে পরিবারের সদস্যকে ফোন করুন, জরুরি হলে ৯৯৯-এ।',
            ],
          },
        ],
        note: 'পরীক্ষামূলক সংস্করণে আসল ফোন বাজে না। এক মিনিটের মধ্যে আবার চাইলে নতুন কল হয় না।',
      },
      {
        id: 'language',
        title: 'ভাষা',
        body: [
          'ওপরের **বাংলা** / **English** বোতাম শুধু পর্দার লেখার ভাষা বদলায়।',
          'ভাইজান কোন ভাষায় কথা বলবেন, তা প্রোফাইলে ঠিক করা যায় — {speechScale.0} থেকে {speechScale.4} পর্যন্ত পাঁচটি ধাপ। {speechScale.2} বাছলে আপনি যে ভাষায় বলবেন, ভাইজানও সেই ভাষায় উত্তর দেবেন।',
          'ভাইজান কখনো হিন্দি বা উর্দুর মতো তৃতীয় কোনো ভাষায় কথা বলেন না।',
        ],
      },
      {
        id: 'wake',
        title: 'হাত না লাগিয়ে শুরু',
        body: [
          'Android বা কম্পিউটারের Chrome-এ {wakeToggle} চালু করুন। তারপর শুধু "ভাইজান" বললেই কথা শুরু হবে।',
          'চালু থাকলে নাম শোনার জন্য মাইকের শব্দ Google-এ যায়। দরকার না হলে বন্ধ রাখুন।',
          'পর্দা চালু রাখুন: পর্দা ঘুমিয়ে গেলে Chrome শোনা বন্ধ করে দেয়।',
        ],
        note: 'যে ব্রাউজারে এই সুবিধা নেই, সেখানে সুইচটি দেখা যায় না।',
      },
      {
        id: 'profile',
        title: 'আপনার প্রোফাইল',
        body: [
          'ভাইজান আপনার প্রোফাইল দেখে উত্তর দেন: আপনার নাম ও সম্বোধন, ঠিকানা, রোগ, অ্যালার্জি, ওষুধ আর পরিবারের সদস্য।',
          'হোম পাতার {editProfile} বোতাম চেপে যেকোনো সময় বদলাতে পারেন।',
          'ওষুধের তথ্য আপনি নিজে লিখেছেন, ডাক্তার যাচাই করেননি। ভাইজান তা হুবহু পড়ে শোনান, কিন্তু চিকিৎসার পরামর্শ দেন না।',
        ],
      },
      {
        id: 'install',
        title: 'ফোনের হোম স্ক্রিনে রাখুন',
        steps: [
          'Android (Chrome): ওপরের ⋮ মেনু খুলে **Add to Home screen** (হোম স্ক্রিনে যোগ করুন) বাছুন।',
          'iPhone (Safari): শেয়ার বোতাম চেপে **Add to Home Screen** বাছুন।',
          'ভাইজানের মুখ একটি অ্যাপের আইকন হিসেবে দেখা যাবে; চাপলে পুরো পর্দায় খুলবে।',
        ],
      },
      {
        id: 'problems',
        title: 'সমস্যা হলে',
        faq: [
          {
            q: 'ভাইজান আমার কথা শুনছেন না',
            a: 'মাইক্রোফোনের অনুমতি দিন: ওয়েব ঠিকানার পাশের চিহ্নে চেপে মাইক্রোফোন চালু করুন, তারপর আবার {start} চাপুন। মাইক ব্যবহার করছে এমন অন্য অ্যাপ বন্ধ করুন।',
          },
          {
            q: 'ভাইজানের কথা শুনতে পাচ্ছি না',
            a: 'ফোনের আওয়াজ বাড়ান। {continueAudio} বোতাম দেখা গেলে সেটি চাপুন — ব্রাউজার শব্দ থামিয়ে রেখেছিল।',
          },
          {
            q: '{reconnecting} লেখা আসছে',
            a: 'ইন্টারনেট এক মুহূর্তের জন্য চলে গিয়েছিল। কয়েক সেকেন্ড অপেক্ষা করুন, কথা নিজে থেকেই আবার চলবে। না চললে আবার {start} চাপুন।',
          },
          {
            q: 'নিজে থেকেই থেমে গেল',
            a: '৩ মিনিট কথা না হলে ভাইজান থেমে যান, যাতে মাইক্রোফোন চালু পড়ে না থাকে। আবার কথা বলতে {start} চাপুন।',
          },
          {
            q: '{help} চাপলে বলছে কেউ যোগ করা নেই',
            a: '{editProfile} চেপে প্রোফাইলে পরিবারের একজনকে যোগ করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
          },
          {
            q: 'কথোপকথনের লেখা মুছে গেছে',
            a: 'কথোপকথন কোথাও সংরক্ষণ করা হয় না। পাতাটি নতুন করে খুললে বা বন্ধ করলে লেখা মুছে যায়।',
          },
          {
            q: 'লেখা খুব ছোট',
            a: 'বড় করে দেখুন: ফোনে দুই আঙুল দিয়ে ছড়িয়ে দিন, কম্পিউটারে Ctrl আর + চাপুন (Mac-এ ⌘ আর +)।',
          },
        ],
      },
      {
        id: 'privacy',
        title: 'গোপনীয়তা ও নিরাপত্তা',
        lists: [
          {
            items: [
              'আপনাকে উত্তর দিতে আপনার বলা ও লেখা কথা Google-এর Gemini সেবায় যায়।',
              'পর্দার কথোপকথন কোথাও জমা থাকে না; পাতা নতুন করে খুললে মুছে যায়।',
              'আপনার প্রোফাইল আপনার অ্যাকাউন্টে সংরক্ষিত থাকে। পরিবারের সদস্যের ফোন নম্বর কখনো Gemini-তে পাঠানো হয় না।',
              'ভাইজান চিকিৎসার পরামর্শ দেন না এবং জরুরি সেবা নন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
            ],
          },
        ],
      },
    ] as GuideSection[],
    cta: 'কথা বলা শুরু করুন',
  },
}

export type Text = typeof bn

// `Text` makes the compiler check that English has exactly the same entries as Bangla.
const en: Text = {
  title: 'Bhaijaan',
  tagline: 'Talk, ask questions, get help when you need it — Bhaijaan is here for you.',

  connecting: 'Connecting…',
  listening: 'Listening…',
  ready: 'Waiting for your message…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  reconnecting: 'Reconnecting…',
  idleStopped: 'Stopped because nobody spoke',
  start: 'Start',
  stop: 'Stop',
  help: 'Get help',
  repeat: 'Repeat',
  continueAudio: 'Tap to continue',

  conversation: 'Conversation',
  transcriptEmpty: 'What you and Bhaijaan say will be written here.',
  you: 'You',
  voiceMessage: 'Voice message',
  typeLabel: 'Type a message',
  send: 'Send',
  recordVoice: 'Record a voice message',
  recording: (s: number, max: number) => `Recording… ${clock(s, max)}`,
  sendVoice: 'Send voice message',
  cancel: 'Cancel',
  messageNote: 'Bhaijaan always answers out loud; the answer is written here too.',

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
    offline: 'Could not connect. Check the internet and try again.',
    mic_denied: 'Please allow the microphone, then try again.',
    mic_missing: 'No microphone was found.',
    mic_busy: 'The microphone is being used by something else.',
    mic_ended: 'The microphone turned off. Please try again.',
    nothing_recorded: 'Nothing was recorded. Allow the microphone and try again.',
    message_unsent: 'The connection dropped, so your last message may not have arrived. Send it again if no answer comes.',
    signed_out: 'You have been signed out. Reload the page and sign in again.',
    no_profile: 'No profile was found. Please reload the page.',
    unavailable: 'Bhaijaan is not responding right now. Try again in a moment.',
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
  sections: { about: 'About you', health: 'Health and medicines' },
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
  back: 'Back',

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
  orSignIn: 'Or sign in to your account',
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

  errorTitle: 'Something went wrong',
  errorText: 'Check the internet connection and try again. In an emergency, call 999.',
  tryAgain: 'Try again',
  notFound: 'This page could not be found.',
  goHome: 'Go to the start page',

  idleHint: 'Press Start to talk',
  features: ['Talk in Bangla, English or a mix', 'Ask about your medicines, address and more', 'Call your family with one button'],
  guideNav: 'How to use',
  guideLink: 'How to use Bhaijaan',
  guide: {
    title: 'How to use Bhaijaan',
    intro: 'Talking with Bhaijaan is simple. Everything is explained here step by step — read it together with a family member if you like.',
    emergency: 'In an emergency, call 999 directly. Bhaijaan is not an emergency service.',
    onThisPage: 'On this page',
    quickTitle: 'Start in three steps',
    quick: [
      { title: 'Press {start}', text: 'Wait a moment for Bhaijaan to greet you.' },
      { title: 'Speak normally', text: 'Ask anything, in Bangla or English. He answers out loud.' },
      { title: 'Need your family?', text: 'Press {help} and Bhaijaan calls your family member.' },
    ],
    sections: [
      {
        id: 'about',
        title: 'What is Bhaijaan?',
        body: [
          'Bhaijaan is a friendly voice companion for older adults who live alone. Talk to him the way you would talk to a younger brother or a grandson — in Bangla, English or a mix. He answers out loud.',
        ],
        lists: [
          {
            title: 'What he can do',
            items: [
              'Chat with you and keep you company.',
              'Answer from your profile — which medicine to take when, your address, your allergies.',
              'Call your family member when you ask him to.',
            ],
          },
          {
            title: 'What he cannot do',
            items: [
              'Give medical advice or change a dose. He reads back what is written and offers to call your family.',
              'Call an ambulance or the police. In an emergency, call 999 yourself.',
            ],
          },
        ],
        note: 'This is a test version: calls to family are simulated, and no phone really rings. Please use made-up details.',
      },
      {
        id: 'start',
        title: 'Getting started',
        steps: [
          'On the sign-in page, press {tryDemo} to look around with a sample profile — or create your own account with your email.',
          'Fill in your profile, or press {useSample}. Every field is optional.',
          'Add one family member to call: name, relationship and phone number. Without one, {help} cannot call anyone.',
          'When the browser asks to use the microphone, press **Allow**.',
        ],
        note: 'It works best in a quiet room, with the phone on loudspeaker about an arm’s length away.',
      },
      {
        id: 'talk',
        title: 'Talking with Bhaijaan',
        body: ['There are three ways to talk. He always answers out loud, and both sides are written under {conversation}.'],
        lists: [
          {
            title: 'Live conversation',
            items: [
              'Press {start} and wait for Bhaijaan to greet you.',
              'Speak normally. When you finish, he notices and answers by himself — no need to press anything.',
              'If you speak while he is talking, he stops and listens.',
              'Press {repeat} to hear his last answer again.',
              'Press {stop} when you are done. If nobody speaks for 3 minutes, he stops by himself.',
            ],
          },
          {
            title: 'Typed message',
            items: ['Write in the {typeLabel} box and press {send}. No microphone needed.', 'You can type during a live conversation too.'],
          },
          {
            title: 'Voice message',
            items: [
              'Press {recordVoice}, speak — pauses are fine — then press {sendVoice}.',
              'Up to 2 minutes, sent as one message. Press {cancel} to throw it away.',
              'During a live conversation this button is hidden — just speak.',
            ],
          },
          {
            title: 'What the circle around his face means',
            items: [
              'Green and gently pulsing: he is listening.',
              'Three dots: he is thinking.',
              'Steady green: he is speaking, or waiting for your message.',
              'Spinning: connecting.',
              'Red: your voice message is recording.',
            ],
          },
        ],
        note: 'The words under his face always say what he is doing.',
      },
      {
        id: 'family',
        title: 'Calling your family',
        steps: [
          'Press the red {help} button.',
          'Check the name, then press {yesCall}. If you pressed it by mistake, press {no}.',
          'Watch {callStatus}: it shows when the phone is ringing, answered or finished.',
        ],
        lists: [
          {
            title: 'Good to know',
            items: [
              'You can also ask by voice, for example "Call my son". Bhaijaan always checks with you before calling.',
              '"Answered" only means the call connected — not that help is on the way.',
              'If the call does not go through, call your family member yourself — or 999 in an emergency.',
            ],
          },
        ],
        note: 'In this test version no real phone rings. Asking again within a minute does not place a second call.',
      },
      {
        id: 'language',
        title: 'Language',
        body: [
          'The **বাংলা** / **English** buttons at the top change only the words on the screen.',
          'The language Bhaijaan speaks is set in your profile, in five steps from {speechScale.0} to {speechScale.4}. With {speechScale.2} he answers in whichever language you use.',
          'He never answers in a third language such as Hindi or Urdu.',
        ],
      },
      {
        id: 'wake',
        title: 'Hands-free start',
        body: [
          'In Chrome on Android or a computer, turn on {wakeToggle}. Then just say "ভাইজান" (Bhaijaan) and the conversation starts.',
          'While it is on, sound from the microphone goes to Google to listen for the name. Turn it off when you don’t need it.',
          'Keep the screen on: Chrome stops listening when the screen goes to sleep.',
        ],
        note: 'The switch only appears in browsers that support it.',
      },
      {
        id: 'profile',
        title: 'Your profile',
        body: [
          'Bhaijaan answers from your profile: your name and how to address you, your address, health conditions, allergies, medicines and your family member.',
          'Change it any time with the {editProfile} button on the home page.',
          'Medicine details are what you typed — not checked by a doctor. Bhaijaan reads them back exactly, but never gives medical advice.',
        ],
      },
      {
        id: 'install',
        title: 'Add to your home screen',
        steps: [
          'Android (Chrome): open the ⋮ menu and choose **Add to Home screen**.',
          'iPhone (Safari): press the Share button and choose **Add to Home Screen**.',
          'Bhaijaan’s face appears as an app icon, and opens full screen.',
        ],
      },
      {
        id: 'problems',
        title: 'If something goes wrong',
        faq: [
          {
            q: 'Bhaijaan can’t hear me',
            a: 'Allow the microphone: tap the icon next to the web address, turn the microphone on, then press {start} again. Close other apps that may be using the microphone.',
          },
          {
            q: 'I can’t hear Bhaijaan',
            a: 'Turn up the volume. If a {continueAudio} button appears, press it — the browser paused the sound.',
          },
          {
            q: 'It says {reconnecting}',
            a: 'The internet dropped for a moment. Wait a few seconds and the conversation carries on by itself. If it doesn’t, press {start} again.',
          },
          {
            q: 'It stopped by itself',
            a: 'After 3 minutes without talking, Bhaijaan stops so the microphone is not left on. Press {start} to talk again.',
          },
          {
            q: '{help} says nobody has been added',
            a: 'Add a family member to your profile with {editProfile}. In an emergency, call 999.',
          },
          {
            q: 'The conversation disappeared',
            a: 'The conversation is not saved anywhere. Reloading or closing the page clears it.',
          },
          {
            q: 'The words are too small',
            a: 'Zoom in: spread two fingers on a phone, or press Ctrl and + on a computer (⌘ and + on a Mac).',
          },
        ],
      },
      {
        id: 'privacy',
        title: 'Privacy and safety',
        lists: [
          {
            items: [
              'To answer you, what you say and type goes to Google’s Gemini service.',
              'The conversation on screen is not stored anywhere; reloading the page clears it.',
              'Your profile is saved in your account. Your family member’s phone number is never sent to Gemini.',
              'Bhaijaan does not give medical advice and is not an emergency service. In an emergency, call 999.',
            ],
          },
        ],
      },
    ],
    cta: 'Start talking',
  },
}

export function text(lang: Lang): Text {
  return lang === 'en' ? en : bn
}

// The on-screen label a guide placeholder names: 'start' → t.start, 'speechScale.0' → t.speechScale[0].
export function labelAt(t: Text, path: string): string | undefined {
  const v = path.split('.').reduce<unknown>((v, key) => (v as Record<string, unknown> | undefined)?.[key], t)
  return typeof v === 'string' ? v : undefined
}

export type ErrorKey = keyof Text['errors']
