/* Interactions de la page : filtres, fiches, coups de cœur, formulaire de contact. */
const data = JSON.parse(document.getElementById('site-data').textContent);
const LOTS = new Map(data.lots.map((l) => [l.id, l]));
const ARTISTS = new Map(data.artists.map((a) => [a.id, a]));
const CATS = new Map(data.categories.map((c) => [c.id, c.label]));

const HEART = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6Z"/></svg>';
const X = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
};

/* ---------- État (mémorisé dans le navigateur du visiteur) ---------- */
const liked = new Set(store.get('vsj_likes', []).filter((id) => LOTS.has(id)));
let contact = store.get('vsj_contact', null);
let visitorId = store.get('vsj_vid', '');
if (!visitorId) { visitorId = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)); store.set('vsj_vid', visitorId); }
let filter = { cat: 'all', fav: false, artist: null };
let pendingLot = null, openLotId = null, lastFocus = null;

const artistName = (l) => (ARTISTS.get(l.artist) || {}).name || '';

/* ---------- Envoi au serveur ---------- */
async function send(action, lotId, who) {
  const res = await fetch('/api/like', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action, lotId, visitorId,
      prenom: who.prenom, nom: who.nom, email: who.email,
      consent: true, consentAt: who.consentAt,
      website: $('#website').value,
    }),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
}

/* ---------- Synchronisation de l'interface ---------- */
function toast(text, bad) {
  const el = $('#toast');
  el.textContent = text; el.classList.toggle('bad', !!bad); el.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), bad ? 5000 : 2600);
}
function applyFilter() {
  let shown = 0;
  $$('#grid .card').forEach((c) => {
    const ok = filter.fav ? liked.has(c.dataset.id)
      : filter.artist ? c.dataset.artist === filter.artist
      : filter.cat === 'all' || c.dataset.cat === filter.cat;
    c.hidden = !ok; if (ok) shown++;
  });
  const empty = $('#empty');
  empty.hidden = shown > 0;
  empty.textContent = filter.fav ? "Aucun coup de cœur pour l'instant. Touchez le cœur d'une œuvre pour la présélectionner." : 'Aucune œuvre dans cette catégorie.';
  $$('#filters [data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(!filter.fav && !filter.artist && b.dataset.cat === filter.cat)));
  $('#filters [data-fav]').setAttribute('aria-pressed', String(filter.fav));
  const chip = $('#artistChip');
  chip.hidden = !filter.artist;
  if (filter.artist) $('span', chip).textContent = ARTISTS.get(filter.artist).name;
}
function syncLikes() {
  $$('#grid [data-like]').forEach((b) => {
    const on = liked.has(b.dataset.like);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', (on ? 'Retirer de' : 'Ajouter à') + ' mes coups de cœur : ' + b.dataset.title);
    $('span', b).textContent = on ? 'Dans ma sélection' : 'Coup de cœur';
  });
  $('#favCount').textContent = liked.size;
  const count = $('#selCount');
  if (count.textContent !== String(liked.size)) { count.textContent = liked.size; count.classList.remove('bump'); void count.offsetWidth; count.classList.add('bump'); }
  const items = [...liked].map((id) => LOTS.get(id));
  $('#selList').innerHTML = items.length
    ? items.map((l) => '<li><img src="' + esc(l.image) + '" alt=""><div><b>' + esc(l.title) + '</b>Lot ' + l.lot + ' · ' + esc(artistName(l)) + '</div><button data-like="' + esc(l.id) + '" aria-label="Retirer ' + esc(l.title) + ' de ma sélection">' + X + '</button></li>').join('')
    : '<li style="border:0;color:var(--muted)">Votre sélection est vide. Touchez le cœur d\'une œuvre pour la retrouver ici.</li>';
  $('#selFoot').textContent = contact && items.length ? "Nous vous écrirons à " + contact.email + " avant l'ouverture des enchères." : '';
  $('#selShare').hidden = !items.length;
  if (items.length) {
    const text = selectionText(items);
    const subject = 'Ma sélection · Vente solidaire Jadara';
    $('#actMail').href = 'mailto:' + (contact ? encodeURIComponent(contact.email) : '') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
    $('#actWa').href = 'https://wa.me/?text=' + encodeURIComponent(text);
  }
  if (filter.fav) applyFilter();
  renderLotModal();
  store.set('vsj_likes', [...liked]);
}

/* ---------- Partage et export de la sélection ---------- */
function selectionText(items) {
  return ['Ma sélection · Vente solidaire Jadara · Agile en Med 2026', data.dateLabel || '', '']
    .concat(items.map((l) => '• Lot ' + l.lot + ' · ' + l.title + ' — ' + artistName(l)))
    .concat(['', 'Voir les œuvres : ' + data.siteUrl]).join('\n');
}
function selectionItems() { return [...liked].map((id) => LOTS.get(id)); }
$('#actCopy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(selectionText(selectionItems())); toast('Liste copiée'); }
  catch { toast('Copie impossible sur ce navigateur.', true); }
});
$('#actCsv').addEventListener('click', () => {
  const cell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const rows = [['Lot', 'Titre', 'Artiste', 'Catégorie', 'Technique', 'Prix']]
    .concat(selectionItems().map((l) => [l.lot, l.title, artistName(l), CATS.get(l.category) || '', l.tech, l.price || '']));
  // BOM + point-virgule : Excel en français ouvre le fichier directement.
  const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'ma-selection-jadara.csv' });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Fichier téléchargé');
});

