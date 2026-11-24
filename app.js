(() => {
'use strict';

/* ================= Setup ================= */
const CFG = window.HB_CONFIG || {};
// URL harus berupa origin proyek saja; buang "/rest/v1" atau garis miring di akhir.
const URL_SB = String(CFG.SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const KEY_SB = String(CFG.SUPABASE_ANON_KEY || '').trim();
const READY = URL_SB && KEY_SB && !URL_SB.includes('ISI_') && !KEY_SB.includes('ISI_');
const sb = READY ? window.supabase.createClient(URL_SB, KEY_SB) : null;

const $ = s => document.querySelector(s);
const app = () => $('#app');
const CATS = ['Coto', 'Jajanan', 'Mie', 'Sop Saudara', 'Cafe', 'Seafood', 'Pallubasa'];
const FAS = ['Wi-Fi', 'Parkir', 'Musala', 'AC', 'Toilet', 'Stop kontak'];
const SUA = ['Tenang', 'Ramah mahasiswa', 'Cocok berkelompok', 'Nyaman untuk tugas', 'Buka sampai malam'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ================= Helper ================= */
const e = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const rp = n => 'Rp' + Number(n || 0).toLocaleString('id-ID');
const harga = p => p.harga_min == 0 ? 'Di bawah ' + rp(p.harga_max) : rp(p.harga_min) + '–' + rp(p.harga_max);
const stars = r => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
const tgl = d => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const jam = t => (t || '').slice(0, 5);
const mapsLink = p => safeUrl(p.maps_url) || `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
const go = h => { if (location.hash === h) route(); else location.hash = h; };
const box = (msg, cls = '') => `<div class="box ${cls}" ${cls ? '' : 'style="background:var(--l)"'}>${msg}</div>`;
const hero = (t, p) => `<section class="hero"><h1>${t}</h1><p>${p}</p></section>`;

const favs = () => { try { return JSON.parse(localStorage.getItem('fav') || '[]'); } catch { return []; } };
const setFavs = a => { try { localStorage.setItem('fav', JSON.stringify(a)); } catch {} };

/* ================= Data ================= */
async function loadAll() {
  const [a, b] = await Promise.all([
    sb.from('places').select('*,menus(id,nama,harga)').eq('status', 'tampil').order('created_at', { ascending: false }),
    sb.from('reviews').select('id,place_id,nama,rating,komentar,created_at').eq('status', 'disetujui').order('created_at', { ascending: false })
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  const by = {};
  b.data.forEach(r => (by[r.place_id] ??= []).push(r));
  const places = a.data.map(p => {
    const rs = by[p.id] || [];
    const avg = rs.length ? Math.round(rs.reduce((s, r) => s + r.rating, 0) / rs.length * 10) / 10 : 0;
    return { ...p, rating: avg, n: rs.length, reviews: rs };
  });
  const names = Object.fromEntries(places.map(p => [p.id, p.nama]));
  const reviews = b.data.filter(r => names[r.place_id]).map(r => ({ ...r, pn: names[r.place_id] }));
  return { places, reviews };
}

/* ================= Sesi admin ================= */
let session = null;
async function isAdmin() {
  if (!session) return false;
  const { data, error } = await sb.rpc('is_admin');
  return !error && data === true;
}

/* ================= Layout ================= */
function renderNav(active) {
  const n = { index: 'Beranda', jelajahi: 'Jelajahi', hemat: 'Hemat', favorit: '♥ Favorit', tambah: '+ Tambah Tempat', peta: 'Peta' };
  $('#nav').innerHTML = `<a class="logo" href="#/">📍 Hidden<b>Bite</b></a><div>` +
    Object.entries(n).map(([f, l]) => `<a class="m${active === f ? ' on' : ''}" href="#/${f === 'index' ? '' : f}">${l}</a>`).join('') +
    (session
      ? `<a class="m adm${active === 'admin' ? ' on' : ''}" href="#/admin">⚙ Panel Admin</a>`
      : `<a class="m adm${active === 'login' ? ' on' : ''}" href="#/login">🔒 Login Admin</a>`) + `</div>`;
}
function renderFoot() {
  $('#foot').innerHTML = `Temukan rasa terbaik di sudut Kota Makassar.<br><a href="#/jelajahi">Jelajahi kategori</a> · <a href="#/hemat">Rekomendasi hemat</a> · <a href="#/favorit">Favorit saya</a> · <a href="#/peta">Buka peta</a> · <a href="#/ulasan">Daftar ulasan</a> · <a href="#/tambah">Tambah tempat</a> · <a href="#/login">Admin</a><br>© 2026 HiddenBite. Dibuat untuk mahasiswa Makassar.`;
}

/* ================= Komponen ================= */
function card(p) {
  const img = safeUrl(p.fotos?.[0]) ? `<img src="${e(p.fotos[0])}" alt="" loading="lazy">` : '<div class="ph"></div>';
  return `<div class="card"><button class="fav${favs().includes(p.id) ? ' on' : ''}" data-id="${e(p.id)}" aria-label="Favorit">♥</button>${img}<span class="tag">${harga(p)}</span><div class="cb"><small>${e(p.kategori)}</small><h3>${e(p.nama)}</h3><p>📍 ${e(p.area)}, Makassar</p><div class="cf"><b>★ ${p.rating}</b><a class="btn" href="#/detail/${e(p.id)}">Lihat Detail ›</a></div></div></div>`;
}
const grid = ps => `<div class="grid">${ps.map(card).join('') || '<p>Belum ada tempat yang cocok.</p>'}</div>`;

document.addEventListener('click', ev => {
  const b = ev.target.closest('.fav');
  if (!b) return;
  const id = b.dataset.id;
  let a = favs();
  a = a.includes(id) ? a.filter(x => x !== id) : [...a, id];
  setFavs(a);
  b.classList.toggle('on');
  if ((location.hash || '').startsWith('#/favorit')) route();
});

function reviewForm(pid, places = []) {
  return `<form class="box" id="tulis"><h2>Tulis Ulasan</h2>` +
    (pid ? '' : `<label>Tempat *</label><select name="place_id" required><option value="">Pilih tempat</option>${places.map(p => `<option value="${e(p.id)}">${e(p.nama)}</option>`).join('')}</select>`) +
    `<label>Nama panggilan (opsional)</label><input name="nama" maxlength="60" placeholder="Contoh: Andi"><label>Beri rating *</label><div class="stars">${[5, 4, 3, 2, 1].map(i => `<input type="radio" name="rating" value="${i}" id="s${i}" required><label for="s${i}">★</label>`).join('')}</div><label>Komentar *</label><textarea name="komentar" rows="4" maxlength="1000" required placeholder="Ceritakan rasa, harga, suasana, atau tips..."></textarea><p><button class="btn">Kirim Ulasan ›</button></p><p class="sub" id="rvmsg"></p></form>`;
}
function bindReview(pid) {
  const f = $('#tulis');
  if (!f) return;
  f.onsubmit = async ev => {
    ev.preventDefault();
    const d = new FormData(f), id = pid || d.get('place_id'), msg = $('#rvmsg');
    const komentar = String(d.get('komentar') || '').trim();
    if (!UUID.test(id || '') || !komentar) return;
    const key = 'rv:' + id, today = new Date().toISOString().slice(0, 10);
    try { if (localStorage.getItem(key) === today) return go(`#/detail/${id}?m=2`); } catch {}
    msg.textContent = 'Mengirim…';
    const { error } = await sb.from('reviews').insert({
      place_id: id, nama: String(d.get('nama') || '').trim().slice(0, 60) || 'Anonim',
      rating: Math.max(1, Math.min(5, +d.get('rating') || 1)), komentar, status: 'menunggu'
    });
    if (error) { msg.textContent = 'Gagal mengirim ulasan. Coba lagi.'; return; }
    try { localStorage.setItem(key, today); } catch {}
    go(`#/detail/${id}?m=1`);
  };
}

/* ---------- Form tempat (dipakai Tambah & Edit admin) ---------- */
function placeForm(d = {}, btn = 'Kirim Tempat') {
  const v = k => e(d[k] ?? '');
  const fas = d.fasilitas || [], sua = d.suasana || [];
  const mn = d.menus && d.menus.length ? d.menus : [{ nama: '', harga: '' }];
  const ck = (a, x) => a.includes(x) ? ' checked' : '';
  const fotos = (d.fotos || []).filter(safeUrl);
  return `<form id="pf">
<div class="box"><h2>1. Informasi dasar</h2><div class="two"><div><label>Nama tempat *</label><input name="nama" required maxlength="100" value="${v('nama')}"></div>
<div><label>Kategori *</label><select name="kategori" required><option value="">${CATS.map(c => `<option${d.kategori === c ? ' selected' : ''}>${c}`).join('')}</select></div></div>
<label>Area / kecamatan *</label><input name="area" required maxlength="80" value="${v('area')}"><label>Alamat lengkap *</label><textarea name="alamat" required maxlength="300">${v('alamat')}</textarea>
<div class="two"><div><label>Patokan lokasi *</label><input name="patokan" required maxlength="200" value="${v('patokan')}"></div><div><label>Tautan Google Maps *</label><input name="maps_url" type="url" required maxlength="500" value="${v('maps_url')}"></div></div>
<div class="two"><div><label>Latitude (opsional jika link memuat @lat,lng)</label><input name="lat" value="${v('lat')}"></div><div><label>Longitude</label><input name="lng" value="${v('lng')}"></div></div></div>
<div class="box"><h2>2. Menu &amp; jam buka</h2><div id="ms">${mn.map(m => `<div class="two" style="grid-template-columns:3fr 1fr"><div><label>Nama menu *</label><input name="menu" required maxlength="100" value="${e(m.nama)}"></div><div><label>Harga *</label><input name="harga" type="number" min="1" required value="${e(m.harga)}"></div></div>`).join('')}</div>
<p><a href="#" id="addmenu" style="color:#0f766e;font-weight:600">+ Tambah menu lain</a></p>
<div class="two"><div><label>Jam buka *</label><input type="time" name="buka" required value="${e(jam(d.jam_buka) || '09:00')}"></div><div><label>Jam tutup *</label><input type="time" name="tutup" required value="${e(jam(d.jam_tutup) || '22:00')}"></div></div></div>
<div class="box"><h2>3. Fasilitas &amp; suasana</h2><label>Fasilitas</label>${FAS.map(f => `<span class="pill"><label style="margin:0;display:inline"><input type="checkbox" name="fas" value="${f}"${ck(fas, f)}> ${f}</label></span>`).join('')}
<label>Suasana</label>${SUA.map(f => `<span class="pill"><label style="margin:0;display:inline"><input type="checkbox" name="sua" value="${f}"${ck(sua, f)}> ${f}</label></span>`).join('')}</div>
<div class="box"><h2>4. Cerita &amp; media</h2><label>Deskripsi *</label><textarea name="deskripsi" rows="5" required maxlength="2000">${v('deskripsi')}</textarea>
${fotos.map(u => `<label style="display:inline-block;margin-right:10px"><img src="${e(u)}" width="90" alt=""><br><input type="checkbox" name="hapus" value="${e(u)}"> hapus</label>`).join('')}
<label>Unggah foto (JPG/PNG, maks 5 MB, boleh banyak)</label><input type="file" name="foto" multiple accept=".jpg,.jpeg,.png"><label>Tautan video TikTok/Instagram (opsional)</label><input name="video" type="url" maxlength="300" value="${v('video_url')}"></div>
<div class="box" style="background:var(--d);color:#fff;display:flex;justify-content:space-between;align-items:center"><div><b>Sudah siap?</b><br>Pastikan informasi sudah benar.</div><button class="btn" id="pfbtn">${btn} ›</button></div>
<p class="sub" id="pfmsg"></p></form>`;
}
function bindPlaceForm(onSubmit) {
  const f = $('#pf');
  $('#addmenu').onclick = ev => {
    ev.preventDefault();
    const r = $('#ms').firstElementChild.cloneNode(true);
    r.querySelectorAll('input').forEach(i => { i.value = ''; i.required = false; });
    $('#ms').append(r);
  };
  f.onsubmit = async ev => {
    ev.preventDefault();
    const btn = $('#pfbtn'), msg = $('#pfmsg');
    btn.disabled = true; msg.textContent = 'Menyimpan…';
    try { await onSubmit(readForm(f)); }
    catch (err) { console.error(err); msg.textContent = 'Gagal menyimpan: ' + (err.message || 'coba lagi'); btn.disabled = false; }
  };
}
function readForm(f) {
  const d = new FormData(f), g = k => String(d.get(k) || '').trim();
  const menus = d.getAll('menu').map((n, i) => ({ nama: String(n).trim(), harga: parseInt(d.getAll('harga')[i], 10) || 0 })).filter(m => m.nama && m.harga > 0);
  let lat = null, lng = null;
  const m = g('maps_url').match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) { lat = +m[1]; lng = +m[2]; }
  if (g('lat') !== '' && g('lng') !== '' && !isNaN(+g('lat')) && !isNaN(+g('lng'))) { lat = +g('lat'); lng = +g('lng'); }
  const hs = menus.map(x => x.harga);
  return {
    row: {
      nama: g('nama'), kategori: g('kategori'), area: g('area'), alamat: g('alamat'), patokan: g('patokan'), maps_url: g('maps_url'),
      lat, lng, harga_min: hs.length ? Math.min(...hs) : 0, harga_max: hs.length ? Math.max(...hs) : 0,
      jam_buka: g('buka'), jam_tutup: g('tutup'), suasana: d.getAll('sua'), fasilitas: d.getAll('fas'),
      deskripsi: g('deskripsi'), video_url: safeUrl(g('video')) || null
    },
    menus, files: d.getAll('foto').filter(x => x && x.size), hapus: d.getAll('hapus')
  };
}
async function uploadFotos(files) {
  const urls = [];
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext) || f.size >= 5 * 1048576) continue;
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('fotos').upload(path, f, { contentType: ext === 'png' ? 'image/png' : 'image/jpeg' });
    if (error) throw error;
    urls.push(sb.storage.from('fotos').getPublicUrl(path).data.publicUrl);
  }
  return urls;
}

