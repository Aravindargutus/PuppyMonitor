/* Bonzaa web client — talks to the Catalyst Advanced I/O function on the same origin. */
'use strict';

const API = '/server/bonzaa_api';

const SLOTS = [
  { key: 'morning', label: 'Morning', emoji: '☀️', time: '08:00' },
  { key: 'noon', label: 'Noon', emoji: '🌤️', time: '12:30' },
  { key: 'evening', label: 'Evening', emoji: '🌆', time: '17:30' },
  { key: 'night', label: 'Night', emoji: '🌙', time: '21:00' },
];
const FOOD_TYPES = ['kibble', 'wet food', 'treat', 'human food', 'supplement', 'other'];
const FOOD_EMOJI = { kibble: '🥣', 'wet food': '🥫', treat: '🦴', 'human food': '🍗', supplement: '💊', other: '🍽️' };
const SYMPTOMS = ['vomiting', 'diarrhea', 'lethargy', 'refusing food', 'itching', 'other'];

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
  const label = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return dateStr === todayStr() ? `Today · ${label}` : label;
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
  return f ? f.Name : 'Unknown food';
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
  let months = (Date.now() - b.getTime()) / (1000 * 3600 * 24 * 30.44);
  if (months < 1) return `${Math.max(1, Math.round(months * 30.44))} days old`;
  if (months < 12) return `${Math.floor(months)}m old`;
  return `${Math.floor(months / 12)}y ${Math.floor(months % 12)}m old`;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
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
  const sub = {
    today: selectedPuppy() ? `${selectedPuppy().Name}'s meals` : 'Daily meals',
    foods: 'Food catalog',
    insights: selectedPuppy() ? `${selectedPuppy().Name}'s health` : 'Health incidents',
    puppies: 'Your pack',
  }[state.tab];
  $('#topbarSub').textContent = sub;

  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('sel', b.dataset.tab === state.tab));

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
    view.innerHTML = emptyState('🐾', 'Welcome to Bonzaa', 'Add your first puppy with the + button to start tracking meals from morning to night.');
    return;
  }
  const bySlot = {};
  for (const f of state.feedings) (bySlot[f.MealSlot] ||= []).push(f);

  view.innerHTML = `
    ${puppyChips()}
    <div class="datenav">
      <button data-shift="-1" aria-label="Previous day">‹</button>
      <span class="label">${prettyDate(state.date)}</span>
      <button data-shift="1" aria-label="Next day" ${state.date >= todayStr() ? 'disabled' : ''}>›</button>
    </div>
    ${SLOTS.map((s) => {
      const meals = bySlot[s.key] || [];
      return `
        <div class="slot-h">${s.emoji} ${s.label} ${meals.length ? '' : '<span class="none">No meals logged</span>'}</div>
        ${meals.map((m) => `
          <div class="card">
            <div class="avatar">${esc(foodName(m.FoodItemId).slice(0, 1).toUpperCase())}</div>
            <div class="c-body">
              <div class="c-title">${esc(foodName(m.FoodItemId))} ${m.IsNewFood ? '<span class="badge">NEW</span>' : ''}</div>
              <div class="c-sub">${fmtQty(m.Quantity)}${esc(m.Unit || '')} · ${esc((m.FedAt || '').slice(11, 16))}${m.FedBy ? ' · by ' + esc(m.FedBy) : ''}</div>
            </div>
            <button class="bin" data-del-feeding="${m.ROWID}" aria-label="Delete meal">🗑</button>
          </div>`).join('')}`;
    }).join('')}`;
}

function renderFoods() {
  if (!state.foods.length) {
    view.innerHTML = emptyState('🦴', 'No foods yet', 'Add every food, brand, and treat your puppies eat. Each logged meal points at one of these — that is what makes the suspect analysis possible.');
    return;
  }
  view.innerHTML = state.foods.map((f) => `
    <div class="card">
      <div class="food-emoji">${FOOD_EMOJI[f.FoodType] || FOOD_EMOJI.other}</div>
      <div class="c-body">
        <div class="c-title">${esc(f.Name)}</div>
        ${f.Brand ? `<div class="c-sub">${esc(f.Brand)}</div>` : ''}
      </div>
      <span class="tag sage">${esc((f.FoodType || 'other').toUpperCase())}</span>
    </div>`).join('');
}

function renderInsights() {
  if (!state.puppies.length) {
    view.innerHTML = emptyState('🐾', 'Add a puppy first', 'Health incidents are tracked per puppy.');
    return;
  }
  const name = selectedPuppy()?.Name || 'your puppy';
  if (!state.symptoms.length) {
    view.innerHTML = puppyChips() + emptyState('💚', 'No incidents logged',
      `Hopefully it stays that way! If ${name} ever feels unwell, log a symptom with the + button and Bonzaa will analyze recent meals for likely culprits.`);
    return;
  }
  view.innerHTML = `
    ${puppyChips()}
    <p class="c-sub" style="margin:6px 2px 12px">Tap an incident to see which foods were the likely cause.</p>
    ${state.symptoms.map((s) => {
      const sev = s.Severity || 'mild';
      const tagClass = sev === 'severe' ? 'bad' : sev === 'moderate' ? 'warn' : 'sage';
      return `
        <div class="card tappable" data-symptom="${s.ROWID}">
          <div class="avatar ${sev === 'mild' ? 'sage' : ''}">${esc(s.Symptom.slice(0, 1).toUpperCase())}</div>
          <div class="c-body">
            <div class="c-title">${esc(s.Symptom[0].toUpperCase() + s.Symptom.slice(1))}</div>
            <div class="c-sub">${esc((s.OnsetAt || '').slice(0, 16))}</div>
          </div>
          <span class="tag ${tagClass}">${esc(sev.toUpperCase())}</span>
        </div>`;
    }).join('')}`;
}

