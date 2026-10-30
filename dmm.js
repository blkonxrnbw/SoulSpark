'use strict';
/* DMM page — public intake form + organizer dashboard (editor+). Needs core.js. */

const FORMATS = { circle: 'Circle', workshop: 'Workshop', meditation: 'Meditation', panel: 'Panel', qa: 'Q&A', ritual: 'Ritual',
                  study: 'Study Group', business: 'Business', other: 'Other' };
const AVAIL = { morning: 'Morning', evening: 'Evening', weekday: 'Weekday', weekend: 'Weekend' };
// Form field = prefix + key; sheet column = header, so the dashboard reads prefix + snake(label) (e.g. 'Q&A' → format_q_a).
const form = $('#dmmForm'), DRAFT = 'dmm';
let rowsCache = [], metaCache = null;

/* ── intake ── */
const toggles = (prefix, map) => Object.entries(map).map(([k, l]) => `<label class="toggle"><input type="checkbox" name="${prefix}${k}" value="true"> ${esc(l)}</label>`).join('');
$('#formats').innerHTML = toggles('dmm_format_', FORMATS);
$('#avail').innerHTML = toggles('dmm_avail_', AVAIL);

const d0 = Drafts.read(DRAFT);
if (d0) { Drafts.fill(form, d0); $('#draftNote').innerHTML = draftBanner(d0); }
Drafts.bind(form, () => DRAFT);
$('#draftNote').addEventListener('click', e => { if (e.target.closest('[data-discard]')) { Drafts.clear(DRAFT); form.reset(); $('#draftNote').innerHTML = ''; } });

form.addEventListener('submit', async e => {
  e.preventDefault();
  const name = form.elements.dmm_name, email = form.elements.dmm_email, msg = $('#dmmMsg'), btn = $('#dmmSubmit');
  if (!name.value.trim()) { msg.textContent = 'Please add your name.'; return name.focus(); }
  if (email.value && !email.checkValidity()) { msg.textContent = 'That email doesn’t look right.'; return email.focus(); }
  const data = { _section: 'dmm' };
  for (const [k, v] of new FormData(form)) if (v !== '') data[k] = v;
  btn.disabled = true; msg.textContent = 'Sending…';
  try {
    let r = await api(null, data);
    if (r.status === 'locked') {
      msg.textContent = '🔒 The intake form needs its access code.';
      const open = await unlockPrompt('🌙 The DMM intake form is locked. Enter its access code to send your response.');
      if (!open.includes('dmm')) throw new Error('This form needs its access code');
      r = await api(null, data);
    }
    if (r.status !== 'success') throw new Error(r.message);
    Drafts.clear(DRAFT);
    form.hidden = true; $('#draftNote').innerHTML = '';
    const t = $('#thanks');
    t.innerHTML = `<h2>Thank you, ${esc(name.value.trim().split(' ')[0])} ✦</h2><p>Your voice is in the circle. An organizer will reach out
      ${data.dmm_facilitate_topics ? 'about holding space' : 'when the next gathering is set'}.</p>
      <button class="btn ghost" id="again">Submit another response</button>`;
    t.hidden = false; t.focus();
  } catch (err) { msg.textContent = '⚠ Could not send: ' + err.message; }
  finally { btn.disabled = false; }
});
$('#thanks').addEventListener('click', e => { if (e.target.id === 'again') { form.reset(); form.hidden = false; $('#thanks').hidden = true; $('#dmmMsg').textContent = ''; } });

/* ── organizer dashboard: shared follow-up board ── */
const yes = v => !!v && v !== 'false';
const count = (rows, key) => rows.filter(r => yes(r[key])).length;
const STATUSES = ['New', 'Contacted', 'Scheduled', 'Done'];
const COL = { assigned_to: 'assigned_to', followup_status: 'follow_up_status', organizer_notes: 'organizer_notes' };   // field key → row key
let orgs = [], F = 'all';
const statusOf = r => r.follow_up_status || 'New';
const who = email => orgs.find(o => o.email === email)?.name || email;
const FILTERS = {
  all: ['All', () => true], unassigned: ['Unassigned', r => !r.assigned_to], mine: ['Assigned to me', r => r.assigned_to === Core.user?.email],
  ...Object.fromEntries(STATUSES.map(s => [s, [s, r => statusOf(r) === s]])),
};

async function loadDash() {
  $('#dash').innerHTML = '<p class="muted">Loading…</p>';
  try {
    const [d, o] = await Promise.all([api({ action: 'data', sections: 'dmm' }), api({ action: 'organizers' })]);
    if (d.status !== 'ok' || !d.sections.dmm) throw new Error(d.user ? 'Your role can’t view responses' : 'Please sign in from the guide first');
    rowsCache = d.sections.dmm.slice().reverse(); metaCache = d.meta.dmm; orgs = o.organizers || [];
    $('#dmmStamp').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    renderDash(rowsCache);
  } catch (err) { $('#dash').innerHTML = `<p class="empty">⚠ ${esc(err.message)}</p>`; }
}