/* ---------- Coups de cœur ---------- */
async function toggleLike(id) {
  if (!LOTS.has(id)) return;
  if (!liked.has(id) && !contact) { pendingLot = id; openLead(); return; }
  const adding = !liked.has(id);
  // Affichage immédiat, annulé si le serveur n'a pas enregistré.
  if (adding) liked.add(id); else liked.delete(id);
  syncLikes();
  try {
    await send(adding ? 'like' : 'unlike', id, contact);
    toast(adding ? 'Ajouté à votre sélection' : 'Retiré de votre sélection');
  } catch {
    if (adding) liked.delete(id); else liked.add(id);
    syncLikes();
    toast("Envoi impossible. Vérifiez votre connexion et réessayez.", true);
  }
}

/* ---------- Modales ---------- */
function openScrim(el, focusEl) {
  if (!$('.scrim.open')) lastFocus = document.activeElement;
  $$('.scrim.open').forEach((s) => { s.classList.remove('open'); s.setAttribute('aria-hidden', 'true'); });
  el.classList.add('open'); el.setAttribute('aria-hidden', 'false');
  (focusEl || $('.x', el)).focus();
}
function closeScrims() {
  $$('.scrim.open').forEach((el) => { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); });
  pendingLot = null; openLotId = null;
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
}
function openLead() {
  const l = LOTS.get(pendingLot);
  $('#chosen').innerHTML = '<img src="' + esc(l.image) + '" alt=""><div><b style="font-weight:500">' + esc(l.title) + '</b><br>Lot ' + l.lot + ' · ' + esc(artistName(l)) + '</div>';
  $('#formView').hidden = false; $('#okView').hidden = true; $('#formErr').hidden = true;
  openScrim($('#leadScrim'), $('#prenom'));
}
function renderLotModal() {
  if (!openLotId) return;
  const l = LOTS.get(openLotId), a = ARTISTS.get(l.artist) || {}, on = liked.has(l.id);
  const hadFocus = $('#lotModal').contains(document.activeElement);
  $('#lotModal').innerHTML = '<button class="x" data-close aria-label="Fermer">' + X + '</button>' +
    '<div class="pic"><img src="' + esc(l.image) + '" alt="' + esc(l.title + ', ' + (a.name || '')) + '"></div>' +
    '<div><div style="color:var(--muted);font-size:15px">Lot ' + l.lot + ' · ' + esc(CATS.get(l.category) || '') + '</div>' +
    '<h2 id="lotTitle"' + (l.rtl ? ' dir="rtl" lang="ar"' : '') + ' style="margin-top:6px">' + esc(l.title) + '</h2>' +
    '<p style="font-size:19px;font-weight:500">' + esc(a.name) + (a.role ? ' <span style="color:var(--muted);font-weight:400">· ' + esc(a.role) + '</span>' : '') + '</p>' +
    '<p class="sub" style="margin-top:6px">' + esc(l.tech) + (l.price ? '<br>' + esc(l.price) : '') + '</p>' +
    '<p style="font-size:16px;color:var(--muted)">' + esc(a.bio) + '</p>' +
    '<button class="pill ' + (on ? 'light' : 'dark') + '" data-like="' + esc(l.id) + '" aria-pressed="' + on + '" style="margin-top:24px">' + HEART + (on ? 'Dans ma sélection' : 'Coup de cœur') + '</button></div>';
  if (hadFocus) $('#lotModal [data-like]').focus();
}

$('#leadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = { prenom: $('#prenom').value.trim(), nom: $('#nom').value.trim(), email: $('#email').value.trim() };
  const bad = [
    ['#f-prenom', !v.prenom], ['#f-nom', !v.nom],
    ['#f-email', !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)], ['#f-consent', !$('#consent').checked],
  ].filter(([id, b]) => { $(id).classList.toggle('err', b); return b; });
  if (bad.length) { $('input', $(bad[0][0])).focus(); return; }

  const btn = $('#leadForm button[type=submit]'), label = btn.textContent, id = pendingLot;
  btn.disabled = true; btn.textContent = 'Envoi…'; $('#formErr').hidden = true;
  v.consentAt = new Date().toISOString();
  try {
    await send('like', id, v);
    contact = v; store.set('vsj_contact', contact);
    liked.add(id); pendingLot = null;
    $('#okName').textContent = v.prenom;
    $('#formView').hidden = true; $('#okView').hidden = false;
    $('#okView button').focus();
    syncLikes();
  } catch {
    const err = $('#formErr');
    err.textContent = "Nous n'avons pas pu enregistrer vos coordonnées. Vérifiez votre connexion et réessayez.";
    err.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
});

