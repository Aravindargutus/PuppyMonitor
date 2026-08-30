/* Bonzaa web client — talks to the Catalyst Advanced I/O function on the same origin.
 * i18n: UI renders in English or Tamil; canonical values stored in the DB stay English. */
'use strict';

const API = '/server/bonzaa_api';

/* ---------- i18n ---------- */

const T = {
  en: {
    daily_meals: 'Daily meals', food_catalog: 'Food catalog', your_pack: 'Your pack',
    meals_of: (n) => `${n}'s meals`, health_of: (n) => `${n}'s health`,
    tab_today: 'Today', tab_foods: 'Foods', tab_insights: 'Insights', tab_puppies: 'Puppies',
    today_prefix: 'Today', welcome_title: 'Welcome to Bonzaa',
    welcome_msg: 'Add your first puppy with the + button to start tracking meals from morning to night.',
    morning: 'Morning', noon: 'Noon', evening: 'Evening', night: 'Night',
    no_meals: 'No meals logged', badge_new: 'NEW', by: 'by',
    log_meal: '🍽️ Log a meal', food: 'Food', meal_slot: 'Meal slot',
    quantity: 'Quantity', unit: 'Unit', time: 'Time', fed_by: 'Fed by (optional)', fed_by_ph: 'Who fed?',
    first_time_q: 'First time eating this?', first_time_hint: 'New foods are prime suspects if tummy trouble follows.',
    save_meal: 'Save meal', add_food_first: 'Add a food in the Foods tab first — every meal points at a food from the catalog.',
    add_food: '🦴 Add a food', edit_food: '🦴 Edit food', name: 'Name', brand_opt: 'Brand (optional)',
    type: 'Type', usually_for: 'Usually for', everyone: '👨‍👩‍👧 Everyone',
    save_food: 'Save food', save_changes: 'Save changes',
    foods_hint: "Tap a food to edit it or tag who it's usually for.",
    no_foods_title: 'No foods yet',
    no_foods_msg: 'Add every food, brand, and treat your puppies eat. Each logged meal points at one of these — that is what makes the suspect analysis possible.',
    add_puppy: '🐶 Add a puppy', breed_opt: 'Breed (optional)', birth_opt: 'Birth date (optional)', save_puppy: 'Save puppy',
    no_puppies_title: 'No puppies yet',
    no_puppies_msg: 'Add your puppies with the + button — then start logging their meals from morning to night.',
    add_puppy_first_title: 'Add a puppy first', add_puppy_first_msg: 'Health incidents are tracked per puppy.',
    log_symptom: '🤒 Log a reaction',
    symptom_desc: (n) => `For ${n} — Bonzaa will immediately check what was eaten in the 2–48 hours before it started.`,
    symptom: 'What happened?', severity: 'Severity', onset: 'When it started', notes_opt: 'Notes (optional)',
    save_analyze: 'Save & analyze',
    mild: 'mild', moderate: 'moderate', severe: 'severe',
    suspects_title: '🔍 Suspect foods', onset_at: 'onset',
    in_window: (x) => `${x}× in the 2–48h window`, last14: (x) => `${x}× in last 14 days`,
    before_incidents: (x) => `before ${x} earlier incident(s)`, new_food_badge: 'NEW FOOD',
    vet_note: 'Correlation aid only — confirm with a veterinarian.',
    no_window_meals: 'No meals were logged in the 2–48 hours before it started, so there is nothing to analyze. Keep logging every meal for better results.',
    insights_hint: 'Tap an incident to see which foods were the likely cause.',
    no_incidents_title: 'No incidents logged',
    no_incidents_msg: (n) => `Hopefully it stays that way! If ${n} ever feels unwell — vomiting, strange drool, anything — log it with the + button and Bonzaa will analyze recent meals for likely culprits.`,
    remove_q: (n) => `Remove ${n}?`,
    remove_msg: 'This removes the puppy from Bonzaa. Meal and symptom history stays in the database but will no longer be shown.',
    cancel: 'Cancel', remove: 'Remove',
    t_meal_saved: 'Meal saved 🐶', t_food_added: 'Food added', t_food_updated: 'Food updated',
    t_welcome: (n) => `Welcome, ${n}! 🐾`, t_meal_deleted: 'Meal deleted', t_removed: (n) => `${n} removed`,
    t_need_food_name: 'Give the food a name', t_need_puppy_name: 'Give your puppy a name', t_need_onset: 'Pick a time',
    your_puppy: 'your puppy',
    reminder_missed: (s) => `⏰ ${s} — not logged yet. Tap to log now.`,
    t_speech_err: "Couldn't hear that — try again", t_listening: 'Listening…',
    sym: {
      'vomiting': 'vomiting', 'diarrhea': 'diarrhea', 'bloody drool': 'bloody drool',
      'black drool': 'black drool', 'excessive drooling': 'excessive drooling',
      'swollen face': 'swollen face', 'shivering': 'shivering', 'lethargy': 'lethargy',
      'refusing food': 'refusing food', 'itching': 'itching', 'crying': 'crying / whining', 'other': 'other',
    },
    ft: {
      'kibble': 'kibble', 'wet food': 'wet food', 'treat': 'treat',
      'human food': 'human food', 'supplement': 'supplement', 'other': 'other',
    },
  },
  ta: {
    daily_meals: 'தினசரி உணவுகள்', food_catalog: 'உணவு பட்டியல்', your_pack: 'உங்கள் குட்டிகள்',
    meals_of: (n) => `${n} — உணவுகள்`, health_of: (n) => `${n} — நலம்`,
    tab_today: 'இன்று', tab_foods: 'உணவுகள்', tab_insights: 'நலம்', tab_puppies: 'குட்டிகள்',
    today_prefix: 'இன்று', welcome_title: 'Bonzaa-வுக்கு வரவேற்பு!',
    welcome_msg: 'காலை முதல் இரவு வரை உணவு பதிவை தொடங்க + பொத்தானை அழுத்தி உங்கள் முதல் குட்டியை சேர்க்கவும்.',
    morning: 'காலை', noon: 'மதியம்', evening: 'மாலை', night: 'இரவு',
    no_meals: 'உணவு பதிவில்லை', badge_new: 'புதியது', by: 'ஊட்டியவர்',
    log_meal: '🍽️ உணவு பதிவு', food: 'உணவு', meal_slot: 'உணவு நேரம்',
    quantity: 'அளவு', unit: 'அலகு', time: 'நேரம்', fed_by: 'ஊட்டியவர் (விருப்பம்)', fed_by_ph: 'யார் ஊட்டியது?',
    first_time_q: 'இதை முதல் முறையாக சாப்பிடுகிறதா?', first_time_hint: 'வயிற்று பிரச்சனை வந்தால் புதிய உணவுகளே முக்கிய சந்தேகம்.',
    save_meal: 'சேமி', add_food_first: 'முதலில் உணவுகள் தாவலில் ஒரு உணவை சேர்க்கவும் — ஒவ்வொரு உணவு பதிவும் பட்டியலில் உள்ள ஒரு உணவை குறிக்கும்.',
    add_food: '🦴 உணவு சேர்க்க', edit_food: '🦴 உணவை திருத்த', name: 'பெயர்', brand_opt: 'பிராண்ட் (விருப்பம்)',
    type: 'வகை', usually_for: 'வழக்கமாக யாருக்கு', everyone: '👨‍👩‍👧 எல்லோருக்கும்',
    save_food: 'சேமி', save_changes: 'மாற்றங்களை சேமி',
    foods_hint: 'உணவை திருத்த அல்லது குட்டியுடன் இணைக்க தட்டவும்.',
    no_foods_title: 'இன்னும் உணவுகள் இல்லை',
    no_foods_msg: 'உங்கள் குட்டிகள் சாப்பிடும் ஒவ்வொரு உணவு, பிராண்ட், சிற்றுண்டியையும் சேர்க்கவும். ஒவ்வொரு உணவு பதிவும் இவற்றில் ஒன்றை குறிக்கும் — அதுவே சந்தேக உணவு ஆய்வை சாத்தியமாக்கும்.',
    add_puppy: '🐶 குட்டியை சேர்க்க', breed_opt: 'இனம் (விருப்பம்)', birth_opt: 'பிறந்த தேதி (விருப்பம்)', save_puppy: 'சேமி',
    no_puppies_title: 'இன்னும் குட்டிகள் இல்லை',
    no_puppies_msg: '+ பொத்தானை அழுத்தி உங்கள் குட்டிகளை சேர்க்கவும் — பின்னர் காலை முதல் இரவு வரை உணவு பதிவு செய்யுங்கள்.',
    add_puppy_first_title: 'முதலில் குட்டியை சேர்க்கவும்', add_puppy_first_msg: 'நல சம்பவங்கள் குட்டி வாரியாக பதிவாகும்.',
    log_symptom: '🤒 அறிகுறி பதிவு',
    symptom_desc: (n) => `${n}-க்கு — தொடங்குவதற்கு முன் 2–48 மணி நேரத்தில் என்ன சாப்பிட்டது என்று Bonzaa உடனே ஆராயும்.`,
    symptom: 'என்ன ஆனது?', severity: 'தீவிரம்', onset: 'தொடங்கிய நேரம்', notes_opt: 'குறிப்பு (விருப்பம்)',
    save_analyze: 'சேமித்து ஆராய்',
    mild: 'லேசு', moderate: 'மிதம்', severe: 'கடுமை',
    suspects_title: '🔍 சந்தேக உணவுகள்', onset_at: 'தொடக்கம்',
    in_window: (x) => `2–48மணி இடைவெளியில் ${x}×`, last14: (x) => `கடந்த 14 நாட்களில் ${x}×`,
    before_incidents: (x) => `முந்தைய ${x} சம்பவங்களுக்கு முன்பும்`, new_food_badge: 'புதிய உணவு',
    vet_note: 'இது தொடர்பு அடிப்படையிலான உதவி மட்டுமே — கால்நடை மருத்துவரிடம் உறுதிப்படுத்தவும்.',
    no_window_meals: 'தொடங்குவதற்கு முன் 2–48 மணி நேரத்தில் உணவு பதிவுகள் இல்லை. சிறந்த முடிவுகளுக்கு ஒவ்வொரு உணவையும் பதிவு செய்யுங்கள்.',
    insights_hint: 'எந்த உணவு காரணமாக இருக்கலாம் என்று பார்க்க ஒரு சம்பவத்தை தட்டவும்.',
    no_incidents_title: 'சம்பவங்கள் இல்லை',
    no_incidents_msg: (n) => `அப்படியே இருக்கட்டும்! ${n}-க்கு உடல்நிலை சரியில்லை என்றால் — வாந்தி, வித்தியாசமான உமிழ்நீர், எதுவானாலும் — + பொத்தானால் பதிவு செய்யுங்கள்; சமீபத்திய உணவுகளை Bonzaa ஆராயும்.`,
    remove_q: (n) => `${n}-ஐ நீக்கவா?`,
    remove_msg: 'இது குட்டியை Bonzaa-விலிருந்து நீக்கும். உணவு மற்றும் அறிகுறி வரலாறு தரவுத்தளத்தில் இருக்கும், ஆனால் காட்டப்படாது.',
    cancel: 'ரத்து', remove: 'நீக்கு',
    t_meal_saved: 'உணவு சேமிக்கப்பட்டது 🐶', t_food_added: 'உணவு சேர்க்கப்பட்டது', t_food_updated: 'புதுப்பிக்கப்பட்டது',
    t_welcome: (n) => `வரவேற்கிறோம், ${n}! 🐾`, t_meal_deleted: 'நீக்கப்பட்டது', t_removed: (n) => `${n} நீக்கப்பட்டது`,
    t_need_food_name: 'உணவுக்கு ஒரு பெயர் கொடுங்கள்', t_need_puppy_name: 'குட்டிக்கு ஒரு பெயர் கொடுங்கள்', t_need_onset: 'நேரத்தை தேர்வு செய்யவும்',
    your_puppy: 'உங்கள் குட்டி',
    reminder_missed: (s) => `⏰ ${s} — இன்னும் பதிவாகவில்லை. இப்போது பதிவு செய்ய தட்டவும்.`,
    t_speech_err: 'கேட்கவில்லை — மீண்டும் முயற்சிக்கவும்', t_listening: 'கேட்கிறது…',
    sym: {
      'vomiting': 'வாந்தி', 'diarrhea': 'வயிற்றுப்போக்கு', 'bloody drool': 'இரத்த உமிழ்நீர்',
      'black drool': 'கருப்பு உமிழ்நீர்', 'excessive drooling': 'அதிக உமிழ்நீர் வடிதல்',
      'swollen face': 'முக வீக்கம்', 'shivering': 'நடுக்கம்', 'lethargy': 'சோர்வு',
      'refusing food': 'உணவு மறுப்பு', 'itching': 'அரிப்பு', 'crying': 'அழுகை / சிணுங்கல்', 'other': 'மற்றவை',
    },
    ft: {
      'kibble': 'உலர் உணவு', 'wet food': 'ஈர உணவு', 'treat': 'சிற்றுண்டி',
      'human food': 'வீட்டு உணவு', 'supplement': 'ஊட்டச்சத்து', 'other': 'மற்றவை',
    },
  },
};