/* ================= Halaman ================= */
const pages = {};

pages.index = async (seg, q) => {
  const { places, reviews } = await loadAll();
  const qs = (q.get('q') || '').trim(), k = q.get('k') || '', s = q.get('s') || 'rating';
  let ps = places.filter(p => !qs || (p.nama + ' ' + p.kategori + ' ' + p.area).toLowerCase().includes(qs.toLowerCase()));
  if (k === 'murah') ps = ps.filter(p => p.harga_max <= 20000); else if (k) ps = ps.filter(p => p.kategori === k);
  ps.sort(s === 'murah' ? (a, b) => a.harga_max - b.harga_max : (a, b) => b.rating - a.rating);
  const chips = [['Semua', ''], ['Murah — di bawah Rp20.000', 'murah'], ['Cafe', 'Cafe'], ['Coto', 'Coto'], ['Mie', 'Mie'], ['Jajanan', 'Jajanan']];
  app().innerHTML = `<section class="hero"><span class="btn" style="background:#fff;color:#0f766e;border:1px solid #99f6e4">✓ Tanpa perlu buat akun</span>
<h1>Temukan kuliner tersembunyi <em>tanpa ribet</em></h1><p>Dari warung legendaris sampai cafe nyaman untuk kerja tugas, semua pilihan lokal ada di sini.</p>
<form class="search" id="sf"><input name="q" list="sg" autocomplete="off" value="${e(qs)}" placeholder="Cari nama, jenis makanan, atau lokasi..."><button class="btn">Cari</button><datalist id="sg"></datalist></form>
<div class="chips">${chips.map(([l, v]) => `<a class="${k === v ? 'on' : ''}" href="#/?k=${encodeURIComponent(v)}">${l}</a>`).join('')}</div></section>
<div class="wrap"><div style="display:flex;justify-content:space-between;align-items:end;flex-wrap:wrap;gap:12px"><div><h2>Tempat yang layak dicoba</h2><p class="sub">${ps.length} tempat ditemukan di Makassar</p></div>
<div>Urutkan <select id="so" style="width:auto"><option value="rating">Rating tertinggi<option value="murah"${s === 'murah' ? ' selected' : ''}>Harga termurah</select></div></div><br>${grid(ps)}</div>
<div class="wrap" style="background:var(--l);max-width:none"><h2>Cerita mereka</h2><div class="grid">${reviews.slice(0, 3).map(r => `<div class="box"><span class="st">${stars(r.rating)}</span> ${r.rating}.0<p>“${e(r.komentar)}”</p><b>${e(r.nama)}</b><br><small class="sub">mengulas ${e(r.pn)}</small></div>`).join('') || '<p class="sub">Belum ada ulasan.</p>'}</div></div>`;
  const nav = (qq, kk, ss) => go('#/?' + new URLSearchParams({ q: qq, k: kk, s: ss }).toString());
  $('#sf').onsubmit = ev => { ev.preventDefault(); nav($('#sf').elements.q.value.trim(), k, s); };
  $('#so').onchange = () => nav(qs, k, $('#so').value);
  const t = new Trie();
  places.forEach(p => { t.insert(p.nama); (p.menus || []).forEach(m => t.insert(m.nama)); });
  const qi = $('#sf').elements.q;
  qi.oninput = () => { $('#sg').innerHTML = qi.value ? t.suggest(qi.value).map(x => `<option value="${e(x)}">`).join('') : ''; };
};

