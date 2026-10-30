'use strict';
/* SoulSpark Synergy Engine v12 — app.js  (needs core.js) · every section opens with its own access code
   Views: Directory · Explore · Match · Calendar · Mandala · Insights · Add/Edit · Inbox
   CRM: accounts · self-listing · photos · bulk actions · duplicate merge · drafts · revenue · recurring events · import · drag-arrange */

const REFRESH_MS = 5 * 60e3;
const S = {
  meta: {}, records: [], cards: [], picked: new Set(), selecting: false,
  vis: store.get('ss_vis', {}), order: store.get('ss_order', []),
  locked: new Set(), mm: new Set(), section: 'all', mode: 'modality', spin: store.get('ss_spin', false), sky: null, edit: null, prefill: null, inbox: [], mod: null, mcat: 'All',
  cal: { y: new Date().getFullYear(), m: new Date().getMonth(), sel: null },
};
const visible = s => S.vis[s] !== false;
const staff = () => Core.lvl >= 2, admin = () => Core.lvl >= 3;
const ordered = ids => [...ids].sort((a, b) => ((S.order.indexOf(a) + 1) || 99) - ((S.order.indexOf(b) + 1) || 99));
const sections = () => ordered(Object.keys(S.meta));
const onView = v => $('#' + v).classList.contains('on');

/* Astro-Sync + Human Design synergy (readSky, synergy, align) lives in core.js — shared with directory.js. */

/* ═══ DATA ══════════════════════════════════════════════════════ */

function setSync(text, live) { const el = $('#sync'); el.textContent = el.title = text; el.setAttribute('aria-label', text); el.classList.toggle('live', !!live); }

async function load() {
  setSync('Syncing…');
  try {
    const d = await api({ action: 'data' });
    if (d.status !== 'ok') throw new Error(d.message);
    if (Core.token && !d.user) { Auth.clear(); toast('Your session expired — please sign in again', 'bad'); }
    else if (d.user) Auth.setUser(d.user);
    S.locked = new Set(d.locked || []);
    const stale = (d.locked || []).filter(s => s in Codes.all());
    if (stale.length) { Codes.drop(stale); toast('A section code has changed — please enter the new one', 'bad'); }
    const viaCode = new Set(Object.keys(Codes.all()));   // never keep code-protected rows on the device
    if (!staff()) store.set('ss_cache', { ...d, user: null, sections: Object.fromEntries(Object.entries(d.sections).filter(([s]) => !viaCode.has(s))) });
    ingest(d);
    setSync(Core.user ? `Live · ${Core.user.role}` : 'Live', true);
  } catch (e) {
    console.warn('Sync failed:', e);
    setSync(S.records.length ? 'Offline · cached' : 'Offline');
  }
  renderAccountBtn();
}

function ingest(d) {
  S.meta = d.meta; S.sky = readSky(); S.picked.clear();
  S.records = Object.entries(d.sections).flatMap(([sec, rows]) => rows.map(r => {
    const a = align(r);
    return Object.assign(r, { _a: a, _syn: sec === 'people' ? synergy(a, S.sky) : NO_SYN });
  }));
  if (d.locked) S.locked = new Set(d.locked);
  renderSeason(); renderChips(); renderGrid(); renderFormSections(); renderLocks(); updateBulk();
  if (onView('calendar')) renderCalendar();
  if (onView('insights')) renderInsights();
  if (onView('mandala')) Mandala.build();
}

const title = r => r[S.meta[r._section]?.title] || r.full_name || r.name || '(untitled)';
const expectOf = r => r[S.meta[r._section]?.title] ?? '';
const subtitle = r => r.role_title || r.focus_industry || r.category || r.event_type || r.org_business || '';
const ref = r => ({ row: r._row, expect: expectOf(r) });
const bySection = list => list.reduce((o, r) => ((o[r._section] ||= []).push(r), o), {});
/** Initials disc with the photo layered on top; if the image fails, the initials show through. */
const avatar = (r, cls = 'ava') => `<span class="${cls}" aria-hidden="true">${esc(initials(title(r)))}${r.photo
  ? `<img src="${esc(thumb(r.photo, 240))}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</span>`;

/* ═══ DIRECTORY · cards carry data- attributes for Universal Search ═══ */

function cardHTML(r, i) {
  const m = S.meta[r._section], a = r._a, s = r._syn, sky = S.sky;
  const loc = r.location || [r.city, r.state].filter(Boolean).join(', ');
  const mods = split(r.modalities || r.modalities_featured).slice(0, 3);
  const tag = (t, hit) => t ? `<span class="tag${hit ? ' hit' : ''}">${esc(t)}</span>` : '';
  const blob = Object.entries(r).filter(([k]) => k[0] !== '_').map(([, v]) => v).join(' ').toLowerCase();
  const data = { section: r._section, name: title(r), role: subtitle(r), mod: r.modalities || '', loc, mbti: a.mbti, hd: a.hd,
                 auth: a.auth, profile: a.profile, sun: a.sun, moon: a.moon, rising: a.rising, element: elementOf(a.sun),
                 tags: r.tags || '', path: r.training_path || '', exp: r.experience_level || '', score: s.score };
  return `<article class="card ${s.tier}" tabindex="0" data-i="${i}" style="--c:${m.color}" title="${esc(s.why.join(' · '))}"
    ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')} data-q="${esc(blob)}">
    <span class="sec" aria-label="${esc(m.label)}">${m.icon}</span>
    ${r._section === 'people' ? `<div class="who">${avatar(r)}<div>` : '<div><div>'}
    <h3>${esc(data.name)}</h3>${data.role ? `<p class="sub">${esc(data.role)}</p>` : ''}</div></div>
    ${loc ? `<p class="loc">📍 ${esc(loc)}</p>` : ''}
    ${pathLine(r) ? `<p class="loc">✦ ${esc(pathLine(r))}</p>` : ''}
    ${r.about_bio || r.description ? `<p class="bio">${esc(r.about_bio || r.description)}</p>` : ''}
    <div class="tags">${mods.map(t => tag(t)).join('')}${tag(a.mbti)}${tag(a.hd, s.why.some(w => w.startsWith('HD')))}
      ${tag(a.profile && 'Profile ' + a.profile)}${tag(a.sun && '☉ ' + a.sun, cap(a.sun) === sky.sign)}
      ${tag(a.moon && '☾ ' + a.moon, cap(a.moon) === sky.sign)}${tag(a.rising && '↑ ' + a.rising, cap(a.rising) === sky.sign)}
      ${split(r.tags).map(t => `<span class="tag own"># ${esc(t)}</span>`).join('')}</div>
  </article>`;
}

function renderGrid() {
  const grid = $('#grid');
  grid.innerHTML = S.records.map(cardHTML).join('');   // one DOM write per data load
  S.cards = [...grid.children];
  filter();
}

/** Universal Search: free text hits data-q; `field:value` hits the matching data- attribute. Toggles `hidden` only — no re-render. */
function filter() {
  const toks = queryTokens($('#q').value);
  const syncOnly = $('#syncOnly').checked;
  let n = 0;
  for (const c of S.cards) {
    const d = c.dataset;
    const ok = visible(d.section) && (S.section === 'all' || d.section === S.section) && (!syncOnly || +d.score > 0) &&
      cardMatches(d, toks);
    c.hidden = !ok;
    n += ok;
  }
  $('#count').textContent = `${n} shown`;
  $('#empty').hidden = n > 0 || (S.locked.size > 0 && !$('#q').value.trim());   // the lock banner explains an empty grid
}

function renderChips() {
  const counts = S.records.reduce((o, r) => (o[r._section] = (o[r._section] || 0) + 1, o), {});
  const ids = sections().filter(visible);
  if (S.section !== 'all' && !ids.includes(S.section)) S.section = 'all';
  $('#chips').innerHTML = `<button class="chip" data-sec="all" aria-pressed="${S.section === 'all'}">✦ All<small>${S.records.filter(r => visible(r._section)).length}</small></button>` +
    ids.map(s => S.locked.has(s)
      ? `<button class="chip locked" data-unlock="${s}" data-id="${s}" title="Locked — enter this section’s code">${S.meta[s].icon} ${esc(S.meta[s].label)}<small>🔒</small></button>`
      : `<button class="chip" data-sec="${s}" data-id="${s}" aria-pressed="${S.section === s}">${S.meta[s].icon} ${esc(S.meta[s].label)}<small>${counts[s] || 0}</small></button>`).join('');
}

/** Lock banner (all views) + form note when the chosen section is still locked. */
function renderLocks() {
  const n = [...S.locked].filter(s => S.meta[s] && visible(s)).length, el = $('#lockNote');
  el.hidden = !n;
  el.innerHTML = n ? `🔒 ${n === sections().filter(visible).length ? 'All sections are' : n + ' section' + (n > 1 ? 's are' : ' is')} locked. Each one opens with its own access code.
    <button type="button" class="link" data-unlock="">🔑 Enter a code</button>` : '';
  const s = formSec(), fl = $('#formLock');
  if (fl) { fl.hidden = !S.locked.has(s); fl.innerHTML = S.locked.has(s) ? `🔒 ${esc(S.meta[s]?.label || '')} needs its access code before you can add to it. <button type="button" class="link" data-unlock="${s}">Enter code</button>` : ''; }
}

/** Ask for a code, then reload whatever it opened. Resolves true if `want` (or anything, when blank) opened. */
async function unlockFlow(want) {
  const label = want && S.meta[want] ? `${S.meta[want].icon} ${S.meta[want].label} is locked.` : '';
  const open = await unlockPrompt(label && label + ' Enter its access code.');
  if (!open.length) return false;
  const names = open.filter(s => S.meta[s]).map(s => S.meta[s].label);
  toast(`🔓 Unlocked ${names.length > 3 ? names.length + ' sections' : names.join(', ')}`);
  await load();
  return !want || open.includes(want);
}

function renderSeason() {
  const k = S.sky, n = S.records.filter(r => r._syn.tier === 'in-season').length;
  $('#season').textContent = `☉ ${k.sign} season · ${k.degree}° · ${k.element} · HD Sun Gate ${k.gate}.${k.line}` + (n ? ` · ${n} in season` : '');
}

/* ── Bulk actions ── */
function setSelecting(on) {
  S.selecting = on; S.picked.clear();
  $('#grid').classList.toggle('selecting', on);
  $('#selectBtn').textContent = on ? 'Cancel' : '☐ Select';
  S.cards.forEach(c => c.removeAttribute('aria-selected'));
  updateBulk();
}
function togglePick(card) {
  const i = +card.dataset.i, on = !S.picked.has(i);
  on ? S.picked.add(i) : S.picked.delete(i);
  card.setAttribute('aria-selected', on);
  updateBulk();
}
function updateBulk() {
  const list = [...S.picked].map(i => S.records[i]), secs = new Set(list.map(r => r._section));
  $('#bulk').hidden = !S.selecting;
  $('#bulkCount').textContent = `${list.length} selected`;
  $$('#bulk [data-need]').forEach(b => { b.hidden = Core.lvl < +b.dataset.need; });
  $('#bulk [data-bulk=merge]').disabled = !(list.length >= 2 && list.length <= 6 && secs.size === 1);
  $$('#bulk [data-bulk]:not([data-bulk=all])').forEach(b => { if (b.dataset.bulk !== 'merge') b.disabled = !list.length; });
}

async function bulk(action) {
  const list = [...S.picked].map(i => S.records[i]);
  if (action === 'all') { S.cards.forEach(c => { if (!c.hidden) { S.picked.add(+c.dataset.i); c.setAttribute('aria-selected', true); } }); return updateBulk(); }
  if (action === 'csv') return exportCSV(list);
  if (action === 'merge') return openMerge(list);
  if (action === 'tag') {
    const t = $('#bulkTag').value.trim();
    if (!t) return $('#bulkTag').focus();
    return mutate(Object.entries(bySection(list)).map(([section, rs]) => ({ _action: 'tag', section, tag: t, rows: rs.map(ref) })),
      `Tagged ${list.length} with “${t}”`, () => { $('#bulkTag').value = ''; });
  }
  if (action === 'delete' && await ask(`Delete ${list.length} entr${list.length === 1 ? 'y' : 'ies'}? A copy is kept in the 🗄 Archive tab.`, 'Delete')) {
    mutate(Object.entries(bySection(list)).map(([section, rs]) => ({ _action: 'delete', section, rows: rs.map(ref) })), `Deleted ${list.length}`);
  }
}

/** Runs one or more POSTs, then reloads. Stops on first error. */
async function mutate(bodies, okMsg, after) {
  try {
    for (const b of [].concat(bodies)) { const r = await api(null, b); if (r.status !== 'ok' && r.status !== 'success') throw new Error(r.message); }
    toast(okMsg); after?.(); setSelecting(false); await load(); return true;
  } catch (e) { toast('⚠ ' + e.message, 'bad'); return false; }
}

function exportCSV(list) {
  const secs = [...new Set(list.map(r => r._section))], seen = new Set();
  const cols = [{ k: '_label', h: 'Section' }, ...secs.flatMap(s => S.meta[s].fields).map(f => ({ k: snake(f.h), h: f.h }))
    .filter(c => !seen.has(c.k) && seen.add(c.k))];
  downloadCSV(`soulspark-${iso(new Date())}.csv`, cols, list.map(r => ({ ...r, _label: S.meta[r._section].label })));
}

/* ── Detail ── */
function openDetail(r) {
  const m = S.meta[r._section] || { icon: '•', fields: [] }, heads = Object.fromEntries(m.fields.map(f => [snake(f.h), f.h]));
  const MODS = ['modalities', 'modalities_featured', 'related_modalities', 'also_known_as'];
  const val = (k, v) => MODS.includes(k) ? split(v).map(n => `<button class="tag" data-explore="${mnorm(n)}">${esc(n)}</button>`).join(' ')
    : /^https?:\/\//.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>`
    : /^\S+@\S+\.\S+$/.test(v) ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : esc(v);
  const own = r._section === 'people' ? LINEAGE_KEYS : [];
  const rows = Object.entries(r).filter(([k, v]) => k[0] !== '_' && v !== '' && !['status', 'photo', 'logo', ...own].includes(k))
    .map(([k, v]) => `<dt>${esc(heads[k] || k.split('_').map(cap).join(' '))}</dt><dd>${val(k, v)}</dd>`).join('');
  const syn = r._syn || NO_SYN, main = r._tab !== 'sub', today = new Date(new Date().setHours(0, 0, 0, 0));
  const next = r.repeats && occurrences(r, today, addDays(today, 400))[0];
  S.detail = r;
  $('#detailBody').innerHTML = `<div class="dhead">${r._section === 'people' ? avatar(r, 'ava lg') : ''}<h2>${m.icon} ${esc(title(r))}</h2>
    ${r.logo ? `<img class="logo" src="${esc(thumb(r.logo, 200))}" alt="${esc(title(r))} logo" onerror="this.remove()">` : ''}</div>
    ${r.repeats ? `<p class="banner">↻ ${esc(r.repeats)}${r.repeat_until ? ' until ' + esc(r.repeat_until) : ''}${next ? ` · next ${next[0].toDateString()}` : ''}</p>` : ''}
    ${syn.why.length ? `<div class="why"><b>Astro-Sync · ${S.sky.sign} season</b><br>${syn.why.map(esc).join('<br>')}</div>` : ''}
    <div class="row">${r.start_date ? '<button class="btn ghost" data-act="ics">📅 Add to calendar</button>' : ''}
      ${staff() && main && S.meta[r._section] ? '<button class="btn ghost" data-act="edit">✎ Edit</button>' : ''}
      ${admin() && main ? '<button class="btn ghost bad-t" data-act="del">Delete</button>' : ''}</div>
    ${r._section === 'people' ? lineageHTML(r) : ''}
    <dl>${rows}</dl>`;
  $('#detail').showModal();
}

