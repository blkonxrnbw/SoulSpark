'use strict';
/* SoulSpark core — shared by app.js (guide), directory.js (public directory) and dmm.js (DMM page). No dependencies. */

// THE Web App URL. After script edits, redeploy as a NEW VERSION of this deployment so it never changes.
const DEFAULT_API = 'https://script.google.com/macros/s/AKfycbwMhGa8xb4L-UVNt8oETitxHZvYvXFyeV1K-VuD5AMu1kLqnUPpxMr_vCR8zkS-gVcxKg/exec';
const RETIRED_API = /AKfycbzg5yEU|AKfycbwJRmpe/;
/** Only an Apps Script /exec URL is accepted — a link like ?sheet=https://evil.example can't capture sign-ins. */
const validApi = u => /^https:\/\/script\.google\.com\/macros\/s\/[\w-]{20,}\/exec$/.test(String(u || '').trim()) && !RETIRED_API.test(u);
const LEVEL = { member: 1, editor: 2, admin: 3 };

/* ── helpers ── */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const snake = h => String(h).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const split = v => String(v || '').split(/[,;|/·]+/).map(s => s.trim()).filter(Boolean);
const cap = s => s && s[0].toUpperCase() + s.slice(1).toLowerCase();
const money = n => (n < 0 ? '−$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
const num = v => parseFloat(String(v ?? '').replace(/[^0-9.-]/g, '')) || 0;
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** 'YYYY-MM-DD…' or any Date.parse-able text → local midnight Date (or null). */
const day = s => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''), t = m ? new Date(+m[1], m[2] - 1, +m[3]) : new Date(Date.parse(s));
  return isNaN(t) ? null : new Date(t.getFullYear(), t.getMonth(), t.getDate());
};
const ago = ts => {
  const s = (ts - Date.now()) / 1000, rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [u, n] of [['day', 86400], ['hour', 3600], ['minute', 60]]) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
  return 'just now';
};
const store = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: k => { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch {} },
};

/* ── session: token lives in localStorage ("keep me signed in") or sessionStorage ── */
const Core = {
  api: [new URLSearchParams(location.search).get('sheet'), store.get('ss_api', '')].find(validApi) || DEFAULT_API,
  token: (() => { try { return localStorage.getItem('ss_token') || sessionStorage.getItem('ss_token') || ''; } catch { return ''; } })(),
  user: store.get('ss_user', null),
  get lvl() { return this.token && this.user ? LEVEL[this.user.role] || 0 : 0; },
};

/* ── Section codes: each section opens with its own code (default 0000). Sent with every request. ── */
const Codes = {
  _get(st) { try { return JSON.parse(st.getItem('ss_codes') || '{}') || {}; } catch { return {}; } },
  _put(st, o) { try { Object.keys(o).length ? st.setItem('ss_codes', JSON.stringify(o)) : st.removeItem('ss_codes'); } catch {} },
  all() { return { ...this._get(localStorage), ...this._get(sessionStorage) }; },
  set(secs, code, remember) {
    const st = remember ? localStorage : sessionStorage, o = this._get(st);
    secs.forEach(s => { o[s] = code; }); this._put(st, o);
  },
  drop(secs) { [localStorage, sessionStorage].forEach(st => { const o = this._get(st); secs.forEach(s => delete o[s]); this._put(st, o); }); },
  clear() { this.drop(Object.keys(this.all())); },
};

async function api(params, body) {
  const codes = Codes.all(), has = Object.keys(codes).length > 0;
  const url = Core.api + (body ? '' : '?' + new URLSearchParams({ ...params, ...(Core.token && { key: Core.token }), ...(has && { codes: JSON.stringify(codes) }) }));
  const res = await fetch(url, body ? { method: 'POST', body: JSON.stringify({ ...body, ...(Core.token && { key: Core.token }), ...(has && { _codes: codes }) }) } : {});
  return res.json();   // text/plain POST → no CORS preflight against Apps Script
}

const Auth = {
  async enter(action, fields, remember) {
    const r = await api(null, { _action: action, ...fields });
    if (r.status !== 'ok') throw new Error(r.message);
    try { (remember ? localStorage : sessionStorage).setItem('ss_token', r.token); } catch {}
    Core.token = r.token; Auth.setUser(r.user);
    return r.user;
  },
  setUser(u) { Core.user = u; store.set('ss_user', u); },
  clear() { store.del('ss_token'); store.del('ss_user'); Core.token = ''; Core.user = null; },
};

/* ── UI primitives ── */
function toast(msg, kind = 'ok') {
  const box = $('#toasts') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'toasts', className: 'toasts' }));
  box.setAttribute('aria-live', 'polite');
  const t = box.appendChild(Object.assign(document.createElement('div'), { className: 'toast ' + kind, textContent: msg }));
  setTimeout(() => t.remove(), 3800);
}

/** Promise-based confirm using <dialog id="confirm">. */
function ask(msg, ok = 'Confirm') {
  const d = $('#confirm');
  $('#confirmMsg').textContent = msg; $('#confirmOk').textContent = ok;
  d.returnValue = ''; d.showModal();
  return new Promise(res => d.addEventListener('close', () => res(d.returnValue === 'yes'), { once: true }));
}