function renderPuppies() {
  if (!state.puppies.length) {
    view.innerHTML = emptyState('🐶', 'No puppies yet', 'Add your puppies with the + button — then start logging their meals from morning to night.');
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
        <button class="bin" data-del-puppy="${p.ROWID}" aria-label="Remove puppy">🗑</button>
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

function chipGroup(name, options, selected, labelFn) {
  return `<div class="chips" data-chipgroup="${name}">${options.map((o) =>
    `<button type="button" class="chip ${o === selected ? 'sel' : ''}" data-val="${esc(o)}">${labelFn ? labelFn(o) : esc(o)}</button>`
  ).join('')}</div>`;
}
function chipVal(name) {
  return document.querySelector(`[data-chipgroup="${name}"] .chip.sel`)?.dataset.val;
}

function sheetAddMeal() {
  if (!state.foods.length) {
    openSheet(`<h3>🍽️ Log a meal</h3><p class="s-sub">Add a food in the Foods tab first — every meal points at a food from the catalog.</p>`);
    return;
  }
  const hour = new Date().getHours();
  const slot = hour < 11 ? 'morning' : hour < 15 ? 'noon' : hour < 19 ? 'evening' : 'night';
  openSheet(`
    <h3>🍽️ Log a meal</h3>
    <p class="s-sub">${esc(selectedPuppy()?.Name || '')} · ${prettyDate(state.date)}</p>
    <div class="lbl">Food</div>
    ${chipGroup('food', state.foods.map((f) => f.ROWID), state.foods[0].ROWID,
      (id) => `${FOOD_EMOJI[state.foods.find((f) => f.ROWID === id)?.FoodType] || '🍽️'} ${esc(foodName(id))}`)}
    <div class="lbl">Meal slot</div>
    ${chipGroup('slot', SLOTS.map((s) => s.key), slot, (k) => { const s = SLOTS.find((x) => x.key === k); return `${s.emoji} ${s.label}`; })}
    <div class="row" style="margin-top:14px">
      <div class="field"><label>Quantity</label><input id="f-qty" type="number" inputmode="decimal" placeholder="100"></div>
      <div class="field" style="flex:0.6"><label>Unit</label><input id="f-unit" value="g"></div>
      <div class="field"><label>Time</label><input id="f-time" type="time" value="${SLOTS.find((s) => s.key === slot).time}"></div>
    </div>
    <div class="field"><label>Fed by (optional)</label><input id="f-fedby" placeholder="Who fed?"></div>
    <div class="switch-row">
      <div><div class="st">First time eating this?</div><div class="ss">New foods are prime suspects if tummy trouble follows.</div></div>
      <span class="switch"><input id="f-new" type="checkbox"><span class="knob"></span></span>
    </div>
    <button class="cta" id="save-meal">Save meal</button>`);

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
      toast('Meal saved 🐶');
    } catch (e) { toast(e.message); }
  };
}

function sheetAddFood() {
  openSheet(`
    <h3>🦴 Add a food</h3>
    <div class="field" style="margin-top:14px"><label>Name</label><input id="fo-name" placeholder="e.g. Chicken & Rice"></div>
    <div class="field"><label>Brand (optional)</label><input id="fo-brand" placeholder="e.g. Pedigree"></div>
    <div class="lbl">Type</div>
    ${chipGroup('ftype', FOOD_TYPES, 'kibble', (t) => `${FOOD_EMOJI[t]} ${esc(t)}`)}
    <button class="cta" id="save-food" style="margin-top:16px">Save food</button>`);
  $('#save-food').onclick = async () => {
    const name = $('#fo-name').value.trim();
    if (!name) return toast('Give the food a name');
    try {
      await call('/foods', { method: 'POST', body: JSON.stringify({
        name, brand: $('#fo-brand').value.trim() || null, food_type: chipVal('ftype'),
      })});
      closeSheet();
      state.foods = (await call('/foods')).foods;
      render();
      toast('Food added');
    } catch (e) { toast(e.message); }
  };
}