async function detailAction(act, el) {
  const r = S.detail;
  if (act === 'explore') { $('#detail').close(); return openExplore(el.dataset.explore); }
  if (act === 'ics') download(`${snake(title(r))}.ics`, ics([r]), 'text/calendar');
  if (act === 'edit') { $('#detail').close(); openForm(r); }
  if (act === 'del' && await ask(`Delete “${title(r)}”? A copy is kept in the 🗄 Archive tab.`, 'Delete')) {
    $('#detail').close(); mutate({ _action: 'delete', section: r._section, rows: [ref(r)] }, 'Deleted');
  }
}

/* ═══ DUPLICATES + MERGE ════════════════════════════════════════ */

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1]));
    prev = cur;
  }
  return prev[b.length];
}

/** Groups likely duplicates per section: same email/phone/site, or names within edit distance 1–2. Blocked by name prefix → ~linear. */
function findDupes() {
  const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
  const parent = S.records.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const join = (a, b) => { parent[find(a)] = find(b); };
  const buckets = new Map(), put = (k, i) => { if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(i); };
  S.records.forEach((r, i) => {
    const s = r._section, n = norm(title(r));
    if (n) put(`${s}|n|${n.slice(0, 3)}`, i);
    if (r.email) put(`${s}|e|${r.email.toLowerCase().trim()}`, i);
    const ph = String(r.phone || '').replace(/\D/g, '').slice(-10); if (ph.length >= 7) put(`${s}|p|${ph}`, i);
    const w = String(r.website || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''); if (w.length > 4) put(`${s}|w|${w}`, i);
  });
  for (const [k, ids] of buckets) for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
    if (!k.includes('|n|')) { join(ids[a], ids[b]); continue; }
    const x = norm(title(S.records[ids[a]])), y = norm(title(S.records[ids[b]]));
    if (lev(x, y) <= (Math.min(x.length, y.length) >= 8 ? 2 : 1)) join(ids[a], ids[b]);
  }
  const groups = new Map();
  S.records.forEach((r, i) => { const g = find(i); groups.set(g, [...(groups.get(g) || []), r]); });
  return [...groups.values()].filter(g => g.length > 1);
}

function openMerge(list) {
  const m = S.meta[list[0]._section], filled = r => Object.keys(r).filter(k => k[0] !== '_').length;
  const keep = [...list].sort((a, b) => filled(b) - filled(a))[0];
  S.merge = { list, keep };
  const rows = m.fields.map(f => ({ f, key: snake(f.h), vals: [...new Set(list.map(r => r[snake(f.h)]).filter(Boolean))] })).filter(x => x.vals.length);
  $('#mergeBody').innerHTML = `<h2>Merge ${list.length} entries</h2>
    <p class="muted">Pick the value to keep for each field. The other entr${list.length > 2 ? 'ies are' : 'y is'} removed and copied to 🗄 Archive.</p>
    <label>Keep this entry <select id="mergeKeep">${list.map((r, i) => `<option value="${i}"${r === keep ? ' selected' : ''}>
      ${esc(title(r))} — row ${r._row}${r === keep ? ' (most complete)' : ''}</option>`).join('')}</select></label>
    <div class="mgrid">${rows.map(({ f, key, vals }) => `<label>${esc(f.h)}${vals.length === 1 ? `<output>${esc(vals[0])}</output>`
      : `<select data-k="${f.k}" data-key="${key}">${vals.map(v => `<option${v === keep[key] ? ' selected' : ''}>${esc(v)}</option>`).join('')}
        <option value="__combine__">⊕ Combine all</option></select>`}</label>`).join('')}</div>
    <div class="row"><button class="btn" id="mergeGo">Merge</button><button class="btn ghost" data-close>Cancel</button></div>`;
  $('#merge').showModal();
}

async function runMerge() {
  const { list } = S.merge, keep = list[+$('#mergeKeep').value], values = {};
  $$('#mergeBody select[data-k]').forEach(sel => {
    const v = sel.value === '__combine__'
      ? [...new Set(list.flatMap(r => String(r[sel.dataset.key] || '').split(/,\s*/)).filter(Boolean))].join(', ') : sel.value;
    if (v !== (keep[sel.dataset.key] || '')) values[sel.dataset.k] = v;
  });
  if (!await ask(`Merge into “${title(keep)}” and remove ${list.length - 1} other${list.length > 2 ? 's' : ''}?`, 'Merge')) return;
  $('#merge').close();
  mutate({ _action: 'merge', section: keep._section, keep: ref(keep), drop: list.filter(r => r !== keep).map(ref), values }, `Merged ${list.length} entries`);
}

/* ═══ CALENDAR ══════════════════════════════════════════════════ */

const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
/** Recurrence rules: occurrence i is computed from the ORIGINAL start, so month-end and DST never drift. */
const RECUR = {
  'Weekly': (s, i) => addDays(s, 7 * i),
  'Every 2 weeks': (s, i) => addDays(s, 14 * i),
  'Monthly (same date)': (s, i) => { const y = s.getFullYear(), m = s.getMonth() + i; return new Date(y, m, Math.min(s.getDate(), dim(y, m))); },
  'Monthly (same weekday)': (s, i) => {      // e.g. "2nd Saturday"; a 5th weekday falls back to the last one
    const f = new Date(s.getFullYear(), s.getMonth() + i, 1), n = Math.ceil(s.getDate() / 7);
    let d = 1 + (s.getDay() - f.getDay() + 7) % 7 + (n - 1) * 7;
    if (d > dim(f.getFullYear(), f.getMonth())) d -= 7;
    return new Date(f.getFullYear(), f.getMonth(), d);
  },
  'Yearly': (s, i) => new Date(s.getFullYear() + i, s.getMonth(), Math.min(s.getDate(), dim(s.getFullYear() + i, s.getMonth()))),
};

/** [start, end] pairs of an event that overlap [from, to]. */
function occurrences(r, from, to) {
  const s = day(r.start_date);
  if (!s) return [];
  const len = Math.max(0, Math.min(60, Math.round(((day(r.end_date) || s) - s) / 864e5))), next = RECUR[r.repeats], until = day(r.repeat_until), out = [];
  for (let i = 0, d = s; d <= to && (!until || d <= until) && i < 1000; d = next ? next(s, ++i) : addDays(to, 1)) {
    const e = addDays(d, len);
    if (e >= from) out.push([d, e]);
  }
  return out;
}

/** date string → [{r, kind}] within [from, to]: event days (incl. recurrences), apply deadlines, staff follow-ups. */
function calendarIndex(from, to) {
  const idx = new Map(), add = (d, item) => { if (d && d >= from && d <= to) { const k = iso(d); idx.set(k, [...(idx.get(k) || []), item]); } };
  for (const r of S.records) {
    if (!visible(r._section)) continue;
    for (const [a, b] of occurrences(r, from, to)) for (let d = a; d <= b; d = addDays(d, 1)) add(d, { r, kind: 'event' });
    add(day(r.apply_vend_deadline), { r, kind: 'deadline' });
    add(day(r.follow_up_date), { r, kind: 'followup' });
  }
  return idx;
}
const KIND = { event: '●', deadline: '◆ Apply by', followup: '⏰ Follow up' };

function renderCalendar() {
  const { y, m, sel } = S.cal, today = iso(new Date()), now = day(today);
  const first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
  const idx = calendarIndex(start < now ? start : now, addDays(start, 41) > addDays(now, 60) ? addDays(start, 41) : addDays(now, 60));
  $('#calTitle').textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="dow">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = iso(d), items = idx.get(k) || [];
    html += `<button class="day${d.getMonth() !== m ? ' out' : ''}${k === today ? ' today' : ''}${k === sel ? ' sel' : ''}" data-day="${k}"
      aria-label="${d.toDateString()}${items.length ? `, ${items.length} item${items.length > 1 ? 's' : ''}` : ''}"><b>${d.getDate()}</b>
      ${items.slice(0, 3).map(({ r, kind }) => `<span class="ev ${kind}" style="--c:${S.meta[r._section].color}">${r.repeats ? '↻ ' : ''}${esc(title(r))}</span>`).join('')}
      ${items.length > 3 ? `<span class="more">+${items.length - 3}</span>` : ''}</button>`;
  }
  $('#calGrid').innerHTML = html;
  renderAgenda(idx);
}