/** Asks for an access code; resolves to the sections it opened ([] if cancelled). */
function unlockPrompt(hint = '') {
  let d = $('#codeDlg');
  if (!d) {
    d = Object.assign(document.createElement('dialog'), { id: 'codeDlg', className: 'narrow' });
    d.innerHTML = `<form class="stack"><h2>🔑 Enter access code</h2><p class="muted" id="codeHint"></p>
      <label>Access code <input id="codeIn" inputmode="numeric" autocomplete="one-time-code" maxlength="40" required></label>
      <label class="chk"><input type="checkbox" id="codeRem"> Remember on this device</label>
      <p id="codeMsg" class="muted" role="status"></p>
      <div class="row"><button class="btn" value="ok">Unlock</button><button type="button" class="btn ghost" data-cancel>Cancel</button></div></form>`;
    document.body.append(d);
  }
  $('#codeHint').textContent = hint || 'Each section has its own code. Ask the guide’s organizer if you don’t have it.';
  $('#codeIn').value = ''; $('#codeMsg').textContent = '';
  d.showModal(); $('#codeIn').focus();
  return new Promise(resolve => {
    const form = d.querySelector('form'); let over = false;
    const done = v => { if (over) return; over = true; form.removeEventListener('submit', onSub); d.removeEventListener('click', onClick); d.removeEventListener('close', onClose); if (d.open) d.close(); resolve(v); };
    const onClose = () => done([]);
    const onClick = e => { if (e.target.closest('[data-cancel]')) done([]); };
    const onSub = async e => {
      e.preventDefault();
      const code = $('#codeIn').value.trim(); if (!code) return;
      $('#codeMsg').textContent = 'Checking…';
      try {
        const r = await api({ action: 'unlock', code });
        if (r.status !== 'ok') throw new Error(r.message);
        Codes.set(r.open, code, $('#codeRem').checked);
        done(r.open);
      } catch (err) { $('#codeMsg').textContent = '⚠ ' + err.message; }
    };
    form.addEventListener('submit', onSub); d.addEventListener('click', onClick); d.addEventListener('close', onClose);
  });
}

/** Horizontal bar list. items: [{label, value, note?}] — signed values render left of a shared zero line. */
function bars(items, fmt = v => v) {
  const max = Math.max(1, ...items.map(i => Math.abs(i.value))), neg = items.some(i => i.value < 0);
  return `<ul class="bars${neg ? ' signed' : ''}">${items.map(i => `<li title="${esc(i.label)}: ${esc(fmt(i.value))}${i.note ? ' · ' + esc(i.note) : ''}">
    <span class="bl">${esc(i.label)}</span><span class="bt"><i class="${i.value < 0 ? 'neg' : ''}" style="--w:${(Math.abs(i.value) / max * 100).toFixed(1)}%"></i></span>
    <span class="bv">${esc(fmt(i.value))}</span></li>`).join('')}</ul>`;
}