pages.jelajahi = async (seg, q) => {
  const { places } = await loadAll();
  const k = q.get('k') || '';
  const cnt = {};
  places.forEach(p => cnt[p.kategori] = (cnt[p.kategori] || 0) + 1);
  const ps = k ? places.filter(p => p.kategori === k) : places;
  app().innerHTML = hero('Jelajahi kategori kuliner', 'Mulai dari semangkuk coto hangat sampai cafe nyaman, pilih rasa yang sedang kamu cari.') +
    `<div class="wrap"><div class="grid"><a class="cat ${k ? '' : 'on'}" href="#/jelajahi"><b>Semua</b><br><small>${places.length} tempat</small></a>` +
    Object.keys(cnt).sort().map(c => `<a class="cat ${k === c ? 'on' : ''}" href="#/jelajahi?k=${encodeURIComponent(c)}"><b>${e(c)}</b><br><small>${cnt[c]} tempat</small></a>`).join('') +
    `</div><h2>${k ? e(k) : 'Semua kategori'}</h2><p class="sub">${ps.length} tempat</p>${grid(ps)}</div>`;
};

pages.hemat = async (seg, q) => {
  const { places } = await loadAll();
  const m = q.get('max') === '50000' ? 50000 : 20000;
  const t = new AVL();
  places.forEach(p => t.insert(+p.harga_max, p));
  app().innerHTML = hero('Rekomendasi hemat mahasiswa', 'Pilihan enak dengan harga bersahabat untuk akhir bulan, jam kosong, dan makan bareng teman.') +
    `<div class="wrap"><div class="box" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px"><div><h2>Makan enak sesuai isi dompet</h2><p class="sub">Harga merupakan perkiraan per orang dan dapat berubah di lokasi.</p></div>
<div class="chips"><a class="${m === 20000 ? 'on' : ''}" href="#/hemat?max=20000">Di bawah Rp20.000</a><a class="${m === 50000 ? 'on' : ''}" href="#/hemat?max=50000">Maksimal Rp50.000</a></div></div>${grid(t.range(0, m))}</div>`;
};