function renderAgenda(idx) {
  const sel = S.cal.sel, from = sel ? day(sel) : new Date(new Date().setHours(0, 0, 0, 0));
  const days = [...idx.keys()].filter(k => sel ? k === sel : day(k) >= from && day(k) - from <= 60 * 864e5).sort();
  $('#agendaTitle').textContent = sel ? day(sel).toDateString() : 'Next 60 days';
  $('#agenda').innerHTML = days.map(k => `<li><time>${day(k).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</time>
    ${idx.get(k).map(({ r, kind }) => `<button class="agi ${kind}" data-i="${S.records.indexOf(r)}" style="--c:${S.meta[r._section].color}">
      <small>${KIND[kind]}</small> ${esc(title(r))}${r.city || r.venue ? ` <span class="muted">· ${esc(r.venue || r.city)}</span>` : ''}${r.repeats ? ` <small>↻ ${esc(r.repeats)}</small>` : ''}</button>`).join('')}</li>`).join('')
    || '<li class="muted">Nothing scheduled.</li>';
}

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
function rrule(r) {
  const s = day(r.start_date), u = day(r.repeat_until), n = Math.ceil(s.getDate() / 7);
  const base = { 'Weekly': 'FREQ=WEEKLY', 'Every 2 weeks': 'FREQ=WEEKLY;INTERVAL=2', 'Monthly (same date)': 'FREQ=MONTHLY', 'Yearly': 'FREQ=YEARLY',
    'Monthly (same weekday)': `FREQ=MONTHLY;BYDAY=${n > 4 ? -1 : n}${BYDAY[s.getDay()]}` }[r.repeats];
  return base ? [`RRULE:${base}${u ? ';UNTIL=' + iso(u).replace(/-/g, '') : ''}`] : [];
}