// Language: URL ?lang=ta wins (and persists), then the saved choice,
// then the browser language — so a Tamil phone starts in Tamil.
let lang = 'en';
try {
  const qLang = new URLSearchParams(location.search).get('lang');
  const stored = localStorage.getItem('bonzaa_lang');
  lang = (qLang === 'ta' || qLang === 'en') ? qLang
    : stored || ((navigator.language || '').startsWith('ta') ? 'ta' : 'en');
  if (qLang === 'ta' || qLang === 'en') localStorage.setItem('bonzaa_lang', lang);
} catch (e) { /* private mode */ }
function t(key, ...args) {
  const v = (T[lang] && T[lang][key]) ?? T.en[key];
  return typeof v === 'function' ? v(...args) : v;
}
// Symptom and food-type values are stored canonically in English; display is localized.
function symLabel(key) {
  return (T[lang].sym && T[lang].sym[key]) || T.en.sym[key] || key;
}
function ftLabel(key) {
  return (T[lang].ft && T[lang].ft[key]) || T.en.ft[key] || key || 'other';
}

/* ---------- constants ---------- */

const SLOTS = [
  { key: 'morning', emoji: '☀️', time: '08:00' },
  { key: 'noon', emoji: '🌤️', time: '12:30' },
  { key: 'evening', emoji: '🌆', time: '17:30' },
  { key: 'night', emoji: '🌙', time: '21:00' },
];
const FOOD_TYPES = ['kibble', 'wet food', 'treat', 'human food', 'supplement', 'other'];
const FOOD_EMOJI = { kibble: '🥣', 'wet food': '🥫', treat: '🦴', 'human food': '🍗', supplement: '💊', other: '🍽️' };
// Canonical symptom/reaction keys — stored in English, displayed localized.
const SYMPTOMS = [
  'vomiting', 'diarrhea', 'bloody drool', 'black drool', 'excessive drooling',
  'swollen face', 'shivering', 'lethargy', 'refusing food', 'itching', 'crying', 'other',
];