pages.favorit = async () => {
  const { places } = await loadAll();
  const f = favs(), ps = places.filter(p => f.includes(p.id));
  app().innerHTML = hero('Favorit saya', 'Simpan rencana kulinermu tanpa login. Daftar ini tersimpan di perangkat ini.') +
    `<div class="wrap"><h2>${ps.length} tempat tersimpan</h2><p class="sub">Tekan ikon hati untuk menghapus tempat dari daftar.</p>${grid(ps)}</div>`;
};

pages.peta = async () => {
  const { places } = await loadAll();
  const all = places.map(p => ({ ...p, hg: harga(p), maps: mapsLink(p) }));
  const cats = [...new Set(all.map(p => p.kategori))];
  app().innerHTML = `<div class="pk"><div id="map"></div><div id="side"><h2 style="margin-top:0">Tempat di sekitar</h2><input id="s" placeholder="Cari tempat di peta..."><div class="chips" style="margin:12px 0"><a href="#" class="on" data-k="">Semua</a>${cats.map(c => `<a href="#" data-k="${e(c)}">${e(c)}</a>`).join('')}</div><p class="sub" id="cnt"></p><div id="list"></div></div></div>`;
  let K = '';
  const m = L.map('map').setView([-5.1477, 119.4327], 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(m);
  const grp = L.layerGroup().addTo(m);
  const render = () => {
    grp.clearLayers();
    const qq = $('#s').value.toLowerCase();
    let n = 0, h = '';
    all.filter(p => (!K || p.kategori === K) && (!qq || (p.nama + p.area + p.kategori).toLowerCase().includes(qq))).forEach(p => {
      n++;
      if (p.lat != null && p.lng != null) L.marker([+p.lat, +p.lng], { title: p.nama }).addTo(grp).bindPopup(`<b>${e(p.nama)}</b><br>★ ${p.rating} · ${e(p.hg)}<br><a href="#/detail/${e(p.id)}">Lihat Detail</a> · <a target="_blank" rel="noopener" href="${e(p.maps)}">Google Maps</a>`);
      h += `<a class="row" href="#/detail/${e(p.id)}"><b>${e(p.nama)}</b><small>${e(p.kategori)} · ${e(p.area)} · ★ ${p.rating} · ${e(p.hg)}</small></a>`;
    });
    $('#list').innerHTML = h; $('#cnt').textContent = n + ' tempat ditemukan';
  };
  $('#s').oninput = render;
  document.querySelectorAll('.chips a').forEach(a => a.onclick = ev => { ev.preventDefault(); K = a.dataset.k; document.querySelectorAll('.chips a').forEach(x => x.classList.remove('on')); a.classList.add('on'); render(); });
  render();
  setTimeout(() => m.invalidateSize(), 200);
};

pages.tambah = async (seg, q) => {
  app().innerHTML = hero('Tambah tempat hidden gem', 'Punya tempat makan favorit yang belum banyak diketahui? Bagikan di sini, tanpa perlu masuk atau membuat akun.') +
    `<div class="wrap" style="max-width:900px">${q.get('terkirim') ? box('<b>Terima kasih!</b> Rekomendasimu sudah masuk dan akan tampil setelah dicek admin.') : ''}${placeForm()}</div>`;
  bindPlaceForm(async ({ row, menus, files }) => {
    const id = crypto.randomUUID();
    const fotos = await uploadFotos(files);
    let r = await sb.from('places').insert({ id, ...row, fotos, status: 'menunggu' });
    if (r.error) throw r.error;
    if (menus.length) {
      r = await sb.from('menus').insert(menus.map(m => ({ place_id: id, ...m })));
      if (r.error) throw r.error;
    }
    go('#/tambah?terkirim=1');
  });
};

pages.detail = async (seg, q) => {
  const id = seg[1] || '';
  if (!UUID.test(id)) return notFound();
  const [a, b] = await Promise.all([
    sb.from('places').select('*,menus(id,nama,harga)').eq('id', id).maybeSingle(),
    sb.from('reviews').select('id,nama,rating,komentar,created_at').eq('place_id', id).eq('status', 'disetujui').order('created_at', { ascending: false })
  ]);
  if (a.error) throw a.error;
  const p = a.data;
  if (!p) return notFound();
  const rs = b.data || [], menus = (p.menus || []).sort((x, y) => x.id - y.id);
  const rating = rs.length ? Math.round(rs.reduce((s, r) => s + r.rating, 0) / rs.length * 10) / 10 : 0;
  const dist = [0, 0, 0, 0, 0, 0];
  rs.forEach(r => dist[r.rating]++);
  const fotos = (p.fotos || []).filter(safeUrl);
  const vid = safeUrl(p.video_url);
  const hasMap = p.lat != null && p.lng != null;
  document.title = p.nama + ' · HiddenBite';
  app().innerHTML = `<div class="wrap">${q.get('m') ? box(q.get('m') === '2' ? 'Kamu sudah mengulas tempat ini hari ini.' : 'Terima kasih! Ulasanmu akan tampil setelah disetujui admin.') : ''}<a href="#/" style="color:#0f766e;font-weight:600">‹ Kembali ke Beranda</a><br><br>
<div class="gal">${fotos.map(u => `<img src="${e(u)}" alt="">`).join('') || '<div class="ph"></div><div class="ph"></div><div class="ph"></div>'}</div>
<div class="cols" style="margin-top:24px"><div><small style="color:var(--t);font-weight:700">${e(p.kategori)} · ${e(p.area)}</small><h1>${e(p.nama)}</h1>
<span class="pill">${harga(p)}</span> <span class="pill">🕒 ${e(jam(p.jam_buka).replace(':', '.'))}–${e(jam(p.jam_tutup).replace(':', '.'))} WITA</span> <span class="pill">★ ${rating} (${rs.length} ulasan)</span><br>
${(p.suasana || []).map(s => `<span class="pill">${e(s)}</span>`).join('')}
${menus.length ? `<h2>Menu &amp; Harga</h2><div class="box" style="padding:0">${menus.map((m, i) => `<div class="menu"><span>${i + 1}. ${e(m.nama)}</span><b>${rp(m.harga)}</b></div>`).join('')}</div>` : ''}
${vid ? `<h2>Video ulasan</h2><a class="btn" href="${e(vid)}" target="_blank" rel="noopener">▶ Tonton video</a>` : ''}
<h2>Kenapa tempat ini hidden gem?</h2><div class="box" style="background:var(--l);white-space:pre-line">${e(p.deskripsi)}</div></div>
<aside><div class="box"><b>Fasilitas tersedia</b><br>${(p.fasilitas || []).map(s => `<span class="pill">${e(s)}</span>`).join('')}</div>
<div class="box" ${hasMap ? 'style="padding:0;overflow:hidden"' : ''}>${hasMap ? `<iframe title="Peta" width="100%" height="240" style="border:0" loading="lazy" src="https://maps.google.com/maps?q=${+p.lat},${+p.lng}&z=16&output=embed"></iframe><div style="padding:16px">` : ''}<a class="btn" style="display:block;text-align:center" target="_blank" rel="noopener" href="${e(mapsLink(p))}">Buka di Google Maps</a>
<p><b>Cara menemukan lokasi</b><br><small class="sub">${e(p.patokan || p.alamat)}</small></p>${hasMap ? '</div>' : ''}</div></aside></div>
<h2 id="ulasan">Ulasan pengunjung</h2><div class="cols" style="grid-template-columns:1fr 2fr"><div><h1 style="font-size:56px;margin:0">${rating}</h1><span class="st">${stars(rating)}</span><br><small class="sub">Dari ${rs.length} ulasan</small><br><br>
${[5, 4, 3, 2, 1].map(i => { const pc = rs.length ? Math.round(dist[i] / rs.length * 100) : 0; return `<div class="dist">${i}<div class="bar"><i style="width:${pc}%"></i></div>${pc}%</div>`; }).join('')}</div>
<div>${rs.map(r => `<div class="rv"><b>${e(r.nama)}</b> <span class="st">${stars(r.rating)}</span><br><small class="sub">${tgl(r.created_at)}</small><p>${e(r.komentar)}</p></div>`).join('') || '<p>Belum ada ulasan. Jadi yang pertama!</p>'}</div></div>
${reviewForm(id)}</div>`;
  bindReview(id);
  if (q.get('m')) setTimeout(() => $('#ulasan')?.scrollIntoView(), 0);
};

pages.ulasan = async (seg, q) => {
  const { places, reviews } = await loadAll();
  const f = parseInt(q.get('r'), 10) || 0;
  const cnt = [0, 0, 0, 0, 0, 0];
  reviews.forEach(r => cnt[r.rating]++);
  const rs = f ? reviews.filter(r => r.rating === f) : reviews;
  app().innerHTML = hero('Daftar ulasan', 'Baca pengalaman mahasiswa lain sebelum menentukan tempat makan berikutnya.') +
    `<div class="wrap"><div class="cols" style="grid-template-columns:1fr 3fr"><div class="box"><b>Filter rating</b><br><br><div class="chips" style="display:grid"><a class="${f ? '' : 'on'}" href="#/ulasan">Semua ulasan (${reviews.length})</a>${[5, 4, 3, 2, 1].map(i => `<a class="${f === i ? 'on' : ''}" href="#/ulasan?r=${i}">${stars(i)} (${cnt[i]})</a>`).join('')}</div></div>
<div><h2>${f ? `Ulasan ${f} bintang` : 'Semua ulasan'}</h2>${rs.map(r => `<div class="rv"><b>${e(r.nama)}</b> <span class="st">${stars(r.rating)}</span> ${r.rating}.0<br><small class="sub">${tgl(r.created_at)}</small><br><a href="#/detail/${e(r.place_id)}"><b style="color:#0f766e">${e(r.pn)}</b></a><p>${e(r.komentar)}</p></div>`).join('') || '<p>Belum ada ulasan.</p>'}</div></div>${reviewForm(0, places)}</div>`;
  bindReview(0);
};

pages.login = async () => {
  if (session && await isAdmin()) return go('#/admin');
  const fails = () => { try { return JSON.parse(localStorage.getItem('lf') || '{"n":0,"u":0}'); } catch { return { n: 0, u: 0 }; } };
  app().innerHTML = `<div class="wrap" style="max-width:420px"><form class="box" id="lf" autocomplete="off"><h2>🔒 Login Admin</h2><p class="sub">Khusus pengelola HiddenBite.</p><div id="lerr"></div>
<label>Email</label><input name="email" type="email" required autofocus autocomplete="username"><label>Kata sandi</label><input name="pass" type="password" required autocomplete="current-password"><p><button class="btn">Masuk ›</button></p></form></div>`;
  const err = m => $('#lerr').innerHTML = m ? `<div class="box err">${e(m)}</div>` : '';
  $('#lf').onsubmit = async ev => {
    ev.preventDefault();
    const st = fails();
    if (st.u > Date.now()) return err('Terlalu banyak percobaan. Coba lagi dalam ' + Math.ceil((st.u - Date.now()) / 60000) + ' menit.');
    const f = ev.target;
    const { error } = await sb.auth.signInWithPassword({ email: f.elements.email.value.trim(), password: f.elements.pass.value });
    if (!error) {
      const { data: s } = await sb.auth.getSession(); session = s.session;
      if (await isAdmin()) { try { localStorage.removeItem('lf'); } catch {} return go('#/admin'); }
      await sb.auth.signOut(); session = null;
      return err('Akun ini bukan admin.');
    }
    st.n++;
    if (st.n >= 5) { st.u = Date.now() + 300000; st.n = 0; }
    try { localStorage.setItem('lf', JSON.stringify(st)); } catch {}
    err(st.u > Date.now() ? 'Terlalu banyak percobaan. Coba lagi dalam 5 menit.' : 'Email atau kata sandi salah.');
  };
};

async function guardAdmin() {
  if (!session || !(await isAdmin())) { go('#/login'); return false; }
  return true;
}

pages.admin = async (seg) => {
  if (!(await guardAdmin())) return;
  if (seg[1] === 'edit') return adminEdit(seg[2]);
  const [a, b] = await Promise.all([
    sb.from('places').select('id,nama,kategori,area,alamat,deskripsi,status,created_at').order('created_at', { ascending: true }),
    sb.from('reviews').select('id,nama,rating,komentar,place_id,created_at,places(nama)').eq('status', 'menunggu').order('created_at', { ascending: true })
  ]);
  if (a.error) throw a.error;
  if (b.error) throw b.error;
  const qt = a.data.filter(p => p.status === 'menunggu'), qr = b.data;
  const aksi = (act, id, s, l, c = '') => `<button class="btn ${c}" data-act="${act}" data-id="${e(id)}" data-s="${s}">${l}</button> `;
  app().innerHTML = `<div class="wrap"><div style="display:flex;justify-content:space-between"><h1>Panel Admin</h1><button class="btn g" id="out">Keluar</button></div>
<h2>Antrean rekomendasi tempat (${qt.length})</h2>${qt.map(r => `<div class="box"><b>${e(r.nama)}</b> · ${e(r.kategori)} · ${e(r.area)}<br><small class="sub">${e(r.alamat)}</small><p>${e(r.deskripsi)}</p><a class="btn g" href="#/admin/edit/${e(r.id)}">Edit</a> ${aksi('tempat', r.id, 'tampil', 'Setujui')}${aksi('tempat', r.id, 'ditolak', 'Tolak', 'r')}</div>`).join('') || '<p class="sub">Tidak ada antrean.</p>'}
<h2>Antrean ulasan (${qr.length})</h2>${qr.map(r => `<div class="box"><b>${e(r.nama)}</b> <span class="st">${stars(r.rating)}</span> untuk <b>${e(r.places?.nama)}</b><p>${e(r.komentar)}</p>${aksi('ulasan', r.id, 'disetujui', 'Setujui')}${aksi('ulasan', r.id, 'ditolak', 'Tolak', 'r')}</div>`).join('') || '<p class="sub">Tidak ada antrean.</p>'}
<h2>Semua tempat</h2><div style="overflow:auto"><table class="tbl"><tr><th>Nama<th>Kategori<th>Status<th>Aksi</tr>${a.data.map(r => `<tr><td>${e(r.nama)}<td>${e(r.kategori)}<td>${e(r.status)}<td><a class="btn g" href="#/admin/edit/${e(r.id)}">Edit</a> ${r.status === 'tampil' ? aksi('tempat', r.id, 'sembunyi', 'Sembunyikan', 'g') : r.status === 'sembunyi' ? aksi('tempat', r.id, 'tampil', 'Tampilkan') : ''}</tr>`).join('')}</table></div></div>`;
  $('#out').onclick = async () => { await sb.auth.signOut(); session = null; go('#/login'); };
  app().onclick = async ev => {
    const b = ev.target.closest('button[data-act]');
    if (!b) return;
    const tbl = b.dataset.act === 'tempat' ? 'places' : 'reviews';
    const ok = tbl === 'places' ? ['tampil', 'ditolak', 'sembunyi'] : ['disetujui', 'ditolak'];
    if (!ok.includes(b.dataset.s)) return;
    b.disabled = true;
    const { error } = await sb.from(tbl).update({ status: b.dataset.s }).eq('id', b.dataset.id);
    if (error) { alert('Gagal: ' + error.message); b.disabled = false; return; }
    route();
  };
};

async function adminEdit(id) {
  if (!UUID.test(id || '')) return notFound();
  const { data: p, error } = await sb.from('places').select('*,menus(id,nama,harga)').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!p) return notFound();
  p.menus = (p.menus || []).sort((x, y) => x.id - y.id);
  app().innerHTML = `<div class="wrap" style="max-width:900px"><a href="#/admin" style="color:#0f766e;font-weight:600">‹ Kembali ke admin</a><h1>Edit: ${e(p.nama)}</h1>${placeForm(p, 'Simpan Perubahan')}</div>`;
  bindPlaceForm(async ({ row, menus, files, hapus }) => {
    const baru = await uploadFotos(files);
    const fotos = [...(p.fotos || []).filter(u => !hapus.includes(u)), ...baru];
    let r = await sb.from('places').update({ ...row, fotos }).eq('id', id);
    if (r.error) throw r.error;
    r = await sb.from('menus').delete().eq('place_id', id);
    if (r.error) throw r.error;
    if (menus.length) { r = await sb.from('menus').insert(menus.map(m => ({ place_id: id, ...m }))); if (r.error) throw r.error; }
    const paths = hapus.map(u => (u.split('/fotos/')[1] || '').split('?')[0]).filter(Boolean);
    if (paths.length) await sb.storage.from('fotos').remove(paths);
    go('#/admin');
  });
}