function renderDash(rows) {
  const facil = rows.filter(r => r.facilitate_topics), sig = rows.filter(r => r.signal_interest === 'Yes').length;
  const top = (prefix, map) => Object.values(map).map(l => ({ label: l, value: count(rows, prefix + snake(l)) })).sort((a, b) => b.value - a.value);
  const pct = n => rows.length ? ` · ${Math.round(n / rows.length * 100)}%` : '';
  const shown = rows.filter(FILTERS[F][1]), list = (r, keyMap, prefix) => Object.values(keyMap).filter(l => yes(r[prefix + snake(l)])).join(', ');
  const opt = (v, cur, label = v) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  $('#dash').innerHTML = `
    <section class="panel wide"><div class="tiles kpi">
      <div class="tile"><b>${rows.length}</b><span>Responses</span></div>
      <div class="tile"><b>${rows.filter(FILTERS.unassigned[1]).length}</b><span>Unassigned</span></div>
      <div class="tile"><b>${facil.length}</b><span>Want to facilitate${pct(facil.length)}</span></div>
      <div class="tile"><b>${sig}</b><span>Join Signal${pct(sig)}</span></div></div></section>
    <section class="panel wide"><h2>Follow-up board</h2>
      <div class="chips sm">${Object.entries(FILTERS).map(([k, [l, fn]]) => `<button class="chip" data-f="${k}" aria-pressed="${k === F}">${l}<small>${rows.filter(fn).length}</small></button>`).join('')}</div>
      ${shown.length ? `<div class="board">${shown.map(r => { const i = rowsCache.indexOf(r); return `<article class="resp s-${snake(statusOf(r))}">
        <details><summary><b>${esc(r.name || '—')}</b><span class="muted">${esc((r.submitted_at || '').slice(0, 10))} · ${esc(list(r, FORMATS, 'format_') || 'no formats')}</span></summary>
          <dl>${[['Email', r.email], ['Phone', r.phone], ['Signal', r.signal_handle], ['Topics', r.discussion_topics], ['When', list(r, AVAIL, 'availability_')],
            ['Could facilitate', [r.facilitate_topics, r.facilitate_length].filter(Boolean).join(' · ')], ['Notes for us', r.facilitate_notes],
            ['Suggestions', r.general_suggestions], ['Heard via', r.referral], ['Signal group', r.signal_interest]].filter(([, v]) => v)
            .map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
          <label>Organizer notes <textarea data-note="${i}" rows="2">${esc(r.organizer_notes || '')}</textarea></label>
          <button class="btn ghost sm" data-savenote="${i}">Save note</button></details>
        <div class="resp-ctl">
          <select data-assign="${i}" aria-label="Assign ${esc(r.name || '')}">${opt('', r.assigned_to || '', 'Unassigned')}${orgs.map(o => opt(o.email, r.assigned_to, o.email === Core.user?.email ? `${o.name} (me)` : o.name)).join('')}
            ${r.assigned_to && !orgs.some(o => o.email === r.assigned_to) ? opt(r.assigned_to, r.assigned_to) : ''}</select>
          <select data-status="${i}" aria-label="Follow-up status">${STATUSES.map(s => opt(s, statusOf(r))).join('')}</select>
          ${!r.assigned_to && Core.user ? `<button class="btn ghost sm" data-claim="${i}">Take it</button>` : ''}</div></article>`; }).join('')}</div>`
      : '<p class="muted">Nothing here.</p>'}</section>
    <section class="panel"><h2>Formats people want</h2>${bars(top('format_', FORMATS), v => v)}</section>
    <section class="panel"><h2>Availability</h2>${bars(top('availability_', AVAIL), v => v)}</section>
    <section class="panel wide"><h2>Ready to hold space</h2>${facil.length ? `<table class="tbl"><thead><tr><th>Name</th><th>Topics</th><th>Length</th><th>Organizer</th></tr></thead>
      <tbody>${facil.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.facilitate_topics)}</td><td>${esc(r.facilitate_length || '')}</td>
      <td>${esc(r.assigned_to ? who(r.assigned_to) : '—')}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No facilitators yet.</p>'}</section>`;
}

/** Saves organizer fields for one response; optimistic, re-syncs on failure. */
async function save(i, values, okMsg, rerender = true) {
  const r = rowsCache[i];
  const res = await api(null, { _action: 'update', section: 'dmm', tab: 'main', row: r._row, expect: r.name ?? '', values }).catch(e => ({ message: e.message }));
  if (res.status !== 'ok') { toast('⚠ ' + res.message, 'bad'); return loadDash(); }
  Object.entries(values).forEach(([k, v]) => { r[COL[k]] = v; });
  toast(okMsg);
  if (rerender) renderDash(rowsCache);
}

$('#dash').addEventListener('change', e => {
  const t = e.target, d = t.dataset;
  if (d.assign) save(+d.assign, { assigned_to: t.value }, t.value ? `Assigned to ${who(t.value)}${t.value !== Core.user?.email ? ' — they’ve been emailed' : ''}` : 'Unassigned');
  if (d.status) save(+d.status, { followup_status: t.value }, `Marked ${t.value}`);
});
$('#dash').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.f) { F = b.dataset.f; renderDash(rowsCache); }
  if (b.dataset.claim) save(+b.dataset.claim, { assigned_to: Core.user.email }, 'It’s yours ✦');
  if (b.dataset.savenote) save(+b.dataset.savenote, { organizer_notes: $(`[data-note="${b.dataset.savenote}"]`).value }, 'Note saved', false);
});

function showTab(tab) {
  $$('#dmmTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
  $$('.view').forEach(v => v.classList.toggle('on', v.id === tab));
  if (tab === 'responses' && !rowsCache.length) loadDash();
}

if (Core.lvl >= 2) $('#dmmTabs').hidden = false;
$('#dmmTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });
$('#dmmRefresh').addEventListener('click', loadDash);
$('#dmmCsv').addEventListener('click', () => metaCache &&
  downloadCSV(`dmm-responses-${iso(new Date())}.csv`, [{ k: 'submitted_at', h: 'Submitted At' }, ...metaCache.fields.map(f => ({ k: snake(f.h), h: f.h }))],
    rowsCache.filter(FILTERS[F][1])));
