'use strict';
/* SoulSpark public directory — every public section as a tab (like the old binder), read-only.
   Needs core.js (api, section codes, Astro-Sync, Universal Search). Deep link: directory.html#networking */

const sky = readSky();
const D = { meta: {}, rows: {}, locked: new Set(), sec: (location.hash.slice(1) || 'people'), mod: '', list: [], cards: [] };
const href = u => /^https?:\/\//i.test(u || '') ? u : '';
const yes = v => v === '✓' || /^(true|yes)$/i.test(v || '');
const BOOL = /^(Type|Cat|Category|Opp|Format|Seeking|Availability) — (.+)$|^(Serves) (.+)$|^(Indoor|Outdoor)$|^Incl(?:\.|udes) (.+)$/;
const boolLabel = h => { const m = BOOL.exec(h); return m && (m[2] || m[4] || m[5] || m[6]); };
const SKIP = new Set(['status', 'submitted_at', 'tags', 'photo', 'logo']);

/* ── people helpers ── */
const SOCIAL = {
  website: ['🌐', 'Website', v => v], instagram: ['📸', 'Instagram', v => `https://instagram.com/${v.replace(/^@/, '')}`],
  tiktok: ['🎵', 'TikTok', v => `https://tiktok.com/@${v.replace(/^@/, '')}`], facebook: ['📘', 'Facebook', v => v],
  linkedin: ['💼', 'LinkedIn', v => v], youtube: ['▶', 'YouTube', v => v], threads: ['🧵', 'Threads', v => `https://threads.net/@${v.replace(/^@/, '')}`],
  substack: ['✉', 'Substack', v => v], patreon: ['🎨', 'Patreon', v => v], etsy: ['🛍', 'Etsy', v => v], shopify: ['🛒', 'Shop', v => v],
};
const socials = r => Object.entries(SOCIAL).map(([k, [ic, label, mk]]) => {
  const v = String(r[k] || '').trim(), url = v && href(/^https?:\/\//i.test(v) ? v : /^[\w.@-]+$/.test(v) ? mk(v) : '');
  return url ? `<a class="tag link" href="${esc(url)}" target="_blank" rel="noopener">${ic} ${label}</a>` : '';
}).join('');
const SERVES = { serves_local: '📍 Local', serves_regional: '🗺 Regional', serves_national: '🇺🇸 National', serves_international: '🌍 International', serves_online: '💻 Online', serves_inperson: '🤝 In person' };
const ava = (r, cls = 'ava') => `<span class="${cls}" aria-hidden="true">${esc(initials(r.full_name || ''))}${r.photo
  ? `<img src="${esc(thumb(r.photo, 240))}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}</span>`;

/* ── generic helpers (every other section) ── */
const titleOf = r => r[D.meta[r._section]?.title] || r.full_name || '(untitled)';
const fields = s => (D.meta[s]?.fields || []).filter(f => !f.p && !f.s);
const flags = (r, s) => fields(s).filter(f => boolLabel(f.h) && yes(r[snake(f.h)])).map(f => boolLabel(f.h));
const when = v => { const d = day(v); return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : v; };
const subOf = r => r.focus_industry || r.category || r.event_type || r.author_creator || r.intended_audience || r.buyer_manager || '';
const locOf = r => r.location || [r.city, r.state].filter(Boolean).join(', ');
const descOf = r => r.description || r.description_summary || r.idea_description || r.why_this_is_valuable || r.about_bio || r.event_notes || r.additional_notes || '';
const val = v => href(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v.replace(/^https?:\/\/(www\.)?/, ''))}</a>`
  : /^\S+@\S+\.\S+$/.test(v) ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : esc(/^(\w{3} \w{3} \d|\d{4}-\d{2}-\d{2})/.test(v) ? when(v) : v);

/* ── load once: all public sections; locked ones come back empty ── */
async function load() {
  $('#status').hidden = false; $('#status').textContent = 'Loading the community…';
  try {
    const d = await api({ action: 'data' });
    if (d.status !== 'ok') throw new Error(d.message);
    D.meta = d.meta; D.locked = new Set(d.locked || []);
    const stale = (d.locked || []).filter(s => s in Codes.all());
    if (stale.length) { Codes.drop(stale); toast('A section code has changed — please enter the new one', 'bad'); }
    D.rows = Object.fromEntries(Object.entries(d.sections).map(([s, rows]) => [s, rows.filter(r => titleOf(r) !== '(untitled)')
      .map(r => Object.assign(r, s === 'people' ? { _a: align(r), _syn: synergy(align(r), sky) } : {}))]));
    (D.rows.people || []).sort((a, b) => b._syn.score - a._syn.score || a.full_name.localeCompare(b.full_name));
    if (!D.meta[D.sec]) D.sec = D.meta.people ? 'people' : Object.keys(D.meta)[0];
    renderTabs(); renderSection();
  } catch (e) { $('#status').textContent = '⚠ Could not load the directory: ' + e.message; }
}

const order = () => Object.keys(D.meta).sort((a, b) => (b === 'people') - (a === 'people'));
function renderTabs() {
  const n = (D.rows.people || []).filter(r => r._syn.tier === 'in-season').length;
  $('#season').textContent = `☉ ${sky.sign} season · ${sky.element} · HD Sun Gate ${sky.gate}.${sky.line}${n ? ` · ${n} in season` : ''}`;
  $('#secs').innerHTML = order().map(s => `<button type="button" class="chip${D.locked.has(s) ? ' locked' : ''}" data-sec="${s}" aria-pressed="${s === D.sec}">
    ${D.meta[s].icon} ${esc(D.meta[s].label)}<small>${D.locked.has(s) ? '🔒' : (D.rows[s] || []).length}</small></button>`).join('');
}

function renderSection() {
  const s = D.sec, m = D.meta[s], people = s === 'people', locked = D.locked.has(s);
  document.body.dataset.sec = s;
  $('#secHead').innerHTML = `${m.icon} ${esc(m.label)}`;
  $$('.people-only').forEach(el => { el.hidden = !people; });
  $('#lock').hidden = !locked;
  $('#lockName').textContent = m.label;
  D.list = locked ? [] : D.rows[s] || [];
  $('#grid').innerHTML = D.list.map((r, i) => people ? personCard(r, i) : itemCard(r, i, s)).join('');
  D.cards = [...$('#grid').children];
  const counts = {};
  if (people) D.list.forEach(r => split(r.modalities).forEach(x => { counts[x] = (counts[x] || 0) + 1; }));
  $('#mods').innerHTML = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
    .map(([x, c]) => `<button type="button" class="chip" data-mod="${esc(x)}" aria-pressed="${x === D.mod}">${esc(x)}<small>${c}</small></button>`).join('');
  filter();
}

const blob = r => esc(Object.entries(r).filter(([k]) => k[0] !== '_').map(([, v]) => v).join(' ').toLowerCase());
function personCard(r, i) {
  const a = r._a, s = r._syn;
  const data = { section: 'people', name: r.full_name, role: r.role_title || '', mod: r.modalities || '', loc: r.location || '', mbti: a.mbti, hd: a.hd,
                 auth: a.auth, profile: a.profile, sun: a.sun, moon: a.moon, rising: a.rising, element: elementOf(a.sun),
                 exp: r.experience_level || '', path: r.training_path || '', tags: r.tags || '', score: s.score };
  return `<article class="card ${s.tier}" tabindex="0" data-i="${i}" title="${esc(s.why.join(' · '))}"
    ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')} data-q="${blob(r)}">
    <div class="who">${ava(r)}<div><h3>${esc(r.full_name)}</h3>${r.role_title ? `<p class="sub">${esc(r.role_title)}</p>` : ''}</div></div>
    ${r.org_business ? `<p class="loc">${esc(r.org_business)}</p>` : ''}${r.location ? `<p class="loc">📍 ${esc(r.location)}</p>` : ''}
    ${r.about_bio ? `<p class="bio">${esc(r.about_bio)}</p>` : ''}
    <div class="tags">${split(r.modalities).slice(0, 4).map(x => `<span class="tag">${esc(x)}</span>`).join('')}
      ${a.hd ? `<span class="tag${s.why.some(w => w.startsWith('HD')) ? ' hit' : ''}">${esc(a.hd)}</span>` : ''}
      ${a.sun ? `<span class="tag${cap(a.sun) === sky.sign ? ' hit' : ''}">☉ ${esc(a.sun)}</span>` : ''}
      ${Object.entries(SERVES).filter(([k]) => yes(r[k])).map(([, l]) => `<span class="tag own">${l}</span>`).join('')}</div>
  </article>`;
}
function itemCard(r, i, s) {
  const loc = locOf(r), date = r.start_date || r.date_s, sub = subOf(r), desc = descOf(r), link = href(r.website || r.website_instagram || r.url || r.link_access_info);
  return `<article class="card" tabindex="0" data-i="${i}" style="--c:${esc(D.meta[s].color)}" data-section="${s}" data-name="${esc(titleOf(r))}"
    data-loc="${esc(loc)}" data-role="${esc(sub)}" data-mod="${esc(r.modalities_featured || '')}" data-tags="${esc(r.tags || '')}" data-q="${blob(r)}">
    <h3>${esc(titleOf(r))}</h3>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    ${date ? `<p class="loc">📅 ${esc(when(date))}${r.end_date && r.end_date !== date ? ' – ' + esc(when(r.end_date)) : ''}</p>` : ''}
    ${loc ? `<p class="loc">📍 ${esc(loc)}</p>` : ''}${desc ? `<p class="bio">${esc(desc)}</p>` : ''}
    <div class="tags">${flags(r, s).map(x => `<span class="tag">${esc(x)}</span>`).join('')}${split(r.tags).map(t => `<span class="tag own"># ${esc(t)}</span>`).join('')}
      ${link ? `<a class="tag link" href="${esc(link)}" target="_blank" rel="noopener" data-stop>🌐 Visit</a>` : ''}</div>
  </article>`;
}

function filter() {
  const toks = queryTokens($('#q').value), people = D.sec === 'people', lvl = people && $('#level').value, al = people && $('#aligned').checked;
  let n = 0;
  for (const c of D.cards) {
    const d = c.dataset, ok = cardMatches(d, toks) && (!lvl || (d.exp || '').toLowerCase() === lvl) && (!al || +d.score > 0) &&
      (!people || !D.mod || (d.mod || '').toLowerCase().includes(D.mod.toLowerCase()));
    c.hidden = !ok; n += ok;
  }
  $('#count').textContent = D.list.length ? `${n} shown` : '';
  $('#status').hidden = n > 0 || D.locked.has(D.sec);
  if (!n) $('#status').textContent = D.list.length ? 'Nothing matches — try fewer words or Show all.' : 'Nothing listed here yet.';
}

/* ── detail pop-up ── */
function openPerson(r) {
  const a = r._a, s = r._syn, row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
  const meta = [['MBTI', a.mbti], ['Human Design', a.hd], ['HD Authority', a.auth], ['HD Profile', a.profile], ['Enneagram', r.enneagram],
    ['☉ Sun', a.sun], ['☾ Moon', a.moon], ['↑ Rising', a.rising], ['Life Path', r.life_path_number]].filter(([, v]) => v);
  return `<div class="dhead">${ava(r, 'ava lg')}<div><h2>${esc(r.full_name)}</h2>
      ${r.role_title ? `<p class="sub">${esc(r.role_title)}${r.org_business ? ' · ' + esc(r.org_business) : ''}</p>` : ''}</div>
      ${r.logo ? `<img class="logo" src="${esc(thumb(r.logo, 200))}" alt="" onerror="this.remove()">` : ''}</div>
    ${s.why.length ? `<div class="why"><b>Astro-Sync · ${sky.sign} season</b><br>${s.why.map(esc).join('<br>')}</div>` : ''}
    ${r.about_bio ? `<p>${esc(r.about_bio)}</p>` : ''}
    ${split(r.modalities).length ? `<div class="tags">${split(r.modalities).map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}
    ${meta.length ? `<h3 class="dsec">✨ Alignment</h3><div class="metagrid">${meta.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}</div>` : ''}
    <dl>${row('Location', r.location)}${row('Experience', r.experience_level)}${row('Path', [r.years_practicing && `${num(r.years_practicing)} years`, r.training_path].filter(Boolean).join(' · '))}
      ${row('Teachers & lineage', r.teachers_lineage)}${row('Certifications', r.certifications)}${row('Offerings', r.classes_offerings)}
      ${row('Open to collaborate', r.collaboration_notes)}</dl>
    ${r.testimonial ? `<blockquote class="quote">“${esc(r.testimonial)}”</blockquote>` : ''}
    ${socials(r) ? `<div class="tags">${socials(r)}</div>` : ''}`;
}
function openItem(r, s) {
  const m = D.meta[s], fl = flags(r, s);
  const rows = fields(s).filter(f => !boolLabel(f.h) && f.k !== fields(s)[0].k).map(f => [f.h, r[snake(f.h)]])
    .filter(([h, v]) => v && !SKIP.has(snake(h))).map(([h, v]) => `<dt>${esc(h)}</dt><dd>${val(String(v))}</dd>`).join('');
  return `<div class="dhead"><h2>${m.icon} ${esc(titleOf(r))}</h2></div>
    ${fl.length ? `<div class="tags">${fl.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>` : ''}
    <dl>${rows}</dl>${split(r.tags).length ? `<div class="tags">${split(r.tags).map(t => `<span class="tag own"># ${esc(t)}</span>`).join('')}</div>` : ''}`;
}
function open(i) {
  const r = D.list[i]; if (!r) return;
  $('#detailBody').innerHTML = D.sec === 'people' ? openPerson(r) : openItem(r, D.sec);
  $('#detail').showModal();
}

/* ── wiring ── */
function pick(s) { D.sec = s; D.mod = ''; history.replaceState(null, '', '#' + s); renderTabs(); renderSection(); }
async function unlock(s) {
  const opened = await unlockPrompt(`${D.meta[s].icon} ${D.meta[s].label} is locked. Enter its access code.`);
  if (opened.length) { if (!opened.includes(s)) toast('That code opens other sections, not this one', 'bad'); load(); }
}
let t;
$('#q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(filter, 120); });
$('#level').addEventListener('change', filter);
$('#aligned').addEventListener('change', filter);
$('#reset').addEventListener('click', () => { $('#q').value = ''; $('#level').value = ''; $('#aligned').checked = false; D.mod = ''; renderSection(); });
$('#secs').addEventListener('click', e => { const b = e.target.closest('[data-sec]'); if (b) { pick(b.dataset.sec); if (D.locked.has(b.dataset.sec)) unlock(b.dataset.sec); } });
$('#mods').addEventListener('click', e => { const b = e.target.closest('[data-mod]'); if (b) { D.mod = D.mod === b.dataset.mod ? '' : b.dataset.mod; renderSection(); } });
$('#grid').addEventListener('click', e => { if (e.target.closest('[data-stop]')) return; const c = e.target.closest('.card'); if (c) open(+c.dataset.i); });
$('#grid').addEventListener('keydown', e => { const c = e.target.closest('.card'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(+c.dataset.i); } });
$('#detail').addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === $('#detail')) $('#detail').close(); });
$('#unlock').addEventListener('click', () => unlock(D.sec));
addEventListener('hashchange', () => { const s = location.hash.slice(1); if (D.meta[s] && s !== D.sec) pick(s); });
load();
