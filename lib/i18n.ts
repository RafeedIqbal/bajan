// On-screen text in Bangla and English, chosen by the `lang` cookie (the toggle at the top of every page).
// Bajan's spoken language is separate: a profile setting (SPEECH below).

export type Lang = 'bn' | 'en'

export function langFrom(cookie: string | undefined): Lang {
  return cookie === 'en' ? 'en' : 'bn'
}

// Which language Bajan speaks (a profile setting, separate from the screen language), as a 5-point scale.
export const SPEECH = ['bangla_only', 'bangla_preferred', 'mix', 'english_preferred', 'english_only'] as const
export type Speech = (typeof SPEECH)[number]
export const DEFAULT_SPEECH: Speech = 'mix'

// A recording's length against its limit, e.g. 0:07 / 2:00.
const clock = (s: number, max: number) => [s, max].map((n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`).join(' / ')
const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯'
const bnDigits = (v: number | string) => String(v).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)])

// A routine time ('19:30') as people say it: "সন্ধ্যা ৭:৩০" / "7:30 pm".
const bnClock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  const part = h < 4 ? 'রাত' : h < 6 ? 'ভোর' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর' : h < 18 ? 'বিকেল' : h < 20 ? 'সন্ধ্যা' : 'রাত'
  return `${part} ${bnDigits(`${h % 12 || 12}:${String(m).padStart(2, '0')}`)}`
}
const enClock = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

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
  title: 'বাজান',
  tagline: 'গল্প করুন, প্রশ্ন করুন — বাজান আপনার কথা শুনবেন।',

  // conversation
  connecting: 'সংযোগ হচ্ছে…',
  listening: 'শুনছি…',
  ready: 'আপনার বার্তার অপেক্ষায়…',
  thinking: 'ভাবছি…',
  speaking: 'বলছি…',
  reconnecting: 'আবার সংযোগ হচ্ছে…',
  idleStopped: '৩ মিনিট কথা না হওয়ায় বন্ধ হয়েছে',
  start: 'শুরু করুন',
  stop: 'থামান',
  help: 'সাহায্য চাই',
  repeat: 'আবার বলুন',
  continueAudio: 'উত্তর শুনতে চাপুন',

  // transcript and messages
  conversation: 'কথোপকথন',
  transcriptEmpty: 'আপনার ও বাজানের কথা এখানে লেখা হিসেবে দেখা যাবে।',
  you: 'আপনি',
  voiceMessage: 'ভয়েস মেসেজ',
  typeLabel: 'লিখে পাঠান',
  send: 'পাঠান',
  recordVoice: 'ভয়েস মেসেজ রেকর্ড করুন',
  recording: (s: number, max: number) => `রেকর্ড হচ্ছে… ${clock(s, max).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)])}`,
  sendVoice: 'ভয়েস মেসেজ পাঠান',
  cancel: 'বাতিল করুন',
  messageNote: 'বাজান কথা বলে উত্তর দেন। উত্তরটি এখানেও পড়তে পারবেন।',

  // help request
  confirmCall: (who: string) => `${who}-কে ফোন করব?`,
  yesCall: 'হ্যাঁ, ফোন করুন',
  no: 'না',
  callStatus: 'পরীক্ষামূলক কলের অবস্থা',
  noRequest: 'এখনো ফোন করার অনুরোধ করা হয়নি',
  testCall: 'এটি শুধু ফোন করার পরীক্ষা। আসলে কাউকে ফোন করা হয় না।',
  noCaregiverNote: 'ফোন করার জন্য পরিবারের কাউকে যোগ করা হয়নি।',
  addCaregiver: 'পরিবারের কাউকে যোগ করুন',
  sending: 'অনুরোধ পাঠানো হচ্ছে…',
  requested: 'ফোন করার অনুরোধ পাওয়া গেছে',
  dialing: (who: string) => `${who}-কে ফোন করা হচ্ছে…`,
  answered: (who: string) => `${who} ফোন ধরেছেন — সাহায্য আসবে কি না, তা নিশ্চিত নয়।`,
  ended: 'কল শেষ।',
  failedNoAnswer: 'কেউ ফোন ধরেননি।',
  failedError: 'সমস্যার কারণে ফোন করা যায়নি।',
  needsReview: 'কলটি হয়েছে কি না, নিশ্চিত হওয়া যায়নি। প্রয়োজনে নিজে পরিবারের সদস্যকে ফোন করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
  unknown: 'কলের অবস্থা যাচাই করা হচ্ছে… প্রয়োজনে নিজে পরিবারের সদস্যকে ফোন করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
  reused: ' আগের অনুরোধটি দেখানো হচ্ছে; নতুন করে ফোন করা হয়নি। এক মিনিট পরে আবার চেষ্টা করুন।',

  // wake word
  wakeToggle: '“বাজান” বলে ডাকলে চালু হবে',
  wakeNote: 'এটি চালু থাকলে আপনার ডাক শোনার জন্য মাইক্রোফোনের শব্দ Google-এ পাঠানো হয়। “বাজান” বলে ডাকলে কথোপকথন শুরু হবে।',

  errors: {
    offline: 'সংযোগ করা যায়নি। ইন্টারনেট চালু আছে কি না দেখে আবার চেষ্টা করুন।',
    mic_denied: 'ব্রাউজারে মাইক্রোফোন ব্যবহারের অনুমতি দিন। তারপর আবার চেষ্টা করুন।',
    mic_missing: 'কোনো মাইক্রোফোন পাওয়া যায়নি।',
    mic_busy: 'অন্য কোনো অ্যাপ বা পাতায় মাইক্রোফোন ব্যবহার হচ্ছে। সেটি বন্ধ করে আবার চেষ্টা করুন।',
    mic_ended: 'মাইক্রোফোন বন্ধ হয়ে গেছে। আবার চেষ্টা করুন।',
    nothing_recorded: 'কিছু রেকর্ড হয়নি। মাইক্রোফোনের অনুমতি দিয়ে আবার চেষ্টা করুন।',
    message_unsent: 'সংযোগ কেটে গিয়েছিল; আপনার শেষ বার্তাটি হয়তো পৌঁছায়নি। উত্তর না পেলে আবার পাঠান।',
    signed_out: 'আপনি সাইন আউট হয়ে গেছেন। পাতাটি আবার খুলে সাইন ইন করুন।',
    no_profile: 'প্রোফাইল পাওয়া যায়নি। পাতাটি নতুন করে খুলুন।',
    unavailable: 'বাজান এখন সাড়া দিচ্ছেন না। একটু পরে আবার চেষ্টা করুন।',
    help_signed_out: 'আপনি সাইন আউট হয়ে গেছেন। পাতাটি আবার খুলে সাইন ইন করুন। প্রয়োজনে নিজে পরিবারের সদস্যকে ফোন করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
    help_not_sent: 'ফোন করার অনুরোধ পাঠানো যায়নি। প্রয়োজনে নিজে পরিবারের সদস্যকে ফোন করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
    help_unsent: 'ফোন করার অনুরোধটি পৌঁছায়নি। আবার “সাহায্য চাই” চাপুন। প্রয়োজনে নিজে পরিবারের সদস্যকে ফোন করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
    no_caregiver: 'ফোন করার জন্য পরিবারের কাউকে যোগ করা হয়নি। “প্রোফাইল বদলান” চেপে একজনকে যোগ করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
    wake_not_allowed: 'আপনার ডাক শোনার জন্য মাইক্রোফোন ব্যবহারের অনুমতি দিন।',
    wake_no_bangla: 'এই ব্রাউজার বাংলায় বলা কথা চিনতে পারে না। “শুরু করুন” চেপে কথা বলুন।',
    wake_failed: 'এই ব্রাউজারে “বাজান” ডাক শুনে চালু হওয়ার সুবিধাটি কাজ করছে না। “শুরু করুন” চেপে কথা বলুন।',
  },

  // home
  demoNote: 'আপনি ডেমো ব্যবহার করছেন। নমুনা প্রোফাইলটি বদলাতে পারেন। সাইন আউট করলে এই ডেমোতে আর ফিরে আসতে পারবেন না।',
  profile: 'প্রোফাইল',
  editProfile: 'প্রোফাইল বদলান',
  signOut: 'সাইন আউট',
  field: {
    name: 'নাম',
    formOfAddress: 'সম্বোধন',
    speech: 'বাজানের কথা বলার ভাষা',
    address: 'ঠিকানা',
    preferences: 'পছন্দ',
    conditions: 'রোগ',
    allergies: 'অ্যালার্জি',
    medications: 'ওষুধ',
    medicalSource: 'স্বাস্থ্যতথ্যের উৎস',
    updated: 'স্বাস্থ্যতথ্য হালনাগাদের তারিখ',
    caregiver: 'পরিবারের সদস্য',
    age: 'বয়স',
    gender: 'লিঙ্গ',
    bloodGroup: 'রক্তের গ্রুপ',
    needs: 'বিশেষ প্রয়োজন',
    routine: 'প্রতিদিনের রুটিন',
    contacts: 'যোগাযোগ',
    callsForHelp: 'সাহায্যের জন্য একেই ফোন করা হবে',
  },

  // profile form
  setupTitle: 'আপনার প্রোফাইল',
  sections: { about: 'আপনার সম্পর্কে', life: 'প্রতিদিনের জীবন', health: 'স্বাস্থ্য ও ওষুধ', contacts: 'যোগাযোগ' },
  intro: 'কোনো ঘর পূরণ করাই বাধ্যতামূলক নয়। যা জানাতে চান, শুধু তা লিখুন। বাজান এই তথ্য দেখে উত্তর দেবেন।',
  madeUp: 'এটি পরীক্ষামূলক সংস্করণ। নিজের আসল ব্যক্তিগত বা স্বাস্থ্যতথ্যের বদলে বানানো তথ্য দিন।',
  saveError: 'তথ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  useSample: 'নমুনা প্রোফাইল দিয়ে শুরু করুন',
  speechScale: ['শুধু বাংলা', 'মূলত বাংলা', 'আপনার কথার ভাষায়', 'মূলত ইংরেজি', 'শুধু ইংরেজি'],
  label: {
    name: 'বাজান আপনাকে যে নামে ডাকবেন',
    speech: 'বাজান কোন ভাষায় কথা বলবেন',
    formOfAddress: 'সম্বোধন — যেমন নানু, চাচা, আপা',
    address: 'ঠিকানা',
    birthYear: 'জন্মসাল — যেমন ১৯৫২',
    gender: 'লিঙ্গ',
    bloodGroup: 'রক্তের গ্রুপ',
    preferences: 'পছন্দ ও অভ্যাস',
    needs: 'বিশেষ প্রয়োজন',
    routine: 'প্রতিদিনের রুটিন',
    conditions: 'রোগ',
    allergies: 'অ্যালার্জি',
    medications: 'ওষুধ',
  },
  notGiven: 'বলা নেই',
  age: (n: number) => `প্রায় ${bnDigits(n)} বছর`,
  badYear: 'সালটি ঠিক নেই। চার অঙ্কে লিখুন, যেমন ১৯৫২।',
  genders: { female: 'নারী', male: 'পুরুষ', other: 'অন্যান্য' },
  needs: {
    hearing: 'শোনা — যেমন বাঁ কানে কম শোনেন',
    eyesight: 'দেখা — যেমন পড়তে চশমা লাগে',
    mobility: 'চলাফেরা — যেমন লাঠি নিয়ে হাঁটেন',
  },
  routine: { wake: 'ঘুম থেকে ওঠেন', breakfast: 'সকালের নাস্তা', lunch: 'দুপুরের খাবার', dinner: 'রাতের খাবার', sleep: 'ঘুমাতে যান' },
  clockTime: bnClock,
  roles: {
    son: 'ছেলে',
    daughter: 'মেয়ে',
    spouse: 'স্বামী/স্ত্রী',
    relative: 'আত্মীয়',
    caregiver: 'সেবাকর্মী',
    doctor: 'ডাক্তার',
    neighbour: 'প্রতিবেশী',
    other: 'অন্য কেউ',
  },
  times: { morning: 'সকাল', noon: 'দুপুর', evening: 'সন্ধ্যা', night: 'রাত' },
  meals: { before: 'খাবারের আগে', after: 'খাবারের পরে' },
  list: {
    add: 'যোগ করুন',
    remove: (item: string) => `${item} বাদ দিন`,
    added: (item: string) => `${item} যোগ হয়েছে`,
    removed: (item: string) => `${item} বাদ দেওয়া হয়েছে`,
    suggestions: 'চাপলেই যোগ হবে',
    full: 'সর্বোচ্চ ২০টি যোগ করা যায়।',
  },
  placeholders: { preferences: 'যেমন সকালে আদা-চা পছন্দ করেন', conditions: 'যেমন উচ্চ রক্তচাপ', allergies: 'যেমন পেনিসিলিন' },
  suggestions: {
    conditions: ['উচ্চ রক্তচাপ', 'ডায়াবেটিস', 'হৃদরোগ', 'হাঁপানি', 'বাত', 'কিডনির রোগ', 'থাইরয়েড', 'আগে স্ট্রোক হয়েছিল'],
    allergies: ['পেনিসিলিন', 'সালফা ওষুধ', 'অ্যাসপিরিন', 'চিংড়ি', 'বাদাম', 'ধুলাবালি'],
  },
  med: {
    heading: (n: number) => `ওষুধ ${bnDigits(n)}`,
    name: 'ওষুধের নাম ও মাত্রা — যেমন Metformin 500 mg',
    dose: 'কতটুকু — যেমন ১টি ট্যাবলেট',
    times: 'কখন খাবেন',
    meal: 'খাবারের আগে না পরে',
    note: 'অন্য নির্দেশনা — যেমন সকাল ৮টা, ৩০ দিন',
    add: 'ওষুধ যোগ করুন',
    remove: 'এই ওষুধটি বাদ দিন',
    full: 'সর্বোচ্চ ২০টি ওষুধ যোগ করা যায়।',
  },
  contact: {
    intro: 'ছেলেমেয়ে, ডাক্তার, সেবাকর্মী — যাঁদের সঙ্গে যোগাযোগ দরকার। সাহায্য চাইলে বাজান যাঁকে ফোন করবেন, তাঁকে বেছে দিন।',
    heading: (n: number) => `যোগাযোগ ${bnDigits(n)}`,
    name: 'নাম',
    role: 'আপনার কে হন',
    detail: 'আরও কিছু — যেমন বড় ছেলে, হৃদরোগ বিশেষজ্ঞ',
    phone: 'ফোন নম্বর (এই পরীক্ষায় কাউকে ফোন করা হয় না)',
    callForHelp: 'সাহায্য চাইলে বাজান এঁকেই ফোন করবেন',
    add: 'যোগাযোগ যোগ করুন',
    remove: 'এই যোগাযোগটি বাদ দিন',
    empty: 'কাউকে যোগ করা হয়নি। কেউ না থাকলে “সাহায্য চাই” চেপে কাউকে ফোন করা যাবে না।',
    full: 'সর্বোচ্চ ১০ জনকে যোগ করা যায়।',
  },
  importer: {
    title: 'প্রেসক্রিপশন বা রিপোর্ট থেকে যোগ করুন',
    text: 'প্রেসক্রিপশন বা রিপোর্টের ছবি তুলুন, অথবা ছবি বা PDF ফাইল দিন। রোগ, অ্যালার্জি ও ওষুধ পড়ে দেখানো হবে। আপনি মিলিয়ে দেখে বেছে নেবেন।',
    photo: 'ছবি তুলুন',
    file: 'ফাইল বেছে নিন',
    note: 'পড়ার জন্য ছবি বা ফাইলটি Google-এর Gemini-তে পাঠানো হয়। এই অ্যাপ সেটি কোথাও সংরক্ষণ করে না।',
    reading: 'পড়া হচ্ছে… কয়েক সেকেন্ড লাগতে পারে।',
    found: 'যা পাওয়া গেছে — কাগজের সঙ্গে মিলিয়ে দেখুন',
    already: 'আগেই আছে',
    addSelected: 'বাছাই করা তথ্য যোগ করুন',
    added: (n: number) => `${bnDigits(n)}টি তথ্য যোগ হয়েছে। কাগজের সঙ্গে মিলিয়ে নিয়ে নিচে “সংরক্ষণ করুন” চাপুন।`,
    nothingNew: 'নতুন কিছু পাওয়া যায়নি — সবই আগে থেকে আছে।',
    errors: {
      too_large: 'ফাইলটি অনেক বড় (সর্বোচ্চ ৪ MB)। প্রতিটি পাতার আলাদা ছবি তুলে দিন।',
      too_many: 'একবারে সর্বোচ্চ ৫টি পাতা দিন।',
      unsupported: 'এই ধরনের ফাইল পড়া যায় না। ছবি (JPG, PNG) বা PDF দিন।',
      unreadable: 'রোগ, অ্যালার্জি বা ওষুধের কোনো তথ্য পড়া যায়নি। আলোতে, কাছ থেকে পরিষ্কার ছবি তুলে আবার চেষ্টা করুন।',
      signed_out: 'আপনি সাইন আউট হয়ে গেছেন। পাতাটি আবার খুলে সাইন ইন করুন।',
      failed: 'এখন পড়া যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।',
    } as Record<string, string>,
  },
  save: 'সংরক্ষণ করুন',
  back: 'ফিরে যান',

  // login
  email: 'ইমেইল',
  password: 'পাসওয়ার্ড',
  newPassword: 'নতুন পাসওয়ার্ড',
  signIn: 'সাইন ইন',
  createAccount: 'অ্যাকাউন্ট খুলুন',
  emailLink: 'ইমেইলে সাইন-ইন লিংক পাঠান',
  forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
  savePassword: 'পাসওয়ার্ড সংরক্ষণ করুন',
  demoTitle: 'আগে ব্যবহার করে দেখতে চান?',
  demoText: 'নমুনা প্রোফাইল দিয়ে ডেমো ব্যবহার করুন। নিজে অ্যাকাউন্ট খুলতে বা ইমেইল দিতে হবে না।',
  tryDemo: 'ডেমো ব্যবহার করুন',
  orSignIn: 'অথবা অ্যাকাউন্টে সাইন ইন করুন',
  loginErrors: {
    missing: 'ইমেইল লিখুন। পাসওয়ার্ড দিয়ে সাইন ইন করতে বা অ্যাকাউন্ট খুলতে চাইলে পাসওয়ার্ডও লিখুন।',
    bad_login: 'ইমেইল বা পাসওয়ার্ড ঠিক নেই, অথবা ইমেইল যাচাই করা হয়নি। ইমেইলে পাওয়া লিংক দিয়ে যাচাই করে থাকলে ঠিকানা ও পাসওয়ার্ড মিলিয়ে আবার চেষ্টা করুন।',
    signup: 'অ্যাকাউন্ট খোলা যায়নি। পাসওয়ার্ডে অন্তত ৬টি অক্ষর, সংখ্যা বা চিহ্ন দিন।',
    email: 'এখন ইমেইল পাঠানো যাচ্ছে না। এক মিনিট পরে আবার চেষ্টা করুন।',
    link: 'লিংকটি কাজ করেনি। যে ব্রাউজার থেকে লিংক চেয়েছিলেন, সেটিতে সর্বশেষ ইমেইলের লিংক খুলুন। প্রয়োজনে নতুন লিংক পাঠানোর অনুরোধ করুন।',
    password: 'পাসওয়ার্ড বদলানো যায়নি। নতুন পাসওয়ার্ডে অন্তত ৬টি অক্ষর, সংখ্যা বা চিহ্ন দিন।',
    demo: 'এখন ডেমো শুরু করা যাচ্ছে না। এক মিনিট পরে আবার চেষ্টা করুন।',
  } as Record<string, string>,
  checkEmail: 'আপনার ইমেইল খুলে লিংকটি দেখুন। না পেলে স্প্যাম ফোল্ডারও দেখুন।',

  // error pages
  errorTitle: 'একটি সমস্যা হয়েছে',
  errorText: 'ইন্টারনেট চালু আছে কি না দেখে আবার চেষ্টা করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
  tryAgain: 'আবার চেষ্টা করুন',
  notFound: 'এই পাতাটি পাওয়া যায়নি।',
  goHome: 'শুরুর পাতায় যান',

  // redesign: hints, login welcome, guide
  idleHint: 'কথা বলতে “শুরু করুন” চাপুন',
  features: ['বাংলায়, ইংরেজিতে বা মিশিয়ে কথা বলুন', 'প্রোফাইলে লেখা ওষুধ, ঠিকানা ও অন্য তথ্য শুনুন', 'পরিবারকে ফোন করার সুবিধাটি পরীক্ষা করুন — আসল কল নয়'],
  guideNav: 'ব্যবহারের নিয়ম',
  guideLink: 'বাজান কীভাবে ব্যবহার করবেন',
  guide: {
    title: 'বাজান ব্যবহারের নিয়ম',
    intro: 'বাজান কীভাবে ব্যবহার করবেন, এখানে ধাপে ধাপে বলা আছে। চাইলে পরিবারের কাউকে সঙ্গে নিয়ে পড়ুন।',
    emergency: 'জরুরি অবস্থায় সরাসরি ৯৯৯-এ ফোন করুন। বাজান জরুরি সেবা দিতে পারেন না।',
    onThisPage: 'এই পাতায় যা আছে',
    quickTitle: 'তিন ধাপে শুরু',
    quick: [
      { title: '{start} চাপুন', text: 'বাজান কথা শুরু করা পর্যন্ত একটু অপেক্ষা করুন।' },
      { title: 'স্বাভাবিকভাবে কথা বলুন', text: 'বাংলায় বা ইংরেজিতে গল্প করুন, প্রশ্ন করুন। বাজান কথা বলে উত্তর দেবেন।' },
      { title: 'ফোন করার পরীক্ষা', text: '{help} চেপে নামটি দেখুন। {yesCall} চাপলে পরীক্ষামূলক কল শুরু হবে। আসলে কাউকে ফোন করা হবে না।' },
    ],
    sections: [
      {
        id: 'about',
        title: 'বাজান কে?',
        body: [
          'বাজান কথা বলতে পারেন এমন একটি ডিজিটাল সহকারী। একা থাকেন এমন বয়স্ক মানুষদের সঙ্গ দেওয়ার জন্য তাঁকে তৈরি করা হয়েছে। ছোট ভাই বা নাতির সঙ্গে যেভাবে কথা বলেন, বাজানের সঙ্গেও সেভাবে বলুন — বাংলায়, ইংরেজিতে বা মিশিয়ে। তিনি কথা বলে উত্তর দেন।',
        ],
        lists: [
          {
            title: 'বাজান যা পারেন',
            items: [
              'আপনার সঙ্গে গল্প করেন, সঙ্গ দেন।',
              'প্রোফাইলে লেখা তথ্য পড়ে শোনান — যেমন ওষুধের নাম ও খাওয়ার সময়, ঠিকানা, অ্যালার্জি।',
              'আপনার অনুমতি নিয়ে পরিবারের সদস্যকে ফোন করার পরীক্ষামূলক অনুরোধ পাঠান। আসলে কাউকে ফোন করা হয় না।',
            ],
          },
          {
            title: 'বাজান যা পারেন না',
            items: [
              'চিকিৎসার পরামর্শ দেন না, ওষুধের ডোজও বদলান না। শুধু প্রোফাইলে লেখা তথ্য পড়ে শোনান।',
              'অ্যাম্বুলেন্স বা পুলিশ ডাকেন না। জরুরি হলে নিজে ৯৯৯-এ ফোন করুন।',
            ],
          },
        ],
        note: 'এটি পরীক্ষামূলক সংস্করণ। কাউকে আসলে ফোন করা হয় না, কোনো ফোন বাজে না। নিজের আসল তথ্যের বদলে বানানো তথ্য ব্যবহার করুন।',
      },
      {
        id: 'start',
        title: 'শুরু করবেন যেভাবে',
        steps: [
          'সাইন ইনের পাতায় {tryDemo} চাপুন। নমুনা প্রোফাইল দিয়ে ব্যবহার করে দেখতে পারবেন। চাইলে ইমেইল দিয়ে নিজের অ্যাকাউন্টও খুলতে পারেন।',
          'নিজের অ্যাকাউন্ট খুললে প্রোফাইলে তথ্য লিখুন, অথবা {useSample} চাপুন। কোনো ঘর পূরণ করাই বাধ্যতামূলক নয়। ডেমোতে নমুনা প্রোফাইল আগে থেকেই দেওয়া থাকে।',
          'ফোন করার সুবিধাটি পরীক্ষা করতে প্রোফাইলের যোগাযোগ অংশে পরিবারের একজনের নমুনা নাম, সম্পর্ক ও ফোন নম্বর দিন। কেউ যোগ করা না থাকলে {help} চেপে পরীক্ষামূলক কলও করা যাবে না।',
          'ব্রাউজার মাইক্রোফোন ব্যবহারের অনুমতি চাইলে **Allow** (অনুমতি দিন) চাপুন।',
        ],
        note: 'শান্ত ঘরে ফোনের স্পিকার চালু করে কথা বলুন। ফোনটি এমন দূরত্বে রাখুন, যাতে আপনার কথা মাইক্রোফোনে স্পষ্ট শোনা যায়।',
      },
      {
        id: 'talk',
        title: 'বাজানের সঙ্গে কথা বলা',
        body: ['কথা বলার তিনটি উপায় আছে। বাজান কথা বলে উত্তর দেন। আপনার ও বাজানের কথা {conversation} অংশে লেখা হিসেবে দেখা যায়।'],
        lists: [
          {
            title: 'সরাসরি কথা বলা',
            items: [
              '{start} চাপুন, বাজান কথা শুরু করা পর্যন্ত অপেক্ষা করুন।',
              'স্বাভাবিকভাবে কথা বলুন। আপনার কথা শেষ হলে বাজান নিজেই বুঝে উত্তর দেবেন — কিছু চাপতে হবে না।',
              'বাজান কথা বলার সময় আপনি কিছু বললে তিনি থেমে আপনার কথা শোনেন।',
              'শেষ উত্তরটি আবার শুনতে {repeat} চাপুন।',
              'কথা শেষ হলে {stop} চাপুন। ৩ মিনিট কথা না হলে কথোপকথন নিজে থেকেই বন্ধ হয়।',
            ],
          },
          {
            title: 'লিখে পাঠানো',
            items: ['{typeLabel} ঘরে আপনার কথা লিখে {send} চাপুন। মাইক্রোফোন লাগবে না।', 'সরাসরি কথা বলার সময়ও লিখে পাঠাতে পারেন।'],
          },
          {
            title: 'ভয়েস মেসেজ',
            items: [
              '{recordVoice} চাপুন। কথা বলা শেষ হলে {sendVoice} চাপুন। মাঝে বিরতি দিলেও রেকর্ডিং চলবে।',
              'সর্বোচ্চ ২ মিনিট রেকর্ড করা যায়। ২ মিনিট হলে বার্তাটি নিজে থেকেই পাঠানো হয়। পুরো রেকর্ডিং একটি বার্তা হিসেবে যায়। পাঠাতে না চাইলে {cancel} চাপুন।',
              'সরাসরি কথা বলার সময় এই বোতামটি দেখা যায় না। তখন রেকর্ড না করে সরাসরি কথা বলুন।',
            ],
          },
          {
            title: 'বাজানের ছবির চারপাশের চিহ্নের অর্থ',
            items: [
              'সবুজ বৃত্ত ধীরে ধীরে নড়ছে — বাজান শুনছেন।',
              'তিনটি বিন্দু — বাজান ভাবছেন।',
              'স্থির সবুজ — বাজান বলছেন, অথবা আপনার বার্তার অপেক্ষায় আছেন।',
              'বৃত্ত ঘুরছে — সংযোগ হচ্ছে।',
              'লাল বৃত্ত — আপনার ভয়েস মেসেজ রেকর্ড হচ্ছে।',
            ],
          },
        ],
        note: 'ছবির নিচের লেখা দেখে বুঝতে পারবেন বাজান এখন কী করছেন।',
      },
      {
        id: 'family',
        title: 'পরিবারকে ফোন করার পরীক্ষা',
        steps: [
          'লাল {help} বোতাম চাপুন।',
          'নামটি ঠিক আছে কি না দেখুন। পরীক্ষা চালাতে চাইলে {yesCall} চাপুন। না চাইলে {no} চাপুন।',
          '{callStatus} অংশে পরীক্ষামূলক কলের ধাপ দেখুন। ফোন করা, ধরা ও শেষ হওয়ার অবস্থা দেখানো হয়; আসলে কারও ফোন বাজে না।',
        ],
        lists: [
          {
            title: 'জেনে রাখুন',
            items: [
              'মুখেও বলতে পারেন, যেমন “আমার ছেলেকে ফোন করুন”। পরীক্ষামূলক অনুরোধ পাঠানোর আগে বাজান আপনার অনুমতি চান।',
              'এই সংস্করণে “ফোন ধরেছেন” লেখাটিও পরীক্ষার অংশ। কেউ আসলে ফোন ধরেননি, সাহায্য আসার নিশ্চয়তাও নেই।',
              'সত্যি যোগাযোগ করতে হলে নিজে পরিবারের সদস্যকে ফোন করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
            ],
          },
        ],
        note: 'এক মিনিটের মধ্যে আবার অনুরোধ করলে নতুন কল শুরু হয় না। আগের অনুরোধ চলমান থাকলে বা তার ফল নিশ্চিত না হলেও নতুন কল শুরু হয় না।',
      },
      {
        id: 'language',
        title: 'ভাষা',
        body: [
          'ওপরের **বাংলা** / **English** বোতাম শুধু পর্দার লেখার ভাষা বদলায়।',
          'বাজান কোন ভাষায় কথা বলবেন, তা প্রোফাইলে ঠিক করা যায় — {speechScale.0} থেকে {speechScale.4} পর্যন্ত পাঁচটি ধাপ। {speechScale.2} বাছলে আপনি যে ভাষায় বলবেন, বাজানও সেই ভাষায় উত্তর দেবেন।',
          '{speechScale.1} বা {speechScale.3} বাছলে বাজান সাধারণত সেই ভাষায় কথা বলেন। অন্য ভাষায় পুরো বাক্য বললে ভাষা বদলাতে পারেন। শুধু “OK” বা “ধন্যবাদ” বললে ভাষা বদলানোর কথা নয়।',
          'বাজানকে বাংলা ও ইংরেজিতে উত্তর দেওয়ার নির্দেশ দেওয়া হয়েছে। ভুল ভাষায় উত্তর দিলে কোন ভাষায় শুনতে চান, তা বলুন।',
        ],
      },
      {
        id: 'wake',
        title: 'ডেকে কথা শুরু করা',
        body: [
          'Android ফোন বা কম্পিউটারে Chrome ব্যবহার করলে {wakeToggle} সুইচটি চালু করুন। এরপর “বাজান” বলে ডাকলে কথোপকথন শুরু হবে।',
          'এটি চালু থাকলে আপনার ডাক শোনার জন্য মাইক্রোফোনের শব্দ Google-এ পাঠানো হয়। প্রয়োজন না হলে সুইচটি বন্ধ রাখুন।',
          'ফোনের পর্দা চালু রাখুন। পর্দা বন্ধ হলে Chrome আপনার ডাক শোনা বন্ধ করে দেয়।',
        ],
        note: 'যে ব্রাউজারে এই সুবিধা নেই, সেখানে সুইচটি দেখা যায় না।',
      },
      {
        id: 'profile',
        title: 'আপনার প্রোফাইল',
        body: [
          'প্রোফাইলে আপনার নাম, সম্বোধন, বয়স, ঠিকানা, প্রতিদিনের রুটিন, বিশেষ প্রয়োজন, রোগ, অ্যালার্জি, ওষুধ এবং পরিবার ও ডাক্তারের যোগাযোগের তথ্য থাকে। বাজান এসব তথ্য দেখে উত্তর দেন।',
          'শুরুর পাতায় {editProfile} চেপে তথ্য বদলাতে পারেন।',
          'রোগ, অ্যালার্জি ও ওষুধ লিখে না দিয়ে প্রেসক্রিপশন বা রিপোর্টের ছবি তুলেও যোগ করা যায়। যা পড়া গেছে, তা দেখানো হয়। কাগজের সঙ্গে মিলিয়ে যা ঠিক, শুধু তা বেছে নিন।',
          'যোগাযোগ অংশে কয়েকজনকে যোগ করা যায়। সাহায্য চাইলে বাজান শুধু বেছে দেওয়া একজনকেই ফোন করেন।',
          'আপনার লেখা স্বাস্থ্যতথ্য এই অ্যাপ যাচাই করে না। বাজানকে লেখা তথ্য হুবহু পড়তে বলা হয়েছে, তবে ভুল হতে পারে। ওষুধের নাম ও ডোজ লিখিত তথ্যের সঙ্গে মিলিয়ে নিন। তিনি চিকিৎসার পরামর্শ দেন না।',
        ],
      },
      {
        id: 'install',
        title: 'ফোনের হোম স্ক্রিনে রাখুন',
        steps: [
          'Android ফোনে Chrome-এর ⋮ মেনু খুলে **Add to Home screen** (হোম স্ক্রিনে যোগ করুন) বাছুন।',
          'iPhone-এ Safari-এর শেয়ার বোতাম চেপে **Add to Home Screen** (হোম স্ক্রিনে যোগ করুন) বাছুন।',
          'হোম স্ক্রিনে বাজানের ছবিসহ আইকন দেখা যাবে। সেটি চাপলে অ্যাপ খুলবে।',
        ],
      },
      {
        id: 'problems',
        title: 'সমস্যা হলে',
        faq: [
          {
            q: 'বাজান আমার কথা শুনছেন না',
            a: 'ওয়েব ঠিকানার পাশের চিহ্নে চাপুন এবং মাইক্রোফোন ব্যবহারের অনুমতি দিন। মাইক্রোফোন ব্যবহার করছে এমন অন্য অ্যাপ বন্ধ করুন। তারপর আবার {start} চাপুন।',
          },
          {
            q: 'বাজানের কথা শুনতে পাচ্ছি না',
            a: 'ফোন বা কম্পিউটারের শব্দের মাত্রা বাড়ান। {continueAudio} বোতাম দেখা গেলে সেটি চাপুন। ব্রাউজার শব্দ চালানো আটকে রাখলে এই বোতামটি দেখা যায়।',
          },
          {
            q: '{reconnecting} লেখা আসছে',
            a: 'সংযোগ কেটে যাওয়ায় আবার সংযোগের চেষ্টা চলছে। কয়েক সেকেন্ড অপেক্ষা করুন। কাজ না হলে ইন্টারনেট চালু আছে কি না দেখুন। {stop} বোতাম থাকলে আগে সেটি চাপুন, তারপর {start} চাপুন।',
          },
          {
            q: 'নিজে থেকেই থেমে গেল',
            a: '৩ মিনিট কথা না হলে কথোপকথন নিজে থেকেই বন্ধ হয় এবং মাইক্রোফোন ছেড়ে দেওয়া হয়। আবার কথা বলতে {start} চাপুন। “বাজান” ডাকে চালু হওয়ার সুইচটি চালু থাকলে আপনার ডাক শোনার জন্য মাইক্রোফোন আবার চালু হবে।',
          },
          {
            q: '{help} চাপলে বলছে কেউ যোগ করা নেই',
            a: '{editProfile} চেপে প্রোফাইলে পরিবারের একজনকে যোগ করুন। জরুরি হলে ৯৯৯-এ ফোন করুন।',
          },
          {
            q: 'কথোপকথনের লেখা মুছে গেছে',
            a: 'এই অ্যাপ কথোপকথনের লেখা সংরক্ষণ করে না। পাতাটি আবার লোড করলে, অন্য পাতায় গেলে বা বন্ধ করলে এখানকার লেখা মুছে যায়।',
          },
          {
            q: 'লেখা খুব ছোট',
            a: 'লেখা বড় করতে ফোনের পর্দায় দুই আঙুল রেখে দূরে সরান। কম্পিউটারে Ctrl ও + একসঙ্গে চাপুন। Mac-এ ⌘ ও + চাপুন।',
          },
        ],
      },
      {
        id: 'privacy',
        title: 'গোপনীয়তা ও নিরাপত্তা',
        lists: [
          {
            items: [
              'উত্তর দেওয়ার জন্য আপনার বলা ও লেখা কথা এবং প্রোফাইলের তথ্য Google-এর Gemini সেবায় পাঠানো হয়।',
              'এই অ্যাপ কথোপকথনের লেখা সংরক্ষণ করে না। পাতাটি আবার লোড করলে এখানকার লেখা মুছে যায়। Google-এ পাঠানো তথ্যের ক্ষেত্রে তাদের সেবার তথ্য ব্যবহারের নিয়ম প্রযোজ্য।',
              'প্রোফাইলের তথ্য আপনার অ্যাকাউন্টে সংরক্ষিত থাকে। অ্যাপ প্রোফাইল থেকে কারও ফোন নম্বর Gemini-তে পাঠায় না। কথায় বা বার্তায় নম্বর জানালে তা অবশ্য Gemini-তে যাবে।',
              'প্রেসক্রিপশন বা রিপোর্টের ছবি দিলে, পড়ার জন্য সেটি Gemini-তে পাঠানো হয়। অ্যাপ ছবিটি সংরক্ষণ করে না; শুধু আপনার বেছে নেওয়া তথ্য প্রোফাইলে থাকে।',
              '“বাজান” ডাকে চালু হওয়ার সুবিধাটি চালু রাখলে আপনার ডাক শোনার জন্য শব্দ Google-এর আলাদা একটি কথাচেনার সেবায় পাঠানো হয়।',
              'বাজান চিকিৎসার পরামর্শ বা জরুরি সেবা দিতে পারেন না। জরুরি হলে ৯৯৯-এ ফোন করুন।',
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
  title: 'Bajan',
  tagline: 'Chat and ask questions — Bajan is here to listen.',

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
  transcriptEmpty: 'What you and Bajan say will be written here.',
  you: 'You',
  voiceMessage: 'Voice message',
  typeLabel: 'Type a message',
  send: 'Send',
  recordVoice: 'Record a voice message',
  recording: (s: number, max: number) => `Recording… ${clock(s, max)}`,
  sendVoice: 'Send voice message',
  cancel: 'Cancel',
  messageNote: 'Bajan always answers out loud; the answer is written here too.',

  confirmCall: (who: string) => `Call ${who}?`,
  yesCall: 'Yes, call',
  no: 'No',
  callStatus: 'Test call status',
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

  wakeToggle: 'Listen for "Bajan"',
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
    unavailable: 'Bajan is not responding right now. Try again in a moment.',
    help_signed_out: 'You have been signed out. Reload the page and sign in again. If needed, call your family member yourself, or 999 in an emergency.',
    help_not_sent: 'The request could not be sent. If needed, call your family member yourself, or 999 in an emergency.',
    help_unsent: 'The request did not get through. Press Get help again. If needed, call your family member yourself, or 999 in an emergency.',
    no_caregiver: 'No family member has been added to call — add one under "Edit profile". In an emergency, call 999.',
    wake_not_allowed: 'Please allow the microphone so Bajan can listen for his name.',
    wake_no_bangla: 'This browser cannot listen for Bangla.',
    wake_failed: 'Listening for the name does not work in this browser.',
  },

  demoNote: 'You are trying the demo. You can edit the sample profile; after signing out, you cannot return to this demo session.',
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
    updated: 'Health details last updated',
    caregiver: 'Family member',
    age: 'Age',
    gender: 'Sex / gender',
    bloodGroup: 'Blood group',
    needs: 'Needs',
    routine: 'Daily routine',
    contacts: 'Contacts',
    callsForHelp: 'Called for help',
  },

  setupTitle: 'Your profile',
  sections: { about: 'About you', life: 'Daily life', health: 'Health and medicines', contacts: 'Contacts' },
  intro: 'Every field is optional — fill in only what you want. Bajan answers from these details.',
  madeUp: 'This is a test version. Use made-up details instead of real personal or health information.',
  saveError: 'Could not save; please try again.',
  useSample: 'Start with the sample profile',
  speechScale: ['Bangla only', 'Bangla preferred', 'Mix (follow me)', 'English preferred', 'English only'],
  label: {
    name: 'Name to call you by',
    speech: 'Which language Bajan speaks',
    formOfAddress: 'How to address you, e.g. Nanu, Chacha, Apa',
    address: 'Address',
    birthYear: 'Year of birth, e.g. 1952',
    gender: 'Sex / gender',
    bloodGroup: 'Blood group',
    preferences: 'Likes and habits',
    needs: 'Needs',
    routine: 'Daily routine',
    conditions: 'Health conditions',
    allergies: 'Allergies',
    medications: 'Medicines',
  },
  notGiven: 'Not given',
  age: (n: number) => `about ${n} years old`,
  badYear: 'That is not a year. Use four digits, e.g. 1952.',
  genders: { female: 'Female', male: 'Male', other: 'Other' },
  needs: {
    hearing: 'Hearing, e.g. hard of hearing in the left ear',
    eyesight: 'Eyesight, e.g. needs glasses to read',
    mobility: 'Getting around, e.g. walks with a stick',
  },
  routine: { wake: 'Wakes up', breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', sleep: 'Goes to bed' },
  clockTime: enClock,
  roles: {
    son: 'Son',
    daughter: 'Daughter',
    spouse: 'Husband / wife',
    relative: 'Relative',
    caregiver: 'Caregiver',
    doctor: 'Doctor',
    neighbour: 'Neighbour',
    other: 'Someone else',
  },
  times: { morning: 'Morning', noon: 'Midday', evening: 'Evening', night: 'Night' },
  meals: { before: 'Before food', after: 'After food' },
  list: {
    add: 'Add',
    remove: (item: string) => `Remove ${item}`,
    added: (item: string) => `${item} added`,
    removed: (item: string) => `${item} removed`,
    suggestions: 'Tap to add',
    full: 'Up to 20 can be added.',
  },
  placeholders: { preferences: 'e.g. likes ginger tea in the morning', conditions: 'e.g. high blood pressure', allergies: 'e.g. penicillin' },
  suggestions: {
    conditions: ['High blood pressure', 'Diabetes', 'Heart disease', 'Asthma', 'Arthritis', 'Kidney disease', 'Thyroid', 'Past stroke'],
    allergies: ['Penicillin', 'Sulfa drugs', 'Aspirin', 'Shrimp', 'Nuts', 'Dust'],
  },
  med: {
    heading: (n: number) => `Medicine ${n}`,
    name: 'Medicine and strength, e.g. Metformin 500 mg',
    dose: 'How much, e.g. 1 tablet',
    times: 'When to take it',
    meal: 'Before or after food',
    note: 'Other instructions, e.g. at 8 am, for 30 days',
    add: 'Add a medicine',
    remove: 'Remove this medicine',
    full: 'Up to 20 medicines can be added.',
  },
  contact: {
    intro: 'Children, doctors, caregivers — anyone to keep in touch with. Choose the one Bajan calls when you ask for help.',
    heading: (n: number) => `Contact ${n}`,
    name: 'Name',
    role: 'Who they are to you',
    detail: 'More detail, e.g. elder son, heart specialist',
    phone: 'Phone number (test calls never dial it)',
    callForHelp: 'Bajan calls this person when you ask for help',
    add: 'Add a contact',
    remove: 'Remove this contact',
    empty: 'Nobody added yet. Without a contact, Get help cannot call anyone.',
    full: 'Up to 10 contacts can be added.',
  },
  importer: {
    title: 'Add from a prescription or report',
    text: 'Take a photo of a prescription or report, or choose a photo or PDF. Conditions, allergies and medicines are read and shown here for you to check and choose.',
    photo: 'Take a photo',
    file: 'Choose a file',
    note: 'The photo or file is sent to Google’s Gemini to be read. This app does not store it anywhere.',
    reading: 'Reading… this can take a few seconds.',
    found: 'What was found — check it against the paper',
    already: 'already listed',
    addSelected: 'Add the selected details',
    added: (n: number) => `${n} ${n === 1 ? 'detail' : 'details'} added. Check them against the paper, then press Save below.`,
    nothingNew: 'Nothing new was found — everything is already listed.',
    errors: {
      too_large: 'The file is too large (4 MB at most). Take a photo of each page instead.',
      too_many: 'Choose at most 5 pages at a time.',
      unsupported: 'This kind of file cannot be read. Use a photo (JPG, PNG) or a PDF.',
      unreadable: 'No conditions, allergies or medicines could be read. Take a clear, close photo in good light and try again.',
      signed_out: 'You have been signed out. Reload the page and sign in again.',
      failed: 'It cannot be read right now. Try again in a moment.',
    } as Record<string, string>,
  },
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
  features: ['Talk in Bangla, English or a mix', 'Hear the medicines, address and other details in your profile', 'Try a simulated family call — no real phone rings'],
  guideNav: 'How to use',
  guideLink: 'How to use Bajan',
  guide: {
    title: 'How to use Bajan',
    intro: 'Talking with Bajan is simple. Everything is explained here step by step — read it together with a family member if you like.',
    emergency: 'In an emergency, call 999 directly. Bajan is not an emergency service.',
    onThisPage: 'On this page',
    quickTitle: 'Start in three steps',
    quick: [
      { title: 'Press {start}', text: 'Wait a moment for Bajan to greet you.' },
      { title: 'Speak normally', text: 'Ask anything, in Bangla or English. He answers out loud.' },
      { title: 'Try a test call', text: 'Press {help}, check the name, then press {yesCall} to simulate a call. No real phone will ring.' },
    ],
    sections: [
      {
        id: 'about',
        title: 'What is Bajan?',
        body: [
          'Bajan is a friendly voice companion for older adults who live alone. Talk to him the way you would talk to a younger brother or a grandson — in Bangla, English or a mix. He answers out loud.',
        ],
        lists: [
          {
            title: 'What he can do',
            items: [
              'Chat with you and keep you company.',
              'Read back your profile — recorded medicine names and times, your address, your allergies.',
              'Send a simulated family-call request with your permission. No real call is made.',
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
          'If you create an account, fill in your profile or press {useSample}. Every field is optional. The demo already has a sample profile.',
          'To try the call feature, add made-up details for one family member under Contacts: name, relationship and phone number. Without one, {help} cannot start a test call.',
          'When the browser asks to use the microphone, press **Allow**.',
        ],
        note: 'It works best in a quiet room, with the phone on loudspeaker about an arm’s length away.',
      },
      {
        id: 'talk',
        title: 'Talking with Bajan',
        body: ['There are three ways to talk. He always answers out loud, and both sides are written under {conversation}.'],
        lists: [
          {
            title: 'Live conversation',
            items: [
              'Press {start} and wait for Bajan to greet you.',
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
              'Up to 2 minutes, sent as one message. At 2 minutes it sends automatically. Press {cancel} to discard it before then.',
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
        title: 'Trying a simulated family call',
        steps: [
          'Press the red {help} button.',
          'Check the name, then press {yesCall}. If you pressed it by mistake, press {no}.',
          'Watch {callStatus}: it simulates dialing, answering and ending. No real phone rings.',
        ],
        lists: [
          {
            title: 'Good to know',
            items: [
              'You can also ask by voice, for example "Call my son". Bajan asks for your permission before sending the simulated request.',
              'In this version, "Answered" is also simulated. Nobody actually answered, and it does not mean help is on the way.',
              'To reach someone, call your family member yourself — or 999 in an emergency.',
            ],
          },
        ],
        note: 'Asking again within a minute does not place a second call. Neither does asking while the previous request is active or its outcome is uncertain.',
      },
      {
        id: 'language',
        title: 'Language',
        body: [
          'The **বাংলা** / **English** buttons at the top change only the words on the screen.',
          'The language Bajan speaks is set in your profile, in five steps from {speechScale.0} to {speechScale.4}. With {speechScale.2} he answers in whichever language you use.',
          'With {speechScale.1} or {speechScale.3}, he normally uses that language. A whole sentence in the other language can switch it; a brief "OK" or "thank you" should not.',
          'Bajan is instructed to answer in Bangla and English. If he uses the wrong language, tell him which one you want.',
        ],
      },
      {
        id: 'wake',
        title: 'Hands-free start',
        body: [
          'In Chrome on Android or a computer, turn on {wakeToggle}. Then just say "বাজান" (Bajan) and the conversation starts.',
          'While it is on, sound from the microphone goes to Google to listen for the name. Turn it off when you don’t need it.',
          'Keep the screen on: Chrome stops listening when the screen goes to sleep.',
        ],
        note: 'The switch only appears in browsers that support it.',
      },
      {
        id: 'profile',
        title: 'Your profile',
        body: [
          'Bajan answers from your profile: your name and how to address you, age, address, daily routine and needs, health conditions, allergies, medicines, and your family’s and doctor’s contact details.',
          'Change it any time with the {editProfile} button on the home page.',
          'Instead of typing conditions, allergies and medicines, you can take a photo of a prescription or report. What could be read is shown to you; check it against the paper and choose only what is right.',
          'You can add several contacts. When you ask for help, Bajan calls only the one you chose.',
          'The app does not verify the health details you enter. Bajan is instructed to read them exactly, but mistakes are possible. Check medicine names and doses against the written details. He does not give medical advice.',
        ],
      },
      {
        id: 'install',
        title: 'Add to your home screen',
        steps: [
          'Android (Chrome): open the ⋮ menu and choose **Add to Home screen**.',
          'iPhone (Safari): press the Share button and choose **Add to Home Screen**.',
          'Bajan’s face appears as an app icon, and opens full screen.',
        ],
      },
      {
        id: 'problems',
        title: 'If something goes wrong',
        faq: [
          {
            q: 'Bajan can’t hear me',
            a: 'Allow the microphone: tap the icon next to the web address, turn the microphone on, then press {start} again. Close other apps that may be using the microphone.',
          },
          {
            q: 'I can’t hear Bajan',
            a: 'Turn up the volume. If a {continueAudio} button appears, press it — the browser paused the sound.',
          },
          {
            q: 'It says {reconnecting}',
            a: 'The connection dropped and Bajan is trying to reconnect. Wait a few seconds and check your internet. If it does not recover, press {stop} if shown, then {start}.',
          },
          {
            q: 'It stopped by itself',
            a: 'After 3 minutes without talking, the conversation stops and releases the microphone. Press {start} to talk again. If the wake-word switch is on, the microphone starts listening for his name again.',
          },
          {
            q: '{help} says nobody has been added',
            a: 'Add a family member to your profile with {editProfile}. In an emergency, call 999.',
          },
          {
            q: 'The conversation disappeared',
            a: 'This app does not save the transcript. Reloading, leaving or closing the page clears the text shown here.',
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
              'To answer you, what you say and type, along with profile details, goes to Google’s Gemini service.',
              'This app does not save the transcript; reloading the page clears the text shown here. Data sent to Google is subject to that service’s data policies.',
              'Your profile is saved in your account. The app leaves out every phone number when sending the profile to Gemini. A number you say or type in a message is still sent.',
              'A photo or file of a prescription or report is sent to Gemini to be read. The app does not store it; only the details you choose are saved to your profile.',
              'When the wake-word switch is on, microphone audio also goes to Google’s separate speech recognition service to listen for his name.',
              'Bajan does not give medical advice and is not an emergency service. In an emergency, call 999.',
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