function sheetAddPuppy() {
  openSheet(`
    <h3>🐶 Add a puppy</h3>
    <div class="field" style="margin-top:14px"><label>Name</label><input id="p-name" placeholder="e.g. Simba"></div>
    <div class="field"><label>Breed (optional)</label><input id="p-breed" placeholder="e.g. Beagle"></div>
    <div class="field"><label>Birth date (optional)</label><input id="p-birth" type="date"></div>
    <button class="cta" id="save-puppy">Save puppy</button>`);
  $('#save-puppy').onclick = async () => {
    const name = $('#p-name').value.trim();
    if (!name) return toast('Give your puppy a name');
    try {
      await call('/puppies', { method: 'POST', body: JSON.stringify({
        name, breed: $('#p-breed').value.trim() || null, birth_date: $('#p-birth').value || null,
      })});
      closeSheet();
      await loadCore();
      toast(`Welcome, ${name}! 🐾`);
    } catch (e) { toast(e.message); }
  };
}

function sheetLogSymptom() {
  openSheet(`
    <h3>🤒 Log a symptom</h3>
    <p class="s-sub">For ${esc(selectedPuppy()?.Name || 'your puppy')} — Bonzaa will immediately check what was eaten in the 2–48 hours before onset.</p>
    <div class="lbl">Symptom</div>
    ${chipGroup('sym', SYMPTOMS, 'vomiting')}
    <div class="lbl">Severity</div>
    ${chipGroup('sev', ['mild', 'moderate', 'severe'], 'mild')}
    <div class="field" style="margin-top:14px"><label>Onset</label><input id="s-onset" type="datetime-local" value="${nowLocal().replace(' ', 'T')}"></div>
    <div class="field"><label>Notes (optional)</label><input id="s-notes"></div>
    <button class="cta" id="save-symptom">Save &amp; analyze</button>`);
  $('#save-symptom').onclick = async () => {
    const onset = ($('#s-onset').value || '').replace('T', ' ');
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(onset)) return toast('Pick an onset time');
    try {
      const r = await call('/symptoms', { method: 'POST', body: JSON.stringify({
        puppy_id: state.selectedPuppyId,
        symptom: chipVal('sym'),
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
  openSheet(`
    <h3>🔍 Suspect foods</h3>
    <p class="s-sub">${esc(symptom.Symptom[0].toUpperCase() + symptom.Symptom.slice(1))} · onset ${esc((symptom.OnsetAt || '').slice(0, 16))}</p>
    ${suspects.length ? suspects.map((s, i) => `
      <div class="suspect">
        <div class="s-row">
          <span class="rank">#${i + 1}</span> ${esc(s.name)}
          ${s.was_new_food ? '<span class="badge">NEW FOOD</span>' : ''}
          <span class="score">${Number(s.score).toFixed(1)}</span>
        </div>
        <div class="bar"><div class="${i === 0 ? 'top' : ''}" style="width:${Math.max(4, (s.score / max) * 100)}%"></div></div>
        <div class="s-meta">${[
          s.brand,
          `${s.feedings_in_window.length}× in window`,
          s.preceded_prior_incidents ? `before ${s.preceded_prior_incidents} earlier incident(s)` : null,
          `${s.fed_times_in_last_14_days}× in last 14 days`,
        ].filter(Boolean).map(esc).join(' · ')}</div>
      </div>`).join('')
    : '<p class="s-sub">No meals were logged in the 2–48 hours before onset, so there is nothing to analyze. Keep logging every meal for better results.</p>'}
    <div class="vet-note">⚕️ ${esc(analysis.note || 'Correlation aid only — confirm with a veterinarian.')}</div>`);
}

function confirmDeletePuppy(id) {
  const p = state.puppies.find((x) => x.ROWID === id);
  if (!p) return;
  openSheet(`
    <h3>Remove ${esc(p.Name)}?</h3>
    <p class="s-sub">This removes the puppy from Bonzaa. Meal and symptom history stays in the database but will no longer be shown.</p>
    <div class="confirm-actions">
      <button class="btn-ghost" id="cancel-del">Cancel</button>
      <button class="btn-danger" id="confirm-del">Remove</button>
    </div>`);
  $('#cancel-del').onclick = closeSheet;
  $('#confirm-del').onclick = async () => {
    try {
      await call(`/puppies?id=${id}`, { method: 'DELETE' });
      closeSheet();
      state.selectedPuppyId = null;
      await loadCore();
      toast(`${p.Name} removed`);
    } catch (e) { toast(e.message); }
  };
}

/* ---------- events ---------- */

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
      toast('Meal deleted');
    } catch (err) { toast(err.message); }
    return;
  }
  const delPuppy = e.target.closest('[data-del-puppy]');
  if (delPuppy) return confirmDeletePuppy(delPuppy.dataset.delPuppy);

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

// chip groups inside sheets (single-select)
$('#sheet').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-chipgroup] .chip');
  if (!chip) return;
  chip.closest('[data-chipgroup]').querySelectorAll('.chip').forEach((c) => c.classList.remove('sel'));
  chip.classList.add('sel');
  // meal-slot chip also presets the time field
  if (chip.closest('[data-chipgroup]').dataset.chipgroup === 'slot') {
    const s = SLOTS.find((x) => x.key === chip.dataset.val);
    const t = document.querySelector('#f-time');
    if (s && t) t.value = s.time;
  }
});

loadCore();