function notFound() {
  app().innerHTML = `<div class="wrap"><h1>Tidak ditemukan</h1><p>Halaman atau tempat yang kamu cari tidak ada.</p><a class="btn" href="#/">Kembali ke Beranda</a></div>`;
}

/* ================= Router ================= */
async function route() {
  const raw = location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  const seg = path.split('/').filter(Boolean);
  const name = seg[0] || 'index';
  const q = new URLSearchParams(qs || '');
  document.title = 'HiddenBite · Kuliner tersembunyi Makassar';
  renderNav(name);
  renderFoot();
  app().onclick = null;
  if (!READY) {
    app().innerHTML = `<div class="wrap"><div class="box err"><b>Belum dikonfigurasi.</b> Isi <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON_KEY</code> di <code>config.js</code> (lihat PANDUAN.md).</div></div>`;
    return;
  }
  try {
    await (pages[name] || notFound)(seg, q);
    if (!q.get('m')) window.scrollTo(0, 0);
  } catch (err) {
    console.error(err);
    app().innerHTML = `<div class="wrap"><div class="box err"><b>Gagal memuat data.</b> Periksa koneksi internet, <code>config.js</code>, dan apakah <code>supabase_schema.sql</code> sudah dijalankan.</div></div>`;
  }
}

window.addEventListener('hashchange', route);
(async () => {
  if (READY) {
    try { const { data } = await sb.auth.getSession(); session = data.session; } catch {}
    sb.auth.onAuthStateChange((ev, s) => { const had = !!session; session = s; if (had !== !!s) renderNav((location.hash.slice(2).split(/[/?]/)[0]) || 'index'); });
  }
  route();
})();
})();