/* ── CSV export ── */
function downloadCSV(name, cols, rowsArr) {
  const q = v => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v;   // spreadsheet apps won't run it as a formula
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const text = [cols.map(c => q(c.h)), ...rowsArr.map(r => cols.map(c => q(r[c.k])))].map(r => r.join(',')).join('\r\n');
  download(name, '﻿' + text, 'text/csv');
}
function download(name, text, type) {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ── Drafts: per-form autosave in this browser only ── */
const Drafts = {
  read: k => store.get('ss_draft_' + k, null),
  clear: k => store.del('ss_draft_' + k),
  save(k, form) {
    const v = {};
    for (const el of form.elements) {
      if (!el.name || el.name[0] === '_' || el.type === 'file') continue;
      if (el.type === 'radio') { if (el.checked) v[el.name] = el.value; }
      else if (el.type === 'checkbox') { if (el.checked) el.value === 'true' ? (v[el.name] = true) : (v[el.name] ||= []).push(el.value); }
      else if (el.value) v[el.name] = el.value;
    }
    Object.keys(v).length ? store.set('ss_draft_' + k, { v, at: Date.now() }) : Drafts.clear(k);
  },
  fill(form, d) {
    for (const [k, val] of Object.entries(d.v)) {
      const el = form.elements[k];
      if (Array.isArray(val)) $$(`[name="${k}"]`, form).forEach(b => { b.checked = val.includes(b.value); });
      else if (el instanceof RadioNodeList) el.value = val;
      else if (el) el.type === 'checkbox' ? (el.checked = true) : (el.value = val);
    }
  },
  /** Autosave on input; returns the restored draft (if any) so callers can show a banner. */
  bind(form, keyFn, enabled = () => true) {
    let t;
    form.addEventListener('input', () => { if (enabled()) { clearTimeout(t); t = setTimeout(() => Drafts.save(keyFn(), form), 500); } });
  },
};

const draftBanner = (d, discardAttr = 'data-discard') =>
  d ? `<p class="banner">✎ Draft restored from ${esc(ago(d.at))} — saved in this browser only. <button type="button" class="link" ${discardAttr}>Discard</button></p>` : '';

/* ═══ SHARED BY THE GUIDE AND THE PUBLIC DIRECTORY ═══ */

/* ═══ ASTRO-SYNC + HUMAN DESIGN SYNERGY ═════════════════════════ */

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const ELEMENTS = ['Fire', 'Earth', 'Air', 'Water'];
const elementOf = sign => { const i = SIGNS.indexOf(cap(sign)); return i < 0 ? '' : ELEMENTS[i % 4]; };
// Rave Mandala gate order, starting at Gate 41 = 2° Aquarius (302° ecliptic). 64 gates × 5.625°.
const GATES = [41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60];
/* SoulSpark convention (editable): which HD types / authorities resonate with each season's element. */
const HD_RESONANCE = {
  Fire:  { types: ['manifestor', 'manifesting generator'], auth: ['splenic', 'ego'] },
  Earth: { types: ['generator', 'manifesting generator'],  auth: ['sacral'] },
  Air:   { types: ['projector'],                            auth: ['self-projected', 'mental', 'environmental', 'none'] },
  Water: { types: ['reflector'],                            auth: ['emotional', 'solar plexus', 'lunar'] },
};

/** Apparent solar longitude (°), accurate to ~0.01° — exact season cusps every year, no hard-coded dates. */
function sunLongitude(date) {
  const n = (date - Date.UTC(2000, 0, 1, 12)) / 864e5, rad = Math.PI / 180;
  const L = 280.46 + 0.9856474 * n, g = (357.528 + 0.9856003 * n) * rad;
  return (((L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360) + 360) % 360;
}

function readSky(date = new Date()) {
  const lon = sunLongitude(date), si = Math.floor(lon / 30);
  const off = (lon - 302 + 360) % 360, gi = Math.floor(off / 5.625);
  return { sign: SIGNS[si], element: ELEMENTS[si % 4], degree: Math.floor(lon % 30),
           gate: GATES[gi], line: Math.floor((off % 5.625) / 0.9375) + 1 };
}

/** Score a practitioner against the current sky. Returns { score, tier, why[] }. */
function synergy(a, sky) {
  const why = [], add = (pts, msg) => { why.push(msg); return pts; };
  const lc = s => String(s || '').toLowerCase(), res = HD_RESONANCE[sky.element];
  let score = 0;
  if (cap(a.sun) === sky.sign) score += add(3, `☉ Sun in ${sky.sign} — their season`);
  else if (elementOf(a.sun) === sky.element) score += add(1, `☉ ${a.sun} shares the ${sky.element} element`);
  if (cap(a.moon) === sky.sign) score += add(1, `☾ Moon in ${sky.sign}`);
  if (cap(a.rising) === sky.sign) score += add(1, `↑ Rising in ${sky.sign}`);
  if (a.hd && res.types.includes(lc(a.hd))) score += add(1, `HD ${a.hd} resonates with ${sky.element} season`);
  if (a.auth && res.auth.some(x => lc(a.auth).includes(x))) score += add(1, `${a.auth} authority resonates with ${sky.element}`);
  if (a.profile && String(a.profile).includes(sky.line)) score += add(1, `Profile ${a.profile} echoes transit line ${sky.line} (Sun Gate ${sky.gate}.${sky.line})`);
  return { score, why, tier: score >= 3 ? 'in-season' : score >= 1 ? 'resonant' : '' };
}

const align = r => ({ hd: r.hd_type || '', auth: r.hd_authority || '', profile: r.hd_profile || '', mbti: (r.mbti || '').toUpperCase(),
                      sun: r.sun_sign || '', moon: r.moon_sign || '', rising: r.rising_sign || '' });
const NO_SYN = { score: 0, why: [], tier: '' };

const initials = s => String(s).split(/\s+/).map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
/** Drive file URL → embeddable thumbnail (files are shared "anyone with link" on upload). */
const thumb = (url, w = 400) => {
  const id = /\/d\/([\w-]{6,})|[?&]id=([\w-]{6,})/.exec(url || '');
  return id ? `https://drive.google.com/thumbnail?id=${id[1] || id[2]}&sz=w${w}` : /^https:\/\//.test(url || '') ? url : '';
};

/* Universal Search: free text matches data-q; `field:value` matches the card's data- attribute. */
const FIELD_ALIAS = { hd: 'hd', type: 'hd', auth: 'auth', authority: 'auth', profile: 'profile', sun: 'sun', moon: 'moon', rising: 'rising',
  asc: 'rising', mbti: 'mbti', mod: 'mod', modality: 'mod', loc: 'loc', role: 'role', element: 'element', sec: 'section', tag: 'tags', path: 'path',
  exp: 'exp', level: 'exp' };

const queryTokens = q => String(q || '').toLowerCase().split(/\s+/).filter(Boolean).map(t => {
  const [f, ...v] = t.split(':');
  return v.length && FIELD_ALIAS[f] ? [FIELD_ALIAS[f], v.join(':')] : [null, t];
});
const cardMatches = (d, toks) => toks.every(([f, v]) => (f ? (d[f] || '').toLowerCase() : d.q || '').includes(v));