const state = {
  tab: 'today',
  puppies: [],
  foods: [],
  selectedPuppyId: null,
  date: todayStr(),
  feedings: [],
  symptoms: [],
};

const $ = (sel) => document.querySelector(sel);
const view = $('#view');

/* ---------- helpers ---------- */

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function prettyDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const label = d.toLocaleDateString(lang === 'ta' ? 'ta-IN' : undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return dateStr === todayStr() ? `${t('today_prefix')} · ${label}` : label;
}
function nowLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function foodName(id) {
  const f = state.foods.find((x) => x.ROWID === id);
  return f ? f.Name : '—';
}
function puppyName(id) {
  const p = state.puppies.find((x) => x.ROWID === String(id ?? ''));
  return p ? p.Name : null;
}
function selectedPuppy() {
  return state.puppies.find((p) => p.ROWID === state.selectedPuppyId) || null;
}
function fmtQty(q) {
  const n = Number(q);
  if (!n) return '';
  return (n % 1 === 0 ? n.toFixed(0) : n) + ' ';
}
function ageLabel(birth) {
  if (!birth) return '';
  const b = new Date(birth.slice(0, 10) + 'T12:00:00');
  if (isNaN(b)) return '';
  const months = (Date.now() - b.getTime()) / (1000 * 3600 * 24 * 30.44);
  if (lang === 'ta') {
    if (months < 1) return `${Math.max(1, Math.round(months * 30.44))} நாட்கள்`;
    if (months < 12) return `${Math.floor(months)} மாதம்`;
    return `${Math.floor(months / 12)} வருடம் ${Math.floor(months % 12)} மாதம்`;
  }
  if (months < 1) return `${Math.max(1, Math.round(months * 30.44))} days old`;
  if (months < 12) return `${Math.floor(months)}m old`;
  return `${Math.floor(months / 12)}y ${Math.floor(months % 12)}m old`;
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
}