/* ---------- Tiroir « Ma sélection » ---------- */
function setDrawer(open) {
  $('#drawer').classList.toggle('open', open);
  $('#openSel').setAttribute('aria-expanded', String(open));
  if (open) $('#closeSel').focus();
}
$('#openSel').addEventListener('click', () => setDrawer(!$('#drawer').classList.contains('open')));
$('#closeSel').addEventListener('click', () => { setDrawer(false); $('#openSel').focus(); });

/* ---------- Événements ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-like],[data-open],[data-close],[data-cat],[data-fav],[data-clear],[data-artist]');
  if (!t) return;
  if (t.dataset.like) return void toggleLike(t.dataset.like);
  if (t.dataset.open) { openLotId = t.dataset.open; renderLotModal(); return openScrim($('#lotScrim')); }
  if ('close' in t.dataset) return closeScrims();
  if (t.dataset.cat) filter = { cat: t.dataset.cat, fav: false, artist: null };
  else if ('fav' in t.dataset) filter = { cat: 'all', fav: !filter.fav, artist: null };
  else if ('clear' in t.dataset) filter = { cat: 'all', fav: false, artist: null };
  else if (t.dataset.artist) { filter = { cat: 'all', fav: false, artist: t.dataset.artist }; $('#oeuvres').scrollIntoView(); }
  applyFilter();
});
$$('.scrim').forEach((s) => s.addEventListener('mousedown', (e) => { if (e.target === s) closeScrims(); }));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if ($('.scrim.open')) closeScrims();
    else if ($('#drawer').classList.contains('open')) { setDrawer(false); $('#openSel').focus(); }
  }
  if (e.key === 'Tab') {
    const m = $('.scrim.open .modal'); if (!m) return;
    const f = $$('button,input,a[href]', m).filter((x) => x.offsetParent !== null && x.tabIndex >= 0);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

/* ---------- Barre flottante : compte à rebours + progression ---------- */
{
  const [y, m, d] = data.eventDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const UNITS = { d: ['jour', 'jours'], h: ['heure', 'heures'], m: ['minute', 'minutes'], s: ['seconde', 'secondes'] };
  const tick = () => {
    const ms = target - Date.now();
    const days = Math.ceil(ms / 864e5);
    const label = days > 0 ? 'J-' + days : days === 0 ? "C'est aujourd'hui" : 'Vente terminée';
    $('#countdown').textContent = label;
    $$('[data-countdown]').forEach((el) => {
      if (ms <= 0) { el.className = 'cdown done'; el.textContent = label; return; }
      const v = { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 };
      for (const k in v) {
        $('[data-u=' + k + ']', el).textContent = k === 'd' ? v[k] : String(v[k]).padStart(2, '0');
        $('[data-l=' + k + ']', el).textContent = UNITS[k][v[k] > 1 ? 1 : 0];
      }
      el.setAttribute('aria-label', v.d + ' jours, ' + v.h + ' heures et ' + v.m + ' minutes avant la vente');
    });
  };
  tick(); setInterval(tick, 1000);
  const upd = () => { const h = document.documentElement; $('#pct').textContent = Math.round(h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight) * 100) + '%'; };
  addEventListener('scroll', upd, { passive: true }); upd();
}

/* ---------- Liste des artistes : les premiers, puis « Voir les autres » ---------- */
{
  const btn = $('#artistsMore');
  if (btn) btn.addEventListener('click', () => {
    const open = $('#alist').classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.textContent = open ? 'Réduire la liste' : 'Voir les ' + btn.dataset.n + ' autres artistes';
  });
}

/* ---------- Apparition au défilement ---------- */
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.15 });
  $$('.reveal').forEach((el) => io.observe(el));
} else $$('.reveal').forEach((el) => el.classList.add('in'));

syncLikes();
applyFilter();

/* ---------- Fenêtre d'accueil : une seule fois, et pas pour un visiteur déjà engagé ---------- */
{
  const welcome = $('#welcomeScrim');
  if (welcome && !store.get('vsj_welcome', false) && !contact && liked.size === 0) {
    setTimeout(() => {
      // On n'interrompt pas quelqu'un qui a déjà ouvert une fiche ou le formulaire.
      if ($('.scrim.open') || $('#drawer').classList.contains('open')) return;
      store.set('vsj_welcome', true);
      openScrim(welcome, $('a.pill', welcome));
    }, 2500);
  }
}