function ics(list) {
  const t = s => String(s || '').replace(/[\\,;]/g, '\\$&').replace(/\n/g, '\\n');
  const next = d => { const n = new Date(d); n.setDate(n.getDate() + 1); return iso(n).replace(/-/g, ''); };
  const stamp = new Date().toISOString().replace(/[-:]|\.\d+/g, '');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SoulSpark//Resource Guide//EN', 'CALSCALE:GREGORIAN',
    ...list.filter(r => day(r.start_date)).flatMap(r => ['BEGIN:VEVENT', `UID:${r._section}-${r._row}-${snake(title(r))}@soulspark`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${iso(day(r.start_date)).replace(/-/g, '')}`, `DTEND;VALUE=DATE:${next(day(r.end_date) || day(r.start_date))}`, ...rrule(r),
      `SUMMARY:${t(title(r))}`, `LOCATION:${t([r.venue, r.address, r.city, r.state].filter(Boolean).join(', '))}`,
      `DESCRIPTION:${t([r.description, r.apply_vend_deadline && 'Apply by ' + r.apply_vend_deadline, r.website].filter(Boolean).join('\n'))}`, 'END:VEVENT']),
    'END:VCALENDAR'].join('\r\n');
}

/* ═══ INSIGHTS: tallies · coming up · revenue · duplicates ═══════ */

function renderInsights() {
  const counts = bySection(S.records), ids = sections().filter(visible);
  const today = new Date(new Date().setHours(0, 0, 0, 0)), soon = [];
  for (const [k, items] of calendarIndex(addDays(today, -120), addDays(today, 14))) {
    const diff = Math.round((day(k) - today) / 864e5);
    for (const it of items) {
      if (diff > 14 || (diff < 0 && it.kind !== 'followup')) continue;
      const prev = soon.find(x => x.r === it.r && x.kind === it.kind);   // multi-day events: keep the nearest day
      prev ? (prev.diff = Math.min(prev.diff, diff)) : soon.push({ ...it, diff });
    }
  }
  soon.sort((a, b) => a.diff - b.diff);
  const when = d => d < 0 ? `<b class="due over">${-d}d overdue</b>` : d === 0 ? '<b class="due now">Today</b>' : `<b class="due">${d}d</b>`;

  const money_ = S.records.filter(r => ['expos', 'events'].includes(r._section) && (r.sales_total || r.expenses_total))
    .map(r => { const g = num(r.sales_total), c = num(r.expenses_total) || num(r.booth_fee || r.vend_booth_fee); return { r, g, c, n: g - c }; })
    .sort((a, b) => b.n - a.n);
  const G = money_.reduce((s, x) => s + x.g, 0), C = money_.reduce((s, x) => s + x.c, 0);
  const dupes = staff() ? findDupes() : [];
  S.dupes = dupes;

  $('#insightsBody').innerHTML = `
    <section class="panel"><h2>At a glance</h2><div class="tiles">${ids.map(s => `<button class="tile" data-go="${s}" style="--c:${S.meta[s].color}">
      <b>${(counts[s] || []).length}</b><span>${S.meta[s].icon} ${esc(S.meta[s].label)}</span></button>`).join('')}</div></section>
    <section class="panel"><h2>Coming up · 14 days</h2>${soon.length ? `<ul class="list">${soon.map(x => `<li><button class="agi ${x.kind}" data-i="${S.records.indexOf(x.r)}"
      style="--c:${S.meta[x.r._section].color}">${when(x.diff)} <small>${KIND[x.kind]}</small> ${esc(title(x.r))}</button></li>`).join('')}</ul>`
      : '<p class="muted">Nothing due in the next two weeks.</p>'}</section>
    ${staff() ? `<section class="panel wide"><h2>Revenue · expos, shows &amp; events</h2>${money_.length ? `
      <div class="tiles kpi"><div class="tile"><b>${money(G)}</b><span>Gross sales</span></div><div class="tile"><b>${money(C)}</b><span>Costs</span></div>
        <div class="tile"><b>${money(G - C)}</b><span>Net · ${G ? Math.round((G - C) / G * 100) : 0}% margin</span></div>
        <div class="tile"><b>${money((G - C) / money_.length)}</b><span>Avg net / event</span></div></div>
      <h3>Net by event</h3>${bars(money_.map(x => ({ label: title(x.r), value: x.n, note: `${money(x.g)} sales − ${money(x.c)} costs` })), money)}
      <p class="muted">Costs use Expenses Total, or the booth fee when expenses are blank.</p>`
      : '<p class="muted">Add Sales Total / Expenses Total to a show, expo or event to see revenue.</p>'}</section>
    <section class="panel wide"><h2>Possible duplicates</h2>${dupes.length ? `<ul class="list">${dupes.map((g, i) => `<li class="dupe">
      <span>${S.meta[g[0]._section].icon} ${g.map(r => `<b>${esc(title(r))}</b>`).join(' · ')}</span>
      <button class="btn ghost" data-dupe="${i}">Review &amp; merge</button></li>`).join('')}</ul>` : '<p class="muted">No likely duplicates ✦</p>'}</section>` : ''}`;
}

/* ═══ EXPLORE · the modality library ═══════════════════════════ */

const mnorm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const CATS = ['Energy', 'Divination', 'Somatic', 'Coaching', 'Creative'];
const catsOf = m => (m.def ? CATS.filter(c => m.def['category_' + c.toLowerCase()]) : []);

/** Every modality — defined in the Modalities tab or just named by a practitioner/event — with who practises it.
    "Also Known As" aliases fold variants together (e.g. Sound Bath → Sound Healing). */
function modalityIndex() {
  const map = new Map(), alias = new Map();
  const node = (name, def = null) => ({ name, def, slug: mnorm(name), people: [], events: [], co: new Map() });
  for (const d of S.records) if (d._section === 'modalities' && mnorm(d.modality_name)) {
    const k = mnorm(d.modality_name);
    map.set(k, node(d.modality_name, d)); alias.set(k, k);
    split(d.also_known_as).forEach(a => alias.has(mnorm(a)) || alias.set(mnorm(a), k));
  }
  const get = name => {
    const n = mnorm(name), k = alias.get(n) || n;
    if (!k) return null;
    if (!map.has(k)) map.set(k, node(String(name).trim()));
    return map.get(k);
  };
  for (const r of S.records) {
    if (r._section === 'people') {
      const ms = [...new Set(split(r.modalities).map(get).filter(Boolean))];
      ms.forEach(m => { m.people.push(r); ms.forEach(o => o !== m && m.co.set(o, (m.co.get(o) || 0) + 1)); });
    } else if (r._section === 'events') split(r.modalities_featured).map(get).forEach(m => m?.events.push(r));
  }
  return { map, get, alias };
}

function renderExplore() {
  S.mods = modalityIndex();
  if (S.mod && !S.mods.map.has(S.mod)) S.mod = S.mods.alias.get(S.mod) || null;
  const q = mnorm($('#mq').value), c = S.mcat, all = [...S.mods.map.values()];
  const inCat = (m, cc) => cc === 'All' || (cc === 'Not yet defined' ? !m.def : catsOf(m).includes(cc));
  const list = all.filter(m => inCat(m, c) && (!q || [m.slug, m.def?.description, m.def?.also_known_as].some(x => mnorm(x).includes(q))))
    .sort((a, b) => b.people.length - a.people.length || a.name.localeCompare(b.name));
  $('#mcats').innerHTML = ['All', ...CATS, 'Not yet defined'].map(cc =>
    `<button class="chip" data-mcat="${cc}" aria-pressed="${cc === c}">${cc}<small>${all.filter(m => inCat(m, cc)).length}</small></button>`).join('');
  $('#mlist').innerHTML = list.map(m => `<button class="mrow${m.def ? '' : ' undef'}" data-slug="${m.slug}">
    <b>${esc(m.name)}</b><span>${esc(catsOf(m).join(' · ') || (m.def ? 'Defined' : 'Not yet defined'))}</span>
    <small title="Practitioners">${m.people.length}</small></button>`).join('') || '<p class="muted">No modalities match.</p>';
  if (!S.mod && matchMedia('(min-width: 861px)').matches) S.mod = list[0]?.slug || null;
  renderModality();
}

function renderModality() {
  const m = S.mods.map.get(S.mod), box = $('#mdetail');
  $('#explore').classList.toggle('picked', !!m);
  $$('#mlist .mrow').forEach(b => b.setAttribute('aria-current', b.dataset.slug === S.mod));
  if (!m) { box.innerHTML = '<p class="empty">Pick a modality to see what it is and who practises it.</p>'; return; }
  const d = m.def || {}, today = new Date(new Date().setHours(0, 0, 0, 0));
  const related = [...new Set([...split(d.related_modalities).map(S.mods.get), ...[...m.co].sort((a, b) => b[1] - a[1]).map(([o]) => o)])]
    .filter(o => o && o !== m).slice(0, 8);
  const people = [...m.people].sort((a, b) => b._syn.score - a._syn.score || title(a).localeCompare(title(b)));   // in-season first
  const events = m.events.map(r => [r, occurrences(r, today, addDays(today, 365))[0]]).filter(([, o]) => o).sort((a, b) => a[1][0] - b[1][0]);
  const info = [['Ideal client', d.ideal_client], ['Tools used', d.tools_used], ['Certification / lineage', d.certification],
    ['Resources & suppliers', d.resources_suppliers], ['Also known as', d.also_known_as]].filter(([, v]) => v);
  box.innerHTML = `<button class="link back" data-mback>‹ All modalities</button>
    <h2>${esc(m.name)}</h2>
    <div class="tags">${catsOf(m).map(c => `<span class="tag">${c}</span>`).join('')}${m.def ? '' : '<span class="tag hit">Not yet defined</span>'}</div>
    ${d.description ? `<p class="lede">${esc(d.description)}</p>`
      : `<p class="muted">${people.length ? `${people.length} practitioner${people.length > 1 ? 's list' : ' lists'} this, but there’s` : 'There’s'} no definition yet.</p>`}
    ${info.length ? `<dl>${info.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
    <div class="row">${m.def ? (staff() ? '<button class="btn ghost sm" data-mact="edit">✎ Edit definition</button>' : '')
      : '<button class="btn sm" data-mact="define">✎ Define this modality</button>'}
      ${staff() ? '<button class="btn ghost sm" data-mact="addp">+ Add a practitioner</button>' : '<button class="btn ghost sm" data-mact="iam">✦ I practise this</button>'}
      <button class="btn ghost sm" data-mact="link">🔗 Copy link</button></div>
    <h3>Practitioners · ${people.length}</h3>
    ${people.length ? `<div class="pgrid">${people.map(p => `<button class="pcard" data-i="${S.records.indexOf(p)}">${avatar(p)}<span>
      <b>${esc(title(p))}</b><small>${esc([p.role_title, p.location].filter(Boolean).join(' · '))}</small>
      ${p._syn.tier === 'in-season' ? '<small class="ins">☉ In season</small>' : ''}</span></button>`).join('')}</div>`
      : '<p class="muted">No one listed yet — be the first.</p>'}
    ${events.length ? `<h3>Upcoming events</h3><ul class="list">${events.map(([r, [a]]) => `<li><button class="agi event" data-i="${S.records.indexOf(r)}"
      style="--c:${S.meta.events?.color}"><small>${a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small> ${esc(title(r))}${r.repeats ? ' <small>↻</small>' : ''}</button></li>`).join('')}</ul>` : ''}
    ${related.length ? `<h3>Related modalities</h3><div class="tags">${related.map(o => `<button class="tag" data-slug="${o.slug}">${esc(o.name)}</button>`).join('')}</div>` : ''}`;
}

function exploreAction(act) {
  const m = S.mods.map.get(S.mod);
  ({
    define: () => openForm(null, { modality_name: m.name }, 'modalities'),
    edit: () => openForm(m.def),
    addp: () => openForm(null, { modalities: m.name }, 'people'),
    iam: () => openListing(m.name),
    link: () => navigator.clipboard.writeText(location.href.split('#')[0] + '#explore/' + m.slug).then(() => toast('Link copied'), () => toast('Couldn’t copy', 'bad')),
  })[act]?.();
}
function openExplore(slug) { S.mod = slug; show('explore'); }
const setHash = () => history.replaceState(null, '', onView('explore') && S.mod ? '#explore/' + S.mod : location.pathname + location.search);

/* ═══ PATH & LINEAGE · every way of learning shown with equal weight; never scored or ranked ═══ */

// Alphabetical on purpose: no path is listed (or weighted) above another.
const PATHS = ['Certified', 'Classes & workshops', 'Family or ancestral tradition', 'Lineage & apprenticeship', 'Mentored', 'Self-taught'];
const LINEAGE_KEYS = ['training_path', 'years_practicing', 'teachers_lineage', 'classes_workshops_taken', 'certifications'];
const list = v => String(v || '').split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
const pathLine = r => [r.years_practicing && `${num(r.years_practicing)} yr${num(r.years_practicing) === 1 ? '' : 's'} practising`, ...list(r.training_path)].filter(Boolean).join(' · ');

/** "Learned from" (up to 3 generations, linked when the teacher is in the directory) and "Has taught" (people who list them). */
function lineageHTML(r) {
  const people = S.records.filter(p => p._section === 'people'), byName = new Map(people.map(p => [mnorm(title(p)), p]));
  const link = (name, p) => p ? `<button class="linkish" data-i="${S.records.indexOf(p)}">${esc(name)}</button>` : esc(name);
  const tree = (p, depth, seen) => list(p.teachers_lineage).map(n => {
    const t = byName.get(mnorm(n)), deeper = t && depth < 3 && !seen.has(t) && list(t.teachers_lineage).length;
    return `<li>${link(n, t)}${deeper ? `<ul>${tree(t, depth + 1, new Set([...seen, t]))}</ul>` : ''}</li>`;
  }).join('');
  const students = people.filter(p => p !== r && list(p.teachers_lineage).some(n => mnorm(n) === mnorm(title(r))));
  const paths = list(r.training_path), years = num(r.years_practicing);
  if (!paths.length && !years && !r.teachers_lineage && !students.length && !r.classes_workshops_taken && !r.certifications) return '';
  return `<section class="lineage"><h3>Path &amp; lineage</h3>
    ${years || paths.length ? `<div class="tags">${years ? `<span class="path">${years} year${years === 1 ? '' : 's'} practising</span>` : ''}${paths.map(x => `<span class="path">${esc(x)}</span>`).join('')}</div>` : ''}
    ${r.teachers_lineage ? `<p class="q">Learned from</p><ul class="tree">${tree(r, 1, new Set([r]))}</ul>` : ''}
    ${students.length ? `<p class="q">Has taught</p><div class="tags">${students.map(p => link(title(p), p)).join(' ')}</div>` : ''}
    ${r.classes_workshops_taken ? `<p class="q">Classes &amp; workshops</p><p>${esc(r.classes_workshops_taken)}</p>` : ''}
    ${r.certifications ? `<p class="q">Certifications</p><p>${esc(r.certifications)}</p>` : ''}
    <p class="muted small">Every path — certified, self-taught, lineage, classes, family tradition — is shown equally and never affects ranking.</p></section>`;
}

/* ═══ MATCH · right practitioner, right moment ══════════════════ */

const ELEMENT_PAIR = { Fire: 'Air', Air: 'Fire', Earth: 'Water', Water: 'Earth' };          // traditional complementary elements
/* SoulSpark convention (editable): which practitioner HD types tend to guide each seeker type well. */
const HD_GUIDE = { Generator: ['Projector'], 'Manifesting Generator': ['Projector'], Projector: ['Generator', 'Manifesting Generator', 'Projector'],
                   Manifestor: ['Projector', 'Reflector'], Reflector: ['Reflector', 'Projector'] };
const STOP = new Set('the and for with from that this have about some help support want need would like feel feeling looking someone into more less work been'.split(' '));
const yesv = v => !!v && v !== 'false';

function renderMatchForm() {
  const mi = modalityIndex(), q = store.get('ss_match', null), f = $('#matchForm');
  if (q && !f.dataset.ready) { ['need', 'format', 'near', 'sun', 'hd'].forEach(k => { if (f.elements[k]) f.elements[k].value = q[k] || ''; }); S.mm = new Set(q.mods || []); }
  $('#mmods').innerHTML = [...mi.map.values()].filter(m => m.people.length).sort((a, b) => a.name.localeCompare(b.name))
    .map(m => `<button type="button" data-mm="${m.slug}" aria-pressed="${S.mm.has(m.slug)}">${esc(m.name)}</button>`).join('');
  f.elements.sun.innerHTML = '<option value="">—</option>' + SIGNS.map(x => `<option>${x}</option>`).join('');
  f.elements.hd.innerHTML = '<option value="">—</option>' + OPTIONS['HD Type'].map(x => `<option>${x}</option>`).join('');
  if (q) { f.elements.sun.value = q.sun || ''; f.elements.hd.value = q.hd || ''; }
  if (q && !f.dataset.ready) runMatch();
  f.dataset.ready = 1;
}

/** Ranks practitioners by need fit first, then practicalities, timing and (opt-in) alignment. Training path and years are never inputs. */
function runMatch() {
  const f = $('#matchForm'), mi = modalityIndex(), need = f.elements.need.value;
  const q = { need, format: f.elements.format.value, near: f.elements.near.value.trim(), sun: f.elements.sun.value, hd: f.elements.hd.value, mods: [...S.mm] };
  store.set('ss_match', q);
  const mods = new Set(q.mods);
  for (const m of mi.map.values()) if (m.slug.length >= 4 && mnorm(need).includes(m.slug)) mods.add(m.slug);   // "reiki" typed in the need box counts
  const words = (need.toLowerCase().match(/[a-z]{4,}/g) || []).filter(w => !STOP.has(w));
  const hasNeed = mods.size || words.length;
  const results = S.records.filter(p => p._section === 'people').map(p => {
    const why = [], add = (pts, msg) => { why.push([pts, msg]); return pts; };
    const pm = new Set(split(p.modalities).map(n => mi.get(n)?.slug).filter(Boolean));
    const serves = REACH.some(l => yesv(p['serves_' + snake(l)]));
    if (serves && q.format === 'Online' && !yesv(p.serves_online)) return null;               // hard filters only when we know
    if (serves && q.format === 'In person' && !['local', 'regional', 'in_person'].some(k => yesv(p['serves_' + k]))) return null;
    let fit = 0;
    [...mods].filter(m => pm.has(m)).forEach(m => { fit += add(4, `Practises ${mi.map.get(m).name}`); });
    if (words.length) {
      const hay = [p.about_bio, p.descriptives_keywords, p.classes_offerings, p.role_title, p.modalities, p.collaboration_notes,
        ...[...pm].map(m => { const d = mi.map.get(m)?.def; return d ? `${d.description || ''} ${d.ideal_client || ''}` : ''; })].join(' ').toLowerCase();
      const found = [...new Set(words.filter(w => hay.includes(w.slice(0, Math.max(4, w.length - 3)))))];   // light stemming: grief ≈ grieving
      if (found.length) fit += add(Math.min(3, found.length) * 1.5, `Their work speaks to “${found.slice(0, 3).join('”, “')}”`);
    }
    if (hasNeed && !fit) return null;
    let sc = fit;
    if (q.format === 'Online' && yesv(p.serves_online)) sc += add(2, 'Works online');
    if (q.format === 'In person' && serves) sc += add(2, 'Meets in person');
    if (q.near && mnorm(p.location).includes(mnorm(q.near))) sc += add(2, `Based in ${p.location}`);
    if (p._syn.tier === 'in-season') sc += add(1.5, `In season now · ${p._syn.why[0]}`);
    else if (p._syn.tier === 'resonant') sc += add(.5, `Resonant now · ${p._syn.why[0]}`);
    const a = elementOf(q.sun), b = elementOf(p._a.sun);
    if (a && b && (a === b || ELEMENT_PAIR[a] === b)) sc += add(1, a === b ? `Shares your ${a} element (☉ ${p._a.sun})` : `Their ${b} complements your ${a} (☉ ${p._a.sun})`);
    if (q.hd && HD_GUIDE[q.hd]?.includes(p._a.hd)) sc += add(1, `${p._a.hd} guidance suits a ${q.hd}`);
    return { p, sc, fit, why: why.sort((x, y) => y[0] - x[0]).map(([, m]) => m) };
  }).filter(Boolean).sort((x, y) => y.sc - x.sc || title(x.p).localeCompare(title(y.p))).slice(0, 12);

  const label = x => !hasNeed ? '' : x.fit >= 4 && x.sc >= 6 ? 'Strong match' : x.fit >= 4 || x.sc >= 4 ? 'Good match' : 'Possible match';
  $('#matchOut').innerHTML = results.length ? `<p class="muted">${results.length} practitioner${results.length > 1 ? 's' : ''} · ${S.sky.sign} season</p>
    <div class="mres">${results.map(x => `<article class="mcard">
      <div class="who">${avatar(x.p)}<div><h3>${esc(title(x.p))}</h3><p class="sub">${esc([x.p.role_title, x.p.location].filter(Boolean).join(' · '))}</p></div>
        ${label(x) ? `<span class="due${x.fit >= 4 ? ' now' : ''}">${label(x)}</span>` : ''}</div>
      ${pathLine(x.p) ? `<p class="loc">✦ ${esc(pathLine(x.p))}</p>` : ''}
      <ul class="whylist">${x.why.slice(0, 4).map(w => `<li>${esc(w)}</li>`).join('')}</ul>
      <button class="btn ghost sm" data-i="${S.records.indexOf(x.p)}">View profile</button></article>`).join('')}</div>`
    : `<p class="empty">No one matches yet. Try fewer words, another modality, or “Either” for how to meet.</p>`;
}

/* ═══ MANDALA ═══════════════════════════════════════════════════ */

const PALETTE = ['#7c5cbf', '#c47a1a', '#2d8a6e', '#d0623f', '#3f7fbf', '#9b5de5', '#c46b8e', '#2ba4c8', '#7f9a3a', '#b8455a', '#6a4c93', '#d4a017'];
const REACH = ['Local', 'Regional', 'National', 'International', 'Online', 'In-Person'];
const titleCase = s => String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
/** Cluster modes: [label, key(record, modalityIndex)]. Modality uses Explore's alias matching so both views agree. */
const MODES = {
  modality: ['Modality', (r, mi) => mi.get(split(r.modalities)[0] || '')?.name],
  sun: ['Sun', r => cap(r._a.sun)], moon: ['Moon', r => cap(r._a.moon)], rising: ['Rising', r => cap(r._a.rising)],
  element: ['Element', r => elementOf(r._a.sun)],
  hd: ['HD Type', r => r._a.hd], auth: ['HD Authority', r => r._a.auth], profile: ['HD Profile', r => r._a.profile],
  genekeys: ['Gene Keys', r => { const v = String(r.gene_keys || '').trim(), n = /\b([1-9]|[1-5]\d|6[0-4])\b/.exec(v); return n ? 'Gene Key ' + n[1] : v; }],
  lifepath: ['Life Path', r => r.life_path_number && 'Life Path ' + r.life_path_number],
  mbti: ['MBTI', r => r._a.mbti],
  location: ['Location', r => titleCase((r.location || r.service_area || '').split(',')[0].trim())],
  services: ['Services', r => REACH.filter(l => (v => !!v && v !== 'false')(r['serves_' + snake(l)])).join(' + ')],
  synergy: ['Synergy', r => ({ 'in-season': '☉ In season', resonant: '✧ Resonant' })[r._syn.tier] || 'Dormant'],
};
/** Rotation is offered only on computers (fine pointer + hover) and never when the OS asks for reduced motion. */
const canSpin = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;

const Mandala = (() => {
  const cv = $('#cv'), tip = $('#tip'), ctx = cv.getContext('2d'), layer = document.createElement('canvas');
  const still = matchMedia('(prefers-reduced-motion: reduce)'), imgs = new Map();
  let nodes = [], labels = [], pairs = [], w = 0, h = 0, cx = 0, cy = 0, R = 0, dpr = 1, raf = 0, reb = 0, hover = null, angle = 0, last = 0;
  const spinning = () => !!S.spin && canSpin();

  function build() {
    const box = cv.getBoundingClientRect();
    if (!box.width) return;
    dpr = Math.min(devicePixelRatio || 1, 2); w = box.width; h = box.height; cx = w / 2; cy = h / 2;
    cv.width = layer.width = w * dpr; cv.height = layer.height = h * dpr;
    const mi = modalityIndex(), people = S.records.filter(r => r._section === 'people'), key = MODES[S.mode][1], groups = new Map();
    people.forEach(p => { const k = key(p, mi) || 'Unspecified'; groups.set(k, [...(groups.get(k) || []), p]); });
    const clusters = [...groups].sort((a, b) => b[1].length - a[1].length);
    R = Math.min(w * 0.33, h * 0.42);
    const ring = clusters.length > 1 ? R * 0.62 : 0, nodeR = Math.max(5, Math.min(14, R / Math.sqrt(people.length + 4) / 1.6));
    nodes = []; labels = [];
    clusters.forEach(([label, list], ci) => {             // positions are relative to the centre, so rotation is one transform
      const ang = (ci / clusters.length) * Math.PI * 2 - Math.PI / 2, gx = Math.cos(ang) * ring, gy = Math.sin(ang) * ring, color = PALETTE[ci % PALETTE.length];
      list.forEach((p, k) => {                             // phyllotaxis spiral: no overlap at any cluster size
        const rr = nodeR * 2.3 * Math.sqrt(k), t = k * 2.39996;
        nodes.push({ x: gx + Math.cos(t) * rr, y: gy + Math.sin(t) * rr, r: nodeR, p, color, img: photo(p, nodeR) });
      });
      const d = nodeR * 2.3 * Math.sqrt(list.length) + 12;
      labels.push({ label, n: list.length, color, x: gx + Math.cos(ang) * d, y: gy + Math.sin(ang) * d,
                    slug: S.mode === 'modality' && label !== 'Unspecified' ? mnorm(label) : null });
    });
    const byMod = new Map();                               // shared-modality threads, alias-aware
    nodes.forEach((n, i) => new Set(split(n.p.modalities).map(m => mi.get(m)?.slug)).forEach(m => m && byMod.set(m, [...(byMod.get(m) || []), i])));
    pairs = [];
    for (const idx of byMod.values()) for (let a = 0; a < idx.length; a++) for (let b = a + 1; b < idx.length && pairs.length < 1500; b++) pairs.push([nodes[idx[a]], nodes[idx[b]]]);
    angle = spinning() ? angle : 0;
    bake(); legend(clusters); loop();
  }

  /** Loads a node photo once; a redraw is scheduled when it arrives. Falls back to initials. */
  function photo(p, r) {
    const src = r >= 8 && p.photo && thumb(p.photo, 96);
    if (!src) return null;
    if (!imgs.has(src)) {
      const im = new Image();
      im.onload = () => { cancelAnimationFrame(reb); reb = requestAnimationFrame(() => { bake(); if (!raf) frame(performance.now()); }); };
      im.src = src; imgs.set(src, im);
    }
    return imgs.get(src);
  }

  function place(a) {
    const c = Math.cos(a), s = Math.sin(a), rot = (x, y) => [cx + x * c - y * s, cy + x * s + y * c];
    nodes.forEach(n => { [n.sx, n.sy] = rot(n.x, n.y); });
    labels.forEach(l => { [l.sx, l.sy] = rot(l.x, l.y); l.ang = Math.atan2(l.sy - cy, l.sx - cx); });
  }

  /** Static layer: backdrop + threads always; nodes, labels and centre too when not spinning. */
  function bake() {
    const g = layer.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, layer.width, layer.height); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.strokeStyle = 'rgba(124,92,191,.10)'; g.lineWidth = 1;            // sacred-geometry backdrop
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.beginPath(); g.arc(cx + Math.cos(a) * R * .4, cy + Math.sin(a) * R * .4, R * .45, 0, 7); g.stroke(); }
    g.strokeStyle = 'rgba(124,92,191,.14)';
    for (const [A, B] of pairs) { g.beginPath(); g.moveTo(cx + A.x, cy + A.y); g.quadraticCurveTo(cx + (A.x + B.x) / 3, cy + (A.y + B.y) / 3, cx + B.x, cy + B.y); g.stroke(); }
    if (!spinning()) { place(0); drawNodes(g); drawLabels(g); drawCenter(g); }
  }

  function drawNodes(g) {
    for (const n of nodes) {
      const t = n.p._syn.tier, im = n.img;
      g.beginPath(); g.arc(n.sx, n.sy, n.r, 0, 7);
      g.fillStyle = t === 'in-season' ? '#fff3d6' : '#fff'; g.fill();
      if (im?.complete && im.naturalWidth) {
        const s = Math.min(im.naturalWidth, im.naturalHeight);
        g.save(); g.clip(); g.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, n.sx - n.r, n.sy - n.r, n.r * 2, n.r * 2); g.restore();
      } else if (n.r >= 8) {
        g.fillStyle = n.color; g.font = `600 ${Math.round(n.r * .8)}px Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(initials(title(n.p)), n.sx, n.sy + 1);
      }
      g.beginPath(); g.arc(n.sx, n.sy, n.r, 0, 7); g.lineWidth = t ? 2.5 : 1.5; g.strokeStyle = t ? '#d4a017' : n.color; g.stroke();
    }
  }

  function drawLabels(g) {
    const mid = getComputedStyle(document.body).getPropertyValue('--mid');
    g.textBaseline = 'middle';
    for (const l of labels) {
      const cos = Math.cos(l.ang), y = l.sy + (Math.sin(l.ang) < -0.3 ? -10 : 0), txt = l.label.length > 18 ? l.label.slice(0, 17) + '…' : l.label;
      g.textAlign = cos > 0.3 ? 'left' : cos < -0.3 ? 'right' : 'center';
      g.font = '600 12px Jost, sans-serif'; g.fillStyle = l.color; g.fillText(txt, l.sx, y);
      const tw = g.measureText(txt).width, x0 = g.textAlign === 'left' ? l.sx : g.textAlign === 'right' ? l.sx - tw : l.sx - tw / 2;
      l.box = [x0, y - 9, tw, 32];
      if (l.slug) { g.globalAlpha = .45; g.fillRect(x0, y + 7, tw, 1); g.globalAlpha = 1; }   // hint: opens in Explore
      g.fillStyle = mid; g.font = '11px Jost, sans-serif'; g.fillText(`(${l.n})`, l.sx, y + 16);
    }
  }

  function drawCenter(g) {
    const css = getComputedStyle(document.body);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = css.color; g.font = '700 14px "Playfair Display", serif'; g.fillText('✦ SoulSpark', cx, cy - 8);
    g.fillStyle = '#c47a1a'; g.font = '11px Jost, sans-serif'; g.fillText(`☉ ${S.sky.sign} · Gate ${S.sky.gate}.${S.sky.line}`, cx, cy + 10);
    if (!nodes.length) { g.fillStyle = css.getPropertyValue('--mid'); g.fillText('No practitioners yet', cx, cy + 40); }
  }

  function frame(t) {
    const spin = spinning(), dt = last ? Math.min(t - last, 100) : 0;
    last = t;
    if (spin && !hover) angle = (angle + dt * 0.00004) % (Math.PI * 2);   // ≈ one turn every 2.6 min; pauses under the cursor
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (spin) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(cx, cy); ctx.rotate(angle); ctx.translate(-cx, -cy);
      ctx.drawImage(layer, 0, 0, w, h); place(angle);
    } else ctx.drawImage(layer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pulse = still.matches ? 0.5 : (Math.sin(t / 500) + 1) / 2;
    for (const n of nodes) if (n.p._syn.tier === 'in-season') {        // Astro-Sync glow
      const rr = n.r * (2.2 + pulse), gr = ctx.createRadialGradient(n.sx, n.sy, n.r, n.sx, n.sy, rr);
      gr.addColorStop(0, `rgba(212,160,23,${0.35 + pulse * 0.25})`); gr.addColorStop(1, 'rgba(212,160,23,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(n.sx, n.sy, rr, 0, 7); ctx.fill();
    }
    if (spin) { drawNodes(ctx); drawLabels(ctx); drawCenter(ctx); }
    if (hover) { ctx.lineWidth = 3; ctx.strokeStyle = hover.color; ctx.beginPath(); ctx.arc(hover.sx, hover.sy, hover.r + 4, 0, 7); ctx.stroke(); }
  }

  /** Animates only when something moves (spin or an in-season glow); otherwise one frame and stop. */
  function loop() {
    cancelAnimationFrame(raf); last = 0;
    const anim = !still.matches && (spinning() || nodes.some(n => n.p._syn.tier === 'in-season'));
    const tick = t => { frame(t); raf = anim && onView('mandala') ? requestAnimationFrame(tick) : 0; };
    raf = requestAnimationFrame(tick);
  }

  function legend(clusters) {
    $('#legend').innerHTML = clusters.map(([l, list], i) => {
      const inner = `<i style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(l)} · ${list.length}`;
      return S.mode === 'modality' && l !== 'Unspecified' ? `<button class="lg" data-explore="${mnorm(l)}" title="Explore ${esc(l)}">${inner}</button>` : `<span>${inner}</span>`;
    }).join('');
  }

  const at = e => { const b = cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const hitNode = ([x, y]) => nodes.find(n => (n.sx - x) ** 2 + (n.sy - y) ** 2 <= (n.r + 4) ** 2) || null;
  const hitLabel = ([x, y]) => labels.find(l => l.slug && l.box && x >= l.box[0] - 4 && x <= l.box[0] + l.box[2] + 4 && y >= l.box[1] && y <= l.box[1] + l.box[3]) || null;

  cv.addEventListener('pointermove', e => {
    const pt = at(e), n = hitNode(pt), l = !n && hitLabel(pt);
    if (n !== hover) { hover = n; if (!raf) frame(performance.now()); }
    cv.style.cursor = n || l ? 'pointer' : '';
    tip.hidden = !n && !l;
    if (n) {
      const a = n.p._a;
      tip.innerHTML = `<b>${esc(title(n.p))}</b>${esc(subtitle(n.p))}<br>${esc([a.hd, a.profile, a.sun && '☉ ' + a.sun].filter(Boolean).join(' · '))}` +
        (n.p._syn.why[0] ? `<br>✧ ${esc(n.p._syn.why[0])}` : '');
      tip.style.left = n.sx + 'px'; tip.style.top = n.sy + 'px';
    } else if (l) { tip.innerHTML = `<b>${esc(l.label)}</b>Explore this modality →`; tip.style.left = pt[0] + 'px'; tip.style.top = pt[1] + 'px'; }
  });
  cv.addEventListener('pointerleave', () => { hover = null; tip.hidden = true; if (!raf) frame(performance.now()); });
  cv.addEventListener('click', e => { const pt = at(e), n = hitNode(pt), l = !n && hitLabel(pt); if (n) openDetail(n.p); else if (l) openExplore(l.slug); });
  let rz; new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(build); }).observe(cv);

  return { build };
})();

function renderModes() {
  $('#modes').innerHTML = Object.entries(MODES).map(([k, [l]]) => `<button class="chip" data-mode="${k}" aria-pressed="${S.mode === k}">${l}</button>`).join('') +
    (canSpin() ? `<button class="chip spin" data-spin aria-pressed="${!!S.spin}" title="Slowly rotate the mandala (computers only)">⟳ Rotate</button>` : '');
}

/* ═══ ADD / EDIT · form generated from the sheet's own field spec ═══ */

const MBTI = 'INFJ INFP INTJ INTP ENFJ ENFP ENTJ ENTP ISFJ ISFP ISTJ ISTP ESFJ ESFP ESTJ ESTP'.split(' ');
const OPTIONS = {
  'MBTI': MBTI, 'Sun Sign': SIGNS, 'Moon Sign': SIGNS, 'Rising Sign': SIGNS,
  'HD Type': ['Manifestor', 'Generator', 'Manifesting Generator', 'Projector', 'Reflector'],
  'HD Authority': ['Emotional', 'Sacral', 'Splenic', 'Ego', 'Self-Projected', 'Mental / Environmental', 'Lunar'],
  'HD Profile': ['1/3', '1/4', '2/4', '2/5', '3/5', '3/6', '4/6', '4/1', '5/1', '5/2', '6/2', '6/3'],
  'Experience Level': ['Newbie', 'Intermediate', 'Advanced'], 'Rating': ['1', '2', '3', '4', '5'], 'Recommend?': ['Yes', 'Maybe', 'No'],
  'Repeats': ['Weekly', 'Every 2 weeks', 'Monthly (same date)', 'Monthly (same weekday)', 'Yearly'],
  'Meeting Frequency': ['Weekly', 'Bi-Weekly', 'Monthly', 'Quarterly', 'As Needed', 'Other'], 'Application Required': ['Yes', 'No'],
  'Follow-Up Needed': ['Yes', 'No'], 'Worth Again?': ['Yes', 'Maybe', 'No'],
};
const MULTI = { 'Training Path': PATHS };   // tick any that apply
const BOOL = /^(Type|Cat|Category|Opp|Seeking|Format|Availability) —|^Serves |^Incl\. |^Includes |^Electricity (Included|Extra)$|^(Indoor|Outdoor)$/;
const LONG = /Bio|Description|Notes|Testimonial|Summary|Endorsements|Requirements|Why |Next Steps|Topics|Suggestions|Comment|Integrate|How We Met/;
const formSec = () => $('#formSec').value;
const fieldsFor = s => {
  const order = store.get('ss_fields_' + s, []), pos = k => (order.indexOf(k) + 1) || 999;
  return S.meta[s].fields.filter(f => staff() || (!f.s && f.k !== 'tags')).map((f, i) => ({ ...f, i })).sort((a, b) => pos(a.k) - pos(b.k) || a.i - b.i);
};

function fieldHTML({ k, h, p, s }, sec, val = '') {
  const note = s ? ' <em>staff</em>' : p ? ' <em>private</em>' : '';
  const wrap = (inner, cls = '') => `<label class="${cls}" data-id="${k}">${inner}</label>`;
  const up = /^_(.+)_link$/.exec(k);
  if (up) return wrap(`${esc(h.replace(' (Drive Link)', ''))}<span class="upl">${val ? `<img src="${esc(thumb(val, 200))}" alt="" onerror="this.remove()">` : ''}
    <input type="file" name="__up_${up[1]}" accept="image/*"></span>`, 'upload');
  if (MULTI[h]) return `<div class="wide multi" data-id="${k}"><span class="q">${esc(h)} <span class="muted">— tick all that apply</span></span><span class="toggles">${MULTI[h]
    .map(o => `<label class="toggle"><input type="checkbox" name="${k}" value="${esc(o)}"${list(val).includes(o) ? ' checked' : ''}> ${esc(o)}</label>`).join('')}</span></div>`;
  if (BOOL.test(h)) return wrap(`<input type="checkbox" name="${k}" value="true"${val ? ' checked' : ''}> ${esc(h)}`, 'chk');
  if (OPTIONS[h]) return wrap(`${esc(h)}${note}<select name="${k}"><option value=""></option>${OPTIONS[h].map(o => `<option${o === val ? ' selected' : ''}>${o}</option>`).join('')}</select>`);
  if (LONG.test(h)) return wrap(`${esc(h)}${note}<textarea name="${k}" rows="3">${esc(val)}</textarea>`, 'wide');
  const type = /Email$/.test(h) ? 'email' : /^(Website|URL)|URL$/.test(h) ? 'url' : /(Start|End) Date|Deadline|Follow-Up Date|Repeat Until/.test(h) ? 'date' : 'text';
  const extra = (/Total|Fee/.test(h) ? ' inputmode="decimal"' : /^Years /.test(h) ? ' inputmode="numeric"' : '') + (k === S.meta[sec].fields[0].k ? ' required' : '');
  return wrap(`${esc(h)}${note}<input type="${type}" name="${k}" value="${esc(val)}"${extra}>`);
}

function renderFormSections() {
  const sel = $('#formSec'), cur = sel.value;
  sel.innerHTML = sections().filter(visible).map(s => `<option value="${s}">${S.meta[s].icon} ${esc(S.meta[s].label)}</option>`).join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
  if (!S.edit && (!onView('add') || !$('#fields').children.length)) renderFields();   // never wipe a form the user is filling in
}

function renderFields() {
  const s = formSec(), r = S.edit, form = $('#form');
  $('#fields').innerHTML = s ? fieldsFor(s).map(f => fieldHTML(f, s, r ? r[snake(f.h)] || '' : S.prefill?.[f.k] || '')).join('') : '';
  const mf = $('#fields [name=modalities]');
  if (mf) mf.insertAdjacentHTML('afterend', `<span class="suggest">${[...modalityIndex().map.values()].sort((a, b) => b.people.length - a.people.length)
    .slice(0, 24).map(m => `<button type="button" data-addmod="${esc(m.name)}">+ ${esc(m.name)}</button>`).join('')}</span>`);
  $('#anon').hidden = !!Core.user || !!r;
  $('#formTitle').textContent = r ? `Edit · ${title(r)}` : S.prefill?.email && s === 'people' ? 'Create your practitioner listing' : 'Add an entry';
  $('#formSubmit').textContent = r ? 'Save changes' : Core.lvl >= 2 ? 'Add to guide' : 'Submit for review';
  $('#formCancel').hidden = !r;
  $('#formSec').disabled = !!r;
  const d = !r && !S.prefill && s && Drafts.read(s);
  if (d) Drafts.fill(form, d);
  $('#draftNote').innerHTML = draftBanner(d);
}

function openForm(r, prefill, section) {
  S.edit = r || null; S.prefill = prefill || null;
  if (r || section) $('#formSec').value = r ? r._section : section;
  renderFields(); show('add');
}

/** Resizes images in the browser before upload (faster, and keeps Apps Script payloads small). */
async function shrink(file, max) {
  if (file.size > 15e6) throw new Error('Image is over 15 MB');
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return { b64: c.toDataURL(mime, 0.85).split(',')[1], mime, name: file.name.replace(/\.\w+$/, '') + (mime === 'image/png' ? '.png' : '.jpg') };
}
async function collectUploads(form, into) {
  for (const el of $$('input[type=file][name^="__up_"]', form)) {
    const f = el.files[0], p = el.name.slice(5);
    if (!f) continue;
    const img = await shrink(f, p === 'logo' ? 600 : 1200);
    Object.assign(into, { [p + '_b64']: img.b64, [p + '_mime']: img.mime, [p + '_filename']: img.name });
  }
  return into;
}

async function submitForm(e) {
  e.preventDefault();
  const form = e.target, btn = $('#formSubmit'), msg = $('#formMsg'), sec = formSec(), r = S.edit;
  btn.disabled = true; msg.textContent = 'Sending…';
  try {
    if (r) {
      const values = {};
      for (const f of fieldsFor(sec)) {
        const el = form.elements[f.k], old = r[snake(f.h)] || ''; if (!el) continue;
        if (MULTI[f.h]) { const v = $$(`[name="${f.k}"]:checked`, form).map(b => b.value).join(', '); if (v !== old) values[f.k] = v; continue; }
        const v = el.type === 'checkbox' ? el.checked : el.value;
        if (el.type === 'checkbox' ? v !== !!old : v !== old) values[f.k] = v;
      }
      await collectUploads(form, values);
      if (!Object.keys(values).length) { msg.textContent = 'No changes.'; return; }
      if (await mutate({ _action: 'update', section: sec, tab: r._tab || 'main', row: r._row, expect: expectOf(r), values }, '✓ Saved')) {
        S.edit = null; msg.textContent = ''; renderFields(); show('directory');
      } else msg.textContent = '';
      return;
    }
    const data = { _section: sec };
    for (const [k, v] of new FormData(form)) if (!k.startsWith('__up_') && v !== '') data[k] = k in data ? `${data[k]}, ${v}` : v;   // multi-select joins
    await collectUploads(form, data);
    if (S.locked.has(sec) && !(await unlockFlow(sec))) { msg.textContent = '🔒 This section needs its access code.'; return; }
    let res = await api(null, data);
    if (res.status === 'locked' && await unlockFlow(sec)) res = await api(null, data);   // code changed while the form was open
    if (res.status !== 'success') throw new Error(res.message);
    Drafts.clear(sec);
    msg.textContent = res.trusted ? '✓ Added to the live guide.' : '✓ Submitted — it will appear once approved.';
    form.reset(); S.prefill = null; renderFields();
    if (res.trusted) load();
  } catch (err) { msg.textContent = '⚠ Could not send: ' + err.message; }
  finally { btn.disabled = false; }
}

/* ═══ ARRANGE · pointer + keyboard reordering (mouse, touch, pen) ═══ */

/** Makes `box`'s `sel` children reorderable while box has .arranging. onDone(ids) receives the new data-id order. */
function sortable(box, sel, onDone) {
  let drag = null;
  const done = () => onDone($$(sel, box).map(el => el.dataset.id));
  box.addEventListener('pointerdown', e => {
    const it = box.classList.contains('arranging') && e.target.closest(sel);
    if (it) { drag = { it, x: e.clientX, y: e.clientY, on: false }; e.preventDefault(); }
  });
  box.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!drag.on) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return; drag.on = true; drag.it.classList.add('dragging'); box.setPointerCapture(e.pointerId); }
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(sel);
    if (over && over !== drag.it && box.contains(over)) {
      const b = over.getBoundingClientRect();
      over[(e.clientX - b.left) / b.width + (e.clientY - b.top) / b.height > 1 ? 'after' : 'before'](drag.it);
    }
  });
  const end = () => { if (drag?.on) { drag.it.classList.remove('dragging'); done(); } drag = null; };
  box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
  box.addEventListener('keydown', e => {
    const it = box.classList.contains('arranging') && e.target.closest(sel), dir = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!it || !dir) return;
    e.preventDefault();
    const sib = dir < 0 ? it.previousElementSibling : it.nextElementSibling;
    if (sib?.matches(sel)) { sib[dir < 0 ? 'before' : 'after'](it); it.focus(); done(); }
  });
  box.addEventListener('click', e => { if (box.classList.contains('arranging')) { e.preventDefault(); e.stopPropagation(); } }, true);
}

function toggleArrange(btn, box, onReset) {
  const on = box.classList.toggle('arranging');
  btn.textContent = on ? '✓ Done' : '⇅ Arrange';
  btn.setAttribute('aria-pressed', on);
  $$('[data-id]', box).forEach(el => { if (!el.matches('button')) el.tabIndex = on ? 0 : -1; });
  btn.nextElementSibling.hidden = !on;
  btn.nextElementSibling.onclick = () => { onReset(); toggleArrange(btn, box, onReset); };
  if (on) toast('Drag to reorder — or focus an item and use the arrow keys');
}

/* ═══ INBOX (editor+) ═══════════════════════════════════════════ */

async function loadInbox() {
  const box = $('#inboxList');
  box.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const d = await api({ action: 'inbox' });
    if (d.status !== 'ok') throw new Error(d.message);
    S.inbox = d.submissions;
    box.innerHTML = S.inbox.length ? S.inbox.map((r, i) => {
      const m = S.meta[r._section] || { icon: '•', color: '#888', label: r._section };
      const pending = /^(⏳|🔁)/.test(r.status);
      return `<div class="item" style="--c:${m.color}"><div><b>${m.icon} ${esc(title(r))}</b>
        <div class="muted">${esc(m.label)} · ${esc(r.submitter_name || 'Anonymous')} · ${esc(r.submitted_at || '')} · ${esc(r.status)}</div></div>
        <div class="acts">${pending ? `<button class="btn" data-rv="approve" data-i="${i}">Approve</button>
          <button class="btn ghost" data-rv="info" data-i="${i}">Needs info</button>
          <button class="btn bad" data-rv="reject" data-i="${i}">Reject</button>` : ''}
          <button class="btn ghost" data-view-sub="${i}">View</button></div></div>`;
    }).join('') : '<p class="empty">Inbox zero ✦</p>';
  } catch (err) { box.innerHTML = `<p class="empty">⚠ ${esc(err.message)}</p>`; }
}

async function reviewItem(i, decision, btn) {
  const r = S.inbox[i];
  btn.disabled = true;
  const res = await api(null, { _action: 'review', section: r._section, row: r._row, decision }).catch(e => ({ message: e.message }));
  res.status === 'ok' ? toast({ approve: '✓ Approved & live', reject: 'Rejected', info: 'Marked “needs info”' }[decision]) : toast('⚠ ' + res.message, 'bad');
  loadInbox();
  if (decision === 'approve') load();
}

/* ═══ SELF-LISTING · practitioners create and maintain their own profile ═══ */

async function openListing(addMod) {
  if (!Core.user) { S.after = { listing: addMod ?? true }; return openAccount('signup'); }
  const d = await api({ action: 'mine' }).catch(() => ({}));
  const own = (d.rows || []).filter(r => r._section === 'people' && !/^❌/.test(r.status || ''));
  const r = own.find(x => x._tab === 'main') || own[0], mod = typeof addMod === 'string' ? addMod : '';
  if (!r) return openForm(null, { name: Core.user.name, email: Core.user.email, ...(mod && { modalities: mod }) }, 'people');
  openForm(r);
  const el = $('#form').elements.modalities;
  if (mod && el && !split(el.value).some(x => mnorm(x) === mnorm(mod))) { el.value = [el.value, mod].filter(Boolean).join(', '); toast(`Added ${mod} — save to update your listing`); }
}

/* ═══ IMPORT (admin) · CSV for one section, or a JSON backup / old-app data for many ═══ */

function parseCSV(t) {
  const rows = [[]];
  let f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true;
    else if (c === ',') { rows.at(-1).push(f); f = ''; }
    else if (c === '\n') { rows.at(-1).push(f.replace(/\r$/, '')); rows.push([]); f = ''; }
    else f += c;
  }
  rows.at(-1).push(f.replace(/\r$/, ''));
  return rows.filter(r => r.some(x => x.trim()));
}
function fromCSV(text, section) {
  const [head, ...rows] = parseCSV(text.replace(/^\ufeff/, '')), fields = S.meta[section].fields;
  const keys = head.map(h => (fields.find(f => snake(f.h) === snake(h) || f.k === snake(h)) || {}).k);
  const dc = head.findIndex(h => /^(date added|submitted at)$/i.test(h.trim()));
  return rows.map(r => ({ ...Object.fromEntries(keys.map((k, i) => [k, r[i]]).filter(([k, v]) => k && v)), ...(dc >= 0 && { _date: r[dc] }) }));
}
const oldAppRecords = () => { try { const a = JSON.parse(localStorage.getItem('rg_local') || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
const groupJSON = j => bySection((Array.isArray(j) ? j : j.records || []).map(r => ({ _section: $('#impSec').value, ...r, _date: r._timestamp || r._date })));

async function importRecords(groups) {
  const n = Object.values(groups).flat().length, msg = $('#impMsg'), tot = { added: 0, enriched: 0, skipped: 0 };
  if (!n) return (msg.textContent = 'Nothing to import.');
  if (!await ask(`Import ${n} entr${n === 1 ? 'y' : 'ies'}? Existing names only get their blank fields filled — nothing is overwritten.`, 'Import')) return;
  try {
    for (const [section, recs] of Object.entries(groups)) {
      if (!S.meta[section]) { tot.skipped += recs.length; continue; }
      for (let i = 0; i < recs.length; i += 300) {
        msg.textContent = `Importing ${S.meta[section].label}… ${i}/${recs.length}`;
        const r = await api(null, { _action: 'import', section, records: recs.slice(i, i + 300) });
        if (r.status !== 'ok') throw new Error(r.message);
        Object.keys(tot).forEach(k => { tot[k] += r[k]; });
      }
    }
    msg.textContent = `✓ ${tot.added} added · ${tot.enriched} filled in · ${tot.skipped} skipped`;
    load();
  } catch (err) { msg.textContent = '⚠ ' + err.message; }
}

/* ═══ ACCOUNT ═══════════════════════════════════════════════════ */

function renderAccountBtn() {
  const u = Core.user, b = $('#acctBtn');
  b.textContent = u ? u.name.split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase() : 'Sign in';
  b.classList.toggle('avatar', !!u);
  b.title = u ? `${u.name} · ${u.role}` : 'Sign in or create an account';
  $('#inboxTab').hidden = !staff();
  $('#joinBtn').hidden = !!u;
}

async function openAccount(mode = 'signin') {
  const u = Core.user, box = $('#acctBody');
  if (!u) {
    box.innerHTML = `<div class="seg" role="tablist">${['signin', 'signup'].map(m => `<button type="button" role="tab" data-mode="${m}" aria-selected="${m === mode}">
      ${m === 'signin' ? 'Sign in' : 'Create account'}</button>`).join('')}</div>
      ${S.after ? '<p class="banner">✦ Create a free account (or sign in), then add your practitioner listing. New listings are reviewed once; after that you can update yours any time.</p>' : ''}
      <form id="authForm" class="stack">${mode === 'signup' ? '<label>Name<input name="name" required autocomplete="name"></label>' : ''}
        <label>Email<input name="email" type="email" required autocomplete="email"></label>
        <label>Password<input name="password" type="password" required minlength="8" autocomplete="${mode === 'signup' ? 'new' : 'current'}-password"></label>
        <label class="chk"><input type="checkbox" name="remember" checked> Keep me signed in on this device</label>
        <button class="btn">${mode === 'signin' ? 'Sign in' : 'Create account'}</button><p class="muted" id="authMsg" role="status"></p></form>`;
    box.dataset.auth = mode;
  } else {
    box.innerHTML = `<h2>${esc(u.name)}</h2><p class="muted">${esc(u.email)} · <b>${esc(u.role)}</b></p>
      <div class="row"><button class="btn ghost" data-acct="out">Sign out</button></div>
      <h3>My practitioner listing</h3><div class="dupe" id="listing"><span class="muted">Loading…</span></div>
      <h3>My entries</h3><ul class="list" id="mine"><li class="muted">Loading…</li></ul>
      ${admin() ? '<h3>Members</h3><div id="users" class="muted">Loading…</div>' : ''}`;
    api({ action: 'mine' }).then(d => {
      S.mine = d.rows || [];
      $('#mine').innerHTML = S.mine.map((r, i) => `<li class="dupe"><span>${S.meta[r._section]?.icon || '•'} <b>${esc(title(r))}</b>
        <span class="muted">· ${esc(r.status || '')}</span></span>${S.meta[r._section] ? `<button class="btn ghost" data-mine="${i}">✎ Edit</button>` : ''}</li>`).join('')
        || '<li class="muted">Nothing yet — add something from the Add tab.</li>';
      const L = S.mine.filter(r => r._section === 'people' && !/^❌/.test(r.status || '')), lr = L.find(x => x._tab === 'main') || L[0];
      $('#listing').innerHTML = lr
        ? `<span class="who">${avatar(lr)}<b>${esc(title(lr))}</b> <span class="due${lr._tab === 'main' ? '' : ' now'}">${lr._tab === 'main' ? 'Live' : esc(lr.status || 'Pending review')}</span></span>
           <button class="btn ghost sm" data-acct="listing">✎ Update listing</button>`
        : '<span class="muted">Practitioners can list themselves in the directory.</span><button class="btn sm" data-acct="listing">✦ Create my listing</button>';
    });
    if (admin()) api({ action: 'users' }).then(d => {
      $('#users').innerHTML = `<table class="tbl"><thead><tr><th>Name</th><th>Email</th><th>Last in</th><th>Role</th></tr></thead><tbody>${(d.users || []).map(x =>
        `<tr><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td>${esc(x.last)}</td><td><select data-role="${esc(x.email)}"${x.email === u.email ? ' disabled' : ''}>
        ${['member', 'editor', 'admin', 'blocked'].map(r => `<option${r === x.role ? ' selected' : ''}>${r}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>`;
    });
  }
  if (!$('#account').open) $('#account').showModal();
}

async function authSubmit(e) {
  e.preventDefault();
  const f = new FormData(e.target), mode = $('#acctBody').dataset.auth, msg = $('#authMsg');
  msg.textContent = mode === 'signin' ? 'Signing in…' : 'Creating account…';
  try {
    const u = await Auth.enter(mode, { name: f.get('name'), email: f.get('email'), password: f.get('password') }, !!f.get('remember'));
    $('#account').close(); toast(`✦ Welcome${mode === 'signin' ? ' back' : ''}, ${u.name.split(' ')[0]}`);
    renderAccountBtn(); renderFields(); load();
    if (S.after) { const a = S.after; S.after = null; openListing(a.listing); }
  } catch (err) { msg.textContent = '⚠ ' + err.message; }
}

/* ═══ VIEWS · SETTINGS · WIRING ═════════════════════════════════ */

function show(view) {
  if (view !== 'add' && (S.edit || S.prefill)) { S.edit = S.prefill = null; renderFields(); }
  $$('.view').forEach(v => v.classList.toggle('on', v.id === view));
  $$('.tabs button').forEach(b => b.toggleAttribute('aria-current', b.dataset.view === view));
  ({ mandala: () => Mandala.build(), inbox: loadInbox, calendar: renderCalendar, insights: renderInsights, explore: renderExplore, match: renderMatchForm })[view]?.();
  setHash();
}

/** Deep links: #explore/<modality> · #join (practitioner sign-up). */
function route() {
  const [v, slug] = location.hash.slice(1).split('/');
  if (v === 'join') openListing();
  if (v === 'match') show('match');
  if (v === 'explore') openExplore(slug ? decodeURIComponent(slug) : null);
}

function openSettings() {
  $('#visList').innerHTML = sections().map(s => `<label class="chk"><input type="checkbox" data-vis="${s}"${visible(s) ? ' checked' : ''}> ${S.meta[s].icon} ${esc(S.meta[s].label)}</label>`).join('')
    || '<p class="muted">Connect to load sections.</p>';
  $('#apiUrl').value = Core.api;
  $('#importBox').hidden = !admin();
  if (admin()) {
    $('#impSec').innerHTML = sections().map(s => `<option value="${s}">${S.meta[s].icon} ${esc(S.meta[s].label)}</option>`).join('');
    const old = oldAppRecords().length;
    $('#impOld').hidden = !old;
    $('#impOld').textContent = `Import ${old} entries saved by the old SoulSpark app in this browser`;
  }
  $('#settings').showModal();
}

const on = (sel, ev, fn) => $(sel).addEventListener(ev, fn);
const hit = (e, attr) => e.target.closest(`[${attr}]`);

function wire() {
  let t;
  on('#q', 'input', () => { clearTimeout(t); t = setTimeout(filter, 120); });
  on('#syncOnly', 'change', filter);
  on('.tabs', 'click', e => hit(e, 'data-view') && show(hit(e, 'data-view').dataset.view));
  on('#chips', 'click', e => { const b = hit(e, 'data-sec'); if (b) { S.section = b.dataset.sec; renderChips(); filter(); } });
  document.addEventListener('click', e => { const b = hit(e, 'data-unlock'); if (b && !e.target.closest('#chips.arranging')) unlockFlow(b.dataset.unlock); });
  on('#formSec', 'change', renderLocks);
  on('#printBtn', 'click', () => print());
  on('#forgetCodes', 'click', () => { Codes.clear(); $('#settings').close(); toast('Section codes forgotten on this device'); load(); });
  on('#modes', 'click', e => {
    const b = hit(e, 'data-mode'), sp = hit(e, 'data-spin');
    if (b) S.mode = b.dataset.mode;
    if (sp) { S.spin = !S.spin; store.set('ss_spin', S.spin); }
    if (b || sp) { renderModes(); Mandala.build(); }
  });
  on('#legend', 'click', e => { const b = hit(e, 'data-explore'); if (b) openExplore(b.dataset.explore); });
  on('#grid', 'click', e => {
    const c = e.target.closest('.card'), r = c && S.records[c.dataset.i];
    if (r) S.selecting ? togglePick(c) : r._section === 'modalities' ? openExplore(mnorm(r.modality_name)) : openDetail(r);
  });
  on('#mq', 'input', () => { clearTimeout(t); t = setTimeout(renderExplore, 120); });
  on('#mcats', 'click', e => { const b = hit(e, 'data-mcat'); if (b) { S.mcat = b.dataset.mcat; renderExplore(); } });
  on('#explore', 'click', e => {
    const sl = hit(e, 'data-slug'), a = hit(e, 'data-mact'), i = hit(e, 'data-i');
    if (sl) { S.mod = sl.dataset.slug; renderModality(); setHash(); $('#mdetail').scrollTop = 0; }
    if (hit(e, 'data-mback')) { S.mod = null; renderModality(); setHash(); }
    if (a) exploreAction(a.dataset.mact);
    if (i) openDetail(S.records[+i.dataset.i]);
  });
  on('#joinBtn', 'click', () => openListing());
  on('#matchForm', 'submit', e => { e.preventDefault(); runMatch(); $('#matchOut').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  on('#mmods', 'click', e => {
    const b = hit(e, 'data-mm'); if (!b) return;
    S.mm.has(b.dataset.mm) ? S.mm.delete(b.dataset.mm) : S.mm.add(b.dataset.mm);
    b.setAttribute('aria-pressed', S.mm.has(b.dataset.mm));
  });
  on('#matchOut', 'click', e => { const b = hit(e, 'data-i'); if (b) openDetail(S.records[+b.dataset.i]); });
  on('#fields', 'click', e => {
    const b = hit(e, 'data-addmod'); if (!b) return;
    e.preventDefault();
    const el = $('#form').elements.modalities, cur = split(el.value);
    if (!cur.some(x => mnorm(x) === mnorm(b.dataset.addmod))) { el.value = [...cur, b.dataset.addmod].join(', '); el.dispatchEvent(new Event('input', { bubbles: true })); }
    b.classList.add('on');
  });
  on('#fields', 'change', e => {
    const el = e.target, f = el.files?.[0];
    if (!f || !el.name.startsWith('__up_')) return;
    const box = el.closest('.upl'), img = $('img', box) || box.insertAdjacentElement('afterbegin', Object.assign(document.createElement('img'), { alt: '' }));
    img.src = URL.createObjectURL(f);
  });
  on('#impFile', 'change', async e => {
    const f = e.target.files[0]; if (!f) return;
    e.target.value = '';
    try {
      const text = await f.text(), json = /\.json$/i.test(f.name) || /^\s*[[{]/.test(text);
      await importRecords(json ? groupJSON(JSON.parse(text)) : { [$('#impSec').value]: fromCSV(text, $('#impSec').value) });
    } catch (err) { $('#impMsg').textContent = '⚠ ' + err.message; }
  });
  on('#impOld', 'click', () => importRecords(groupJSON(oldAppRecords())));
  on('#grid', 'keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.card')) { e.preventDefault(); e.target.click(); } });
  on('#selectBtn', 'click', () => setSelecting(!S.selecting));
  on('#bulk', 'click', e => { const b = hit(e, 'data-bulk'); if (b && !b.disabled) bulk(b.dataset.bulk); });
  on('#bulkTag', 'keydown', e => { if (e.key === 'Enter') bulk('tag'); });
  on('#detail', 'click', e => {
    const b = hit(e, 'data-act'), x = hit(e, 'data-explore'), i = hit(e, 'data-i');
    if (b) detailAction(b.dataset.act); if (x) detailAction('explore', x); if (i) openDetail(S.records[+i.dataset.i]);
  });
  on('#merge', 'click', e => { if (e.target.id === 'mergeGo') runMerge(); });
  on('#calNav', 'click', e => {
    const b = hit(e, 'data-cal'); if (!b) return;
    const c = S.cal, k = b.dataset.cal;
    if (k === 'ics') return download('soulspark-events.ics', ics(S.records.filter(r => r.start_date && visible(r._section))), 'text/calendar');
    if (k === 'today') Object.assign(c, { y: new Date().getFullYear(), m: new Date().getMonth(), sel: null });
    else { const d = new Date(c.y, c.m + +k, 1); c.y = d.getFullYear(); c.m = d.getMonth(); }
    renderCalendar();
  });
  on('#calGrid', 'click', e => { const b = hit(e, 'data-day'); if (b) { S.cal.sel = S.cal.sel === b.dataset.day ? null : b.dataset.day; renderCalendar(); } });
  ['#agenda', '#insightsBody'].forEach(s => on(s, 'click', e => {
    const i = hit(e, 'data-i'), g = hit(e, 'data-go'), dp = hit(e, 'data-dupe');
    if (i) openDetail(S.records[+i.dataset.i]);
    if (g) { S.section = g.dataset.go; renderChips(); filter(); show('directory'); }
    if (dp) openMerge(S.dupes[+dp.dataset.dupe]);
  }));
  on('#formSec', 'change', renderFields);
  on('#form', 'submit', submitForm);
  on('#formCancel', 'click', () => { S.edit = null; renderFields(); show('directory'); });
  on('#draftNote', 'click', e => { if (hit(e, 'data-discard')) { Drafts.clear(formSec()); $('#form').reset(); renderFields(); } });
  Drafts.bind($('#form'), formSec, () => !S.edit);
  on('#inboxList', 'click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rv) reviewItem(+b.dataset.i, b.dataset.rv, b);
    else if (b.dataset.viewSub) openDetail({ ...S.inbox[+b.dataset.viewSub], _tab: 'sub' });
  });
  on('#acctBtn', 'click', () => openAccount());
  on('#account', 'click', e => {
    const m = hit(e, 'data-mode'), a = hit(e, 'data-acct'), mi = hit(e, 'data-mine');
    if (m) openAccount(m.dataset.mode);
    if (a?.dataset.acct === 'out') { Auth.clear(); $('#account').close(); toast('Signed out'); renderAccountBtn(); renderFields(); load(); }
    if (mi) { $('#account').close(); openForm(S.mine[+mi.dataset.mine]); }
    if (a?.dataset.acct === 'listing') { $('#account').close(); openListing(); }
  });
  on('#account', 'submit', e => { if (e.target.id === 'authForm') authSubmit(e); });
  on('#account', 'change', async e => {
    const s = e.target.dataset.role; if (!s) return;
    const r = await api(null, { _action: 'role', email: s, role: e.target.value });
    r.status === 'ok' ? toast(`${s} is now ${e.target.value}`) : toast('⚠ ' + r.message, 'bad');
  });
  on('#settingsBtn', 'click', openSettings);
  on('#visList', 'change', e => {
    const s = e.target.dataset.vis; if (!s) return;
    S.vis[s] = e.target.checked; store.set('ss_vis', S.vis);
    renderChips(); filter(); renderFormSections();
  });
  on('#saveSettings', 'click', () => {
    const u = $('#apiUrl').value.trim() || DEFAULT_API;
    if (!validApi(u)) return toast('⚠ That isn’t a current Apps Script Web App URL (https://script.google.com/macros/s/…/exec)', 'bad');
    Core.api = u; store.set('ss_api', u); $('#settings').close(); load();
  });

  sortable($('#chips'), '[data-id]', ids => { S.order = ids; store.set('ss_order', ids); renderFormSections(); });
  sortable($('#fields'), '[data-id]', ids => store.set('ss_fields_' + formSec(), ids));
  on('#arrangeChips', 'click', e => toggleArrange(e.target, $('#chips'), () => { S.order = []; store.del('ss_order'); renderChips(); renderFormSections(); }));
  on('#arrangeFields', 'click', e => toggleArrange(e.target, $('#fields'), () => { store.del('ss_fields_' + formSec()); renderFields(); }));

  document.addEventListener('click', e => { if (e.target.matches('[data-close]')) e.target.closest('dialog').close(); });
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]')) { e.preventDefault(); show('directory'); $('#q').focus(); }
    if (e.key === 'Escape' && S.selecting && !$('dialog[open]')) setSelecting(false);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - (S.loaded || 0) > REFRESH_MS) refresh(); });
}

function refresh() { S.loaded = Date.now(); return load(); }

/* ── boot: paint from cache instantly, then sync ── */
wire();
renderModes();
renderAccountBtn();
S.sky = readSky(); renderSeason();
const cached = store.get('ss_cache');
if (cached?.sections) ingest(cached);
refresh().then(route);
addEventListener('hashchange', route);
setInterval(() => { if (!document.hidden && !S.selecting && !$('dialog[open]')) refresh(); }, REFRESH_MS);