async function call(path, opts = {}) {
  $('#loader').hidden = false;
  try {
    const res = await fetch(API + path, {
      ...opts,
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  } finally {
    $('#loader').hidden = true;
  }
}

/* ---------- data loading ---------- */

async function loadCore() {
  try {
    const [p, f] = await Promise.all([call('/puppies'), call('/foods')]);
    state.puppies = p.puppies;
    state.foods = f.foods;
    if (!state.selectedPuppyId || !state.puppies.some((x) => x.ROWID === state.selectedPuppyId)) {
      state.selectedPuppyId = state.puppies[0]?.ROWID || null;
    }
    if (state.selectedPuppyId) await Promise.all([loadDay(), loadSymptoms()]);
    render();
  } catch (e) { toast(e.message); }
}
async function loadDay() {
  if (!state.selectedPuppyId) { state.feedings = []; return; }
  const r = await call(`/feedings?puppy_id=${state.selectedPuppyId}&date=${state.date}`);
  state.feedings = r.feedings;
}
async function loadSymptoms() {
  if (!state.selectedPuppyId) { state.symptoms = []; return; }
  const r = await call(`/symptoms?puppy_id=${state.selectedPuppyId}`);
  state.symptoms = r.symptoms;
}

/* ---------- rendering ---------- */

function render() {
  const name = selectedPuppy()?.Name;
  const sub = {
    today: name ? t('meals_of', name) : t('daily_meals'),
    foods: t('food_catalog'),
    insights: name ? t('health_of', name) : t('daily_meals'),
    puppies: t('your_pack'),
  }[state.tab];
  $('#topbarSub').textContent = sub;
  $('#langBtn').textContent = lang === 'en' ? 'தமிழ்' : 'English';

  document.querySelectorAll('.nav-item').forEach((b) => {
    b.classList.toggle('sel', b.dataset.tab === state.tab);
    b.querySelector('.nav-label').textContent = t('tab_' + b.dataset.tab);
  });

  if (state.tab === 'today') renderToday();
  else if (state.tab === 'foods') renderFoods();
  else if (state.tab === 'insights') renderInsights();
  else renderPuppies();
}

function puppyChips() {
  if (!state.puppies.length) return '';
  return `<div class="chips">${state.puppies.map((p) =>
    `<button class="chip ${p.ROWID === state.selectedPuppyId ? 'sel' : ''}" data-puppy="${p.ROWID}">🐶 ${esc(p.Name)}</button>`
  ).join('')}</div>`;
}

function emptyState(emoji, title, msg) {
  return `<div class="empty"><div class="e-emoji">${emoji}</div><h3>${esc(title)}</h3><p>${esc(msg)}</p></div>`;
}

function renderToday() {
  if (!state.puppies.length) {
    view.innerHTML = emptyState('🐾', t('welcome_title'), t('welcome_msg'));
    return;
  }
  const bySlot = {};
  for (const f of state.feedings) (bySlot[f.MealSlot] ||= []).push(f);

  // Missed-meal reminder: slots whose time has passed today with nothing logged.
  let reminder = '';
  if (state.date === todayStr()) {
    const nowHM = new Date().toTimeString().slice(0, 5);
    const missed = SLOTS.filter((s) => s.time <= nowHM && !(bySlot[s.key] || []).length);
    if (missed.length) {
      const names = missed.map((s) => `${s.emoji} ${t(s.key)}`).join(', ');
      reminder = `<button class="reminder" data-remind-slot="${missed[0].key}">${t('reminder_missed', names)}</button>`;
    }
  }

  view.innerHTML = `
    ${puppyChips()}
    <div class="datenav">
      <button data-shift="-1" aria-label="prev">‹</button>
      <span class="label">${prettyDate(state.date)}</span>
      <button data-shift="1" aria-label="next" ${state.date >= todayStr() ? 'disabled' : ''}>›</button>
    </div>
    ${reminder}
    ${SLOTS.map((s) => {
      const meals = bySlot[s.key] || [];
      return `
        <div class="slot-h">${s.emoji} ${t(s.key)} ${meals.length ? '' : `<span class="none">${t('no_meals')}</span>`}</div>
        ${meals.map((m) => `
          <div class="card">
            <div class="avatar">${esc(foodName(m.FoodItemId).slice(0, 1).toUpperCase())}</div>
            <div class="c-body">
              <div class="c-title">${esc(foodName(m.FoodItemId))} ${m.IsNewFood ? `<span class="badge">${t('badge_new')}</span>` : ''}</div>
              <div class="c-sub">${fmtQty(m.Quantity)}${esc(m.Unit || '')} · ${esc((m.FedAt || '').slice(11, 16))}${m.FedBy ? ` · ${t('by')} ${esc(m.FedBy)}` : ''}</div>
            </div>
            <button class="bin" data-del-feeding="${m.ROWID}" aria-label="delete">🗑</button>
          </div>`).join('')}`;
    }).join('')}`;
}

function renderFoods() {
  if (!state.foods.length) {
    view.innerHTML = emptyState('🦴', t('no_foods_title'), t('no_foods_msg'));
    return;
  }
  view.innerHTML = `
    <p class="c-sub" style="margin:6px 2px 12px">${t('foods_hint')}</p>
    ${state.foods.map((f) => {
      const pup = puppyName(f.UsualPuppyId);
      return `
      <div class="card tappable" data-edit-food="${f.ROWID}">
        <div class="food-emoji">${FOOD_EMOJI[f.FoodType] || FOOD_EMOJI.other}</div>
        <div class="c-body">
          <div class="c-title">${esc(f.Name)} ${pup ? `<span class="badge">🐶 ${esc(pup).toUpperCase()}</span>` : ''}</div>
          ${f.Brand ? `<div class="c-sub">${esc(f.Brand)}</div>` : ''}
        </div>
        <span class="tag sage">${esc(ftLabel(f.FoodType).toUpperCase())}</span>
      </div>`;
    }).join('')}`;
}

function renderInsights() {
  if (!state.puppies.length) {
    view.innerHTML = emptyState('🐾', t('add_puppy_first_title'), t('add_puppy_first_msg'));
    return;
  }
  const name = selectedPuppy()?.Name || t('your_puppy');
  if (!state.symptoms.length) {
    view.innerHTML = puppyChips() + emptyState('💚', t('no_incidents_title'), t('no_incidents_msg', name));
    return;
  }
  view.innerHTML = `
    ${puppyChips()}
    <p class="c-sub" style="margin:6px 2px 12px">${t('insights_hint')}</p>
    ${state.symptoms.map((s) => {
      const sev = s.Severity || 'mild';
      const tagClass = sev === 'severe' ? 'bad' : sev === 'moderate' ? 'warn' : 'sage';
      const label = symLabel(s.Symptom);
      return `
        <div class="card tappable" data-symptom="${s.ROWID}">
          <div class="avatar ${sev === 'mild' ? 'sage' : ''}">${esc(label.slice(0, 1).toUpperCase())}</div>
          <div class="c-body">
            <div class="c-title">${esc(label[0].toUpperCase() + label.slice(1))}</div>
            <div class="c-sub">${esc((s.OnsetAt || '').slice(0, 16))}</div>
          </div>
          <span class="tag ${tagClass}">${esc(t(sev).toUpperCase())}</span>
        </div>`;
    }).join('')}`;
}

function renderPuppies() {
  if (!state.puppies.length) {
    view.innerHTML = emptyState('🐶', t('no_puppies_title'), t('no_puppies_msg'));
    return;
  }
  view.innerHTML = state.puppies.map((p) => {
    const sub = [p.Breed, ageLabel(p.BirthDate)].filter(Boolean).join(' · ');
    return `
      <div class="card">
        <div class="avatar big">${esc(p.Name.slice(0, 1).toUpperCase())}</div>
        <div class="c-body">
          <div class="c-title" style="font-size:17px">${esc(p.Name)}</div>
          ${sub ? `<div class="c-sub">${esc(sub)}</div>` : ''}
        </div>
        <button class="bin" data-del-puppy="${p.ROWID}" aria-label="remove">🗑</button>
      </div>`;
  }).join('');
}

/* ---------- sheets ---------- */

function openSheet(html) {
  $('#sheet').innerHTML = '<div class="grab"></div>' + html;
  $('#sheet').hidden = false;
  $('#scrim').hidden = false;
}
function closeSheet() {
  $('#sheet').hidden = true;
  $('#scrim').hidden = true;
}

/* ---------- speech to text ---------- */

const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition || null;

// Mic button markup for a text input — empty string when the browser can't listen.
function mic(inputId) {
  return SpeechAPI ? `<button type="button" class="mic" data-mic="${inputId}" aria-label="voice input">🎤</button>` : '';
}

let activeRecognition = null;
function listenInto(input, btn) {
  if (!SpeechAPI) return;
  if (activeRecognition) { try { activeRecognition.abort(); } catch (e) { /* ignore */ } }
  const rec = new SpeechAPI();
  activeRecognition = rec;
  rec.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  btn.classList.add('listening');
  btn.textContent = '🔴';
  const done = () => {
    btn.classList.remove('listening');
    btn.textContent = '🎤';
    activeRecognition = null;
  };
  rec.onresult = (e) => {
    const text = e.results[0]?.[0]?.transcript?.trim();
    if (text) {
      input.value = input.value ? `${input.value} ${text}` : text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };
  rec.onend = done;
  rec.onerror = (e) => { done(); if (e.error !== 'aborted') toast(t('t_speech_err')); };
  toast(t('t_listening'));
  rec.start();
}

function chipGroup(name, options, selected, labelFn) {
  return `<div class="chips" data-chipgroup="${name}">${options.map((o) =>
    `<button type="button" class="chip ${o === selected ? 'sel' : ''}" data-val="${esc(o)}">${labelFn ? labelFn(o) : esc(o)}</button>`
  ).join('')}</div>`;
}
function chipVal(name) {
  return document.querySelector(`[data-chipgroup="${name}"] .chip.sel`)?.dataset.val;
}

function sheetAddMeal(presetSlot) {
  if (!state.foods.length) {
    openSheet(`<h3>${t('log_meal')}</h3><p class="s-sub">${t('add_food_first')}</p>`);
    return;
  }
  const hour = new Date().getHours();
  const slot = presetSlot || (hour < 11 ? 'morning' : hour < 15 ? 'noon' : hour < 19 ? 'evening' : 'night');
  // this puppy's usual foods first, then shared, then other puppies' foods
  const rankFood = (f) => f.UsualPuppyId === state.selectedPuppyId ? 0 : !f.UsualPuppyId ? 1 : 2;
  const sortedFoods = [...state.foods].sort((a, b) => rankFood(a) - rankFood(b));
  openSheet(`
    <h3>${t('log_meal')}</h3>
    <p class="s-sub">${esc(selectedPuppy()?.Name || '')} · ${prettyDate(state.date)}</p>
    <div class="lbl">${t('food')}</div>
    ${chipGroup('food', sortedFoods.map((f) => f.ROWID), sortedFoods[0].ROWID,
      (id) => `${FOOD_EMOJI[state.foods.find((f) => f.ROWID === id)?.FoodType] || '🍽️'} ${esc(foodName(id))}`)}
    <div class="lbl">${t('meal_slot')}</div>
    ${chipGroup('slot', SLOTS.map((s) => s.key), slot, (k) => `${SLOTS.find((x) => x.key === k).emoji} ${t(k)}`)}
    <div class="row" style="margin-top:14px">
      <div class="field"><label>${t('quantity')}</label><input id="f-qty" type="number" inputmode="decimal" placeholder="100"></div>
      <div class="field" style="flex:0.6"><label>${t('unit')}</label><input id="f-unit" value="g"></div>
      <div class="field"><label>${t('time')}</label><input id="f-time" type="time" value="${SLOTS.find((s) => s.key === slot).time}"></div>
    </div>
    <div class="field"><label>${t('fed_by')}</label><input id="f-fedby" placeholder="${t('fed_by_ph')}">${mic('f-fedby')}</div>
    <div class="switch-row">
      <div><div class="st">${t('first_time_q')}</div><div class="ss">${t('first_time_hint')}</div></div>
      <span class="switch"><input id="f-new" type="checkbox"><span class="knob"></span></span>
    </div>
    <button class="cta" id="save-meal">${t('save_meal')}</button>`);

  $('#save-meal').onclick = async () => {
    const slotKey = chipVal('slot');
    try {
      await call('/feedings', { method: 'POST', body: JSON.stringify({
        puppy_id: state.selectedPuppyId,
        food_item_id: chipVal('food'),
        quantity: parseFloat($('#f-qty').value) || 0,
        unit: $('#f-unit').value.trim() || 'g',
        meal_slot: slotKey,
        fed_at: `${state.date} ${$('#f-time').value || SLOTS.find((s) => s.key === slotKey).time}:00`,
        fed_by: $('#f-fedby').value.trim() || null,
        is_new_food: $('#f-new').checked,
      })});
      closeSheet();
      await loadDay();
      render();
      toast(t('t_meal_saved'));
    } catch (e) { toast(e.message); }
  };
}

function puppyTagChips(selectedId) {
  const opts = ['', ...state.puppies.map((p) => p.ROWID)];
  return chipGroup('ufor', opts, String(selectedId ?? ''), (id) =>
    id === '' ? t('everyone') : `🐶 ${esc(puppyName(id) || '')}`);
}

function sheetAddFood(existing) {
  const f = existing || null;
  openSheet(`
    <h3>${f ? t('edit_food') : t('add_food')}</h3>
    <div class="field" style="margin-top:14px"><label>${t('name')}</label><input id="fo-name" value="${f ? esc(f.Name) : ''}">${mic('fo-name')}</div>
    <div class="field"><label>${t('brand_opt')}</label><input id="fo-brand" value="${f ? esc(f.Brand || '') : ''}">${mic('fo-brand')}</div>
    <div class="lbl">${t('type')}</div>
    ${chipGroup('ftype', FOOD_TYPES, f?.FoodType || 'kibble', (ty) => `${FOOD_EMOJI[ty]} ${esc(ftLabel(ty))}`)}
    ${state.puppies.length ? `<div class="lbl">${t('usually_for')}</div>${puppyTagChips(f?.UsualPuppyId)}` : ''}
    <button class="cta" id="save-food" style="margin-top:16px">${f ? t('save_changes') : t('save_food')}</button>`);
  $('#save-food').onclick = async () => {
    const name = $('#fo-name').value.trim();
    if (!name) return toast(t('t_need_food_name'));
    const payload = {
      name,
      brand: $('#fo-brand').value.trim() || null,
      food_type: chipVal('ftype'),
      usual_puppy_id: chipVal('ufor') || null,
    };
    try {
      if (f) {
        await call('/foods', { method: 'PUT', body: JSON.stringify({ id: f.ROWID, ...payload }) });
      } else {
        await call('/foods', { method: 'POST', body: JSON.stringify(payload) });
      }
      closeSheet();
      state.foods = (await call('/foods')).foods;
      render();
      toast(f ? t('t_food_updated') : t('t_food_added'));
    } catch (e) { toast(e.message); }
  };
}

function sheetAddPuppy() {
  openSheet(`
    <h3>${t('add_puppy')}</h3>
    <div class="field" style="margin-top:14px"><label>${t('name')}</label><input id="p-name">${mic('p-name')}</div>
    <div class="field"><label>${t('breed_opt')}</label><input id="p-breed">${mic('p-breed')}</div>
    <div class="field"><label>${t('birth_opt')}</label><input id="p-birth" type="date"></div>
    <button class="cta" id="save-puppy">${t('save_puppy')}</button>`);
  $('#save-puppy').onclick = async () => {
    const name = $('#p-name').value.trim();
    if (!name) return toast(t('t_need_puppy_name'));
    try {
      await call('/puppies', { method: 'POST', body: JSON.stringify({
        name, breed: $('#p-breed').value.trim() || null, birth_date: $('#p-birth').value || null,
      })});
      closeSheet();
      await loadCore();
      toast(t('t_welcome', name));
    } catch (e) { toast(e.message); }
  };
}

function sheetLogSymptom() {
  openSheet(`
    <h3>${t('log_symptom')}</h3>
    <p class="s-sub">${t('symptom_desc', esc(selectedPuppy()?.Name || t('your_puppy')))}</p>
    <div class="lbl">${t('symptom')}</div>
    ${chipGroup('sym', SYMPTOMS, 'vomiting', (k) => esc(symLabel(k)))}
    <div class="lbl">${t('severity')}</div>
    ${chipGroup('sev', ['mild', 'moderate', 'severe'], 'mild', (k) => esc(t(k)))}
    <div class="field" style="margin-top:14px"><label>${t('onset')}</label><input id="s-onset" type="datetime-local" value="${nowLocal().replace(' ', 'T')}"></div>
    <div class="field"><label>${t('notes_opt')}</label><input id="s-notes">${mic('s-notes')}</div>
    <button class="cta" id="save-symptom">${t('save_analyze')}</button>`);
  $('#save-symptom').onclick = async () => {
    const onset = ($('#s-onset').value || '').replace('T', ' ');
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(onset)) return toast(t('t_need_onset'));
    try {
      const r = await call('/symptoms', { method: 'POST', body: JSON.stringify({
        puppy_id: state.selectedPuppyId,
        symptom: chipVal('sym'),          // canonical English key
        severity: chipVal('sev'),
        onset_at: onset.length === 16 ? onset + ':00' : onset,
        notes: $('#s-notes').value.trim() || null,
      })});
      await loadSymptoms();
      state.tab = 'insights';
      render();
      showAnalysis(r.symptom, r.analysis);
    } catch (e) { toast(e.message); }
  };
}

function showAnalysis(symptom, analysis) {
  const suspects = analysis.suspects || [];
  const max = Math.max(0.01, ...suspects.map((s) => s.score));
  const label = symLabel(symptom.Symptom);
  openSheet(`
    <h3>${t('suspects_title')}</h3>
    <p class="s-sub">${esc(label[0].toUpperCase() + label.slice(1))} · ${t('onset_at')} ${esc((symptom.OnsetAt || '').slice(0, 16))}</p>
    ${suspects.length ? suspects.map((s, i) => `
      <div class="suspect">
        <div class="s-row">
          <span class="rank">#${i + 1}</span> ${esc(s.name)}
          ${s.was_new_food ? `<span class="badge">${t('new_food_badge')}</span>` : ''}
          <span class="score">${Number(s.score).toFixed(1)}</span>
        </div>
        <div class="bar"><div class="${i === 0 ? 'top' : ''}" style="width:${Math.max(4, (s.score / max) * 100)}%"></div></div>
        <div class="s-meta">${[
          s.brand ? esc(s.brand) : null,
          esc(t('in_window', s.feedings_in_window.length)),
          s.preceded_prior_incidents ? esc(t('before_incidents', s.preceded_prior_incidents)) : null,
          esc(t('last14', s.fed_times_in_last_14_days)),
        ].filter(Boolean).join(' · ')}</div>
      </div>`).join('')
    : `<p class="s-sub">${t('no_window_meals')}</p>`}
    <div class="vet-note">⚕️ ${t('vet_note')}</div>`);
}

function confirmDeletePuppy(id) {
  const p = state.puppies.find((x) => x.ROWID === id);
  if (!p) return;
  openSheet(`
    <h3>${t('remove_q', esc(p.Name))}</h3>
    <p class="s-sub">${t('remove_msg')}</p>
    <div class="confirm-actions">
      <button class="btn-ghost" id="cancel-del">${t('cancel')}</button>
      <button class="btn-danger" id="confirm-del">${t('remove')}</button>
    </div>`);
  $('#cancel-del').onclick = closeSheet;
  $('#confirm-del').onclick = async () => {
    try {
      await call(`/puppies?id=${id}`, { method: 'DELETE' });
      closeSheet();
      state.selectedPuppyId = null;
      await loadCore();
      toast(t('t_removed', p.Name));
    } catch (e) { toast(e.message); }
  };
}

/* ---------- events ---------- */

$('#langBtn').addEventListener('click', () => {
  lang = lang === 'en' ? 'ta' : 'en';
  try { localStorage.setItem('bonzaa_lang', lang); } catch (e) { /* ignore */ }
  render();
});

document.querySelector('.navbar').addEventListener('click', async (e) => {
  const btn = e.target.closest('.nav-item');
  if (!btn) return;
  state.tab = btn.dataset.tab;
  if (state.tab === 'insights') { try { await loadSymptoms(); } catch (err) { toast(err.message); } }
  render();
});

$('#fab').addEventListener('click', () => {
  if (state.tab === 'foods') return sheetAddFood();
  if (state.tab === 'puppies') return sheetAddPuppy();
  if (!state.selectedPuppyId) return sheetAddPuppy();
  if (state.tab === 'insights') return sheetLogSymptom();
  sheetAddMeal();
});

$('#scrim').addEventListener('click', closeSheet);

view.addEventListener('click', async (e) => {
  const remind = e.target.closest('[data-remind-slot]');
  if (remind) return sheetAddMeal(remind.dataset.remindSlot);

  const puppyChip = e.target.closest('[data-puppy]');
  if (puppyChip) {
    state.selectedPuppyId = puppyChip.dataset.puppy;
    try { await Promise.all([loadDay(), loadSymptoms()]); } catch (err) { toast(err.message); }
    render();
    return;
  }
  const shift = e.target.closest('[data-shift]');
  if (shift) {
    state.date = shiftDate(state.date, Number(shift.dataset.shift));
    try { await loadDay(); } catch (err) { toast(err.message); }
    render();
    return;
  }
  const delFeeding = e.target.closest('[data-del-feeding]');
  if (delFeeding) {
    try {
      await call(`/feedings?id=${delFeeding.dataset.delFeeding}`, { method: 'DELETE' });
      await loadDay();
      render();
      toast(t('t_meal_deleted'));
    } catch (err) { toast(err.message); }
    return;
  }
  const delPuppy = e.target.closest('[data-del-puppy]');
  if (delPuppy) return confirmDeletePuppy(delPuppy.dataset.delPuppy);

  const editFood = e.target.closest('[data-edit-food]');
  if (editFood) {
    const f = state.foods.find((x) => x.ROWID === editFood.dataset.editFood);
    if (f) sheetAddFood(f);
    return;
  }

  const sym = e.target.closest('[data-symptom]');
  if (sym) {
    const s = state.symptoms.find((x) => x.ROWID === sym.dataset.symptom);
    if (!s) return;
    try {
      const analysis = await call(`/suspects?puppy_id=${s.PuppyId}&onset_at=${encodeURIComponent(s.OnsetAt)}`);
      showAnalysis(s, analysis);
    } catch (err) { toast(err.message); }
  }
});

// chip groups inside sheets (single-select) + mic buttons
$('#sheet').addEventListener('click', (e) => {
  const micBtn = e.target.closest('[data-mic]');
  if (micBtn) {
    const input = document.getElementById(micBtn.dataset.mic);
    if (input) listenInto(input, micBtn);
    return;
  }
  const chip = e.target.closest('[data-chipgroup] .chip');
  if (!chip) return;
  chip.closest('[data-chipgroup]').querySelectorAll('.chip').forEach((c) => c.classList.remove('sel'));
  chip.classList.add('sel');
  if (chip.closest('[data-chipgroup]').dataset.chipgroup === 'slot') {
    const s = SLOTS.find((x) => x.key === chip.dataset.val);
    const tEl = document.querySelector('#f-time');
    if (s && tEl) tEl.value = s.time;
  }
});

loadCore();
