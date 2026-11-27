/* Pro Maps — navegador gratuito con radares, DGT y avisos tipo Waze */
'use strict';

const $ = s => document.querySelector(s);
const N = window.Nativo || null;
/** Android Auto: la misma página dibujada en la pantalla del coche */
const CAR = /[?&]car=1/.test(location.search);
if (CAR) document.documentElement.classList.add('car');
let carArea = { l: 0, t: 0, r: 0, b: 0 };


/* ====================== Iconos de línea (dibujados a mano, sin librerías) ====================== */
const SV = (inner, fill) => '<svg viewBox="0 0 24 24" fill="' + (fill ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
function gearPath() {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a0 = i * 45 - 11, a1 = i * 45 + 11, r1 = 9.6, r2 = 7.4;
    const p = (a, r) => (12 + r * Math.cos(a * Math.PI / 180)).toFixed(2) + ' ' + (12 + r * Math.sin(a * Math.PI / 180)).toFixed(2);
    d += (i ? 'L' : 'M') + p(a0 - 11, r2) + 'L' + p(a0, r1) + 'L' + p(a1, r1) + 'L' + p(a1 + 11, r2);
  }
  return d + 'Z';
}
const IC = {
  search: SV('<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>'),
  mic: SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  gear: '<svg viewBox="0 0 24 24"><path d="' + gearPath() + '" fill="currentColor"/><circle cx="12" cy="12" r="3.2" fill="var(--bgx,#0e1a2b)"/></svg>',
  flag: SV('<path d="M6 21V4h11l-2.5 4.5L17 13H6"/>'),
  layers: SV('<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>'),
  plus: SV('<path d="M12 5v14M5 12h14"/>'), minus: SV('<path d="M5 12h14"/>'),
  close: SV('<path d="M6 6l12 12M18 6L6 18"/>'),
  target: SV('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  home: SV('<path d="M3 11l9-7 9 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>'),
  work: SV('<rect x="3" y="7.5" width="18" height="12.5" rx="2.5"/><path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3 12.5h18"/>'),
  star: SV('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>'),
  fuel: SV('<rect x="4" y="3.5" width="10" height="17" rx="1.5"/><path d="M6.5 7h5v4h-5z"/><path d="M14 9h2.5l2 2.5V18a1.5 1.5 0 0 1-3 0v-3.5H14"/>'),
  food: SV('<path d="M7 3v8M4.5 3v4.5a2.5 2.5 0 0 0 5 0V3M7 11v10M16.5 3c-2 1.5-2.5 6 0 8.5V21M16.5 3v18"/>'),
  car: SV('<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3.5 16h17v3h-17z"/><circle cx="7.5" cy="13" r="1" fill="currentColor"/><circle cx="16.5" cy="13" r="1" fill="currentColor"/>'),
  chart: SV('<path d="M4 20h16"/><path d="M7 20v-6M12 20V8M17 20v-9"/>'),
  back: SV('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  fork: SV('<path d="M12 21v-6M12 15L6 8.5M12 15l6-6.5M4.5 10V5h5M19.5 10V5h-5"/>'),
  map: SV('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  info: SV('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  phone: SV('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
  down: SV('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  route: SV('<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>'),
  music: SV('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  vol: SV('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  bell: SV('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
  mute: SV('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>'),
  traffic: SV('<rect x="8" y="2.5" width="8" height="19" rx="3"/><circle cx="12" cy="7" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="17" r="1.4" fill="currentColor"/>'),
  building: SV('<path d="M5 21V6l7-3 7 3v15"/><path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1M3 21h18"/>'),
  camera: SV('<path d="M4 8h3.5l1.5-2.5h6L16.5 8H20v11H4z"/><circle cx="12" cy="13.2" r="3.3"/>'),
  bulb: SV('<path d="M9 17.5h6M10 21h4"/><path d="M8.5 14.5a5.5 5.5 0 1 1 7 0c-.8.7-1 1.5-1 3h-5c0-1.5-.2-2.3-1-3z"/>'),
  tree: SV('<path d="M12 3l-5.5 8h3l-4 6h13l-4-6h3z"/><path d="M12 17v4"/>'),
  cloud: SV('<path d="M7 18.5a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 9a4.5 4.5 0 0 1 .5 9.5z"/>'),
  shadow: SV('<circle cx="9" cy="9" r="4"/><path d="M9 2v1.5M9 14.5V16M2 9h1.5M14.5 9H16M4 4l1 1M13 13l1 1M14 4l-1 1M4 14l1-1"/><path d="M12 21h9l-3-5h-4z" fill="currentColor" opacity=".45"/>'),
  alert: SV('<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>'),
  leaf: SV('<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l7-7"/>'),
  pin: SV('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  sun: SV('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"/>'),
  moon: SV('<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>'),
  auto: SV('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
  police: SV('<path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6z"/><path d="M12 8.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="currentColor" stroke="none"/>'),
  crash: SV('<path d="M4 17v-4l2-4.5h8l2 4.5v4"/><path d="M3 17h14v2.5H3z"/><path d="M19 3l.8 2.2L22 4.5l-1.3 1.8L22 8l-2.2-.3L19 10l-.8-2.3"/>'),
  jam: SV('<path d="M3 14v-3l1.5-3h6l1.5 3v3z"/><path d="M12 18v-3l1.5-3h6l1.5 3v3z"/><circle cx="5.5" cy="14" r="1" fill="currentColor"/><circle cx="14.5" cy="18" r="1" fill="currentColor"/>'),
  works: SV('<path d="M4 20h16M7 20l3-12h4l3 12M8.5 14h7"/><path d="M10 8l2-4 2 4"/>'),
  wrench: SV('<path d="M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2z"/>'),
  view2d: SV('<path d="M4 6h16v12H4z"/>'), view3d: SV('<path d="M7 7h13l-3 11H4z"/>')
};
/** Pone el icono a todos los elementos con data-ic="nombre" */
function paintIcons(root) { (root || document).querySelectorAll('[data-ic]').forEach(el => { const k = el.dataset.ic; if (IC[k] && el.dataset.icDone !== k) { el.innerHTML = IC[k]; el.dataset.icDone = k; } }); }
paintIcons();

/* ====================== Ajustes y almacenamiento ====================== */
const store = {
  get(k, d) { try { const v = localStorage.getItem('pn_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) {
    try { localStorage.setItem('pn_' + k, JSON.stringify(v)); } catch (e) { }
    if (SYNC_KEYS[k] && !store.quiet && typeof stateChanged === 'function') stateChanged();
    if ((k === 'favs' || k === 'favList') && typeof updateHome === 'function') setTimeout(updateHome, 50);
  }
};
/* Lo que se copia al otro dispositivo vinculado (ajustes, Casa/Trabajo, favoritos y rutas guardadas) */
const SYNC_KEYS = { cfg: 1, favs: 1, favList: 1, savedRoutes: 1 };
/* Ajustes que cada dispositivo guarda a su gusto (dependen de la pantalla) */
const LOCAL_CFG = { syncCode: 1, zoomLvl: 1, carSize: 1, syncSettings: 1, localView: 1 };
const DEF = { voice: true, radars: true, semaforos: true, incid: true, reports: true, beep: true,
  tomtom: '', style: 'auto', tolls: false, highways: false, traffic: false,
  fuel: 'g95', gas: true, limit: true, limitWarn: true, ttinc: true,
  b3d: true, wxfx: true, wxchip: true, trees: false, lamps: false, car: 'arrow', carColor: '#33ccff', lanes: true,
  label: 'c', zbe: true, zbeShow: true, zbeAvoid: false, parkNear: true, syncCode: '', darkLvl: 'mas',
  fatigue: true, hazards: true, curves: true, offlineRoute: true, routeType: 'fastest',
  zoomLvl: 'cerca', autoZoom: true, overhead: true, persp: true, carSize: 'grande', syncSettings: true, sound: 'all', shadows: true, northUp: false, musicBtn: true };
const cfg = Object.assign({}, DEF, store.get('cfg', {}));
const saveCfg = () => store.set('cfg', cfg);

/* ====================== Red (pasa por Android para evitar bloqueos) ====================== */
let reqN = 0; const pend = {};
window.__net = (id, ok, body) => {
  const p = pend[id]; if (!p) return; delete pend[id];
  ok ? p.res(body) : p.rej(new Error(String(body).slice(0, 240)));
};
function nativeCall(fn, url) {
  return new Promise((res, rej) => {
    const id = 'r' + (++reqN); pend[id] = { res, rej };
    if (fn === 'dgt') N.dgt(id); else if (fn === 'fuel') N.fuel(id); else N.get(id, url);
    setTimeout(() => { if (pend[id]) { delete pend[id]; rej(new Error('Tiempo agotado')); } }, 100000);
  });
}
function get(url) {
  if (N) return nativeCall('get', url);
  return fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
}
const getJSON = url => get(url).then(t => JSON.parse(t));
function postJSON(url, obj) {
  return new Promise((res, rej) => {
    const id = 'r' + (++reqN); pend[id] = { res: t => { try { res(JSON.parse(t)); } catch (e) { rej(e); } }, rej };
    N.post(id, url, JSON.stringify(obj), JSON.stringify({ 'Content-Type': 'application/json' }));
    setTimeout(() => { if (pend[id]) { delete pend[id]; rej(new Error('Tiempo agotado')); } }, 60000);
  });
}

/* ====================== Voz, avisos y utilidades ====================== */
let lastSay = '';
function say(t, urgent) {
  if (!cfg.voice || cfg.sound === 'off' || !t) return;
  lastSay = t;
  if (N) { urgent ? N.speakNow(t) : N.speak(t); }
  else if (window.speechSynthesis) {
    if (urgent) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t); u.lang = 'es-ES'; speechSynthesis.speak(u);
  }
}
const beep = k => { if (cfg.beep && cfg.sound !== 'off' && N) N.beep(k || 1); };
/** Indicaciones de la ruta (giros, llegada…): no suenan en el modo «solo avisos» */
function sayNav(t, urgent) { if (cfg.sound === 'alerts') return; say(t, urgent); }
const vib = ms => { if (N) N.vibrate(ms || 200); };
let toastT;
function toast(m, ms) {
  const t = $('#toast'); t.textContent = m; t.classList.remove('hidden');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), ms || 3200);
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ====================== Geometría ====================== */
const R = 6371000, rad = Math.PI / 180;
function dist(a, b) { // a,b = [lon,lat] -> metros
  const dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
function bearing(a, b) {
  const y = Math.sin((b[0] - a[0]) * rad) * Math.cos(b[1] * rad);
  const x = Math.cos(a[1] * rad) * Math.sin(b[1] * rad) - Math.sin(a[1] * rad) * Math.cos(b[1] * rad) * Math.cos((b[0] - a[0]) * rad);
  return (Math.atan2(y, x) / rad + 360) % 360;
}
const angDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
/** Proyecta p sobre el segmento a-b. Devuelve {d: distancia, t: fracción 0..1} */
function projSeg(p, a, b) {
  const kx = Math.cos(p[1] * rad) * R * rad, ky = R * rad;
  const ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky, bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? -(ax * dx + ay * dy) / L : 0; t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx, y = ay + t * dy;
  return { d: Math.sqrt(x * x + y * y), t };
}
function decode6(str) {
  let i = 0, lat = 0, lon = 0; const out = [];
  while (i < str.length) {
    let b, s = 0, r = 0;
    do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32);
    lat += (r & 1) ? ~(r >> 1) : (r >> 1);
    s = 0; r = 0;
    do { b = str.charCodeAt(i++) - 63; r |= (b & 31) << s; s += 5; } while (b >= 32);
    lon += (r & 1) ? ~(r >> 1) : (r >> 1);
    out.push([lon / 1e6, lat / 1e6]);
  }
  return out;
}
function fmtDist(m) {
  if (m < 1000) return (m < 100 ? Math.max(0, Math.round(m / 10) * 10) : Math.round(m / 50) * 50) + ' m';
  return (m < 10000 ? (Math.round(m / 100) / 10).toString().replace('.', ',') : Math.round(m / 1000)) + ' km';
}
function sayDist(m) {
  if (m < 1000) return (m < 100 ? Math.round(m / 10) * 10 : Math.round(m / 50) * 50) + ' metros';
  const km = Math.round(m / 100) / 10;
  return (km === 1 ? 'un kilómetro' : String(km).replace('.', ' coma ') + ' kilómetros');
}
function fmtTime(s) {
  const m = Math.round(s / 60); if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0');
}
const lowFirst = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : '';

/* ====================== Categorías de avisos ====================== */
const CAT = {
  radar:     { e: '📷', c: '#e53935', n: 'Radar fijo' },
  tramo:     { e: '⏱️', c: '#d81b60', n: 'Radar de tramo' },
  semaforo:  { e: '🚦', c: '#8e24aa', n: 'Cámara de semáforo' },
  movil:     { e: '🚓', c: '#1e88e5', n: 'Radar móvil' },
  policia:   { e: '👮', c: '#1565c0', n: 'Control policial' },
  accidente: { e: '💥', c: '#f4511e', n: 'Accidente' },
  obras:     { e: '🚧', c: '#fb8c00', n: 'Obras' },
  corte:     { e: '⛔', c: '#c62828', n: 'Carretera cortada' },
  carril:    { e: '🚧', c: '#ef6c00', n: 'Carril cortado' },
  retencion: { e: '🚗', c: '#e65100', n: 'Retención' },
  atasco:    { e: '🚗', c: '#e65100', n: 'Atasco' },
  v16:       { e: '🛑', c: '#ff6f00', n: 'Vehículo detenido (V16)' },
  averia:    { e: '🛑', c: '#ff6f00', n: 'Vehículo averiado' },
  meteo:     { e: '❄️', c: '#0288d1', n: 'Meteorología adversa' },
  animal:    { e: '🦌', c: '#6d4c41', n: 'Animales en la vía' },
  obstaculo: { e: '⚠️', c: '#f9a825', n: 'Obstáculo en la vía' },
  peligro:   { e: '⚠️', c: '#f9a825', n: 'Peligro' },
  evento:    { e: '🎪', c: '#7b1fa2', n: 'Evento' },
  incid:     { e: '❗', c: '#ef6c00', n: 'Incidencia' },
  curva:     { e: '↪️', c: '#d84315', n: 'Curva peligrosa' },
  paso:      { e: '🚂', c: '#5d4037', n: 'Paso a nivel' },
  escuela:   { e: '🏫', c: '#f9a825', n: 'Zona escolar' },
  fauna:     { e: '🦌', c: '#6d4c41', n: 'Paso de animales' },
  rocas:     { e: '🪨', c: '#795548', n: 'Desprendimientos' }
};
const HAZ = { curva: 1, paso: 1, escuela: 1, fauna: 1, rocas: 1 };
const IS_CAMERA = c => c === 'radar' || c === 'tramo' || c === 'semaforo' || c === 'movil';
/* Duración de los avisos propios (minutos). 0 = no caduca */
const REPORT_TTL = { movil: 120, policia: 120, accidente: 120, atasco: 60, obras: 20160, peligro: 180, v16: 60, radar: 0, corte: 720 };

/* ====================== Datos: radares (OpenStreetMap) ====================== */
let radars = store.get('radars', []);
const radarsAt = store.get('radarsAt', 0);
const OVERPASS = ['https://overpass-api.de/api/interpreter?data=', 'https://overpass.kumi.systems/api/interpreter?data=',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter?data='];
const OVQ = '[out:json][timeout:120];area["ISO3166-1"="ES"][admin_level=2]->.es;' +
  '(node["highway"="speed_camera"](area.es);node["enforcement"="maxspeed"](area.es););out body;' +
  'rel["type"="enforcement"](area.es)->.r;.r out body;node(r.r);out skel;';

async function loadRadars(force) {
  if (!force && radars.length && Date.now() - radarsAt < 7 * 864e5 && store.get('radarsV', 1) === 2) return;
  for (const base of OVERPASS) {
    try {
      const j = await getJSON(base + encodeURIComponent(OVQ));
      const nodes = {}, out = {};
      for (const el of j.elements) if (el.type === 'node') nodes[el.id] = el;
      for (const el of j.elements) {
        if (el.type === 'node' && el.tags && (el.tags.highway === 'speed_camera' || el.tags.enforcement)) {
          out[el.id] = { id: 'o' + el.id, lon: el.lon, lat: el.lat, cat: 'radar', max: parseInt(el.tags.maxspeed) || 0,
            sub: el.tags.name || el.tags['ref'] || '' };
        }
      }
      for (const el of j.elements) {
        if (el.type !== 'relation' || !el.tags) continue;
        const enf = el.tags.enforcement || '', max = parseInt(el.tags.maxspeed) || 0;
        let cat = null;
        if (enf === 'maxspeed') cat = 'radar'; else if (enf === 'average_speed') cat = 'tramo';
        else if (enf === 'traffic_signals') cat = 'semaforo';
        if (!cat) continue;
        for (const m of el.members || []) {
          if (m.type !== 'node' || !nodes[m.ref]) continue;
          const nd = nodes[m.ref];
          if (cat === 'tramo' && (m.role === 'from' || m.role === 'to')) {
            out['t' + el.id + m.ref + m.role] = { id: 't' + el.id + m.ref + m.role, lon: nd.lon, lat: nd.lat, cat: 'tramo', max, g: el.id,
              sub: m.role === 'from' ? 'Inicio de tramo' : 'Fin de tramo', fin: m.role === 'to' };
          } else if (m.role === 'device' || m.role === '') {
            const o = out[m.ref] || { id: 'o' + m.ref, lon: nd.lon, lat: nd.lat, sub: '' };
            o.cat = cat === 'tramo' ? 'tramo' : cat; if (max) o.max = max;
            if (cat === 'tramo' && !o.sub) o.sub = 'Cámara de tramo';
            out[m.ref] = o;
          }
        }
      }
      radars = Object.values(out);
      store.set('radars', radars); store.set('radarsAt', Date.now()); store.set('radarsV', 2);
      toast('📷 ' + radars.length + ' radares de España actualizados');
      refreshPois();
      return;
    } catch (e) { console.log('Overpass ' + base + ': ' + e.message); }
  }
  if (!radars.length) toast('No se pudieron descargar los radares. Lo intentaré más tarde.');
}

/* ====================== Datos: incidencias DGT ====================== */
let dgt = [];
function classifyDgt(o) {
  const s = JSON.stringify(o).toLowerCase();
  if (/accident/.test(s)) return 'accidente';
  if (/vehiclestuck|brokendown|vehicleonfire|abandonedvehicle|vehicleobstruction|vehicle_?stopped|v16/.test(s)) return 'v16';
  if (/roadclosed|roadclosure|carriagewayclosure|closedpermanently|closed/.test(s) && !/laneclosure/.test(s)) return 'corte';
  if (/laneclosure|narrowlanes|singlealternatelinetraffic|contraflow|lanes/.test(s)) return 'carril';
  if (/roadmaintenance|roadworks|maintenancework|construction|resurfacing|repair/.test(s)) return 'obras';
  if (/congest|queu|heavytraffic|stationarytraffic|slowtraffic|abnormaltraffic|stopandgo/.test(s)) return 'retencion';
  if (/snow|ice|icy|fog|wind|rain|flood|hail|poorenvironment|weather|winter|chains|blackice|visibility/.test(s)) return 'meteo';
  if (/animal/.test(s)) return 'animal';
  if (/obstruct|objectonroad|spillage|debris|fallen|rockfall|landslip|shed/.test(s)) return 'obstaculo';
  if (/publicevent|sportsevent|parade|demonstration|march/.test(s)) return 'evento';
  return 'incid';
}
function dgtSub(o) {
  const p = [];
  if (o.roadName) p.push(o.roadName);
  if (o.kilometerPoint) p.push('km ' + String(o.kilometerPoint).replace('.', ','));
  if (o.municipality) p.push(o.municipality);
  else if (o.province) p.push(o.province);
  return p.join(' · ');
}
async function loadDgt() {
  if (!N) return;
  try {
    const arr = JSON.parse(await nativeCall('dgt'));
    const seen = {};
    dgt = [];
    for (const o of arr) {
      if (o.validityStatus && /suspended/i.test(o.validityStatus)) continue;
      const cat = classifyDgt(o);
      const key = o.sid + cat; if (seen[key]) continue; seen[key] = 1;
      const it = { id: 'd' + (o.id || o.sid) + cat, lon: o.lon, lat: o.lat, cat, sub: dgtSub(o), src: 'DGT',
        since: o.overallStartTime || '', road: o.roadName || '' };
      if (o.lat2 != null && dist([o.lon, o.lat], [o.lon2, o.lat2]) > 50) { it.lon2 = o.lon2; it.lat2 = o.lat2; }
      dgt.push(it);
    }
    refreshPois();
  } catch (e) { console.log('DGT: ' + e.message); }
}

/* ====================== Datos: avisos propios ====================== */
let reports = store.get('reports', []);
function cleanReports() {
  const now = Date.now();
  reports = reports.filter(r => !r.exp || r.exp > now);
  store.set('reports', reports);
}
function addReport(cat, pos) {
  const ttl = REPORT_TTL[cat] == null ? 120 : REPORT_TTL[cat];
  reports.push({ id: 'u' + Date.now(), cat, lon: pos[0], lat: pos[1], t: Date.now(), exp: ttl ? Date.now() + ttl * 60000 : 0,
    sub: 'Aviso tuyo · ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), mine: true });
  store.set('reports', reports);
  alerted[reports[reports.length - 1].id] = { t: Date.now() };
  refreshPois();
  say('Gracias, aviso guardado'); toast(CAT[cat].e + ' Aviso guardado: ' + CAT[cat].n);
}
function removeReport(id) { reports = reports.filter(r => r.id !== id); store.set('reports', reports); refreshPois(); }

/* ====================== Mapa ====================== */
const STYLE = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
  soft: 'https://tiles.openfreemap.org/styles/positron'
};
let map, meMarker, destMarker, styleOk = {};
let me = null, heading = 0, speedMs = 0, gpsAcc = 99, follow = true;
const stats = { lastPos: null, lastT: 0 };

function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
function loadCss(href) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }

function isNight() {
  const p = me || store.get('lastPos', [-3.8249, 40.3459]);
  const t = sunTimes(p[1], p[0], new Date()), now = Date.now();
  if (!t) { const h = new Date().getHours(); return h >= 20 || h < 8; }
  return now < t.rise - 15 * 60000 || now > t.set + 15 * 60000;
}
/** Salida y puesta de sol (fórmula de la NOAA, precisión de un par de minutos) */
function sunTimes(lat, lon, date) {
  const d0 = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const n = Math.floor((d0 - Date.UTC(2000, 0, 1, 12)) / 864e5) + 1 - lon / 360;
  const M = (357.5291 + 0.98560028 * n) % 360, Mr = M * rad;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const L = (M + C + 180 + 102.9372) % 360, Lr = L * rad;
  const Jt = 2451545 + n + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * Lr);
  const dec = Math.asin(Math.sin(Lr) * Math.sin(23.44 * rad));
  const cosH = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec));
  if (cosH < -1 || cosH > 1) return null;
  const H = Math.acos(cosH) / rad;
  const toMs = j => (j - 2440587.5) * 864e5;
  return { rise: toMs(Jt - H / 360), set: toMs(Jt + H / 360) };
}
function wantedStyle() {
  let k = cfg.style;
  if (k === 'auto') k = isNight() ? 'dark' : 'light';
  if (k === 'sat' || k === 'satw') k = 'dark';
  if (k === 'dark' && styleOk.dark === false) k = 'light';
  return k;
}
let curStyle = '';
function applyStyle(force) {
  const k = wantedStyle();
  if (!force && k === curStyle) { updateLampGlow(); return; }
  curStyle = k;
  map.setStyle(STYLE[k], { diff: false });
}

async function boot() {
  const libs = [['https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js', 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'],
    ['https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js', 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css']];
  for (const [js, css] of libs) {
    try { loadCss(css); await loadScript(js); break; } catch (e) { console.log('lib ' + js); }
  }
  if (!window.maplibregl) {
    $('#splashMsg').innerHTML = 'No hay conexión a internet.<br>Pro Maps necesita datos móviles o wifi para cargar el mapa.';
    const b = document.createElement('button'); b.textContent = 'Reintentar'; b.onclick = () => location.reload();
    $('#splash').appendChild(b); return;
  }
  const start = store.get('lastPos', [-3.8249, 40.3459]); // Alcorcón por defecto
  // ¿Existe el estilo oscuro? Si no, se usa el claro.
  styleOk.dark = await Promise.race([get(STYLE.dark).then(() => true, () => false), new Promise(r => setTimeout(() => r(false), 4000))]);
  curStyle = wantedStyle();
  map = new maplibregl.Map({ container: 'map', style: STYLE[curStyle], center: start, zoom: 14, attributionControl: { compact: true },
    pitchWithRotate: true, dragRotate: true, maxPitch: 70, fadeDuration: 0, pixelRatio: Math.min(window.devicePixelRatio || 1, 2), antialias: false });
  map.on('style.load', onStyleLoad);
  map.on('error', e => console.log('map error ' + (e && e.error && e.error.message)));
  map.on('dragstart', () => setFollow(false));
  map.on('moveend', () => {
    if (anim.inJump) { if (Date.now() - (anim.natAt || 0) < 2000) return; anim.natAt = Date.now(); }
    if (cfg.trees || cfg.lamps) maybeLoadNature();
  });
  map.on('click', 'pois', e => { const f = e.features && e.features[0]; if (f) showPoi(f); });
  map.on('click', 'routeAltHit', e => {
    const f = e.features && e.features[0]; if (!f) return;
    if (preview) selectRoute(f.properties.i); else if (navigating) altSheet(+f.properties.i);
  });
  map.on('mouseenter', 'pois', () => map.getCanvas().style.cursor = 'pointer');
  map.on('click', e => {
    hideMediaCard(); $('#reportPop').classList.add('hidden');
    const own = ['pois', 'gas', 'parkings', 'routeAltHit', 'haz'].filter(id => map.getLayer(id));
    if (own.length && map.queryRenderedFeatures(e.point, { layers: own }).length) return; // ya lo atiende su propia capa
    const box = [[e.point.x - 14, e.point.y - 14], [e.point.x + 14, e.point.y + 14]];
    const poiLayers = (map.getStyle().layers || []).filter(l => l.type === 'symbol' && l['source-layer'] === 'poi').map(l => l.id);
    if (!poiLayers.length) return;
    const f = map.queryRenderedFeatures(box, { layers: poiLayers }).find(x => x.properties && x.properties.name);
    if (!f) return;
    const pr = f.properties, c = f.geometry.coordinates;
    const kind = (POI_KIND[pr.subclass] || POI_KIND[pr.class] || '');
    placeMenu([c[0], c[1]], pr['name:es'] || pr.name, kind);
  });
  map.on('click', 'parkings', e => { const f = e.features && e.features[0]; if (f) showParking(+f.properties.i); });
  map.on('click', 'gas', e => { const f = e.features && e.features[0]; if (f) showGas(f.properties.id); });
  setupLongPress();

  const el = document.createElement('div'); el.className = 'me'; el.id = 'meIcon';
  el.innerHTML = carSvg(cfg.car, cfg.carColor);
  meMarker = new maplibregl.Marker({ element: el, rotationAlignment: 'map', pitchAlignment: 'viewport' }).setLngLat(start).addTo(map);

  map.once('load', () => {
    drawPark(); applyCar();
    $('#splash').classList.add('hidden');
    const sh = N && N.takeShared ? N.takeShared() : ''; if (sh) onShared(sh);
  });
  setTimeout(() => $('#splash').classList.add('hidden'), 9000);

  cleanReports();
  loadRadars(false);
  loadDgt(); setInterval(loadDgt, 3 * 60000);
  setTimeout(() => loadFuel(false), 2500);
  setTimeout(() => loadZbe(false), 5000);
  restorePark(); tripRestore();
  setTimeout(syncPoll, 3000); setInterval(syncPoll, 120000);
  setTimeout(pushState, 9000);
  updateHome();
  setTimeout(() => { if (N && N.mediaState) window.onMedia(N.mediaState()); }, 2000);
  addEventListener('resize', () => map && setTimeout(() => map.resize(), 100));
  setInterval(() => { const every = navigating ? 180000 : 300000; if (Date.now() - ttAt > every) loadTT(); }, 30000); setInterval(() => loadFuel(false), 60 * 60000);
  setInterval(() => { cleanReports(); refreshPois(); applyStyle(false); updateLight(); }, 5 * 60000);
  map.on('rotate', () => { if (anim.inJump && (anim.rotN = (anim.rotN || 0) + 1) % 6) return; carShadow(); updateNorth(); });
  requestAnimationFrame(animFrame);
  if (!N && navigator.geolocation) {
    navigator.geolocation.watchPosition(p => onGps(p.coords.latitude, p.coords.longitude, p.coords.speed == null ? -1 : p.coords.speed,
      p.coords.heading == null ? -1 : p.coords.heading, p.coords.accuracy, 1), null, { enableHighAccuracy: true });
  }
}

function makeIcon(emoji, color, size) {
  const S = size || 56, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2); x.fillStyle = color; x.fill();
  x.lineWidth = 4; x.strokeStyle = '#fff'; x.stroke();
  x.font = Math.round(S * 0.52) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(emoji, S / 2, S / 2 + 2);
  return x.getImageData(0, 0, S, S);
}

/* Aclara el estilo oscuro (fondo, manzanas, calles) según el ajuste elegido */
const colorCtx = document.createElement('canvas').getContext('2d');
function parseColor(v) {
  if (typeof v !== 'string' || /^(get|interpolate|linear|step|match|case|zoom|literal|exponential|coalesce|to-|==|!=|all|any|has|in|feature-state|var|let|rgb|rgba|hsl|hsla)$/.test(v)) return null;
  colorCtx.fillStyle = '#010203'; colorCtx.fillStyle = v;
  const out = colorCtx.fillStyle;
  if (out === '#010203' && !/^#010203$/i.test(v)) return null;
  let m = out.match(/^#([0-9a-f]{6})$/i);
  if (m) { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255, 1]; }
  m = out.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; }
  return null;
}
function lightenVal(v, a, T) {
  if (Array.isArray(v)) return v.map(x => lightenVal(x, a, T));
  const c = parseColor(v); if (!c) return v;
  const r = c.map((x, i) => i < 3 ? Math.round(x + (T[i] - x) * a) : x);
  return 'rgba(' + r[0] + ',' + r[1] + ',' + r[2] + ',' + r[3] + ')';
}
function brightenDark() {
  const a = { normal: 0, mas: 0.2, mucho: 0.36 }[cfg.darkLvl] || 0;
  if (!a || curStyle !== 'dark' || SAT[cfg.style]) return;
  const T = [128, 146, 176];
  for (const l of map.getStyle().layers || []) {
    const prop = { background: 'background-color', fill: 'fill-color', line: 'line-color' }[l.type];
    if (!prop) continue;
    try {
      const v = map.getPaintProperty(l.id, prop);
      if (v != null) map.setPaintProperty(l.id, prop, lightenVal(v, l.type === 'line' ? a * 1.25 : a, T));
    } catch (e) { }
  }
}
/** En el mapa oscuro, todos los textos en claro con borde oscuro para que se lean */
function lightLabels() {
  if (curStyle !== 'dark') return;
  for (const l of map.getStyle().layers || []) {
    if (l.type !== 'symbol' || !l.layout || !l.layout['text-field']) continue;
    try {
      map.setPaintProperty(l.id, 'text-color', '#e8eef7');
      map.setPaintProperty(l.id, 'text-halo-color', 'rgba(15,22,36,0.9)');
      map.setPaintProperty(l.id, 'text-halo-width', 1.6);
    } catch (e) { }
  }
}
function onStyleLoad() {
  brightenDark();
  lightLabels();
  for (const k in CAT) if (!map.hasImage('i_' + k)) map.addImage('i_' + k, makeIcon(CAT[k].e, CAT[k].c), { pixelRatio: 2 });
  const empty = { type: 'FeatureCollection', features: [] };
  map.addSource('route', { type: 'geojson', data: empty });
  map.addSource('routeAlt', { type: 'geojson', data: empty });
  map.addSource('pois', { type: 'geojson', data: empty });
  map.addSource('segs', { type: 'geojson', data: empty });
  if (cfg.tomtom) {
    map.addSource('traffic', { type: 'raster', tileSize: 256,
      tiles: ['https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=' + encodeURIComponent(cfg.tomtom) + '&tileSize=256'] });
    map.addLayer({ id: 'traffic', type: 'raster', source: 'traffic', paint: { 'raster-opacity': 0.85 },
      layout: { visibility: cfg.traffic ? 'visible' : 'none' } });
  }
  map.addLayer({ id: 'routeAltCase', type: 'line', source: 'routeAlt', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#4c1d95', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 6, 16, 13], 'line-opacity': 0.75 } });
  map.addLayer({ id: 'routeAlt', type: 'line', source: 'routeAlt', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#b39dfa', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 16, 8], 'line-opacity': 0.95 } });
  map.addLayer({ id: 'routeAltHit', type: 'line', source: 'routeAlt', paint: { 'line-color': '#000', 'line-width': 34, 'line-opacity': 0.01 } });
  map.addLayer({ id: 'routeCase', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#0b3d91', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 7, 16, 16] } });
  map.addLayer({ id: 'routeLine', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#2f8cff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 11] } });
  map.addLayer({ id: 'segs', type: 'line', source: 'segs', minzoom: 9, layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': ['get', 'color'], 'line-width': ['get', 'w'], 'line-opacity': 0.85 } });
  map.addLayer({ id: 'poisDot', type: 'circle', source: 'pois', maxzoom: 9.5,
    paint: { 'circle-color': ['get', 'color'], 'circle-radius': 3.5, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } });
  map.addLayer({ id: 'pois', type: 'symbol', source: 'pois', minzoom: 9.5,
    layout: { 'icon-image': ['get', 'icon'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 15, 1.1],
      'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-sort-key': ['get', 'prio'] } });
  map.addSource('haz', { type: 'geojson', data: empty });
  map.addLayer({ id: 'haz', type: 'symbol', source: 'haz', minzoom: 14,
    layout: { 'icon-image': ['get', 'icon'], 'icon-size': 0.7, 'icon-allow-overlap': false } });
  map.addLayer({ id: 'poisMax', type: 'symbol', source: 'pois', minzoom: 13, filter: ['>', ['get', 'max'], 0],
    layout: { 'text-field': ['to-string', ['get', 'max']], 'text-size': 12, 'text-offset': [0, 1.7], 'text-allow-overlap': true,
      'text-font': ['Noto Sans Bold'] },
    paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 2 } });
  addLookLayers();
  if (!map.hasImage('i_gas')) map.addImage('i_gas', makeIcon('⛽', '#2e7d32'), { pixelRatio: 2 });
  map.addSource('gas', { type: 'geojson', data: empty });
  map.addLayer({ id: 'gas', type: 'symbol', source: 'gas', minzoom: 12, layout: {
      'icon-image': 'i_gas', 'icon-size': 0.75, 'icon-allow-overlap': false,
      'text-field': ['get', 'p'], 'text-size': 13, 'text-offset': [0, 1.5], 'text-anchor': 'top', 'text-font': ['Noto Sans Bold'],
      'text-allow-overlap': false, visibility: cfg.gas ? 'visible' : 'none' },
    paint: { 'text-color': ['get', 'c'], 'text-halo-color': '#111', 'text-halo-width': 2 } }, 'pois');
  map.addLayer({ id: 'routeAltLabel', type: 'symbol', source: 'routeAlt', layout: { 'symbol-placement': 'line-center', 'text-field': ['get', 'label'],
      'text-size': 15, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-keep-upright': true },
    paint: { 'text-color': '#ffffff', 'text-halo-color': '#5b21b6', 'text-halo-width': 3 } });
  refreshPois();
  refreshGas();
  drawRoutes();
}

/* --- Capa con todos los avisos --- */
let allPois = [];
function refreshPois() {
  allPois = [];
  if (cfg.radars) for (const r of radars) if (r.cat !== 'semaforo' || cfg.semaforos) allPois.push(r);
  if (cfg.incid) for (const d of dgt) allPois.push(d);
  if (cfg.ttinc && cfg.tomtom) for (const t of ttInc) {
    // si la DGT ya tiene lo mismo a menos de 300 m, no se repite
    if (cfg.incid && dgt.some(d => d.cat === t.cat && Math.abs(d.lat - t.lat) < 0.003 && dist([d.lon, d.lat], [t.lon, t.lat]) < 300)) continue;
    allPois.push(t);
  }
  if (cfg.reports) for (const r of reports) allPois.push(r);
  if (cfg.hazards) for (const h of osmHaz) allPois.push(h);
  if (map && map.getSource('pois')) {
    if (map.getSource('haz')) map.getSource('haz').setData({ type: 'FeatureCollection', features: allPois.filter(p => HAZ[p.cat]).map(p => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { id: p.id, icon: 'i_' + p.cat } })) });
    map.getSource('pois').setData({ type: 'FeatureCollection', features: allPois.filter(p => !HAZ[p.cat]).map(p => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { id: p.id, cat: p.cat, icon: 'i_' + p.cat, color: CAT[p.cat].c, max: p.max || 0, prio: IS_CAMERA(p.cat) ? 1 : 2 } })) });
    map.getSource('segs').setData({ type: 'FeatureCollection', features: allPois.filter(p => p.lon2 != null || p.line).map(p => ({
      type: 'Feature', geometry: { type: 'LineString', coordinates: p.line || [[p.lon, p.lat], [p.lon2, p.lat2]] },
      properties: { color: p.cat === 'retencion' ? (p.mag >= 3 ? '#b71c1c' : p.mag === 2 ? '#e53935' : '#fb8c00') : CAT[p.cat].c, w: p.line ? 7 : 5 } })) });
  }
  if (active) { indexRoutePois(active); if (navigating) renderRouteBar(); }
  if (preview) routes.forEach(indexRoutePois);
}
function poiById(id) { return allPois.find(p => p.id === id); }

function showPoi(f) {
  const p = poiById(f.properties.id); if (!p) return;
  const c = CAT[p.cat];
  let h = '<div class="pop"><b>' + c.e + ' ' + esc(c.n) + (p.max ? ' · ' + p.max + ' km/h' : '') + '</b>';
  if (p.sub) h += '<div>' + esc(p.sub) + '</div>';
  if (p.since) { const d = new Date(p.since); if (!isNaN(d)) h += '<div class="muted">Desde ' + d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' · ' + (p.src || 'DGT') + '</div>'; }
  if (p.src !== 'DGT' && !p.mine && IS_CAMERA(p.cat)) h += '<div class="muted">Fuente: OpenStreetMap</div>';
  if (p.src === 'TomTom') h += '<div class="muted">' + (p.delay >= 60 ? '⏱️ Retraso: ' + fmtTime(p.delay) + ' · ' : '') + (p.len ? fmtDist(p.len) + ' · ' : '') + 'Fuente: TomTom en directo</div>';
  h += '<div class="pb"><button data-go="1">🚗 Ir aquí</button>' + (p.mine ? '<button data-del="1">🗑️ Ya no está</button>' : '') + '</div></div>';
  const pop = new maplibregl.Popup({ offset: 16, maxWidth: '300px' }).setLngLat([p.lon, p.lat]).setHTML(h).addTo(map);
  const el = pop.getElement();
  el.querySelector('[data-go]').onclick = () => { pop.remove(); goTo({ name: c.n, sub: p.sub, lon: p.lon, lat: p.lat }); };
  const del = el.querySelector('[data-del]'); if (del) del.onclick = () => { pop.remove(); removeReport(p.id); };
}

/* --- Pulsación larga en el mapa --- */
function setupLongPress() {
  let t = null, start = null;
  const cancel = () => { clearTimeout(t); t = null; };
  map.on('touchstart', e => {
    if (e.originalEvent.touches.length !== 1) return cancel();
    start = e.point; const ll = e.lngLat;
    t = setTimeout(() => { vib(40); placeMenu([ll.lng, ll.lat]); }, 600);
  });
  map.on('touchmove', e => { if (start && (Math.abs(e.point.x - start.x) > 10 || Math.abs(e.point.y - start.y) > 10)) cancel(); });
  map.on('touchend', cancel); map.on('touchcancel', cancel); map.on('movestart', e => { if (e.originalEvent) cancel(); });
  map.on('contextmenu', e => placeMenu([e.lngLat.lng, e.lngLat.lat]));
}
function placeMenu(pos, title, sub) {
  const name = title || 'Punto del mapa';
  openSheet('<div class="sTitle">📍 ' + esc(title || 'Este punto') + '</div><div class="sSub">' + (sub ? esc(sub) : pos[1].toFixed(5) + ', ' + pos[0].toFixed(5)) + '</div>' +
    '<button class="btn" id="pmGo">🚗 Ir aquí</button>' +
    '<button class="btn alt" id="pmRep">⚠️ Avisar de algo aquí</button>' +
    '<button class="btn alt" id="pmPark">🅿️ He aparcado aquí</button>' +
    (title ? '<button class="btn alt" id="pmFav">⭐ Guardar en favoritos</button>' : '') +
    '<button class="btn alt" id="pmHome">🏠 Guardar como Casa</button>' +
    '<button class="btn alt" id="pmWork">💼 Guardar como Trabajo</button>');
  $('#pmGo').onclick = () => { closeSheet(); goTo({ name, sub: sub || '', lon: pos[0], lat: pos[1] }); };
  if ($('#pmFav')) $('#pmFav').onclick = () => { closeSheet(); addFavorite({ name, sub: sub || '', lon: pos[0], lat: pos[1] }); };
  $('#pmRep').onclick = () => reportSheet(pos);
  $('#pmPark').onclick = () => { closeSheet(); savePark(pos, true); };
  $('#pmHome').onclick = () => { setFav('casa', { name: 'Casa', lon: pos[0], lat: pos[1] }); closeSheet(); };
  $('#pmWork').onclick = () => { setFav('trabajo', { name: 'Trabajo', lon: pos[0], lat: pos[1] }); closeSheet(); };
}

/* ====================== Hoja inferior ====================== */
let sheetOnClose = null, backTo = null;
function openSheet(html, onClose) {
  // Pantallas abiertas desde Ajustes: botón para volver
  if (backTo && html.indexOf('id="setBack"') < 0) html = '<button class="back" id="sheetBack">‹ Ajustes</button>' + html;
  $('#sheetBody').innerHTML = html; delete $('#sheetBody').dataset.gas;
  const sb = document.getElementById('sheetBack'); if (sb) { const f = backTo; sb.onclick = () => { sheetOnClose = null; f(); }; }
  $('#sheet').classList.remove('hidden', 'routes', 'wz'); $('#sheetBg').classList.remove('hidden'); document.body.classList.remove('picking-route');
  $('#sheet').scrollTop = 0; sheetOnClose = onClose || null;
}
function closeSheet() {
  backTo = null;
  $('#sheet').classList.add('hidden'); $('#sheetBg').classList.add('hidden'); $('#sheet').classList.remove('routes', 'wz'); document.body.classList.remove('picking-route');
  const f = sheetOnClose; sheetOnClose = null; if (f) f();
}
const sheetOpen = () => !$('#sheet').classList.contains('hidden');
$('#sheetBg').onclick = closeSheet;

/* ====================== Búsqueda ====================== */
let favs = store.get('favs', {}), recents = store.get('recents', []), favList = store.get('favList', []);
function setFav(k, v) { favs[k] = v; store.set('favs', favs); toast((k === 'casa' ? '🏠 Casa' : '💼 Trabajo') + ' guardado'); }
function addRecent(d) {
  recents = [d].concat(recents.filter(r => Math.abs(r.lat - d.lat) > 1e-4 || Math.abs(r.lon - d.lon) > 1e-4)).slice(0, 10);
  store.set('recents', recents);
}
let searchT = null, searchSeq = 0;
$('#q').addEventListener('focus', () => showSearch(''));
$('#q').addEventListener('input', e => { clearTimeout(searchT); const v = e.target.value.trim(); searchT = setTimeout(() => showSearch(v), 350); });
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(searchT); showSearch(e.target.value.trim()); } });

function rowHtml(i, icon, t1, t2, right) {
  return '<div class="row" data-i="' + i + '"><div class="ri">' + icon + '</div><div class="rt"><div class="r1">' + esc(t1) +
    '</div>' + (t2 ? '<div class="r2">' + esc(t2) + '</div>' : '') + '</div>' + (right ? '<div class="rr">' + right + '</div>' : '') + '</div>';
}
function bindRows(list) {
  document.querySelectorAll('#sheetBody .row[data-i]').forEach(el => el.onclick = async () => {
    let d = list[+el.dataset.i]; if (!d) return;
    if (d.fav && d.lat == null) { startPick(d.fav); return; }
    if (d.cc && d.lat == null) {
      el.querySelector('.r2') && (el.querySelector('.r2').textContent = 'Buscando el número exacto…');
      try { d = await ccFind(d); } catch (e) { }
      if (d.lat == null) { toast('No he encontrado esa dirección exacta. Prueba con otra.'); return; }
    }
    $('#q').blur();
    if (pickFor) { const k = pickFor; pickFor = null; sheetOnClose = null; closeSheet(); $('#q').value = ''; finishPick(k, d); return; }
    closeSheet(); goTo(d);
  });
}
async function showSearch(q) {
  const seq = ++searchSeq;
  let html = '<div class="sTitle">' + (pickFor ? PICK_TITLE[pickFor] : '¿A dónde vamos?') + '</div>' +
    (pickFor ? '<div class="sSub">Escribe arriba la dirección o el sitio y elígelo de la lista.</div>' : '');
  const list = [];
  if (!q && pickFor) { openSheet(html, pickCancel); bindRows(list); return; }
  if (!q) {
    list.push(Object.assign({ fav: 'casa', name: 'Casa' }, favs.casa || {}));
    list.push(Object.assign({ fav: 'trabajo', name: 'Trabajo' }, favs.trabajo || {}));
    html += rowHtml(0, '🏠', 'Casa', favs.casa ? (favs.casa.sub || '') : 'Toca para guardar tu dirección') +
      rowHtml(1, '💼', 'Trabajo', favs.trabajo ? (favs.trabajo.sub || '') : 'Toca para guardar tu dirección');
    favList.forEach(f => { list.push(f); html += rowHtml(list.length - 1, '⭐', f.name, f.sub || ''); });
    html += '<div class="chips">' + ['Gasolinera', 'Parking', 'Cargador eléctrico', 'Taller', 'Hospital', 'Farmacia', 'Cafetería']
      .map(c => '<button class="chip" data-c="' + c + '">' + c + '</button>').join('') + '</div>';
    recents.forEach(r => { list.push(r); html += rowHtml(list.length - 1, '🕘', r.name, r.sub || ''); });
    openSheet(html); bindRows(list);
    document.querySelectorAll('.chip').forEach(b => b.onclick = () => { $('#q').value = b.dataset.c; showSearch(b.dataset.c); });
    return;
  }
  const m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (m) {
    list.push({ name: 'Coordenadas', sub: q, lat: +m[1], lon: +m[2] });
    openSheet(html + rowHtml(0, '📍', 'Estas coordenadas', q), pickFor ? pickCancel : null); bindRows(list); return;
  }
  if (!sheetOpen() || !$('#sheetBody .sTitle')) openSheet(html + '<div class="muted">Buscando…</div>');
  const c = me || map.getCenter().toArray();
  try {
    const url = 'https://photon.komoot.io/api/?limit=10&q=' + encodeURIComponent(q) + '&lat=' + c[1].toFixed(4) + '&lon=' + c[0].toFixed(4);
    const hasNum = /\d/.test(q);
    const [pj, cj] = await Promise.all([getJSON(url).catch(() => ({ features: [] })), searchCarto(q).catch(() => [])]);
    const j = pj;
    if (seq !== searchSeq) return;
    const seen = {};
    const ccList = cj.slice();
    // Con número: primero las direcciones exactas (portales) de CartoCiudad
    if (hasNum) for (const d of ccList.filter(x => x.exact)) { list.push(d); seen[d.name + d.sub] = 1; }
    for (const f of j.features || []) {
      const p = f.properties || {}, [lon, lat] = f.geometry.coordinates;
      const name = p.name || ((p.street || '') + (p.housenumber ? ' ' + p.housenumber : '')) || p.city || 'Sin nombre';
      const sub = [p.name && p.street ? p.street + (p.housenumber ? ' ' + p.housenumber : '') : '', p.city || p.district || '', p.state || '',
        p.country && p.country !== 'España' ? p.country : ''].filter(Boolean).join(', ');
      const key = name + sub; if (seen[key]) continue; seen[key] = 1;
      const d = { name, sub, lon, lat, icon: p.housenumber ? '🏠' : (p.osm_key === 'highway' ? '🛣️' : p.osm_key === 'place' ? '🏙️' : '📍') };
      // una calle sin número cuando has escrito un número: mejor la de CartoCiudad
      if (hasNum && !p.housenumber && p.osm_key === 'highway' && ccList.some(x => x.exact)) continue;
      if (list.some(x => x.lat != null && Math.abs(x.lat - lat) < 3e-4 && Math.abs(x.lon - lon) < 3e-4 && x.name.split(',')[0].toLowerCase() === name.toLowerCase())) continue;
      list.push(d);
    }
    for (const d of ccList) {
      if (hasNum && d.exact) continue;
      const key = d.name + d.sub; if (seen[key]) continue; seen[key] = 1;
      if (list.length >= 14) break;
      list.push(d);
    }
    list.forEach((d, i) => { html += rowHtml(i, d.icon || '📍', d.name, d.sub, me && d.lat != null ? fmtDist(dist(me, [d.lon, d.lat])) : ''); });
    if (!list.length) html += '<div class="muted">No he encontrado nada. Prueba con la calle y el pueblo, p. ej. «Calle Mayor 5 Alcorcón».</div>';
    openSheet(html, pickFor ? pickCancel : null); bindRows(list);
  } catch (e) {
    if (seq === searchSeq) openSheet(html + '<div class="muted">No se pudo buscar (' + esc(e.message) + '). ¿Tienes internet?</div>');
  }
}

/* ====================== Rutas ====================== */
let navAlts = [], altBusy = false, altAt = 0, routeMode = 'car', viaPts = null, tripKind = null;
const routeKind = () => tripKind || cfg.routeType || 'fastest';
let dest = null, stops = [], routes = [], selIdx = 0, preview = false, active = null, navigating = false, pendingGo = null;

const VAL_ARROW = { 1: 'start', 2: 'start', 3: 'start', 4: 'dest', 5: 'dest', 6: 'dest', 7: 'straight', 8: 'straight', 9: 'slight_right',
  10: 'right', 11: 'sharp_right', 12: 'uturn', 13: 'uturn', 14: 'sharp_left', 15: 'left', 16: 'slight_left', 17: 'straight',
  18: 'slight_right', 19: 'slight_left', 20: 'slight_right', 21: 'slight_left', 22: 'straight', 23: 'slight_right', 24: 'slight_left',
  25: 'straight', 26: 'roundabout', 27: 'roundabout_exit', 28: 'straight', 29: 'straight', 37: 'slight_right', 38: 'slight_left' };
const ARROW = { start: '⬆', dest: '🏁', straight: '⬆', slight_right: '⬈', right: '➡', sharp_right: '⬊', uturn: '↩', sharp_left: '⬋',
  left: '⬅', slight_left: '⬉', roundabout: '⟳', roundabout_exit: '⬈', stop: '📍' };

async function routeValhalla(from, pts, vias) {
  const loc0 = { lat: from[1], lon: from[0] };
  if (speedMs > 3 && heading >= 0) { loc0.heading = Math.round(heading); loc0.heading_tolerance = 60; }
  const walk = routeMode === 'walk';
  if (walk) { delete loc0.heading; delete loc0.heading_tolerance; }
  const req = { locations: [loc0].concat(pts.map(p => ({ lat: p[1], lon: p[0], type: 'break' }))), costing: walk ? 'pedestrian' : 'auto',
    costing_options: walk ? { pedestrian: {} } : { auto: Object.assign({ use_tolls: cfg.tolls ? 0 : 0.5, use_highways: cfg.highways ? 0 : 1 },
      routeKind() === 'shortest' ? { shortest: true } : {}) },
    directions_options: { language: 'es-ES', units: 'kilometers' } };
  if (!walk && cfg.zbeAvoid && zbeMustAvoid()) {
    const ex = zbeExclude([from].concat(pts));
    if (ex.length) req.exclude_polygons = ex;
  }
  if (pts.length === 1 && !vias) req.alternates = 2;
  if (vias && vias.length) {
    // puntos de paso de una ruta guardada: van antes de la primera parada o del destino, en orden
    const vl = vias.map(p => ({ lat: p[1], lon: p[0], type: 'through' }));
    req.locations = [req.locations[0]].concat(vl, req.locations.slice(1));
  }
  const j = (req.exclude_polygons && N && N.post) ? await postJSON('https://valhalla1.openstreetmap.de/route', req)
    : await getJSON('https://valhalla1.openstreetmap.de/route?json=' + encodeURIComponent(JSON.stringify(req)));
  const trips = [j.trip].concat((j.alternates || []).map(a => a.trip)).filter(Boolean);
  return trips.map(trip => {
    const coords = [], steps = [];
    trip.legs.forEach((leg, li) => {
      const off = coords.length ? coords.length - 1 : 0;
      const pts = decode6(leg.shape); if (coords.length) pts.shift();
      coords.push(...pts);
      const last = li === trip.legs.length - 1;
      for (const m of leg.maneuvers) {
        let kind = VAL_ARROW[m.type] || 'straight';
        if (kind === 'dest' && !last) kind = 'stop';
        if (kind === 'start' && li > 0) continue;
        steps.push({ i: m.begin_shape_index + off, kind,
        text: m.instruction || '', pre: m.verbal_pre_transition_instruction || m.instruction || '',
        alert: m.verbal_transition_alert_instruction || m.verbal_pre_transition_instruction || m.instruction || '',
        street: (m.street_names || m.begin_street_names || [])[0] || '' });
      }
    });
    return { coords, steps, time: trip.summary.time, len: trip.summary.length * 1000, delay: 0, src: 'OSM' };
  });
}
function ttKind(m) {
  m = m || '';
  if (/WAYPOINT/.test(m)) return 'stop';
  if (/ARRIVE/.test(m)) return 'dest'; if (/DEPART/.test(m)) return 'start';
  if (/ROUNDABOUT/.test(m)) return 'roundabout'; if (/U_?TURN|MAKE_UTURN/.test(m)) return 'uturn';
  if (/SHARP_RIGHT/.test(m)) return 'sharp_right'; if (/SHARP_LEFT/.test(m)) return 'sharp_left';
  if (/BEAR_RIGHT|KEEP_RIGHT|EXIT_RIGHT|MOTORWAY_EXIT_RIGHT|SWITCH_PARALLEL_ROAD|TAKE_EXIT/.test(m)) return 'slight_right';
  if (/BEAR_LEFT|KEEP_LEFT|EXIT_LEFT|MOTORWAY_EXIT_LEFT/.test(m)) return 'slight_left';
  if (/RIGHT/.test(m)) return 'right'; if (/LEFT/.test(m)) return 'left';
  return 'straight';
}
async function routeTomTom(from, pts) {
  try { return await routeTomTom2(from, pts, true); } catch (e) { console.log('TomTom con carriles: ' + e.message); }
  return routeTomTom2(from, pts, false);
}
async function routeTomTom2(from, pts, withLanes) {
  let url = 'https://api.tomtom.com/routing/1/calculateRoute/' + [from].concat(pts).map(p => p[1] + ',' + p[0]).join(':') +
    '/json?key=' + encodeURIComponent(cfg.tomtom) + '&traffic=true&travelMode=car&routeType=' + routeKind() + '&instructionsType=text&language=es-ES' +
    (pts.length === 1 ? '&maxAlternatives=2' : '');
  if (cfg.tolls) url += '&avoid=tollRoads';
  if (cfg.highways) url += '&avoid=motorways';
  if (speedMs > 3 && heading >= 0) url += '&vehicleHeading=' + Math.round(heading);
  if (withLanes) url += '&sectionType=lanes&sectionType=traffic';
  const j = await getJSON(url);
  return (j.routes || []).map(r => {
    const coords = [];
    for (const leg of r.legs) for (const p of leg.points) coords.push([p.longitude, p.latitude]);
    const steps = ((r.guidance && r.guidance.instructions) || []).map(ins => ({ i: ins.pointIndex, kind: ttKind(ins.maneuver),
      text: ins.message || '', pre: ins.message || '', alert: ins.message || '', street: ins.street || ins.roadNumbers && ins.roadNumbers[0] || '' }));
    const lanes = (r.sections || []).filter(sc => /LANE/i.test(sc.sectionType || '') && sc.lanes && sc.lanes.length).map(sc => ({
      i0: sc.startPointIndex, i1: sc.endPointIndex,
      lanes: sc.lanes.map(l => ({ d: (l.directions || []).map(ttDir), f: l.follow ? ttDir(l.follow) : null })) }));
    return { coords, steps, lanes, time: r.summary.travelTimeInSeconds, len: r.summary.lengthInMeters, delay: r.summary.trafficDelayInSeconds || 0, src: 'TomTom' };
  });
}
/** Ruta desde «from» pasando por las paradas pendientes hasta el destino */
async function calcRoutes(from) {
  const pts = stops.map(p => [p.lon, p.lat]).concat([[dest.lon, dest.lat]]);
  if (routeMode === 'walk') return routeValhalla(from, pts);
  if (viaPts && viaPts.length) return routeValhalla(from, pts, viaPts);
  if (cfg.zbeAvoid && zbeMustAvoid() && zbeExclude([from].concat(pts)).length) {
    try { const r = await routeValhalla(from, pts); if (r.length) return r; } catch (e) { console.log('ZBE: ' + e.message); }
  }
  if (cfg.tomtom) {
    try { const r = await routeTomTom(from, pts); if (r.length) return r; } catch (e) { console.log('TomTom: ' + e.message); }
  }
  return routeValhalla(from, pts);
}
function prepRoute(r) {
  r.cum = [0];
  for (let i = 1; i < r.coords.length; i++) r.cum.push(r.cum[i - 1] + dist(r.coords[i - 1], r.coords[i]));
  r.total = r.cum[r.cum.length - 1] || 1;
  r.steps.forEach(s => { s.i = Math.min(s.i, r.coords.length - 1); s.at = r.cum[s.i]; });
  (r.lanes || []).forEach(l => { l.at0 = r.cum[Math.min(l.i0, r.coords.length - 1)]; l.at1 = r.cum[Math.min(l.i1, r.coords.length - 1)]; });
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  for (const c of r.coords) { minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]); minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]); }
  r.bbox = [minX, minY, maxX, maxY];
  r.walk = routeMode === 'walk';
  r.curves = r.walk ? [] : findCurves(r);
  indexRoutePois(r);
  r.zbe = r.walk ? null : zbeOnRoute(r);
  return r;
}
/** Busca los avisos que están encima de la ruta y su distancia desde el inicio */
function indexRoutePois(r) {
  const pad = 0.004, [a, b, c, d] = r.bbox, out = [];
  for (const p of allPois) {
    const pts = [[p.lon, p.lat]]; if (p.lon2 != null) pts.push([p.lon2, p.lat2]);
    if (p.line && p.line.length > 2) pts.push(p.line[Math.floor(p.line.length / 2)]);
    let best = null, last = null;
    for (const pt of pts) {
      if (pt[0] < a - pad || pt[0] > c + pad || pt[1] < b - pad || pt[1] > d + pad) continue;
      const lim = IS_CAMERA(p.cat) ? 35 : 80;
      let here = null;
      for (let i = 0; i < r.coords.length - 1; i++) {
        const A = r.coords[i], B = r.coords[i + 1];
        if (Math.abs(A[1] - pt[1]) > 0.02 && Math.abs(B[1] - pt[1]) > 0.02) continue;
        const pr = projSeg(pt, A, B);
        if (pr.d < lim) { const at = r.cum[i] + pr.t * (r.cum[i + 1] - r.cum[i]); if (here == null || at < here) here = at; }
      }
      if (here != null) { if (best == null || here < best) best = here; if (last == null || here > last) last = here; }
    }
    if (best != null) out.push({ p, at: best, end: last });
  }
  if (cfg.curves && r.curves) for (const c of r.curves) out.push(c);
  out.sort((x, y) => x.at - y.at);
  r.pois = out;
  r.nCam = out.filter(o => IS_CAMERA(o.p.cat)).length;
  r.nInc = out.length - r.nCam;
}
function drawRoutes() {
  if (!map || !map.getSource('route')) return;
  const line = r => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.coords } });
  const diff = (t, base) => { const m = Math.round((t - base) / 60); return m > 0 ? '+' + m + ' min' : m < 0 ? m + ' min' : 'igual'; };
  if (navigating && active) {
    map.getSource('route').setData({ type: 'FeatureCollection', features: [line(active)] });
    const restT = active.time * Math.max(0, active.total - nav.along) / active.total;
    map.getSource('routeAlt').setData({ type: 'FeatureCollection',
      features: navAlts.map((r, i) => Object.assign(line(r), { properties: { i, label: diff(r.time, restT) } })) });
  } else if (preview && routes.length) {
    map.getSource('route').setData({ type: 'FeatureCollection', features: [line(routes[selIdx])] });
    map.getSource('routeAlt').setData({ type: 'FeatureCollection',
      features: routes.map((r, i) => Object.assign(line(r), { properties: { i, label: diff(r.time, routes[selIdx].time) } })).filter((f, i) => i !== selIdx) });
  } else {
    map.getSource('route').setData({ type: 'FeatureCollection', features: [] });
    map.getSource('routeAlt').setData({ type: 'FeatureCollection', features: [] });
  }
}
function setDestMarker(d) {
  if (destMarker) destMarker.remove(); destMarker = null;
  if (d) destMarker = new maplibregl.Marker({ color: '#e53935' }).setLngLat([d.lon, d.lat]).addTo(map);
}
async function goTo(d, keepStops, walk) {
  if (navigating) stopNav(true);
  if (!keepStops) { stops = []; routeMode = walk ? 'walk' : 'car'; viaPts = null; tripKind = null; }
  dest = d; if (!d.park) addRecent({ name: d.name, sub: d.sub || '', lon: d.lon, lat: d.lat });
  setDestMarker(d);
  if (!me) {
    pendingGo = d;
    openSheet('<div class="sTitle">🚗 ' + esc(d.name) + '</div><div class="muted">Esperando la señal del GPS para calcular la ruta… Si tarda, sal a un sitio despejado.</div>',
      () => { pendingGo = null; cancelPreview(); });
    return;
  }
  pendingGo = null;
  const from = me;
  openSheet('<div class="sTitle">🚗 ' + esc(d.name) + '</div><div class="muted">Calculando la mejor ruta…</div>', cancelPreview);
  try {
    routes = (await calcRoutes(from)).map(prepRoute);
    if (!routes.length) throw new Error('sin ruta');
  } catch (e) {
    if (CAR && N) { N.carNav('{"err":' + JSON.stringify('No hay ruta: ' + e.message) + '}'); return; }
    openSheet('<div class="sTitle">No hay ruta</div><div class="sSub">' + esc(e.message) + '</div><button class="btn alt" id="rx">Cerrar</button>', cancelPreview);
    $('#rx').onclick = closeSheet; return;
  }
  preview = true; selIdx = 0; setFollow(false);
  drawRoutes();
  if (CAR) { fitRoutes(); startNav(); closeSheet(); return; }
  routeSheet(); fitRoutes();
  if (cfg.tomtom && cfg.ttinc) loadTT().then(() => { if (preview && sheetOpen() && $('#rGo')) routeSheet(); });
}
function fitRoutes() {
  let a = 180, b = 90, c = -180, d = -90;
  for (const r of routes) { a = Math.min(a, r.bbox[0]); b = Math.min(b, r.bbox[1]); c = Math.max(c, r.bbox[2]); d = Math.max(d, r.bbox[3]); }
  const sh = $('#sheet'), open = sh && !sh.classList.contains('hidden'), side = innerWidth > innerHeight && innerWidth >= 700;
  const pad = side ? { top: 40, bottom: 40, left: (open ? sh.offsetWidth + 24 : 40), right: 90 }
    : { top: 40, bottom: (open ? sh.offsetHeight + 20 : Math.round(innerHeight * 0.45)), left: 30, right: 80 };
  map.fitBounds([[a, b], [c, d]], { padding: pad, bearing: 0, pitch: 0, duration: 800 });
}
function routeSheet() {
  const best = Math.min(...routes.map(r => r.time)), shortest = Math.min(...routes.map(x => x.len));
  let h = '<div class="rHead"><div class="sTitle">' + (routeMode === 'walk' ? '🚶 ' : '🚗 ') + esc(dest.name) + '</div>' + (dest.sub ? '<div class="sSub">' + esc(dest.sub) + '</div>' : '') + '</div>';
  const z = routes[selIdx] && routes[selIdx].zbe;
  if (z) h += '<div class="rNote">🌿 Entra en la ZBE ' + esc(z.name) + ' · ' + (zbeMustAvoid() ? '⚠️ con etiqueta ' + LABEL_NAME[cfg.label] + ' puede que no puedas entrar' : 'con etiqueta ' + LABEL_NAME[cfg.label] + ' puedes entrar') + '</div>';
  h += '<div class="chips rChips">';
  if (routeMode === 'car') h += [['fastest', '⚡ Más rápida'], ['shortest', '📏 Más corta']]
    .map(([k, n]) => '<button class="chip' + (routeKind() === k ? ' on' : '') + '" data-rk="' + k + '">' + n + '</button>').join('');
  if (cfg.parkNear && routeMode === 'car') h += '<button class="chip" id="rPark">🅿️ <span id="rParkN">…</span></button>';
  h += '</div>';
  stops.forEach((p, i) => {
    h += '<div class="row"><div class="ri">📍</div><div class="rt"><div class="r1">Parada ' + (i + 1) + ': ' + esc(p.name) + '</div>' +
      (p.sub ? '<div class="r2">' + esc(p.sub) + '</div>' : '') + '</div><button class="rowbtn" data-xs="' + i + '">✕</button></div>';
  });
  h += '<div class="rCards">';
  routes.forEach((r, i) => {
    const eta = new Date(Date.now() + r.time * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const tag = routes.length > 1 ? (routeKind() === 'shortest' ? (r.len === shortest ? 'La más corta' : '') : (r.time === best ? 'La más rápida' : '')) : '';
    h += '<button class="rCard' + (i === selIdx ? ' sel' : '') + '" data-r="' + i + '">' +
      '<b>' + fmtTime(r.time) + '</b>' + (tag ? '<i>' + tag + '</i>' : '<i>&nbsp;</i>') +
      '<span>' + fmtDist(r.len) + ' · ' + eta + '</span>' +
      (r.delay > 60 ? '<span class="red">🔴 +' + fmtTime(r.delay) + ' atasco</span>' : '') +
      '<span>📷 ' + r.nCam + ' · ⚠️ ' + r.nInc + '</span></button>';
  });
  h += '</div>';
  h += '<div class="rActs"><button class="btn" id="rGo">▶ Iniciar</button>' +
    '<button class="rIco" id="rStop" title="Parada">➕<small>Parada</small></button><button class="rIco" id="rGas">⛽<small>Gasolina</small></button>' +
    '<button class="rIco" id="rList">📋<small>Detalles</small></button><button class="rIco" id="rMore">⋯<small>Más</small></button></div>' +
    '<div id="rMoreBox" class="hidden">' +
    (routeMode === 'car' ? '<button class="btn alt" id="rSave">💾 Guardar esta ruta</button>' : '') +
    '<div class="btnrow"><button class="btn alt" id="rFav">⭐ Favorito</button><button class="btn alt" id="rHome">🏠 Casa</button><button class="btn alt" id="rWork">💼 Trabajo</button></div>' +
    '<div class="muted" style="margin-top:8px">Rutas: ' + (routes[0].src === 'TomTom' ? 'TomTom con tráfico en directo' : 'OpenStreetMap (Valhalla)') + '</div></div>';
  openSheet(h, cancelPreview);
  $('#sheet').classList.add('routes'); $('#sheetBg').classList.add('hidden'); document.body.classList.add('picking-route');
  { const c = $('#sheetBody .rCard.sel'); if (c) c.scrollIntoView({ inline: 'center', block: 'nearest' }); }
  $('#rMore').onclick = () => { $('#rMoreBox').classList.toggle('hidden'); setTimeout(fitRoutes, 50); };
  document.querySelectorAll('#sheetBody [data-r]').forEach(el => el.onclick = () => selectRoute(+el.dataset.r));
  $('#rGo').onclick = () => { sheetOnClose = null; closeSheet(); startNav(); };
  $('#rList').onclick = () => stepsSheet(routes[selIdx], false);
  $('#rStop').onclick = () => startPick('stop');
  document.querySelectorAll('#sheetBody [data-rk]').forEach(b => b.onclick = () => {
    if (routeKind() === b.dataset.rk) return;
    tripKind = b.dataset.rk; const keepVia = viaPts, keepKind = tripKind;
    goTo(dest, true).then(() => { tripKind = keepKind; });
    viaPts = keepVia;
  });
  if ($('#rSave')) $('#rSave').onclick = () => saveRouteSheet(routes[selIdx]);
  if ($('#rPark')) { $('#rPark').onclick = () => parkListSheet(true); loadParkings(dest).then(() => { const e = $('#rParkN'); if (e) e.textContent = parkings.length ? parkings.length + ' parkings' : 'sin datos'; }); }
  $('#rGas').onclick = () => gasSheet(routes[selIdx], 0);
  $('#rFav').onclick = () => addFavorite(dest);
  $('#rHome').onclick = () => setFav('casa', Object.assign({}, dest, { name: 'Casa', sub: dest.name }));
  $('#rWork').onclick = () => setFav('trabajo', Object.assign({}, dest, { name: 'Trabajo', sub: dest.name }));
  document.querySelectorAll('#sheetBody [data-xs]').forEach(b => b.onclick = ev => { ev.stopPropagation(); stops.splice(+b.dataset.xs, 1); goTo(dest, true); });
}
function selectRoute(i) { selIdx = +i; drawRoutes(); routeSheet(); }
function stepsSheet(r, fromNav) {
  let h = '<div class="sTitle">Indicaciones</div>';
  const items = r.steps.map(s => ({ at: s.at, html: rowHtml(-1, ARROW[s.kind] || '⬆', s.text, s.street, fmtDist(s.at)) }))
    .concat((r.pois || []).map(o => ({ at: o.at, html: rowHtml(-1, CAT[o.p.cat].e, CAT[o.p.cat].n + (o.p.max ? ' · ' + o.p.max : ''), o.p.sub || '', fmtDist(o.at)) })));
  items.sort((a, b) => a.at - b.at).forEach(x => h += x.html);
  if (fromNav) h += '<div class="btnrow"><button class="btn alt" id="sStop">➕ Añadir parada</button><button class="btn alt" id="sGas">⛽ Gasolineras</button></div>' +
    '<div class="btnrow"><button class="btn alt" id="sShare">📤 Compartir mi llegada</button><button class="btn alt" id="sPark">🅿️ Parkings</button></div>';
  h += '<button class="btn alt" id="sBack">Volver</button>';
  openSheet(h, fromNav ? null : cancelPreview);
  $('#sBack').onclick = () => fromNav ? closeSheet() : routeSheet();
  if (fromNav) { $('#sStop').onclick = () => startPick('stop'); $('#sGas').onclick = () => gasSheet(active, nav.along);
    $('#sShare').onclick = () => { closeSheet(); shareEta(false); }; $('#sPark').onclick = () => { loadParkings(dest).then(() => parkListSheet(false)); }; }
}
function cancelPreview() {
  if (navigating || pickFor) return;
  preview = false; routes = []; dest = null; stops = []; setDestMarker(null); drawRoutes(); setFollow(true);
}

/* ====================== Navegación ====================== */
const nav = { idx: 0, step: 0, off: 0, lastReroute: 0, said: {}, along: 0, arrived: false };
function startNav() {
  active = routes[selIdx]; preview = false; navigating = true;
  Object.assign(nav, { idx: 0, step: 0, off: 0, lastReroute: Date.now(), said: {}, along: 0, arrived: false });
  navAlts = routes.filter((r, i) => i !== selIdx).map(r => markDivergence(r, 0)).filter(Boolean);
  routes = []; altAt = Date.now();
  document.body.classList.add('nav'); $('#btnGas').classList.remove('hidden'); $('#btnSet2').classList.remove('hidden'); $('#routeBar').classList.remove('hidden');
  $('#searchBar').classList.add('hidden'); $('#banner').classList.remove('hidden'); $('#navBar').classList.remove('hidden');
  drawRoutes(); setTimeout(() => { map.resize(); setFollow(true); }, 60);
  if (cfg.tomtom && cfg.ttinc && Date.now() - ttAt > 60000 && !active.walk) loadTT();
  nav.zbeSaid = false; nav.parkAsked = false;
  if (cfg.offlineRoute) setTimeout(() => prefetchRoute(active, false), 3000);
  const first = active.steps[0];
  sayNav((first ? first.pre + '. ' : '') + (!active.walk && active.nCam ? 'Hay ' + active.nCam + (active.nCam === 1 ? ' radar' : ' radares') + ' en la ruta.' : ''), true);
  if (me) navUpdate();
}
function stopNav(silent) {
  navigating = false; active = null; dest = null; stops = []; navAlts = []; showLanes(null); nav.nextDist = null; nav.nextKind = null; sharedEta = null; hideNotice();
  parkings = []; $('#parkPill').classList.add('hidden'); if (map && map.getSource('parkings')) map.getSource('parkings').setData({ type: 'FeatureCollection', features: [] });
  setTimeout(() => map && map.resize(), 50); hideAltPrompt(); declinedAlts.length = 0; setDestMarker(null);
  document.body.classList.remove('nav'); $('#btnGas').classList.add('hidden'); $('#btnSet2').classList.add('hidden'); $('#routeBar').classList.add('hidden');
  $('#searchBar').classList.remove('hidden'); $('#banner').classList.add('hidden'); $('#navBar').classList.add('hidden');
  drawRoutes(); setFollow(true);
  if (!silent && N) N.stopSpeak();
  if (CAR && N) N.carNav('{}');
}
$('#btnStop').onclick = () => {
  openSheet('<div class="sTitle">¿Terminar la ruta?</div><button class="btn red" id="sY">Sí, terminar</button><button class="btn alt" id="sN">Seguir</button>');
  $('#sY').onclick = () => { closeSheet(); stopNav(); }; $('#sN').onclick = closeSheet;
};
$('#btnRoutes').onclick = () => { if (active) stepsSheet(active, true); };

async function reroute() {
  nav.lastReroute = Date.now();
  if (!dest || !me) return;
  sayNav('Recalculando', true);
  try {
    const rs = await calcRoutes(me);
    if (!rs.length || !navigating) return;
    active = prepRoute(rs[0]);
    Object.assign(nav, { idx: 0, step: 0, off: 0, along: 0 });
    for (const k in nav.said) if (k.startsWith('s')) delete nav.said[k];
    navAlts = rs.slice(1).map(r => markDivergence(prepRoute(r), 0)).filter(Boolean); altAt = Date.now();
    drawRoutes(); maybeOfferAlt();
  } catch (e) { console.log('reroute ' + e.message); }
}

function navUpdate() {
  const r = active; if (!r || !me) return;
  // 1) Posición sobre la ruta
  let best = { d: 1e9, i: nav.idx, t: 0 };
  const from = Math.max(0, nav.idx - 3), to = Math.min(r.coords.length - 1, nav.idx + 150);
  for (let i = from; i < to; i++) {
    const pr = projSeg(me, r.coords[i], r.coords[i + 1]);
    if (pr.d < best.d) best = { d: pr.d, i, t: pr.t };
  }
  if (best.d > 120) { // búsqueda completa por si se ha saltado
    for (let i = 0; i < r.coords.length - 1; i++) { const pr = projSeg(me, r.coords[i], r.coords[i + 1]); if (pr.d < best.d) best = { d: pr.d, i, t: pr.t }; }
  }
  const tol = Math.max(35, Math.min(gpsAcc * 1.5, 80));
  if (best.d > tol) nav.off++; else { nav.off = 0; nav.idx = best.i; }
  if (nav.off >= 4 && Date.now() - nav.lastReroute > 12000) { reroute(); return; }
  nav.along = r.cum[nav.idx] + best.t * ((r.cum[nav.idx + 1] || r.cum[nav.idx]) - r.cum[nav.idx]);
  if (nav.off === 0 && best.d < 25 && r.coords[nav.idx + 1]) { // dibujar la flecha encima de la carretera
    const A = r.coords[nav.idx], B = r.coords[nav.idx + 1];
    setCarTarget([A[0] + (B[0] - A[0]) * best.t, A[1] + (B[1] - A[1]) * best.t]);
    anim.onRoute = { r, along: nav.along };
  } else anim.onRoute = null;
  if (viaPts && viaPts.length && dist(me, viaPts[0]) < 250) viaPts.shift();
  // Alternativas: se quitan las que ya has dejado atrás; se buscan nuevas cada 2 min
  const nAlt = navAlts.length;
  navAlts = navAlts.filter(a => nav.along < a.divAt + 40);
  if (nAlt !== navAlts.length || !navUpdate.lastDraw || Date.now() - navUpdate.lastDraw > 30000) { navUpdate.lastDraw = Date.now(); drawRoutes(); }
  if (!r.walk && !altBusy && Date.now() - altAt > 120000 && Date.now() - nav.lastReroute > 30000 && r.total - nav.along > 3000) refreshAlts();
  // 2) Próxima maniobra (y paradas intermedias superadas)
  while (nav.step < r.steps.length - 1 && r.steps[nav.step].at < nav.along + 8) {
    if (r.steps[nav.step].kind === 'stop' && stops.length) {
      const p = stops.shift(); sayNav('Has llegado a tu parada: ' + p.name + '. Cuando quieras, seguimos.', true); toast('📍 Parada: ' + p.name);
    }
    nav.step++;
  }
  const st = r.steps[nav.step]; if (!st) return;
  const dm = Math.max(0, st.at - nav.along);
  nav.nextDist = dm; nav.nextKind = st.kind;
  updateLanes(r, st, dm);
  const rest = Math.max(0, r.total - nav.along);
  $('#bArrow').textContent = ARROW[st.kind] || '⬆';
  $('#bDist').textContent = fmtDist(dm);
  $('#bStreet').textContent = st.street || st.text;
  const nx = r.steps[nav.step + 1];
  if (nx && nx.at - st.at < 150 && dm < 400) { $('#bThen').textContent = 'Después ' + (ARROW[nx.kind] || ''); $('#bThen').classList.remove('hidden'); }
  else $('#bThen').classList.add('hidden');
  const remT = r.time * (rest / r.total);
  $('#nEta').textContent = new Date(Date.now() + remT * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  $('#nRest').textContent = fmtTime(remT) + ' · ' + fmtDist(rest);
  if (CAR && N) N.carNav(JSON.stringify({ nav: 1, kind: st.kind, dist: Math.round(dm), street: st.street || '', text: st.text || '',
    then: nx && nx.at - st.at < 150 ? nx.kind : '', rest: Math.round(rest), remT: Math.round(remT), dest: dest ? dest.name : '' }));
  // 3) Voz
  const v = Math.max(speedMs, 5);
  const far = v > 25 ? 2000 : v > 14 ? 800 : 350;
  const near = Math.max(60, Math.min(v * 7, 250));
  const legLen = nav.step > 0 ? st.at - r.steps[nav.step - 1].at : st.at;
  if (st.kind === 'dest' && rest < (r.walk ? 20 : 40) && !nav.arrived) {
    nav.arrived = true;
    if (r.walk && dest && dest.park) { sayNav('Has llegado a tu coche', true); toast('🚗 Has llegado a tu coche'); clearPark(); }
    else { sayNav('Has llegado a tu destino', true); toast('🏁 Has llegado'); }
    const walked = r.walk;
    setTimeout(() => { stopNav(true); if (!walked) arrivedPark(); }, 4000); return;
  }
  navExtras(r, rest);
  if (dm <= far && dm > near + 80 && legLen > far * 0.6 && !nav.said['sf' + nav.step]) {
    nav.said['sf' + nav.step] = 1;
    sayNav(st.kind === 'dest' ? 'En ' + sayDist(dm) + ' llegarás a tu destino' : st.kind === 'stop' ? 'En ' + sayDist(dm) + ' llegarás a tu parada'
      : 'En ' + sayDist(dm) + ', ' + lowFirst(st.alert));
  }
  if (dm <= near && !nav.said['sn' + nav.step]) {
    nav.said['sn' + nav.step] = 1; nav.said['sf' + nav.step] = 1;
    sayNav(st.pre + (nx && nx.at - st.at < 120 && nx.kind !== 'straight' ? ' Y después, ' + lowFirst(nx.alert) : ''));
  }
}

/* ====================== Avisos de radares e incidencias ====================== */
let shownAlert = null;
const alerted = {}; // id -> {t, stage}
function checkAlerts() {
  if (!me) return;
  if (navigating && active && active.walk) { $('#alert').classList.add('hidden'); return; }
  const v = Math.max(speedMs, 0), kmh = v * 3.6;
  const camRange = Math.max(400, Math.min(v * 30, 1100)); // ~30 s de antelación
  const incRange = Math.max(800, Math.min(v * 60, 2500));
  let cands = [];
  if (navigating && active && active.pois) {
    for (const o of active.pois) {
      const d = o.at - nav.along;
      if (d < -30) continue; if (d > incRange) break;
      cands.push({ p: o.p, d: Math.max(0, d) });
    }
  } else if (kmh > 12) {
    // Modo libre: avisos delante de ti en tu dirección
    for (const p of allPois) {
      if (Math.abs(p.lat - me[1]) > 0.03 || Math.abs(p.lon - me[0]) > 0.04) continue;
      const pt = [p.lon, p.lat], d = dist(me, pt);
      const range = IS_CAMERA(p.cat) ? camRange : incRange;
      if (d > range) continue;
      const ang = angDiff(bearing(me, pt), heading);
      if (d > 60 && ang > (d < 250 ? 35 : 22)) continue;
      if (d <= 60 && ang > 90) continue;
      cands.push({ p, d });
    }
  }
  const now0 = new Date(), schoolTime = now0.getDay() >= 1 && now0.getDay() <= 5 && now0.getHours() >= 8 && now0.getHours() < 18;
  cands = cands.filter(c => {
    if (c.p.cat === 'curva') return kmh > 50 && c.d <= Math.max(250, Math.min(v * 12, 500));
    if (c.p.cat === 'escuela') return schoolTime && kmh > 20 && c.d <= 250;
    if (HAZ[c.p.cat]) return kmh > 20 && c.d <= Math.max(300, Math.min(v * 15, 700));
    return IS_CAMERA(c.p.cat) ? c.d <= camRange : c.d <= incRange;
  });
  cands.sort((a, b) => (IS_CAMERA(b.p.cat) - IS_CAMERA(a.p.cat)) || a.d - b.d);
  const top = cands.find(c => IS_CAMERA(c.p.cat) && c.d <= camRange) || cands[0];
  // Voz: una vez por aviso
  for (const c of cands) {
    const a = alerted[c.p.id];
    if (a && Date.now() - a.t < 15 * 60000) continue;
    if (c.p.cat === 'tramo' && c.p.fin && tramo) { alerted[c.p.id] = { t: Date.now() }; continue; }
    alerted[c.p.id] = { t: Date.now() };
    const n = CAT[c.p.cat].n;
    let t;
    if (c.p.cat === 'curva') t = c.p.sub + ' a ' + sayDist(c.d);
    else if (HAZ[c.p.cat]) t = CAT[c.p.cat].n + ' a ' + sayDist(c.d);
    else if (c.p.cat === 'tramo') t = c.p.fin ? 'Fin de tramo de velocidad controlada' : 'Tramo de velocidad controlada a ' + sayDist(c.d) + (c.p.max ? '. Límite ' + c.p.max : '');
    else if (IS_CAMERA(c.p.cat)) t = n + ' a ' + sayDist(c.d) + (c.p.max ? '. Límite ' + c.p.max : '');
    else t = 'Atención. ' + n + ' a ' + sayDist(c.d) + (c.p.road ? ' en la ' + c.p.road : '') +
      (c.p.delay >= 90 ? '. Pierdes unos ' + Math.round(c.p.delay / 60) + ' minutos' : '');
    beep(1); say(t);
    if (trip && IS_CAMERA(c.p.cat)) trip.radars = (trip.radars || 0) + 1;
    break; // un aviso de voz por posición
  }
  // Tarjeta visual
  const card = $('#alert');
  if (!top) { card.classList.add('hidden'); shownAlert = null; return; }
  const p = top.p, c = CAT[p.cat];
  shownAlert = p.id;
  card.classList.remove('hidden'); card.classList.toggle('free', !navigating);
  card.style.borderColor = c.c;
  $('#aIcon').textContent = c.e; $('#aTitle').textContent = c.n; $('#aSub').textContent = p.sub || '';
  $('#aDist').textContent = fmtDist(top.d);
  if (p.max) { $('#aLimit').textContent = p.max; $('#aLimit').classList.remove('hidden'); } else $('#aLimit').classList.add('hidden');
  const lim = p.max || (IS_CAMERA(p.cat) ? roadLimit : 0);
  const over = IS_CAMERA(p.cat) && lim && kmh > lim + 2;
  card.classList.toggle('speeding', !!over);
  if (over && (!checkAlerts.lastOver || Date.now() - checkAlerts.lastOver > 3500)) {
    checkAlerts.lastOver = Date.now(); beep(2); vib(300);
    if (!checkAlerts.saidOver || Date.now() - checkAlerts.saidOver > 20000) { checkAlerts.saidOver = Date.now(); say('Reduce la velocidad', true); }
  }
}

/* ====================== GPS ====================== */
window.onGps = (lat, lon, spd, brg, acc, isGps) => {
  const pos = [lon, lat], now = Date.now();
  gpsAcc = acc || 50;
  if (spd >= 0) speedMs = spd;
  else if (stats.lastPos && now - stats.lastT < 5000) speedMs = dist(stats.lastPos, pos) / ((now - stats.lastT) / 1000);
  if (brg >= 0 && speedMs > 1.5) heading = brg;
  else if (stats.lastPos && dist(stats.lastPos, pos) > 6) heading = bearing(stats.lastPos, pos);
  stats.lastPos = pos; stats.lastT = now;
  const firstFix = !me;
  me = pos;
  if (!map) return;
  setCarTarget(pos);
  if (!onGps.shAt || now - onGps.shAt > 3000) { onGps.shAt = now; carShadow(); }
  $('#spdVal').textContent = Math.round(speedMs * 3.6);
  { const arc = document.getElementById('spdArc'); if (arc) { const L = 200, top = Math.max(roadLimit ? roadLimit * 1.3 : 130, 60);
    arc.style.strokeDasharray = (Math.min(1, speedMs * 3.6 / top) * L).toFixed(1) + ' 1000'; } }
  if (!onGps.homeAt || now - onGps.homeAt > 10000) { onGps.homeAt = now; updateHome(); }
  if (navigating) { navUpdate(); renderRouteBar(); }
  updateTramo();
  checkAlerts();
  tripTick(pos, now);
  fatigueTick(now);
  if (cfg.hazards && (!osmHazAt.c || dist(osmHazAt.c, pos) > 2500) && now - (osmHazAt.t || 0) > 30000) loadHazards(pos);
  if (!navigating) zbeFreeCheck();
  if (firstFix && !preview) map.jumpTo({ center: pos, zoom: 15.5 });
  if (firstFix && pendingGo) goTo(pendingGo, true);
  updateLimit();
  if (map && (cfg.trees || cfg.lamps)) maybeLoadNature();
  if (!onGps.wxAt || now - onGps.wxAt > 10 * 60000) { onGps.wxAt = now; loadWeather(); }
  if (follow && !preview) moveCamera();
  if (!onGps.saved || now - onGps.saved > 60000) { onGps.saved = now; store.set('lastPos', pos); }
};
function moveCamera(force) {
  const kmh = speedMs * 3.6;
  const off = { lejos: -1, normal: 0, cerca: 0.8, muycerca: 1.6 }[cfg.zoomLvl] || 0;
  let target;
  if (cfg.autoZoom) {
    // A más velocidad, más lejos; a menos velocidad, más cerca (sin saltos)
    const f = Math.max(0, Math.min(1, (kmh - 15) / 105));
    target = navigating ? 17.2 - f * 2.4 : 16.6 - f * 2.2;
  } else target = navigating ? 16.6 : 16.2;
  target += off + zoomAdj;
  // Vista cenital (desde arriba) al acercarse a un cruce, rotonda o salida
  const junction = navigating && cfg.overhead && nav.nextKind && !/^(straight|start|dest)$/.test(nav.nextKind) && nav.nextDist != null &&
    nav.nextDist < Math.max(120, Math.min(speedMs * 9, 350));
  if (junction) target += 0.6;
  const z = Math.max(12, Math.min(19.5, target));
  const pitch = junction ? 0 : !cfg.persp ? 0 : navigating ? 55 : (kmh > 8 ? 40 : 0);
  const h = map.getCanvas().clientHeight;
  const padding = CAR ? { left: carArea.l, right: carArea.r, bottom: carArea.b,
      top: carArea.t + Math.round((h - carArea.t - carArea.b) * (navigating ? 0.35 : 0)) } : navigating && landscapeNav() ? { top: Math.round(h * 0.3), bottom: 0, left: Math.round(map.getCanvas().clientWidth * 0.36), right: 0 }
    : { top: navigating ? Math.round(h * 0.4) : 0, bottom: 0, left: 0, right: 0 };
  // El dibujo lo hace animFrame() a 60 imágenes por segundo; aquí solo se fija adónde tiene que ir la cámara
  anim.cam = { zoom: z, pitch, padding, rotate: !cfg.northUp && (navigating || kmh > 8) };
  if (force || anim.z == null) {
    const c = anim.disp || (me ? me : map.getCenter().toArray());
    const brg = cfg.northUp ? 0 : anim.cam.rotate ? (anim.brg != null ? anim.brg : heading) : map.getBearing();
    anim.z = z; anim.p = pitch; anim.pad = Object.assign({}, padding);
    anim.easeUntil = performance.now() + 750;
    map.easeTo({ center: c, zoom: z, bearing: brg, pitch, padding, duration: 700 });
  }
}
/* ====================== Movimiento suave del coche y de la cámara ======================
   El GPS da una posición por segundo. Entre una y otra se calcula dónde va el coche con su
   velocidad y rumbo, y se dibuja el mapa en cada imagen (como Google Maps), sin saltos. */
const anim = { disp: null, from: null, fromT: 0, fix: null, fixT: 0, v: 0, h: 0, brg: null, z: null, p: null, pad: null, cam: null, easeUntil: 0, last: 0, inJump: false };
function setCarTarget(pos) {
  const now = performance.now();
  if (!anim.disp || dist(anim.disp, pos) > 300) { anim.disp = pos.slice(); if (meMarker) meMarker.setLngLat(pos); }
  // Diferencia entre lo que se ve y el GPS nuevo: se irá borrando suavemente, sin frenar ni acelerar
  anim.off = [anim.disp[0] - pos[0], anim.disp[1] - pos[1]];
  anim.from = anim.disp.slice(); anim.fromT = now;
  anim.fix = pos.slice(); anim.fixT = now; anim.v = speedMs; anim.h = heading;
  if (anim.brg == null) anim.brg = heading;
}
/** Punto y rumbo de la ruta a «s» metros del inicio */
function routeAt(r, s) {
  const c = r.cum; let lo = 0, hi = c.length - 1;
  if (s <= 0) return { p: r.coords[0], i: 0 };
  if (s >= c[hi]) return { p: r.coords[hi], i: hi - 1 };
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= s) lo = m; else hi = m; }
  const A = r.coords[lo], B = r.coords[lo + 1], k = (s - c[lo]) / ((c[lo + 1] - c[lo]) || 1);
  return { p: [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k], i: lo };
}
function movePt(p, brgDeg, m) {
  const b = brgDeg * Math.PI / 180;
  return [p[0] + m * Math.sin(b) / (111320 * Math.cos(p[1] * Math.PI / 180)), p[1] + m * Math.cos(b) / 110540];
}
const sAng = (a, b) => ((a - b + 540) % 360) - 180;
function animFrame(t) {
  requestAnimationFrame(animFrame);
  if (!map || !anim.fix || !meMarker) return;
  const dt = Math.min(0.1, Math.max(0, (t - (anim.last || t)) / 1000)); anim.last = t;
  // Dónde está el coche ahora: posición del GPS + lo que ha avanzado desde entonces (máx. 1,5 s)
  const ahead = anim.v > 1.2 ? anim.v * Math.min(2, (t - anim.fixT) / 1000) : 0;
  let tgt;
  if (anim.onRoute && navigating && anim.onRoute.r === active) {
    // En ruta: avanza por encima de la carretera dibujada, siguiendo sus curvas
    const q = routeAt(active, anim.onRoute.along + ahead); tgt = q.p;
    const A = active.coords[q.i], B = active.coords[q.i + 1];
    if (A && B && anim.v > 2) heading = bearing(A, B);
  } else tgt = ahead ? movePt(anim.fix, anim.brg == null ? anim.h : anim.brg, ahead) : anim.fix;
  if (!anim.off) anim.off = [0, 0];
  const dec = Math.exp(-dt * 2.5); anim.off[0] *= dec; anim.off[1] *= dec;
  const pos = [tgt[0] + anim.off[0], tgt[1] + anim.off[1]];
  const moved = !anim.disp || Math.abs(pos[0] - anim.disp[0]) + Math.abs(pos[1] - anim.disp[1]) > 1e-8;
  anim.disp = pos;
  // El giro también se suaviza
  const dB = sAng(heading, anim.brg == null ? heading : anim.brg);
  anim.brg = ((anim.brg == null ? heading : anim.brg) + dB * Math.min(1, dt * 3) + 360) % 360;
  if (moved) meMarker.setLngLat(pos);
  if (Math.abs(dB) > 0.05 || moved) meMarker.setRotation(anim.brg);
  if (!follow || preview || !anim.cam || t < anim.easeUntil) return;
  const c = anim.cam, f = Math.min(1, dt * 2.2);
  const dz = c.zoom - anim.z, dp = c.pitch - anim.p;
  anim.z += dz * f; anim.p += dp * f;
  let padMoved = false;
  for (const key of ['top', 'bottom', 'left', 'right']) { const d = c.padding[key] - anim.pad[key]; if (Math.abs(d) > 0.5) { anim.pad[key] += d * f; padMoved = true; } else anim.pad[key] = c.padding[key]; }
  const brg = cfg.northUp ? 0 : c.rotate ? anim.brg : map.getBearing();
  if (!moved && Math.abs(dz) < 0.002 && Math.abs(dp) < 0.05 && !padMoved && Math.abs(sAng(brg, map.getBearing())) < 0.05) return;
  anim.inJump = true;
  try { map.jumpTo({ center: pos, zoom: anim.z, pitch: anim.p, bearing: brg, padding: anim.pad }); } finally { anim.inJump = false; }
}
let camZ = null;
function landscapeNav() { return innerWidth > innerHeight && innerWidth >= 700; }
function setFollow(on) {
  follow = on; $('#btnRecenter').classList.toggle('hidden', on || preview);
  if (on && me && map) moveCamera(true);
}
$('#btnRecenter').onclick = () => setFollow(true);

/* ====================== Avisar (estilo Waze) ====================== */
function reportSheet(pos) {
  const p = pos || me;
  if (!p) { toast('Esperando señal GPS…'); return; }
  const items = [['policia', 'police', '#64b5f6', 'Control'], ['accidente', 'crash', '#ef5350', 'Accidente'], ['peligro', 'alert', '#ffca28', 'Peligro'],
    ['v16', 'wrench', '#ffa726', 'Averiado'], ['atasco', 'jam', '#ff7043', 'Atasco'], ['obras', 'works', '#ffa726', 'Obras'],
    ['movil', 'camera', '#64b5f6', 'Radar móvil'], ['radar', 'camera', '#ef5350', 'Radar fijo nuevo']];
  const el = $('#reportPop');
  el.innerHTML = '<div class="rpHead"><b>' + (pos ? 'Avisar en ese punto' : 'Avisar aquí') + '</b><button class="circ sm" id="rpX">' + IC.close + '</button></div><div class="rpGrid">' +
    items.map(([k, ic, col, n]) => '<button class="rpT" data-k="' + k + '"><span class="ic" style="background:' + col + '2e;color:' + col + '">' + IC[ic] + '</span>' + n + '</button>').join('') + '</div>';
  el.classList.remove('hidden');
  $('#rpX').onclick = () => el.classList.add('hidden');
  el.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { el.classList.add('hidden'); addReport(b.dataset.k, p); });
  clearTimeout(reportSheet.t); reportSheet.t = setTimeout(() => el.classList.add('hidden'), 15000);
}
$('#btnReport').onclick = () => reportSheet(null);

/* ====================== Capas y tráfico ====================== */
$('#btnTraffic').onclick = () => {
  if (!cfg.tomtom) {
    openSheet('<div class="sTitle">🚦 Tráfico en directo</div><div class="sSub">Para ver los atascos en colores y que las rutas los esquiven, pega tu clave gratuita de TomTom en Ajustes. ' +
      'Las incidencias de la DGT (accidentes, obras, cortes, V16…) ya salen sin clave.</div><button class="btn" id="tGo">Ir a Ajustes</button>');
    $('#tGo').onclick = () => settingsPage('trafico'); return;
  }
  cfg.traffic = !cfg.traffic; saveCfg();
  if (map.getLayer('traffic')) map.setLayoutProperty('traffic', 'visibility', cfg.traffic ? 'visible' : 'none');
  $('#btnTraffic').classList.toggle('on', cfg.traffic);
  toast(cfg.traffic ? '🚦 Tráfico en directo activado' : 'Tráfico ocultado');
};
$('#btnTraffic').classList.toggle('on', cfg.traffic && !!cfg.tomtom);
$('#btnLayers').onclick = () => mapOptions();
function mapOptions() {
  const base = cfg.style === 'soft' ? 'soft' : (cfg.style === 'sat' || cfg.style === 'satw') ? 'sat' : 'std';
  const mode = cfg.style === 'light' ? 'day' : cfg.style === 'dark' ? 'night' : 'auto';
  const seg = (name, opts, cur) => '<div class="seg" data-seg="' + name + '">' + opts.map(([v, n]) => '<button data-v="' + v + '"' + (v === cur ? ' class="on"' : '') + '>' + n + '</button>').join('') + '</div>';
  const tile = (k, ic, n) => '<button class="tile' + (cfg[k] ? ' on' : '') + '" data-t="' + k + '">' + IC[ic] + n + '</button>';
  let h = '<div class="sTitle">Opciones del mapa</div>' +
    '<div class="sec">Vista</div>' + seg('view', [['2d', '2D'], ['3d', '3D']], cfg.persp ? '3d' : '2d') +
    '<div class="sec">Sonido</div>' + seg('sound', [['all', 'Voz'], ['alerts', 'Solo avisos'], ['off', 'Silencio']], cfg.sound) +
    '<div class="sec">Mapa</div><div class="mapCards">' +
    [['std', 'Estándar', 'linear-gradient(160deg,#e9e5dc 0 55%,#cfe3c4 55%)'], ['soft', 'Suave', 'linear-gradient(160deg,#f2f2f2 0 60%,#d9dde3 60%)'],
      ['sat', 'Satélite', 'linear-gradient(160deg,#4a6b3a 0 45%,#7a6a4a 45% 60%,#3c5a2e 60%)']]
      .map(([v, n, bg]) => '<button class="mCard' + (base === v ? ' on' : '') + '" data-base="' + v + '"><div class="pv" style="background:' + bg + '"></div><span>' + n + '</span></button>').join('') + '</div>' +
    (base === 'std' ? seg('mode', [['auto', 'Auto'], ['day', 'Día'], ['night', 'Noche']], mode) : '') +
    '<div class="rangeRow"><span data-ic="sun"></span><input type="range" min="0" max="2" step="1" id="darkRange" value="' + ({ normal: 0, mas: 1, mucho: 2 }[cfg.darkLvl] || 0) + '"><span data-ic="moon"></span><small class="muted" id="darkLbl"></small></div>' +
    '<div class="sec">En el mapa</div><div class="tiles">' +
    tile('traffic', 'traffic', 'Tráfico') + tile('b3d', 'building', 'Edificios 3D') + tile('radars', 'camera', 'Radares') +
    tile('semaforos', 'traffic', 'Semáforos') + tile('incid', 'alert', 'DGT') + (cfg.tomtom ? tile('ttinc', 'jam', 'Atascos') : '') +
    tile('gas', 'fuel', 'Gasolineras') + tile('zbeShow', 'leaf', 'ZBE') + tile('hazards', 'alert', 'Peligros') +
    tile('lamps', 'bulb', 'Farolas') + tile('trees', 'tree', 'Árboles') + tile('wxfx', 'cloud', 'Tiempo') +
    tile('shadows', 'shadow', 'Sombras') + tile('reports', 'flag', 'Mis avisos') + '</div>' +
    '<button class="btn alt" id="moSet">' + '⚙️ Más ajustes' + '</button>';
  openSheet(h);
  paintIcons($('#sheetBody'));
  const lbl = () => { const e = $('#darkLbl'); if (e) e.textContent = 'Brillo de noche: ' + ['oscuro', 'más claro', 'mucho más claro'][+$('#darkRange').value]; };
  lbl();
  document.querySelectorAll('#sheetBody .seg button').forEach(b => b.onclick = () => {
    const g = b.parentNode.dataset.seg, v = b.dataset.v;
    if (g === 'view') { cfg.persp = v === '3d'; saveCfg(); camZ = null; if (follow && me) moveCamera(); else map.easeTo({ pitch: cfg.persp ? 50 : 0 }); }
    if (g === 'sound') setSound(v);
    if (g === 'mode') { cfg.style = v === 'day' ? 'light' : v === 'night' ? 'dark' : 'auto'; saveCfg(); applyStyle(true); }
    mapOptions();
  });
  document.querySelectorAll('#sheetBody [data-base]').forEach(b => b.onclick = () => {
    const v = b.dataset.base;
    cfg.style = v === 'soft' ? 'soft' : v === 'sat' ? (me && (me[0] < -9.5 || me[0] > 4.5 || me[1] < 35.8 || me[1] > 43.9) ? 'satw' : 'sat') : 'auto';
    saveCfg(); applyStyle(true); mapOptions();
  });
  $('#darkRange').oninput = () => { cfg.darkLvl = ['normal', 'mas', 'mucho'][+$('#darkRange').value]; saveCfg(); lbl(); applyStyle(true); };
  document.querySelectorAll('#sheetBody [data-t]').forEach(b => b.onclick = () => {
    const k = b.dataset.t;
    if (k === 'traffic') { closeSheet(); $('#btnTraffic').onclick(); return; }
    cfg[k] = !cfg[k]; saveCfg();
    if (['radars', 'semaforos', 'incid', 'ttinc', 'reports', 'hazards'].includes(k)) { refreshPois(); if (k === 'ttinc' && cfg.ttinc) loadTT(); }
    if (k === 'gas' && map.getLayer('gas')) map.setLayoutProperty('gas', 'visibility', cfg.gas ? 'visible' : 'none');
    if (k === 'zbeShow') ['zbeFill', 'zbeLine'].forEach(id => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', cfg.zbeShow ? 'visible' : 'none'));
    lookChanged(k);
    b.classList.toggle('on', !!cfg[k]);
  });
  $('#moSet').onclick = settingsSheet;
}

/* ====================== Ajustes ====================== */
/* ====================== Ajustes (menú por secciones) ====================== */
let setPage = null;
const SET_PAGES = {
  general:  { i: '⚙️', n: 'General', d: 'Actualizaciones, radares y sincronizar ajustes' },
  aspecto:  { i: '🗺️', n: 'Visualización de mapa', d: 'Modo oscuro, vista 3D, zoom, capas del mapa, vehículo' },
  voz:      { i: '🔊', n: 'Voz y sonido', d: 'Indicaciones por voz, solo avisos o silencio' },
  ruta:     { i: '🧭', n: 'Navegación', d: 'Más rápida o más corta, peajes, autopistas, carriles' },
  coche:    { i: '🚗', n: 'Detalles del vehículo', d: 'Combustible, etiqueta, gasolineras y aparcamiento' },
  zbe:      { i: '🌿', n: 'Zonas de Bajas Emisiones', d: 'Avisos y evitar las ZBE' },
  avisos:   { i: '⚠️', n: 'Alertas y avisos', d: 'Límite de velocidad, cansancio, curvas, escuelas, DGT' },
  trafico:  { i: '🚦', n: 'Tráfico en directo', d: 'Clave de TomTom y atascos' },
  musica:   { i: '🎵', n: 'Música', d: 'Botón de música en el mapa' },
  offline:  { i: '📥', n: 'Mapa sin conexión', d: 'Guardar el mapa de tus rutas y de tu zona' },
  sync:     { i: '📲', n: 'Vincular móvil y coche', d: 'Aparcamiento, ajustes y favoritos entre el móvil y el coche' },
  app:      { i: 'ℹ️', n: 'Información', d: 'Versión y datos que usa la app' }
};
const SET_LOOK = {
  general: ['gear', '#1fb5d8', 'general actualizar version radares sincronizar'],
  aspecto: ['map', '#22a55a', 'mapa colores oscuro claro satelite 3d 2d edificios arboles farolas tiempo lluvia sombras vehiculo icono coche zoom camara vista cenital norte brujula trafico'],
  voz: ['vol', '#1e9bf0', 'voz sonido silencio avisos pitidos probar'],
  ruta: ['route', '#3b6ff0', 'navegacion ruta rapida corta peajes autopistas autovias carriles'],
  coche: ['car', '#1fb5d8', 'vehiculo coche combustible gasolina diesel etiqueta gasolineras parking aparcamiento'],
  zbe: ['leaf', '#2e9d4c', 'zona bajas emisiones etiqueta eco madrid'],
  avisos: ['alert', '#f57c00', 'alertas avisos limite velocidad cansancio curvas pasos a nivel escuelas peligros dgt'],
  trafico: ['traffic', '#e0a800', 'tomtom clave trafico atascos incidencias'],
  musica: ['music', '#e8478b', 'musica spotify deezer youtube'],
  offline: ['down', '#3b6ff0', 'sin conexion descargar mapa zona cobertura'],
  sync: ['phone', '#8e5cf0', 'vincular movil coche junsun aparcamiento sincronizar'],
  app: ['info', '#1fb5d8', 'informacion version datos creditos']
};
const wRow = (attr, ic, col, title, kw) => '<div class="wRow" ' + attr + ' data-kw="' + esc(kw.toLowerCase()) + '"><span class="wIc" style="background:' + col + '">' + IC[ic] + '</span><span class="wT">' + title + '</span><span class="wChev">›</span></div>';
const wHead = (title, backId) => '<div class="wHead"><button class="wBack" id="' + backId + '">' + IC.back + '</button><b>' + title + '</b></div>';
function settingsSheet() {
  setPage = null; backTo = null;
  const pg = k => { const L = SET_LOOK[k]; return wRow('data-pg="' + k + '"', L[0], L[1], SET_PAGES[k].n, SET_PAGES[k].n + ' ' + SET_PAGES[k].d + ' ' + L[2]); };
  const grp = (title, rows) => (title ? '<div class="wSec">' + title + '</div>' : '<div class="wSec sp"></div>') + '<div class="wGrp">' + rows + '</div>';
  let h = wHead('Ajustes', 'wClose') + '<div class="setSearch">' + IC.search + '<input id="setQ" placeholder="Buscar ajustes" autocomplete="off"></div>' +
    grp('', pg('general') + pg('aspecto') + pg('voz')) +
    grp('Preferencias de conducción', pg('ruta') + pg('coche') + pg('zbe') + pg('avisos') + pg('trafico') + pg('musica')) +
    grp('Mis sitios', wRow('data-go="favs"', 'star', '#f5a300', 'Casa, Trabajo y favoritos', 'casa trabajo favoritos rutas guardadas') +
      wRow('data-go="stats"', 'chart', '#22a55a', 'Mis viajes', 'viajes estadisticas kilometros') +
      wRow('data-go="voice"', 'mic', '#e5484d', 'Órdenes por voz', 'voz microfono ordenes dictado')) +
    grp('Dispositivos', pg('sync') + pg('offline')) +
    grp('', pg('app')) +
    '<div class="wVer">Versión ' + esc(N ? N.version() : 'web') + '</div>';
  openSheet(h);
  $('#sheet').classList.add('wz');
  $('#wClose').onclick = closeSheet;
  document.querySelectorAll('#sheetBody [data-pg]').forEach(el => el.onclick = () => { if (el.dataset.pg === 'sync') { backTo = settingsSheet; syncSheet(); } else settingsPage(el.dataset.pg); });
  document.querySelectorAll('#sheetBody [data-go]').forEach(el => el.onclick = () => { backTo = settingsSheet; ({ favs: favSheet, stats: statsSheet, voice: voiceHelp })[el.dataset.go](); });
  $('#setQ').oninput = e => {
    const q = noAcc(e.target.value);
    document.querySelectorAll('#sheetBody .wRow[data-kw]').forEach(r => r.style.display = !q || noAcc(r.dataset.kw).includes(q) ? '' : 'none');
    document.querySelectorAll('#sheetBody .wGrp').forEach(g => { const any = [...g.children].some(r => r.style.display !== 'none'); g.style.display = any ? '' : 'none';
      const sec = g.previousElementSibling; if (sec && sec.classList.contains('wSec')) sec.style.display = any ? '' : 'none'; });
  };
}
function settingsPage(k) {
  setPage = k; backTo = null;
  const pg = SET_PAGES[k];
  const clean = t => String(t).replace(/^[^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡(]+\s*/, '');
  const tg = (key, label, sub) => '<div class="set"><label>' + clean(label) + (sub ? '<small>' + sub + '</small>' : '') + '</label><input type="checkbox" data-k="' + key + '"' + (cfg[key] ? ' checked' : '') + '></div>';
  const sel = (key, label, opts, sub) => '<div class="set setcol"><label>' + clean(label) + (sub ? '<small>' + sub + '</small>' : '') + '</label><select data-sel="' + key + '">' +
    opts.map(([v, n]) => '<option value="' + v + '"' + (cfg[key] === v ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div>';
  const btn = (id, label, cls) => '<button class="btn ' + (cls || 'alt') + '" id="' + id + '">' + label + '</button>';
  const seg = (key, label, opts) => '<div class="set"><label>' + label + '</label><div class="seg mini" data-segk="' + key + '">' +
    opts.map(([v, n]) => '<button data-v="' + v + '"' + (String(cfg[key]) === String(v) ? ' class="on"' : '') + '>' + n + '</button>').join('') + '</div></div>';
  const sec = t => '<div class="wSec">' + t + '</div>';
  let h = wHead(pg.n, 'setBack');
  if (k === 'general') h +=
    tg('syncSettings', 'Sincronizar ajustes entre el móvil y el coche', 'Si los tienes vinculados') +
    btn('bUpd', '🔄 Buscar actualización (tienes la v' + esc(N ? N.version() : 'web') + ')') +
    btn('bRad', '📷 Actualizar los radares ahora');
  if (k === 'voz') h +=
    sec('Indicaciones por voz') + '<div class="wGrp">' +
    [['all', '🔊', 'Voz y avisos'], ['alerts', '🔔', 'Solo avisos'], ['off', '🔇', 'No']].map(([v, e, n]) =>
      '<div class="wRow" data-snd="' + v + '"><span class="wEm">' + e + '</span><span class="wT">' + n + '</span>' + (cfg.sound === v ? '<span class="wChk">✓</span>' : '') + '</div>').join('') + '</div>' +
    sec('Sonido') + tg('beep', 'Pitidos en radares y exceso de velocidad') + btn('bTest', '🔊 Probar la voz');
  if (k === 'musica') h +=
    tg('musicBtn', 'Mostrar en el mapa', 'Botón con el logo de la app que suena (Spotify, Deezer, YouTube Music…)') +
    btn('bMusic', '🔓 Permiso para ver lo que suena') +
    '<div class="muted" style="margin-top:10px">Funciona con cualquier app de música que muestre sus controles en las notificaciones.</div>';
  if (k === 'ruta') h +=
    sel('routeType', '🧭 Tipo de ruta por defecto', [['fastest', '⚡ La más rápida'], ['shortest', '📏 La más corta']], 'En cada viaje también puedes cambiarla al ver las rutas') +
    tg('tolls', '💶 Evitar peajes') + tg('highways', '🛣️ Evitar autopistas y autovías') +
    tg('lanes', '🛣️ Carriles al acercarte a un desvío', 'Con TomTom o con los datos de OpenStreetMap');
  if (k === 'avisos') h +=
    sec('Velocidad') +
    tg('limit', '🚫 Mostrar el límite de la vía', 'Sale de OpenStreetMap; en algunas calles no hay dato') +
    tg('limitWarn', '⚠️ Avisar si paso el límite de la vía') +
    sec('Seguridad') +
    tg('fatigue', '😴 Aviso de cansancio', 'A las 2 horas seguidas conduciendo te propone descansar') +
    tg('curves', '↪️ Curvas peligrosas en la ruta', 'Solo a más de 50 km/h') +
    tg('hazards', '🚂 Pasos a nivel, zonas escolares y peligros', 'Escuelas: de lunes a viernes de 8 a 18 h') +
    sec('En la carretera') +
    tg('incid', '⚠️ Incidencias de la DGT', 'Accidentes, obras, cortes, balizas V16') + tg('radars', '📷 Radares') + tg('reports', '🚩 Mis avisos');
  if (k === 'trafico') h +=
    '<div class="set setcol"><label>🔑 Clave de TomTom (gratis)<small>Activa el tráfico en directo, los atascos y las rutas que los esquivan. Se saca gratis en my.tomtom.com</small></label>' +
    '<input type="text" id="ttKey" placeholder="Pega aquí tu clave" value="' + esc(cfg.tomtom) + '" autocapitalize="off" autocorrect="off" spellcheck="false"></div>' +
    tg('ttinc', '🚗 Atascos e incidencias de TomTom', 'Se ven en el mapa y te avisa con el retraso en minutos') +
    tg('incid', '⚠️ Incidencias de la DGT', 'Accidentes, obras, cortes, balizas V16');
  if (k === 'aspecto') h +=
    sel('style', '🗺️ Modo oscuro y tipo de mapa', [['auto', 'Automático (claro de día, oscuro de noche)'], ['light', 'Claro'], ['dark', 'Oscuro'], ['soft', 'Suave'], ['sat', 'Satélite España (IGN)'], ['satw', 'Satélite mundial']]) +
    seg('persp', 'Vista del mapa', [['true', '3D'], ['false', '2D']]) +
    tg('northUp', 'Mantener orientación norte') +
    sec('Cámara') +
    sel('zoomLvl', '🔍 Distancia de la cámara', [['lejos', 'Lejos'], ['normal', 'Normal'], ['cerca', 'Cerca'], ['muycerca', 'Muy cerca']]) +
    tg('autoZoom', '🚀 Zoom automático', 'A más velocidad se aleja y a menos velocidad se acerca') +
    tg('overhead', '⬇️ Vista desde arriba en cruces y rotondas', 'Al acercarte a un giro, rotonda o salida la cámara se pone cenital') +
    tg('shadows', '🌗 Sombras según la hora', 'De edificios y del coche: sol, amanecer, atardecer o luz de luna') +
    sel('carSize', '🚗 Tamaño del icono del vehículo', [['normal', 'Normal'], ['grande', 'Grande'], ['muygrande', 'Muy grande']]) +
    sec('Información del mapa y superposiciones') +
    tg('traffic', '🚦 Mostrar tráfico', 'Necesita la clave de TomTom') +
    sel('darkLvl', '🌙 Brillo del modo oscuro', [['normal', 'Oscuro'], ['mas', 'Más claro'], ['mucho', 'Mucho más claro']]) +
    tg('b3d', '🏙️ Edificios en 3D', 'Al acercar e inclinar el mapa') +
    tg('trees', '🌳 Árboles', 'Al acercar mucho el mapa') + tg('lamps', '💡 Farolas', 'De noche se iluminan') +
    sec('Tiempo') +
    tg('wxfx', '🌧️ Efectos del tiempo real', 'Lluvia, nieve, niebla o tormenta si está pasando donde estás') +
    tg('wxchip', '🌡️ Tiempo y temperatura junto al velocímetro') +
    '<div class="chips"><button class="chip" data-fx="rain">🌧️ Ver lluvia</button><button class="chip" data-fx="snow">❄️ Ver nieve</button><button class="chip" data-fx="fog">🌫️ Ver niebla</button><button class="chip" data-fx="storm">⛈️ Ver tormenta</button></div>' +
    sec('Icono del vehículo') +
    '<div class="row" id="bCar"><div class="ri" style="width:46px">' + carSvg(cfg.car, cfg.carColor) + '</div><div class="rt"><div class="r1">' + CARS[cfg.car] + '</div><div class="r2">Toca para cambiar el icono y el color</div></div><div class="rr chev">›</div></div>';
  if (k === 'zbe') h +=
    sel('label', '🏷️ Etiqueta ambiental de tu coche', Object.keys(LABEL_NAME).map(x => [x, LABEL_NAME[x]])) +
    tg('zbe', '🔔 Avisar al entrar en una ZBE') + tg('zbeShow', '🗺️ Dibujar las ZBE en el mapa') +
    tg('zbeAvoid', '↪️ Evitar las ZBE en las rutas', 'Solo si tu etiqueta puede tener problemas (sin etiqueta, B o C). Esas rutas se calculan sin tráfico de TomTom');
  if (k === 'coche') h +=
    sel('label', '🏷️ Etiqueta ambiental', Object.keys(LABEL_NAME).map(x => [x, LABEL_NAME[x]])) +
    sel('fuel', '⛽ Mi combustible', Object.keys(FUELS).map(x => [x, FUELS[x].n])) +
    tg('gas', '⛽ Gasolineras con precio en el mapa') +
    tg('parkNear', '🅿️ Aparcamientos cerca del destino', 'Un botón pequeño al acercarte') +
    sec('¿Dónde aparqué?') +
    btn('bSync', '📲 Vincular móvil y pantalla del coche' + (cfg.syncCode ? ' ✅' : ''));
  if (k === 'offline') h +=
    tg('offlineRoute', '📥 Guardar el mapa de cada ruta', 'Al empezar una ruta se descarga el mapa del camino') +
    btn('bZone', '📥 Descargar el mapa de mi zona (30 km)') + btn('bCache', '🗂️ Mapa guardado en el móvil');
  if (k === 'app') h +=
    '<div class="wInfo"><b>Pro Maps</b><span>Versión ' + esc(N ? N.version() : 'web') + '</span></div>' +
    btn('bUpd', '🔄 Buscar actualización') +
    '<div class="muted" style="margin-top:12px">Mapa © OpenStreetMap y OpenFreeMap · Rutas Valhalla (FOSSGIS) · Incidencias DGT (datos abiertos) · Búsqueda Photon y CartoCiudad (IGN) · ' +
    'Satélite PNOA © IGN y Esri · Tiempo Open-Meteo · Tráfico TomTom (con tu clave) · Carburantes: Ministerio (datos abiertos).</div>';
  openSheet(h);
  $('#sheet').classList.add('wz');
  $('#setBack').onclick = settingsSheet;
  document.querySelectorAll('#sheetBody [data-snd]').forEach(r => r.onclick = () => { setSound(r.dataset.snd); settingsPage('voz'); });
  document.querySelectorAll('#sheetBody [data-segk]').forEach(g => g.querySelectorAll('button').forEach(b => b.onclick = () => {
    const key = g.dataset.segk, v = b.dataset.v; cfg[key] = v === 'true' ? true : v === 'false' ? false : v; saveCfg();
    g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    if (key === 'persp') { if (follow && me) moveCamera(true); else map.easeTo({ pitch: cfg.persp ? 50 : 0 }); }
  }));
  // Interruptores
  document.querySelectorAll('#sheetBody input[type=checkbox]').forEach(i => i.onchange = () => {
    const key = i.dataset.k; cfg[key] = i.checked; saveCfg();
    lookChanged(key);
    if (key === 'limit' && !cfg.limit) $('#limit').classList.add('hidden');
    if (key === 'autoZoom' || key === 'overhead' || key === 'northUp') { if (follow && me) moveCamera(true); }
    if (key === 'northUp') $('#btnNorth').classList.toggle('lock', cfg.northUp);
    if (key === 'traffic') { if (map.getLayer('traffic')) map.setLayoutProperty('traffic', 'visibility', cfg.traffic ? 'visible' : 'none'); $('#btnTraffic').classList.toggle('on', cfg.traffic); }
    if (key === 'musicBtn' && window.onMedia && N && N.mediaState) window.onMedia(N.mediaState());
    if (key === 'radars' || key === 'reports') refreshPois();
    if (key === 'zbeShow') ['zbeFill', 'zbeLine'].forEach(id => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', cfg.zbeShow ? 'visible' : 'none'));
    if (key === 'gas' && map.getLayer('gas')) map.setLayoutProperty('gas', 'visibility', cfg.gas ? 'visible' : 'none');
    if (key === 'ttinc' || key === 'incid') { refreshPois(); if (key === 'ttinc' && cfg.ttinc) loadTT(); }
  });
  // Desplegables
  document.querySelectorAll('#sheetBody select[data-sel]').forEach(sl => sl.onchange = () => {
    const key = sl.dataset.sel; cfg[key] = sl.value; saveCfg();
    if (key === 'style' || key === 'darkLvl') applyStyle(true);
    if (key === 'fuel') refreshGas();
    if (key === 'carSize') applyCar();
    if (key === 'sound') setSound(cfg.sound);
    if (key === 'zoomLvl') { camZ = null; if (follow && me) moveCamera(); }
  });
  // Botones
  const on = (id, f) => { const el = document.getElementById(id); if (el) el.onclick = () => { if (/^(bCar|bSync|bCache)$/.test(id)) backTo = () => settingsPage(k); f(); }; };
  on('bTest', () => say('Radar fijo a 500 metros. Límite 100.', true));
  on('bMusic', () => { if (N && N.mediaPermission) N.mediaPermission(); });

  on('bCar', carSheet);
  on('bSync', syncSheet);
  on('bZone', () => { closeSheet(); prefetchZone(); });
  on('bCache', cacheSheet);
  on('bUpd', () => { if (N) N.checkUpdate(); });
  on('bRad', () => { toast('Descargando radares… (puede tardar un minuto)', 5000); loadRadars(true); });
  const tk = document.getElementById('ttKey');
  if (tk) tk.onchange = e => {
    const had = !!cfg.tomtom; cfg.tomtom = e.target.value.trim(); saveCfg();
    toast(cfg.tomtom ? 'Clave de TomTom guardada' : 'Clave quitada'); if (had !== !!cfg.tomtom || cfg.tomtom) applyStyle(true);
    if (cfg.tomtom) loadTT(); else { ttInc = []; refreshPois(); }
  };
  document.querySelectorAll('#sheetBody [data-fx]').forEach(b => b.onclick = () => {
    closeSheet(); fx.set(b.dataset.fx, 1, 15); toast('Así se ve con ' + b.textContent.replace(/^\S+\s/, '').replace('Ver ', '') + ' (10 segundos)');
    clearTimeout(fx.demoT); fx.demoT = setTimeout(renderWeather, 10000);
  });
}
$('#btnSettings').onclick = settingsSheet;
$('#btnMore').onclick = () => document.body.classList.toggle('more');
document.querySelectorAll('#fabMore .fab').forEach(b => b.addEventListener('click', () => document.body.classList.remove('more')));
$('#btnSet2').onclick = settingsSheet;




/* ====================== Atascos e incidencias de TomTom (en directo) ====================== */
let ttInc = [], ttAt = 0, ttBusy = false;
const TT_CAT = { 0: 'incid', 1: 'accidente', 2: 'meteo', 3: 'peligro', 4: 'meteo', 5: 'meteo', 6: 'retencion', 7: 'carril', 8: 'corte',
  9: 'obras', 10: 'meteo', 11: 'meteo', 14: 'averia' };
const TT_FIELDS = '{incidents{type,geometry{type,coordinates},properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,from,to,length,delay,roadNumbers}}}';
/** Zonas a consultar: alrededor de ti y por delante en la ruta (TomTom admite zonas de hasta 10.000 km²) */
function ttBoxes() {
  const boxes = [], add = (c, dy, dx) => boxes.push([c[0] - dx, c[1] - dy, c[0] + dx, c[1] + dy]);
  const r = (navigating && active) || (preview && routes[selIdx]) || null;
  if (r) {
    const from = navigating ? nav.along : 0;
    let next = from;
    for (let i = 0; i < r.coords.length && boxes.length < 5; i++) {
      if (r.cum[i] >= next) { add(r.coords[i], 0.22, 0.3); next = r.cum[i] + 45000; }
    }
    add(r.coords[r.coords.length - 1], 0.15, 0.2);
  } else if (me || map) {
    add(me || map.getCenter().toArray(), 0.3, 0.4);
  }
  return boxes;
}
async function loadTT() {
  if (!cfg.tomtom || !cfg.ttinc || ttBusy) return;
  ttBusy = true; ttAt = Date.now();
  const out = {};
  try {
    for (const b of ttBoxes()) {
      const url = 'https://api.tomtom.com/traffic/services/5/incidentDetails?key=' + encodeURIComponent(cfg.tomtom) +
        '&bbox=' + b.map(v => v.toFixed(4)).join(',') + '&fields=' + encodeURIComponent(TT_FIELDS) +
        '&language=es-ES&timeValidityFilter=present';
      let j;
      try { j = await getJSON(url); } catch (e) { console.log('TomTom incidencias: ' + e.message); continue; }
      for (const inc of (j && j.incidents) || []) {
        const pr = inc.properties || {}, g = inc.geometry || {};
        if (!pr.id || out[pr.id]) continue;
        const cat = TT_CAT[pr.iconCategory] || 'incid';
        let line = null, first;
        if (g.type === 'LineString' && g.coordinates && g.coordinates.length) {
          first = g.coordinates[0];
          const step = Math.max(1, Math.floor(g.coordinates.length / 60));
          line = g.coordinates.filter((c, i) => i % step === 0 || i === g.coordinates.length - 1);
        } else if (g.type === 'Point') first = g.coordinates;
        if (!first) continue;
        const ev = (pr.events || [])[0] || {};
        const road = (pr.roadNumbers || [])[0] || '';
        const where = pr.from && pr.to ? pr.from + ' → ' + pr.to : (pr.from || '');
        const it = { id: 't' + pr.id, lon: first[0], lat: first[1], cat, src: 'TomTom', road, delay: pr.delay || 0, len: pr.length || 0,
          mag: pr.magnitudeOfDelay || 0, since: pr.startTime || '',
          sub: [ev.description, road, where].filter(Boolean).join(' · ') };
        if (line && line.length > 1) { it.line = line; const L = line[line.length - 1]; it.lon2 = L[0]; it.lat2 = L[1]; }
        out[pr.id] = it;
      }
    }
    ttInc = Object.values(out);
    refreshPois();
    if (navigating) {
      drawRoutes();
      const jamAhead = (active && active.pois || []).some(o => o.at > nav.along && o.at - nav.along < 30000 && (o.p.delay || 0) >= 120);
      if (jamAhead && !altBusy && Date.now() - altAt > 45000) refreshAlts();
    }
  } catch (e) { console.log('TomTom: ' + e.message); }
  ttBusy = false;
}


/* ====================== Barra de la ruta (se consume al avanzar) ====================== */
function renderRouteBar() {
  const el = $('#routeBar'); if (!navigating || !active) return;
  const r = active, T = r.total || 1, pct = v => Math.max(0, Math.min(100, v / T * 100)).toFixed(2) + '%';
  let h = '<div class="rbIn"><div class="rbTrack"></div>';
  // atascos y retenciones como tramos de color
  for (const o of r.pois || []) {
    if ((o.p.cat === 'retencion' || o.p.cat === 'corte') && o.end != null && o.end - o.at > 30 && o.end > nav.along) {
      const col = o.p.cat === 'corte' ? '#7f0000' : o.p.mag >= 3 ? '#b71c1c' : o.p.mag === 2 ? '#e53935' : '#fb8c00';
      h += '<div class="rbJam" style="left:' + pct(Math.max(o.at, nav.along)) + ';width:' + pct(o.end - Math.max(o.at, nav.along)) + ';background:' + col + '"></div>';
    }
  }
  h += '<div class="rbDone" style="width:' + pct(nav.along) + '"></div>';
  // iconos de lo que queda por delante (radares e incidencias)
  let lastX = -1e9;
  const ahead = (r.pois || []).filter(o => o.at > nav.along + 10 && !(o.p.cat === 'tramo' && o.p.fin) && !HAZ[o.p.cat]);
  for (const o of ahead) {
    const x = o.at / T * 100;
    if (x - lastX < 2.2) continue; // que no se monten unos sobre otros
    lastX = x;
    h += '<div class="rbIco" style="left:' + x.toFixed(2) + '%;background:' + CAT[o.p.cat].c + '">' + CAT[o.p.cat].e + '</div>';
  }
  for (const st of r.steps) if (st.kind === 'stop' && st.at > nav.along) h += '<div class="rbIco" style="left:' + pct(st.at) + ';background:#fff">📍</div>';
  h += '<div class="rbEnd">🏁</div><div class="rbMe" style="left:' + pct(nav.along) + '"></div></div>';
  el.innerHTML = h;
}

/* ====================== Tramo de velocidad controlada ====================== */
let tramo = null;
function updateTramo() {
  const box = $('#tramo');
  const hide = () => { box.classList.add('hidden'); document.body.classList.remove('tramo'); };
  if (!cfg.radars || !me || (navigating && active && active.walk)) { tramo = null; return hide(); }
  const now = Date.now();
  if (!tramo) {
    if (navigating && active && active.pois) {
      for (const o of active.pois) {
        if (o.p.cat !== 'tramo' || o.p.fin || o.p.g == null) continue;
        if (o.at <= nav.along + 5 && nav.along - o.at < 300) {
          const e = active.pois.find(x => x.p.cat === 'tramo' && x.p.fin && x.p.g === o.p.g && x.at > o.at);
          if (e) { tramo = { g: o.p.g, max: o.p.max || e.p.max || 0, route: true, endAt: e.at, end: [e.p.lon, e.p.lat], len: e.at - o.at }; break; }
        }
      }
    }
    if (!tramo && speedMs > 5) {
      for (const t of radars) {
        if (t.cat !== 'tramo' || t.fin || t.g == null || Math.abs(t.lat - me[1]) > 0.001) continue;
        if (dist(me, [t.lon, t.lat]) < 45) {
          const e = radars.find(x => x.g === t.g && x.fin);
          if (e) { tramo = { g: t.g, max: t.max || e.max || 0, route: false, end: [e.lon, e.lat], len: Math.max(200, dist([t.lon, t.lat], [e.lon, e.lat])) }; break; }
        }
      }
    }
    if (!tramo) return hide();
    Object.assign(tramo, { t0: now, trav: 0, last: me, minEnd: 1e9 });
    if (!tramo.max) tramo.max = roadLimit || 0;
  } else {
    const d = dist(tramo.last, me); if (d < 300) tramo.trav += d; tramo.last = me;
  }
  const rest = tramo.route && navigating && active ? Math.max(0, tramo.endAt - nav.along) : dist(me, tramo.end);
  tramo.minEnd = Math.min(tramo.minEnd, rest);
  const secs = (now - tramo.t0) / 1000;
  const avg = secs > 8 ? tramo.trav / secs * 3.6 : speedMs * 3.6;
  const finished = rest <= 25 || (!tramo.route && rest > tramo.minEnd + 150) || secs > 3600 || (tramo.route && !navigating);
  if (finished) {
    if (secs > 20) say('Fin de tramo. Tu velocidad media ha sido de ' + Math.round(avg) + ' kilómetros por hora');
    tramo = null; return hide();
  }
  const frac = Math.max(0, Math.min(1, rest / tramo.len));
  const lim = tramo.max;
  box.classList.remove('hidden'); document.body.classList.add('tramo');
  $('#tTitle').textContent = 'Tramo controlado' + (lim ? ' a ' + lim : '');
  $('#tSub').textContent = 'Quedan ' + fmtDist(rest) + (lim && avg > lim ? ' · baja un poco' : '');
  $('#tAvg').textContent = Math.round(avg);
  $('#tLim').textContent = lim || '?';
  $('#tFill').style.width = (frac * 100).toFixed(1) + '%';
  box.classList.toggle('over', !!lim && avg > lim + 2);
  box.classList.toggle('warn', !!lim && avg > lim - 3 && avg <= lim + 2);
  if (lim && avg > lim + 2 && secs > 15 && (!tramo.warned || now - tramo.warned > 30000)) {
    tramo.warned = now; beep(2); say('Tu media en el tramo es de ' + Math.round(avg) + '. El límite es ' + lim);
  }
}


/* ====================== Apariencia: satélite, 3D, árboles y farolas ====================== */
const SAT = {
  sat: { tiles: ['https://www.ign.es/wmts/pnoa-ma?request=GetTile&service=WMTS&VERSION=1.0.0&Layer=OI.OrthoimageCoverage&Style=default&Format=image/jpeg&TileMatrixSet=GoogleMapsCompatible&TileMatrix={z}&TileRow={y}&TileCol={x}'],
    attr: 'PNOA © Instituto Geográfico Nacional', max: 19 },
  satw: { tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attr: 'Imágenes © Esri', max: 18 }
};
/** Primera capa de nombres que va DESPUÉS de todas las calles, suelos y agua del estilo */
function labelsAfterGeometry() {
  const ls = map.getStyle().layers || [];
  let last = -1;
  ls.forEach((l, i) => { if (l.type === 'fill' || l.type === 'line' || l.type === 'background' || l.type === 'fill-extrusion') last = i; });
  const l = ls.slice(last + 1).find(x => x.type === 'symbol'); return l ? l.id : undefined;
}
/** Primera capa de calles (para poner el satélite por debajo de las calles) */
function firstLineLayer() {
  const l = (map.getStyle().layers || []).find(x => x.type === 'line'); return l ? l.id : undefined;
}
function firstSymbolLayer() {
  const ls = map.getStyle().layers || [];
  const l = ls.find(x => x.type === 'symbol'); return l ? l.id : undefined;
}
function addLookLayers() {
  const before = firstSymbolLayer();
  // Satélite por debajo de los nombres de calles
  if (SAT[cfg.style]) {
    const S = SAT[cfg.style];
    map.addSource('sat', { type: 'raster', tiles: S.tiles, tileSize: 256, maxzoom: S.max, attribution: S.attr });
    map.addLayer({ id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-opacity': 1 } }, firstLineLayer() || before);
  }
  // Edificios en 3D
  const src = Object.keys(map.getStyle().sources || {}).find(k => map.getStyle().sources[k].type === 'vector');
  // Se quitan los edificios 3D que trae el estilo (en el oscuro salen como losas negras) y se ponen los nuestros
  (map.getStyle().layers || []).filter(l => l.type === 'fill-extrusion').forEach(l => map.removeLayer(l.id));
  const before3d = labelsAfterGeometry();
  if (src) {
    // hide_3d: contornos de edificios que ya vienen por partes (si se levantan los dos, salen cajas huecas)
    map.addLayer({ id: 'b3d', type: 'fill-extrusion', source: src, 'source-layer': 'building', minzoom: 15,
      filter: ['!', ['to-boolean', ['get', 'hide_3d']]],
      layout: { visibility: cfg.b3d ? 'visible' : 'none' }, paint: b3dPaint() }, before3d);
    // Todos los nombres del estilo que quedaban por debajo de los edificios se suben por encima (en su mismo orden)
    const ls = map.getStyle().layers || [], bi = ls.findIndex(l => l.id === 'b3d');
    ls.slice(0, bi).filter(l => l.type === 'symbol').forEach(l => { try { before3d ? map.moveLayer(l.id, before3d) : map.moveLayer(l.id); } catch (e) { } });
    addPoiLabels(src);
    addShadowLayers(src);
  }
  // Zonas de Bajas Emisiones
  map.addSource('zbe', { type: 'geojson', data: zbeGeo() });
  map.addLayer({ id: 'zbeFill', type: 'fill', source: 'zbe', layout: { visibility: cfg.zbeShow ? 'visible' : 'none' },
    paint: { 'fill-color': '#43a047', 'fill-opacity': 0.08 } }, before);
  map.addLayer({ id: 'zbeLine', type: 'line', source: 'zbe', layout: { visibility: cfg.zbeShow ? 'visible' : 'none' },
    paint: { 'line-color': '#2e7d32', 'line-width': 2.5, 'line-dasharray': [3, 2], 'line-opacity': 0.8 } }, before);
  // Aparcamientos cerca del destino
  if (!map.hasImage('i_park')) map.addImage('i_park', makePark(), { pixelRatio: 2 });
  map.addSource('parkings', { type: 'geojson', data: parkGeo() });
  map.addLayer({ id: 'parkings', type: 'symbol', source: 'parkings', minzoom: 13,
    layout: { 'icon-image': 'i_park', 'icon-size': 0.8, 'icon-allow-overlap': true } });
  // Árboles y farolas
  if (!map.hasImage('i_tree')) map.addImage('i_tree', makeGlyph('🌳', 44), { pixelRatio: 2 });
  if (!map.hasImage('i_lamp')) map.addImage('i_lamp', makeLamp(), { pixelRatio: 2 });
  map.addSource('nature', { type: 'geojson', data: natureGeo() });
  map.addLayer({ id: 'lampGlow', type: 'circle', source: 'nature', minzoom: 15, filter: ['==', ['get', 'k'], 'l'],
    layout: { visibility: cfg.lamps ? 'visible' : 'none' },
    paint: { 'circle-color': '#ffd54f', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 6, 19, 26], 'circle-blur': 1, 'circle-opacity': 0 } });
  map.addLayer({ id: 'trees', type: 'symbol', source: 'nature', minzoom: 15.5, filter: ['==', ['get', 'k'], 't'],
    layout: { visibility: cfg.trees ? 'visible' : 'none', 'icon-image': 'i_tree', 'icon-size': ['interpolate', ['linear'], ['zoom'], 15.5, 0.45, 19, 1.1],
      'icon-allow-overlap': true, 'icon-pitch-alignment': 'viewport', 'icon-anchor': 'bottom' } });
  map.addLayer({ id: 'lamps', type: 'symbol', source: 'nature', minzoom: 15.5, filter: ['==', ['get', 'k'], 'l'],
    layout: { visibility: cfg.lamps ? 'visible' : 'none', 'icon-image': 'i_lamp', 'icon-size': ['interpolate', ['linear'], ['zoom'], 15.5, 0.45, 19, 1],
      'icon-allow-overlap': true, 'icon-pitch-alignment': 'viewport', 'icon-anchor': 'bottom' } });
  updateLampGlow();
}
/* Nombres de bares, tiendas y locales: el estilo oscuro no los trae, así que se añaden */
const POI_ICON = { cafe: '☕', bar: '🍺', beer: '🍺', restaurant: '🍴', fast_food: '🍔', ice_cream: '🍦', bakery: '🥖', shop: '🛍️', grocery: '🛒',
  supermarket: '🛒', clothing_store: '👕', pharmacy: '💊', hospital: '🏥', doctors: '🩺', bank: '🏦', fuel: '⛽', parking: '🅿️', school: '🏫',
  college: '🎓', library: '📚', cinema: '🎬', theatre: '🎭', museum: '🏛️', hotel: '🏨', lodging: '🏨', place_of_worship: '⛪', police: '👮',
  post: '✉️', town_hall: '🏛️', park: '🌳', playground: '🛝', sports_centre: '🏟️', pitch: '⚽', swimming: '🏊', hairdresser: '💇', car: '🚗',
  car_repair: '🔧', bus: '🚌', railway: '🚆', subway: '🚇', attraction: '📍' };
const POI_KIND = { cafe: 'Cafetería', bar: 'Bar', pub: 'Bar', beer: 'Bar', restaurant: 'Restaurante', fast_food: 'Comida rápida', ice_cream: 'Heladería',
  bakery: 'Panadería', supermarket: 'Supermercado', grocery: 'Tienda de alimentación', clothes: 'Tienda de ropa', clothing_store: 'Tienda de ropa', shop: 'Tienda',
  pharmacy: 'Farmacia', hospital: 'Hospital', doctors: 'Médico', bank: 'Banco', fuel: 'Gasolinera', parking: 'Aparcamiento', school: 'Colegio',
  college: 'Centro de estudios', library: 'Biblioteca', cinema: 'Cine', theatre: 'Teatro', museum: 'Museo', hotel: 'Hotel', lodging: 'Alojamiento',
  place_of_worship: 'Iglesia', police: 'Policía', post: 'Correos', town_hall: 'Ayuntamiento', park: 'Parque', playground: 'Parque infantil',
  sports_centre: 'Polideportivo', hairdresser: 'Peluquería', car_repair: 'Taller', bus: 'Parada de autobús', railway: 'Estación de tren', subway: 'Metro' };
function addPoiLabels(src) {
  const st = map.getStyle();
  const hasPoi = (st.layers || []).some(l => l.type === 'symbol' && l['source-layer'] === 'poi' && (!l.layout || l.layout.visibility !== 'none'));
  if (hasPoi) return;
  for (const k in POI_ICON) if (!map.hasImage('poi_' + k)) map.addImage('poi_' + k, makeGlyph(POI_ICON[k], 36), { pixelRatio: 2 });
  if (!map.hasImage('poi_dot')) { const S = 16, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    x.fillStyle = '#9fb0c8'; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); x.fill(); map.addImage('poi_dot', x.getImageData(0, 0, S, S), { pixelRatio: 2 }); }
  const cls = ['coalesce', ['get', 'subclass'], ''], klass = ['coalesce', ['get', 'class'], ''];
  const iconExpr = ['case'];
  for (const k in POI_ICON) { iconExpr.push(['any', ['==', cls, k], ['==', klass, k]], 'poi_' + k); }
  iconExpr.push('poi_dot');
  map.addLayer({ id: 'poiNames', type: 'symbol', source: src, 'source-layer': 'poi', minzoom: 17,
    filter: ['has', 'name'],
    layout: { 'icon-image': iconExpr, 'icon-size': 0.9, 'text-field': ['coalesce', ['get', 'name:es'], ['get', 'name']], 'text-font': ['Noto Sans Regular'],
      'text-size': 12, 'text-anchor': 'left', 'text-offset': [0.9, 0], 'text-max-width': 9, 'symbol-sort-key': ['coalesce', ['get', 'rank'], 99],
      'text-optional': true },
    paint: { 'text-color': '#dfe6f3', 'text-halo-color': '#1b2333', 'text-halo-width': 1.5 } });
}
/** Edificios con color según la altura y sombreado, para que se distingan paredes y tejados */
function b3dPaint() {
  const dark = curStyle === 'dark' || !!SAT[cfg.style];
  const h = ['coalesce', ['get', 'render_height'], ['get', 'height'], 6];
  return {
    'fill-extrusion-color': ['interpolate', ['linear'], h, 0, dark ? '#46557a' : '#e4ddd0', 20, dark ? '#55668f' : '#d8cfbf', 60, dark ? '#6b7fab' : '#c9bea9'],
    'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.6, h],
    'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.6, ['coalesce', ['get', 'render_min_height'], 0]],
    'fill-extrusion-opacity': 1,
    'fill-extrusion-vertical-gradient': true
  };
}
function updateLampGlow() {
  if (map && map.getLayer('lampGlow')) map.setPaintProperty('lampGlow', 'circle-opacity', isNight() ? 0.55 : 0);
}
function makeGlyph(emoji, S) {
  const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.font = Math.round(S * 0.8) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emoji, S / 2, S / 2 + 2);
  return x.getImageData(0, 0, S, S);
}
function makeLamp() {
  const W = 24, H = 48, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#4a5568'; x.fillRect(W / 2 - 1.5, 10, 3, H - 10); x.fillRect(W / 2 - 5, H - 4, 10, 4);
  x.fillStyle = '#2d3748'; x.beginPath(); x.moveTo(W / 2 - 7, 10); x.lineTo(W / 2 + 7, 10); x.lineTo(W / 2 + 4, 3); x.lineTo(W / 2 - 4, 3); x.fill();
  x.fillStyle = '#ffe082'; x.fillRect(W / 2 - 5, 10, 10, 3);
  return x.getImageData(0, 0, W, H);
}
let nature = { c: null, t: [], l: [], at: 0, busy: false };
const natureGeo = () => ({ type: 'FeatureCollection', features:
  nature.t.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: { k: 't' } })).concat(
  nature.l.map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: { k: 'l' } }))) });
async function maybeLoadNature() {
  if (nature.busy || map.getZoom() < 15 || Date.now() - nature.at < 8000) return;
  const c = (!follow || !me) ? map.getCenter().toArray() : me;
  if (nature.c && dist(nature.c, c) < 350) return;
  nature.busy = true; nature.at = Date.now();
  const R = 650, ll = c[1].toFixed(5) + ',' + c[0].toFixed(5);
  const q = '[out:json][timeout:20];(' + (cfg.trees ? 'node(around:' + R + ',' + ll + ')["natural"="tree"];' : '') +
    (cfg.lamps ? 'node(around:' + R + ',' + ll + ')["highway"="street_lamp"];' : '') + ');out body qt 4000;';
  for (const base of OVERPASS) {
    try {
      const j = await getJSON(base + encodeURIComponent(q));
      const t = [], l = [];
      for (const e of j.elements || []) (e.tags && e.tags.natural === 'tree' ? t : l).push([e.lon, e.lat]);
      nature = { c, t, l, at: Date.now(), busy: false };
      if (map.getSource('nature')) map.getSource('nature').setData(natureGeo());
      return;
    } catch (e) { console.log('Árboles/farolas: ' + e.message); }
  }
  nature.busy = false;
}
function lookChanged(k) {
  if (!map) return;
  if (k === 'b3d' && map.getLayer('b3d')) map.setLayoutProperty('b3d', 'visibility', cfg.b3d ? 'visible' : 'none');
  if (k === 'b3d' || k === 'shadows') updateLight();
  if (k === 'trees' && map.getLayer('trees')) { map.setLayoutProperty('trees', 'visibility', cfg.trees ? 'visible' : 'none'); nature.c = null; nature.at = 0; }
  if (k === 'lamps' && map.getLayer('lamps')) { ['lamps', 'lampGlow'].forEach(id => map.setLayoutProperty(id, 'visibility', cfg.lamps ? 'visible' : 'none')); nature.c = null; nature.at = 0; }
  if ((k === 'trees' || k === 'lamps') && (cfg.trees || cfg.lamps)) { if (map.getZoom() < 15) toast('Acerca el mapa para ver ' + (k === 'trees' ? 'los árboles' : 'las farolas')); maybeLoadNature(); }
  if (k === 'wxfx' || k === 'wxchip') renderWeather();
  if (k === 'hazards' || k === 'curves') { refreshPois(); if (cfg.hazards) { osmHazAt = {}; } }
}

/* ====================== Icono del vehículo ====================== */
const CARS = { arrow: 'Flecha', car: 'Turismo', sport: 'Deportivo', suv: 'Todoterreno', van: 'Furgoneta', moto: 'Moto' };
const CAR_COLORS = ['#33ccff', '#e53935', '#ffffff', '#212121', '#fdd835', '#43a047', '#fb8c00', '#8e24aa'];
function carSvg(kind, col) {
  const dark = '#1b2333', glass = '#9ad0ff', o = 'stroke="#fff" stroke-width="1.6"';
  const halo = '<circle cx="23" cy="23" r="21" fill="#1a73e8" fill-opacity=".16"/>';
  let b;
  switch (kind) {
    case 'car': b = '<rect x="13" y="5" width="20" height="36" rx="7" fill="' + col + '" ' + o + '/><path d="M15.5 14 Q23 10 30.5 14 L29 20 H17 Z" fill="' + glass + '"/>' +
      '<rect x="17" y="21" width="12" height="9" rx="2" fill="' + col + '" stroke="' + dark + '" stroke-opacity=".25"/><path d="M17 31 H29 L30 36 Q23 38 16 36 Z" fill="' + glass + '" opacity=".85"/>'; break;
    case 'sport': b = '<path d="M23 3 C31 3 33 9 33 16 L34 34 C34 40 30 43 23 43 C16 43 12 40 12 34 L13 16 C13 9 15 3 23 3 Z" fill="' + col + '" ' + o + '/>' +
      '<path d="M16 17 Q23 13 30 17 L28.5 24 H17.5 Z" fill="' + glass + '"/><rect x="18" y="25" width="10" height="7" rx="2" fill="' + dark + '" opacity=".35"/><rect x="21.5" y="4" width="3" height="10" fill="#fff" opacity=".7"/>'; break;
    case 'suv': b = '<rect x="12" y="4" width="22" height="38" rx="4" fill="' + col + '" ' + o + '/><path d="M14.5 12 H31.5 L30 18 H16 Z" fill="' + glass + '"/>' +
      '<rect x="16" y="19" width="14" height="16" rx="1.5" fill="' + dark + '" opacity=".3"/><rect x="15" y="21" width="16" height="1.6" fill="#fff" opacity=".6"/><rect x="15" y="31" width="16" height="1.6" fill="#fff" opacity=".6"/>'; break;
    case 'van': b = '<rect x="12" y="3" width="22" height="40" rx="4" fill="' + col + '" ' + o + '/><path d="M14 9 H32 L31 15 H15 Z" fill="' + glass + '"/>' +
      '<rect x="15" y="17" width="16" height="23" rx="1" fill="' + dark + '" opacity=".22"/>'; break;
    case 'moto': b = '<ellipse cx="23" cy="23" rx="6" ry="17" fill="' + dark + '" ' + o + '/><rect x="14" y="13" width="18" height="3" rx="1.5" fill="' + dark + '"/>' +
      '<ellipse cx="23" cy="22" rx="4.5" ry="9" fill="' + col + '"/><circle cx="23" cy="29" r="4.5" fill="' + col + '" stroke="#fff" stroke-width="1.2"/>'; break;
    default: b = '<path d="M23 6 L35 36 L23 29 L11 36 Z" fill="' + col + '" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>';
  }
  return '<svg viewBox="0 0 46 46">' + halo + b + '</svg>';
}
function carSheet() {
  let h = '<div class="sTitle">🚗 Tu vehículo en el mapa</div><div class="cars">';
  for (const k in CARS) h += '<button class="carOpt' + (cfg.car === k ? ' sel' : '') + '" data-car="' + k + '">' + carSvg(k, cfg.carColor) + CARS[k] + '</button>';
  h += '</div><div class="sec">Color</div><div class="colors">' + CAR_COLORS.map(c => '<button class="col' + (cfg.carColor === c ? ' sel' : '') +
    '" data-col="' + c + '" style="background:' + c + '"></button>').join('') + '</div><button class="btn" id="carOk">Listo</button>';
  openSheet(h);
  document.querySelectorAll('[data-car]').forEach(b => b.onclick = () => { cfg.car = b.dataset.car; saveCfg(); applyCar(); carSheet(); });
  document.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { cfg.carColor = b.dataset.col; saveCfg(); applyCar(); carSheet(); });
  $('#carOk').onclick = () => backTo ? backTo() : closeSheet();
}
function applyCar() {
  const el = document.getElementById('meIcon'); if (!el) return;
  el.innerHTML = carSvg(cfg.car, cfg.carColor);
  const px = { normal: 46, grande: 62, muygrande: 80 }[cfg.carSize] || 46;
  el.style.width = el.style.height = px + 'px';
  el.querySelector('svg').style.width = el.querySelector('svg').style.height = px + 'px';
  if (typeof carShadow === 'function' && map) carShadow();
}

/* ====================== Tiempo real (Open-Meteo) y efectos ====================== */
let wx = null;
async function loadWeather() {
  if (!cfg.wxfx && !cfg.wxchip) return renderWeather();
  const c = me || store.get('lastPos', null); if (!c) return;
  try {
    const j = await getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + c[1].toFixed(3) + '&longitude=' + c[0].toFixed(3) +
      '&current=weather_code,temperature_2m,precipitation,is_day,wind_speed_10m');
    const cur = j.current || {};
    wx = { code: cur.weather_code, temp: cur.temperature_2m, rain: cur.precipitation || 0, day: cur.is_day, wind: cur.wind_speed_10m || 0 };
    renderWeather();
  } catch (e) { console.log('Tiempo: ' + e.message); }
}
function wxKind(code) {
  if (code == null) return 'none';
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  return code === 0 ? 'clear' : 'cloud';
}
function wxIntensity(code) {
  if ([51, 56, 61, 66, 80, 71, 85].includes(code)) return 0.5;
  if ([53, 63, 81, 73].includes(code)) return 1;
  return 1.6;
}
function renderWeather() {
  const chip = $('#wx');
  if (cfg.wxchip && wx) {
    const k = wxKind(wx.code);
    const ico = { storm: '⛈️', snow: '❄️', rain: '🌧️', fog: '🌫️', clear: wx.day ? '☀️' : '🌙', cloud: wx.day ? '⛅' : '☁️' }[k] || '';
    chip.textContent = ico + ' ' + Math.round(wx.temp) + '°'; chip.classList.remove('hidden');
  } else chip.classList.add('hidden');
  const k = wx ? wxKind(wx.code) : 'none';
  fx.set(cfg.wxfx ? k : 'none', wx ? wxIntensity(wx.code) : 1, wx ? wx.wind : 0);
}
const fx = (() => {
  const cv = $('#fx'), ctx = cv.getContext('2d');
  let kind = 'none', amt = 1, wind = 0, parts = [], raf = 0, flash = 0;
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; };
  addEventListener('resize', size); size();
  function spawn(n) {
    parts = [];
    for (let i = 0; i < n; i++) parts.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, v: 0.6 + Math.random() * 0.8, r: 1 + Math.random() * 2.5 });
  }
  function frame() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    const W = cv.width, H = cv.height, drift = Math.min(wind, 50) / 12;
    if (kind === 'fog') {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(220,225,230,.55)'); g.addColorStop(1, 'rgba(220,225,230,.15)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (kind === 'rain' || kind === 'storm') {
      ctx.strokeStyle = 'rgba(190,215,255,.55)'; ctx.lineWidth = 1.3; ctx.beginPath();
      for (const p of parts) {
        const sp = 14 * p.v + 6; ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - drift * 2 - 1.5, p.y - sp * 1.4);
        p.y += sp; p.x += drift; if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
      }
      ctx.stroke();
      if (kind === 'storm') {
        if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (flash / 10 * 0.6) + ')'; ctx.fillRect(0, 0, W, H); flash--; }
        else if (Math.random() < 0.004) flash = 10;
      }
    }
    if (kind === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (const p of parts) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        p.y += p.v * 1.6; p.x += Math.sin(p.y / 30) * 0.6 + drift * 0.3; if (p.y > H + 5) { p.y = -5; p.x = Math.random() * W; }
      }
    }
    raf = requestAnimationFrame(frame);
  }
  return {
    set(k, a, w) {
      if (k === 'clear' || k === 'cloud') k = 'none';
      if (k === kind && a === amt) { wind = w; return; }
      kind = k; amt = a; wind = w;
      cancelAnimationFrame(raf); ctx.clearRect(0, 0, cv.width, cv.height);
      if (kind === 'none') return;
      spawn(kind === 'snow' ? Math.round(90 * amt) : kind === 'fog' ? 0 : Math.round(140 * amt));
      raf = requestAnimationFrame(frame);
    }
  };
})();

/* ====================== Carriles al acercarse a un desvío ====================== */
const LANE_ARROW = { through: '⬆', none: '⬆', '': '⬆', left: '⬅', slight_left: '⬉', sharp_left: '⬋', right: '➡', slight_right: '⬈', sharp_right: '⬊',
  reverse: '↩', merge_to_left: '⬉', merge_to_right: '⬈' };
function ttDir(d) {
  d = String(d || '').toUpperCase();
  return { STRAIGHT: 'through', SLIGHT_RIGHT: 'slight_right', RIGHT: 'right', SHARP_RIGHT: 'sharp_right', LEFT: 'left', SLIGHT_LEFT: 'slight_left',
    SHARP_LEFT: 'sharp_left', U_TURN: 'reverse' }[d] || 'through';
}
const KIND_OK = { right: ['right', 'sharp_right', 'slight_right'], sharp_right: ['sharp_right', 'right'], slight_right: ['slight_right', 'right', 'merge_to_right'],
  left: ['left', 'sharp_left', 'slight_left'], sharp_left: ['sharp_left', 'left'], slight_left: ['slight_left', 'left', 'merge_to_left'],
  uturn: ['reverse', 'left'], straight: ['through', 'none', ''] };
function showLanes(list) {
  const el = $('#lanes');
  if (!list || !list.length) { el.classList.add('hidden'); document.body.classList.remove('lanes'); return; }
  el.innerHTML = list.map(l => '<div class="lane' + (l.rec ? ' rec' : '') + '">' + l.dirs.slice(0, 3).map(d => LANE_ARROW[d] || '⬆').join('') + '</div>').join('');
  el.classList.remove('hidden'); document.body.classList.add('lanes');
}
function updateLanes(r, st, dm) {
  if (!cfg.lanes || r.walk) return showLanes(null);
  // 1) TomTom: tramos con carriles de la ruta
  const sec = (r.lanes || []).find(l => l.at0 - nav.along <= 600 && l.at1 >= nav.along - 10);
  if (sec) {
    const list = sec.lanes.map(l => ({ dirs: l.f ? [l.f] : (l.d.length ? l.d : ['through']), rec: !!l.f }));
    if (list.some(l => l.rec) && list.some(l => !l.rec)) return showLanes(list);
  }
  // 2) OpenStreetMap: carriles de la calle por la que vas (turn:lanes)
  const ok = KIND_OK[st.kind];
  if (ok && st.kind !== 'straight' && dm < 450 && dm > 5 && curWay) {
    const tl = curWay.fwd ? curWay.w.tl : (curWay.w.tlb || '');
    if (tl && tl.includes('|')) {
      const list = tl.split('|').map(x => { const dirs = x.split(';').map(s => s.trim()); return { dirs, rec: dirs.some(d => ok.includes(d)) }; });
      if (list.some(l => l.rec) && list.some(l => !l.rec)) return showLanes(list);
    }
  }
  showLanes(null);
}


/* ====================== Aviso genérico ====================== */
let noticeYes = null, noticeT = null;
function showNotice(ico, title, sub, yesLabel, onYes, noLabel, ms) {
  $('#nIco').textContent = ico; $('#nTitle').textContent = title; $('#nSub').textContent = sub || '';
  $('#nYes').textContent = yesLabel || 'Aceptar'; $('#nYes').classList.toggle('hidden', !onYes);
  $('#nNo').textContent = noLabel || 'Cerrar';
  noticeYes = onYes; $('#notice').classList.remove('hidden');
  clearTimeout(noticeT); if (ms) noticeT = setTimeout(hideNotice, ms);
}
function hideNotice() { clearTimeout(noticeT); $('#notice').classList.add('hidden'); noticeYes = null; }
$('#nNo').onclick = hideNotice;
$('#nYes').onclick = () => { const f = noticeYes; hideNotice(); if (f) f(); };

/* ====================== ¿Dónde aparqué? (+ sincronizar con el otro dispositivo) ====================== */
let park = store.get('park', null), parkMarker = null;
const devId = store.get('devId', null) || (() => { const id = Math.random().toString(36).slice(2, 10); store.set('devId', id); return id; })();
function drawPark() {
  if (parkMarker) { parkMarker.remove(); parkMarker = null; }
  $('#qPark').classList.toggle('hidden', !park);
  if (!park || !map) return;
  const el = document.createElement('div'); el.className = 'parkMk'; el.textContent = 'P';
  el.onclick = ev => { ev.stopPropagation(); parkSheet(); };
  parkMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([park.lon, park.lat]).addTo(map);
}
function restorePark() { drawPark(); }
function savePark(pos, manual, from) {
  park = { lon: pos[0], lat: pos[1], t: Date.now(), dev: from ? 'otro' : devId };
  store.set('park', park); drawPark();
  if (!from) syncPush();
  if (manual) { toast('🅿️ Aparcamiento guardado'); }
  if (from) toast('🅿️ Ubicación de tu coche recibida' + (from === 'sync' ? ' desde el otro dispositivo' : ''), 5000);
}
function clearPark() { park = null; store.set('park', null); store.set('parkClearedAt', Date.now()); drawPark(); syncPush(true); }
function parkText() {
  return '🅿️ Mi coche está aparcado aquí: https://maps.google.com/?q=' + park.lat.toFixed(6) + ',' + park.lon.toFixed(6) + ' (Pro Maps)';
}
function arrivedPark() {
  if (!me) return;
  savePark(me, false);
  const paired = !!cfg.syncCode;
  showNotice('🅿️', 'Aparcamiento guardado', paired ? 'Ya lo tienes también en el otro dispositivo vinculado' : 'Para verlo en el móvil, envíatelo o vincula los dispositivos en Ajustes',
    paired ? null : 'Enviar por WhatsApp', paired ? null : () => N && N.share(parkText(), true), 'Vale', 15000);
}
function parkSheet() {
  if (!park) { toast('No hay ningún aparcamiento guardado'); return; }
  const d = me ? dist(me, [park.lon, park.lat]) : null;
  const ago = Math.round((Date.now() - park.t) / 60000);
  const agoTxt = ago < 60 ? 'hace ' + ago + ' min' : ago < 1440 ? 'hace ' + Math.floor(ago / 60) + ' h ' + (ago % 60) + ' min' : 'el ' + new Date(park.t).toLocaleDateString('es-ES');
  openSheet('<div class="sTitle">🅿️ Tu coche</div><div class="sSub">Aparcado ' + agoTxt + (d != null ? ' · a ' + fmtDist(d) + ' de ti' : '') + '</div>' +
    '<button class="btn" id="pkWalk">🚶 Llévame andando</button>' +
    '<div class="btnrow"><button class="btn alt" id="pkSee">🗺️ Ver en el mapa</button><button class="btn alt" id="pkShare">📤 Compartir</button></div>' +
    '<button class="btn red" id="pkDel">🗑️ Ya he cogido el coche</button>');
  $('#pkWalk').onclick = () => { closeSheet(); goTo({ name: 'Mi coche', sub: 'Aparcado ' + agoTxt, lon: park.lon, lat: park.lat, park: true }, false, true); };
  $('#pkSee').onclick = () => { closeSheet(); setFollow(false); map.flyTo({ center: [park.lon, park.lat], zoom: 17 }); };
  $('#pkShare').onclick = () => N && N.share(parkText(), false);
  $('#pkDel').onclick = () => { closeSheet(); clearPark(); toast('Aparcamiento borrado'); };
}
// Sincronización: canal privado en ntfy.sh (gratis, sin cuenta). Los mensajes se guardan 12 horas.
const syncTopic = () => cfg.syncCode ? 'promaps-' + cfg.syncCode.toLowerCase() + '-p' : null;
function syncPush(cleared) {
  const t = syncTopic(); if (!t || !N || !N.post) return;
  const msg = JSON.stringify({ type: cleared ? 'unpark' : 'park', lon: park && park.lon, lat: park && park.lat, t: Date.now(), dev: devId });
  const id = 'r' + (++reqN); pend[id] = { res: () => { }, rej: e => console.log('sync ' + e.message) };
  N.post(id, 'https://ntfy.sh/' + t, msg, JSON.stringify({ Title: 'Pro Maps', Tags: 'car' }));
}
async function syncPoll() {
  const t = syncTopic(); if (!t) return;
  try {
    const txt = await get('https://ntfy.sh/' + t + '/json?poll=1&since=12h');
    let last = null;
    const parts = {};
    for (const line of txt.split('\n')) {
      if (!line.trim()) continue;
      try {
        const m = JSON.parse(line); if (m.event !== 'message') continue; const o = JSON.parse(m.message);
        if (o.dev === devId) continue;
        if (o.type === 'state') { (parts[o.t] = parts[o.t] || { n: o.n, got: {} }).got[o.i] = o.d; continue; }
        if (!last || o.t > last.t) last = o;
      } catch (e) { }
    }
    applyRemoteState(parts);
    if (!last) return;
    const mine = park ? park.t : (store.get('parkClearedAt', 0));
    if (last.t <= mine || last.t <= store.get('syncSeen', 0)) return;
    store.set('syncSeen', last.t);
    if (last.type === 'unpark') { if (park) { park = null; store.set('park', null); drawPark(); } return; }
    park = { lon: last.lon, lat: last.lat, t: last.t, dev: 'otro' }; store.set('park', park); drawPark();
    toast('🅿️ Tu coche se ha aparcado (desde el otro dispositivo)', 5000);
  } catch (e) { console.log('sync poll ' + e.message); }
}

/* ====================== Ajustes sincronizados entre dispositivos ====================== */
let statePushT = null;
function stateChanged() {
  store.quiet = true; store.set('stateT', Date.now()); store.quiet = false;
  clearTimeout(statePushT); statePushT = setTimeout(pushState, 4000);
}
function stateSnapshot() {
  const c = {}; for (const k in cfg) if (!LOCAL_CFG[k]) c[k] = cfg[k];
  return { cfg: c, favs: store.get('favs', {}), favList: store.get('favList', []), savedRoutes: store.get('savedRoutes', []) };
}
/** Envía los ajustes en trozos (ntfy admite mensajes de hasta 4 KB) */
function pushState() {
  const t = syncTopic(); if (!t || !cfg.syncSettings || !N || !N.post) return;
  const ts = store.get('stateT', 0); if (!ts) return;
  const data = JSON.stringify(stateSnapshot()), size = 3000, n = Math.ceil(data.length / size);
  for (let i = 0; i < n; i++) {
    const id = 'r' + (++reqN); pend[id] = { res: () => { }, rej: e => console.log('sync ajustes ' + e.message) };
    N.post(id, 'https://ntfy.sh/' + t, JSON.stringify({ type: 'state', t: ts, i, n, d: data.slice(i * size, (i + 1) * size), dev: devId }), '{}');
  }
}
function applyRemoteState(parts) {
  if (!cfg.syncSettings) return;
  const mine = store.get('stateT', 0);
  const ts = Object.keys(parts).map(Number).filter(x => x > mine && Object.keys(parts[x].got).length === parts[x].n).sort((a, b) => b - a)[0];
  if (!ts) return;
  let st;
  try { const p = parts[ts]; st = JSON.parse(Array.from({ length: p.n }, (_, i) => p.got[i]).join('')); } catch (e) { return; }
  const oldStyle = cfg.style, oldDark = cfg.darkLvl, oldKey = cfg.tomtom;
  store.quiet = true;
  for (const k in st.cfg) if (!LOCAL_CFG[k]) cfg[k] = st.cfg[k];
  store.set('cfg', cfg);
  favs = st.favs || {}; store.set('favs', favs);
  favList = st.favList || []; store.set('favList', favList);
  store.set('savedRoutes', st.savedRoutes || []);
  store.set('stateT', ts);
  store.quiet = false;
  // aplicar en pantalla
  if (cfg.style !== oldStyle || cfg.darkLvl !== oldDark || cfg.tomtom !== oldKey) applyStyle(true);
  refreshPois(); refreshGas(); applyCar(); renderWeather();
  if (map && map.getLayer('gas')) map.setLayoutProperty('gas', 'visibility', cfg.gas ? 'visible' : 'none');
  ['zbeFill', 'zbeLine'].forEach(id => map && map.getLayer(id) && map.setLayoutProperty(id, 'visibility', cfg.zbeShow ? 'visible' : 'none'));
  ['b3d', 'trees', 'lamps'].forEach(k => lookChanged(k));
  if (cfg.tomtom && cfg.tomtom !== oldKey) loadTT();
  soundIcon(); updateLight();
  toast('⚙️ Ajustes y favoritos actualizados desde el otro dispositivo', 4500);
}

window.onResume = () => { syncPoll(); };
/** Modo tarjeta (Pro Inicio): al cambiar de ventana se vuelve a ajustar y pintar el mapa */
window.onCardMode = (on) => {
  document.body.classList.toggle('cardMode', !!on);
  [50, 400, 1200].forEach((ms) => setTimeout(() => { if (map) { map.resize(); map.triggerRepaint(); if (follow && me) moveCamera(); } }, ms));
};
function syncSheet() {
  const code = cfg.syncCode;
  let h = '<div class="sTitle">📲 Vincular dispositivos</div><div class="sSub">Vincula la pantalla del coche y el móvil: cuando aparques con la pantalla del coche, ' +
    'la ubicación del coche aparecerá en el móvil (botón «🅿️ Mi coche»). Y si quieres, los ajustes, Casa, Trabajo, favoritos y rutas guardadas serán iguales en los dos.</div>';
  if (code) h += '<div class="muted">Código de vinculación de este dispositivo:</div><div class="code">' + esc(code.slice(0, 4) + '-' + code.slice(4)) + '</div>' +
    '<div class="muted" style="margin-bottom:10px">Escribe este mismo código en el otro dispositivo (Ajustes → Vincular). Si ya lo has hecho, están vinculados.</div>' +
    '<div class="set"><label>⚙️ Sincronizar también los ajustes<small>Ajustes, Casa y Trabajo, favoritos y rutas guardadas. El zoom y el tamaño del icono se quedan como los tengas en cada pantalla.</small></label>' +
    '<input type="checkbox" id="sySet"' + (cfg.syncSettings ? ' checked' : '') + '></div>' +
    '<button class="btn alt" id="syNow">🔄 Enviar mis ajustes ahora al otro dispositivo</button>' +
    '<button class="btn red" id="syOff">Desvincular</button>';
  else h += '<button class="btn" id="syNew">➕ Crear un código nuevo</button><div class="sec">O escribe el código del otro dispositivo</div>' +
    '<input class="inl" id="syIn" maxlength="9" placeholder="Por ejemplo: K7PQ-M2XD" autocapitalize="characters"><button class="btn alt" id="syJoin">Vincular</button>';
  h += '<div class="muted" style="margin-top:10px">Funciona gratis a través de ntfy.sh, un servicio público de avisos. Solo viaja la posición del coche, en un canal que solo conoce quien tiene el código, y se borra a las 12 horas. ' +
    'Si abres la app del móvil más tarde de esas 12 horas, envíatela por WhatsApp desde la pantalla del coche (🅿️ Mi coche → Compartir).</div>';
  openSheet(h);
  if (code) {
    $('#syOff').onclick = () => { cfg.syncCode = ''; saveCfg(); syncSheet(); toast('Desvinculado'); };
    $('#sySet').onchange = e => { cfg.syncSettings = e.target.checked; saveCfg(); if (cfg.syncSettings) syncPoll(); };
    $('#syNow').onclick = () => { store.quiet = true; store.set('stateT', Date.now()); store.quiet = false; pushState(); toast('📤 Ajustes enviados. El otro dispositivo los recibe al abrir Pro Maps (o en 2 minutos si ya está abierta).', 5000); };
  }
  else {
    $('#syNew').onclick = () => {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = '';
      for (let i = 0; i < 8; i++) c += A[Math.floor(Math.random() * A.length)];
      cfg.syncCode = c; saveCfg(); syncSheet();
    };
    $('#syJoin').onclick = () => {
      const c = $('#syIn').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (c.length !== 8) { toast('El código tiene 8 letras o números'); return; }
      cfg.syncCode = c; saveCfg(); toast('✅ Vinculado'); syncPoll(); syncSheet();
    };
  }
}

/* ====================== Zonas de Bajas Emisiones ====================== */
const LABEL_NAME = { none: 'Sin etiqueta', b: 'B (amarilla)', c: 'C (verde)', eco: 'ECO', cero: '0 (cero emisiones)' };
const zbeMustAvoid = () => cfg.label === 'none' || cfg.label === 'b' || cfg.label === 'c';
let zbes = store.get('zbe', []);
async function loadZbe(force) {
  if (!force && zbes.length && Date.now() - store.get('zbeAt', 0) < 30 * 864e5) { refreshZbe(); return; }
  const q = '[out:json][timeout:120];area["ISO3166-1"="ES"][admin_level=2]->.es;(relation["boundary"="low_emission_zone"](area.es);way["boundary"="low_emission_zone"](area.es););out geom;';
  for (const base of OVERPASS) {
    try {
      const j = await getJSON(base + encodeURIComponent(q));
      const out = [];
      for (const el of j.elements || []) {
        const name = (el.tags && (el.tags.name || el.tags['name:es'])) || 'Zona de Bajas Emisiones';
        let rings = [];
        if (el.type === 'way' && el.geometry) rings.push(el.geometry.map(p => [p.lon, p.lat]));
        if (el.type === 'relation') rings = joinRings((el.members || []).filter(m => m.type === 'way' && m.geometry && m.role !== 'inner').map(m => m.geometry.map(p => [p.lon, p.lat])));
        for (let r of rings) {
          if (r.length < 4) continue;
          if (r.length > 400) { const k = Math.ceil(r.length / 400); r = r.filter((p, i) => i % k === 0); r.push(r[0]); }
          r = r.map(p => [+p[0].toFixed(5), +p[1].toFixed(5)]);
          let a = 180, b = 90, c = -180, d = -90; for (const p of r) { a = Math.min(a, p[0]); c = Math.max(c, p[0]); b = Math.min(b, p[1]); d = Math.max(d, p[1]); }
          out.push({ name, ring: r, bbox: [a, b, c, d] });
        }
      }
      zbes = out; store.set('zbe', zbes); store.set('zbeAt', Date.now()); refreshZbe(); return;
    } catch (e) { console.log('ZBE ' + base + ': ' + e.message); }
  }
}
/** Une los tramos de un borde en anillos cerrados */
function joinRings(segs) {
  const rings = [], key = p => p[0].toFixed(6) + ',' + p[1].toFixed(6);
  segs = segs.map(s => s.slice());
  while (segs.length) {
    let ring = segs.shift();
    let guard = 0;
    while (key(ring[0]) !== key(ring[ring.length - 1]) && guard++ < 500) {
      const endK = key(ring[ring.length - 1]);
      const i = segs.findIndex(s => key(s[0]) === endK || key(s[s.length - 1]) === endK);
      if (i < 0) break;
      let s = segs.splice(i, 1)[0]; if (key(s[0]) !== endK) s = s.reverse();
      ring = ring.concat(s.slice(1));
    }
    if (key(ring[0]) === key(ring[ring.length - 1])) rings.push(ring);
  }
  return rings;
}
const zbeGeo = () => ({ type: 'FeatureCollection', features: zbes.map(z => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [z.ring] }, properties: { name: z.name } })) });
function refreshZbe() { if (map && map.getSource('zbe')) map.getSource('zbe').setData(zbeGeo()); }
function inRing(pt, r) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if (((yi > pt[1]) !== (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
const zbeAt = pt => zbes.find(z => pt[0] >= z.bbox[0] && pt[0] <= z.bbox[2] && pt[1] >= z.bbox[1] && pt[1] <= z.bbox[3] && inRing(pt, z.ring));
/** Zonas a evitar: las que no contienen el origen, las paradas ni el destino */
function zbeExclude(pts) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const a = Math.min(...xs) - 0.5, c = Math.max(...xs) + 0.5, b = Math.min(...ys) - 0.5, d = Math.max(...ys) + 0.5;
  return zbes.filter(z => z.bbox[2] > a && z.bbox[0] < c && z.bbox[3] > b && z.bbox[1] < d && !pts.some(p => inRing(p, z.ring))).map(z => z.ring);
}
function zbeOnRoute(r) {
  if (!zbes.length) return null;
  const startIn = zbeAt(r.coords[0]);
  for (let i = 0, last = -1e9; i < r.coords.length; i++) {
    if (r.cum[i] - last < 80) continue; last = r.cum[i];
    const z = zbeAt(r.coords[i]);
    if (z && z !== startIn) return { at: r.cum[i], name: z.name };
  }
  return null;
}
let zbeInside = null;
function zbeFreeCheck() {
  if (!cfg.zbe || !me || !zbes.length) return;
  const z = zbeAt(me);
  if (z && z !== zbeInside && speedMs > 3) {
    if (zbeMustAvoid()) { beep(1); say('Has entrado en la Zona de Bajas Emisiones ' + z.name + '. Comprueba que tu etiqueta ' + LABEL_NAME[cfg.label].split(' ')[0] + ' puede circular'); }
    else toast('🌿 Zona de Bajas Emisiones: ' + z.name);
  }
  zbeInside = z || null;
}

/* ====================== Llegada compartida, ZBE y parkings durante la ruta ====================== */
let sharedEta = null;
function etaNow() { const r = active; return Date.now() + r.time * Math.max(0, r.total - nav.along) / r.total * 1000; }
function shareEta(update) {
  if (!active || !dest || !N) return;
  const eta = etaNow(), hh = new Date(eta).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const rest = Math.max(0, active.total - nav.along);
  const txt = (update ? '⏱️ Actualización: ' : '🚗 ') + 'Voy de camino a ' + dest.name + '. ' + (update ? 'Ahora llego' : 'Llego') + ' sobre las ' + hh +
    ' (me quedan ' + fmtDist(rest) + '). https://maps.google.com/?q=' + me[1].toFixed(5) + ',' + me[0].toFixed(5) + ' — Pro Maps';
  sharedEta = eta;
  N.share(txt, true);
}
function navExtras(r, rest) {
  // Retraso respecto a la hora de llegada que compartiste
  if (sharedEta && !nav.etaAsking) {
    const diff = (etaNow() - sharedEta) / 60000;
    if (Math.abs(diff) >= 5) {
      nav.etaAsking = true;
      showNotice('⏱️', diff > 0 ? 'Llegarás ' + Math.round(diff) + ' min más tarde' : 'Llegarás ' + Math.round(-diff) + ' min antes',
        'de lo que avisaste. ¿Quieres enviar la nueva hora?', 'Avisar', () => { nav.etaAsking = false; shareEta(true); }, 'Ahora no', 20000);
      setTimeout(() => { nav.etaAsking = false; sharedEta = etaNow(); }, 21000);
    }
  }
  // Entrada en una ZBE
  if (cfg.zbe && r.zbe && !nav.zbeSaid && r.zbe.at - nav.along < 1500 && r.zbe.at > nav.along) {
    nav.zbeSaid = true;
    if (zbeMustAvoid()) { beep(1); say('Atención. En ' + sayDist(r.zbe.at - nav.along) + ' entras en la Zona de Bajas Emisiones ' + r.zbe.name + '. Comprueba que tu etiqueta puede circular'); }
    else toast('🌿 Entras en la ZBE ' + r.zbe.name + ' (tu etiqueta puede)');
  }
  // Parkings cerca del destino: solo un botón pequeño al acercarte
  if (cfg.parkNear && !r.walk && rest < 1500 && !nav.parkAsked) {
    nav.parkAsked = true;
    loadParkings(dest).then(() => { if (navigating && parkings.length) { $('#parkN').textContent = parkings.length; $('#parkPill').classList.remove('hidden'); } });
  }
}

/* ====================== Aparcamientos cerca del destino (OpenStreetMap) ====================== */
let parkings = [], parkingsFor = null;
function makePark() {
  const S = 44, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = '#1565c0'; x.strokeStyle = '#fff'; x.lineWidth = 4;
  x.beginPath(); x.roundRect ? x.roundRect(3, 3, S - 6, S - 6, 9) : x.rect(3, 3, S - 6, S - 6); x.fill(); x.stroke();
  x.fillStyle = '#fff'; x.font = 'bold 28px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('P', S / 2, S / 2 + 2);
  return x.getImageData(0, 0, S, S);
}
const parkGeo = () => ({ type: 'FeatureCollection', features: parkings.map((p, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { i } })) });
async function loadParkings(d) {
  if (!d) return;
  if (parkingsFor && Math.abs(parkingsFor.lat - d.lat) < 1e-4 && Math.abs(parkingsFor.lon - d.lon) < 1e-4) return;
  parkingsFor = d;
  const q = '[out:json][timeout:20];nwr(around:800,' + d.lat.toFixed(5) + ',' + d.lon.toFixed(5) + ')["amenity"="parking"]["access"!~"private|customers|no|permissive"];out center 60;';
  for (const base of OVERPASS) {
    try {
      const j = await getJSON(base + encodeURIComponent(q));
      parkings = (j.elements || []).map(e => {
        const t = e.tags || {}, lon = e.lon != null ? e.lon : e.center && e.center.lon, lat = e.lat != null ? e.lat : e.center && e.center.lat;
        const kind = t.parking === 'underground' ? 'Subterráneo' : t.parking === 'multi-storey' ? 'Edificio' : t.parking === 'street_side' || t.parking === 'lane' ? 'En la calle' : 'Superficie';
        const fee = t.fee === 'no' ? 'Gratis' : t.fee === 'yes' ? 'De pago' : '';
        return { lon, lat, name: t.name || ('Aparcamiento ' + kind.toLowerCase()), kind, fee, cap: t.capacity || '', d: dist([d.lon, d.lat], [lon, lat]) };
      }).filter(p => p.lon != null && (p.cap === '' || +p.cap >= 8 || p.name.indexOf('Aparcamiento') !== 0)).sort((a, b) => a.d - b.d).slice(0, 25);
      if (map && map.getSource('parkings')) map.getSource('parkings').setData(parkGeo());
      return;
    } catch (e) { console.log('Parkings: ' + e.message); }
  }
}
function showParking(i) {
  const p = parkings[i]; if (!p) return;
  const h = '<div class="pop"><b>🅿️ ' + esc(p.name) + '</b><div>' + esc([p.kind, p.fee, p.cap ? p.cap + ' plazas' : ''].filter(Boolean).join(' · ')) + '</div>' +
    '<div class="muted">A ' + fmtDist(p.d) + ' del destino</div><div class="pb"><button data-go="1">🚗 Llévame aquí</button></div></div>';
  const pop = new maplibregl.Popup({ offset: 16, maxWidth: '300px' }).setLngLat([p.lon, p.lat]).setHTML(h).addTo(map);
  pop.getElement().querySelector('[data-go]').onclick = () => { pop.remove(); goToParking(p); };
}
function goToParking(p) {
  const finalDest = dest;
  $('#parkPill').classList.add('hidden');
  goTo({ name: p.name, sub: 'Aparcamiento cerca de ' + (finalDest ? finalDest.name : 'tu destino'), lon: p.lon, lat: p.lat }, true).then(() => { if (preview && routes.length) { sheetOnClose = null; closeSheet(); startNav(); } });
}
function parkListSheet(fromPreview) {
  let h = '<div class="sTitle">🅿️ Aparcamientos cerca' + (parkingsFor && parkingsFor.name === 'Aquí' ? ' de ti' : ' del destino') + '</div>';
  if (!parkings.length) h += '<div class="muted">No hay aparcamientos apuntados en OpenStreetMap cerca de este destino.</div>';
  parkings.forEach((p, i) => {
    h += '<div class="row" data-p="' + i + '"><div class="ri">🅿️</div><div class="rt"><div class="r1">' + esc(p.name) + '</div><div class="r2">' +
      esc([p.kind, p.fee, p.cap ? p.cap + ' plazas' : ''].filter(Boolean).join(' · ')) + '</div></div><div class="rr">' + fmtDist(p.d) + '</div></div>';
  });
  h += '<div class="muted" style="margin-top:8px">Datos de OpenStreetMap. No incluyen plazas libres en tiempo real.</div>';
  openSheet(h, fromPreview ? () => setTimeout(routeSheet, 50) : null);
  document.querySelectorAll('#sheetBody [data-p]').forEach(el => el.onclick = () => { sheetOnClose = null; closeSheet(); goToParking(parkings[+el.dataset.p]); });
}

/* ====================== Viajes y estadísticas ====================== */
let trip = null;
function tripRestore() {
  const t = store.get('trip', null);
  if (t && Date.now() - t.lastMove < 10 * 60000) trip = t; else if (t) tripClose(t);
}
function tripClose(t) {
  t = t || trip; if (!t) return;
  if (t.km >= 0.3) { const all = store.get('trips', []); all.unshift({ s: t.start, e: t.lastMove, km: +t.km.toFixed(2), mv: Math.round(t.moving), max: Math.round(t.max), rad: t.radars || 0, to: t.to || '' }); store.set('trips', all.slice(0, 300)); }
  if (t === trip) trip = null; store.set('trip', null);
}
function tripTick(pos, now) {
  const kmh = speedMs * 3.6;
  if (navigating && active && active.walk) return;
  if (!trip) {
    if (kmh < 12 || gpsAcc > 50) return;
    trip = { start: now, last: pos, lastT: now, lastMove: now, km: 0, moving: 0, max: 0, radars: 0, to: navigating && dest ? dest.name : '' };
    return;
  }
  const dt = (now - trip.lastT) / 1000, d = dist(trip.last, pos);
  if (dt > 0 && dt < 15 && d < 600 && gpsAcc < 60) { trip.km += d / 1000; if (kmh > 3) trip.moving += dt; }
  trip.last = pos; trip.lastT = now;
  if (kmh > 3) trip.lastMove = now;
  if (kmh > trip.max && gpsAcc < 30) trip.max = kmh;
  if (navigating && dest && !trip.to) trip.to = dest.name;
  if (now - trip.lastMove > 5 * 60000) { tripClose(); return; }
  if (!tripTick.saved || now - tripTick.saved > 30000) { tripTick.saved = now; store.set('trip', trip); }
}
function statsSheet() {
  const all = store.get('trips', []).slice();
  if (trip && trip.km >= 0.3) all.unshift({ s: trip.start, e: trip.lastMove, km: trip.km, mv: trip.moving, max: trip.max, rad: trip.radars, to: (trip.to || '') + ' (en curso)' });
  const now = new Date(), day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const wk0 = day0 - ((now.getDay() + 6) % 7) * 864e5, mo0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const sum = from => { const l = all.filter(t => t.s >= from); const km = l.reduce((a, t) => a + t.km, 0), mv = l.reduce((a, t) => a + t.mv, 0);
    return { n: l.length, km, mv, avg: mv > 0 ? km / (mv / 3600) : 0 }; };
  const box = (title, o) => '<div class="stat"><span>' + title + '</span><b>' + (o.km < 100 ? o.km.toFixed(1).replace('.', ',') : Math.round(o.km)) + ' km</b><span>' +
    o.n + ' viaje' + (o.n === 1 ? '' : 's') + ' · ' + fmtTime(o.mv) + (o.avg ? ' · ' + Math.round(o.avg) + ' km/h' : '') + '</span></div>';
  const maxEver = all.reduce((a, t) => Math.max(a, t.max || 0), 0), radEver = all.reduce((a, t) => a + (t.rad || 0), 0);
  let h = '<div class="sTitle">📊 Mis viajes</div><div class="stats">' + box('Hoy', sum(day0)) + box('Esta semana', sum(wk0)) + box('Este mes', sum(mo0)) + box('Total', sum(0)) +
    '</div><div class="stats"><div class="stat"><span>Velocidad máxima</span><b>' + Math.round(maxEver) + ' km/h</b></div><div class="stat"><span>Radares pasados</span><b>' + radEver + '</b></div></div>';
  h += '<div class="sec">Últimos viajes</div>';
  all.slice(0, 20).forEach(t => {
    const d = new Date(t.s);
    h += '<div class="row"><div class="ri">🚗</div><div class="rt"><div class="r1">' + esc(t.to || 'Trayecto libre') + '</div><div class="r2">' +
      d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) +
      ' · ' + fmtTime(t.mv) + ' · media ' + (t.mv > 0 ? Math.round(t.km / (t.mv / 3600)) : 0) + ' km/h · máx ' + Math.round(t.max) + '</div></div><div class="rr">' +
      (+t.km).toFixed(1).replace('.', ',') + ' km</div></div>';
  });
  if (!all.length) h += '<div class="muted">Todavía no hay viajes. Se guardan solos cuando conduces con Pro Maps abierta.</div>';
  h += '<button class="btn alt" id="stDel">🗑️ Borrar el historial</button>';
  openSheet(h);
  $('#stDel').onclick = () => { openSheet('<div class="sTitle">¿Borrar todos los viajes?</div><button class="btn red" id="sdY">Sí, borrar</button><button class="btn alt" id="sdN">No</button>');
    $('#sdY').onclick = () => { store.set('trips', []); statsSheet(); }; $('#sdN').onclick = statsSheet; };
}


/* ====================== Órdenes por voz ====================== */
let voiceOn = false;
$('#btnMic').onclick = () => {
  if (!N || !N.listen) { toast('La voz solo funciona en la app instalada'); return; }
  voiceOn = true; $('#btnMic').classList.add('on'); $('#btnMicNav').classList.add('on');
  $('#vbTxt').textContent = 'Te escucho…'; $('#voiceBox').classList.remove('hidden');
  N.listen();
};
function voiceDone(msg, ms) {
  voiceOn = false; $('#btnMic').classList.remove('on'); $('#btnMicNav').classList.remove('on');
  if (msg) { $('#vbTxt').textContent = msg; setTimeout(() => $('#voiceBox').classList.add('hidden'), ms || 2200); }
  else $('#voiceBox').classList.add('hidden');
}
window.onVoiceState = st => { $('#vbTxt').textContent = st === 'escuchando' ? 'Te escucho…' : 'Un momento…'; };
window.onVoiceError = msg => { voiceDone('😕 ' + msg); say(msg); };
const noAcc = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿?¡!.,]/g, ' ').replace(/\s+/g, ' ').trim();
window.onVoice = async text => {
  if (!text) return window.onVoiceError('No te he oído bien');
  voiceDone('«' + text + '»', 2500);
  const t = noAcc(text);
  const rep = { 'radar movil': 'movil', 'radar': 'movil', 'control': 'policia', 'policia': 'policia', 'guardia civil': 'policia', 'accidente': 'accidente',
    'atasco': 'atasco', 'retencion': 'atasco', 'obra': 'obras', 'peligro': 'peligro', 'coche parado': 'v16', 'vehiculo parado': 'v16', 'averia': 'v16' };
  // Avisar de algo
  if (/^(avisa|aviso|hay|reporta|marca)\b/.test(t)) {
    for (const k in rep) if (t.includes(k)) { if (me) addReport(rep[k], me); return; }
  }
  // Empezar la ruta que se está viendo
  if (preview && /^(vamos|iniciar|inicia|empieza|empezar|arranca|adelante|si|venga|dale)\b/.test(t)) { sheetOnClose = null; closeSheet(); startNav(); return; }
  if (/(cancela|para|termina|deten|quita|anula).*(ruta|navegacion|viaje)|^(cancelar|terminar) ruta/.test(t)) { if (navigating) { stopNav(); say('Ruta terminada'); } else if (preview) { closeSheet(); cancelPreview(); } return; }
  if (/(a que hora llego|cuanto (me )?(falta|queda)|hora de llegada)/.test(t)) {
    if (!navigating || !active) return say('No estás navegando');
    const rest = Math.max(0, active.total - nav.along);
    return say('Llegas a las ' + new Date(etaNow()).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + '. Te quedan ' + sayDist(rest) + ', unos ' + Math.max(1, Math.round(active.time * rest / active.total / 60)) + ' minutos');
  }
  if (/(silencio|calla|sin voz|quita la voz|desactiva la voz|sin sonido)/.test(t)) { say('Sonido desactivado'); setTimeout(() => setSound('off'), 50); return; }
  if (/solo (los )?avisos/.test(t)) { setSound('alerts'); return say('Solo avisos'); }
  if (/(activa|pon|enciende) (la )?(voz|sonido)/.test(t)) { setSound('all'); return say('Voz activada'); }
  if (/(comparte|compartir|envia|manda).*(llegada|hora|ubicacion)/.test(t)) { if (navigating) shareEta(false); else say('Primero empieza una ruta'); return; }
  if (/(donde|llevame|ir|vamos).*(mi coche|el coche|aparcado|aparque)/.test(t)) {
    if (!park) return say('No tengo guardado dónde aparcaste');
    say('Te llevo andando a tu coche');
    return goTo({ name: 'Mi coche', sub: '', lon: park.lon, lat: park.lat, park: true }, false, true);
  }
  if (/(he aparcado|aparca aqui|guarda (el )?aparcamiento)/.test(t)) { if (me) savePark(me, true); return say('Aparcamiento guardado'); }
  if (/(gasolinera|repostar|gasolina|gasoil|diesel)/.test(t)) {
    gasSheet(null, 0);
    setTimeout(() => { const r = $('#sheetBody .row[data-g="0"]'); if (r) say('La más barata es ' + r.querySelector('.r1').textContent + ', ' + r.querySelector('.rr').textContent.replace(',', ' coma ').replace('€', 'euros')); }, 600);
    return;
  }
  if (/(parking|aparcamiento)/.test(t)) { if (dest) { await loadParkings(dest); parkListSheet(false); say(parkings.length ? 'Hay ' + parkings.length + ' aparcamientos cerca del destino' : 'No encuentro aparcamientos cerca'); } else say('Primero elige un destino'); return; }
  if (/(trafico)/.test(t)) { $('#btnTraffic').onclick(); return; }
  if (/(siguiente cancion|pasa (la )?cancion|siguiente tema|cambia (la )?cancion)/.test(t)) { if (N) N.mediaCmd('next'); return; }
  if (/(cancion anterior|tema anterior)/.test(t)) { if (N) N.mediaCmd('prev'); return; }
  if (/(pausa|para la musica|deten la musica)/.test(t)) { if (N) N.mediaCmd('pause'); return; }
  if (/(pon (la )?musica|reanuda|sigue la musica|play)/.test(t)) { if (N) N.mediaCmd('play'); return; }
  if (/(que (cancion|suena|esta sonando))/.test(t)) { try { const m = JSON.parse(N.mediaState()); return say(m.title ? 'Suena ' + m.title + (m.artist ? ', de ' + m.artist : '') : 'No suena nada'); } catch (e) { return; } }
  // Ir a casa / trabajo / favorito / cualquier sitio
  const m = t.match(/^(?:llevame|lleveme|ir|ve|vamos|navega|navegar|ruta|como (?:llego|voy)|quiero ir|busca|buscar)(?: (?:a|al|a la|hasta|hacia|para|por))? (.+)$/);
  if (m) {
    let q = m[1].replace(/^(la|el|los|las|mi) /, '').trim();
    if (/^(casa|mi casa)$/.test(q)) { if (favs.casa) { say('Vamos a casa'); return goTo(favs.casa); } return say('Aún no has guardado tu casa'); }
    if (/^(trabajo|el trabajo|curro|la oficina)$/.test(q)) { if (favs.trabajo) { say('Vamos al trabajo'); return goTo(favs.trabajo); } return say('Aún no has guardado tu trabajo'); }
    const f = favList.find(x => noAcc(x.name) === q) || store.get('savedRoutes', []).find(x => noAcc(x.name) === q);
    if (f && f.via) { say('Ruta ' + f.name); return useSavedRoute(f); }
    if (f) { say('Vamos a ' + f.name); return goTo(f); }
    try {
      const c = me || map.getCenter().toArray();
      const [pj, cj] = await Promise.all([getJSON('https://photon.komoot.io/api/?limit=3&q=' + encodeURIComponent(m[1]) + '&lat=' + c[1].toFixed(4) + '&lon=' + c[0].toFixed(4)).catch(() => ({ features: [] })),
        searchCarto(m[1]).catch(() => [])]);
      let d = /\d/.test(m[1]) ? cj.find(x => x.exact) : null;
      if (!d && pj.features && pj.features[0]) { const p0 = pj.features[0].properties, g = pj.features[0].geometry.coordinates;
        d = { name: p0.name || ((p0.street || '') + (p0.housenumber ? ' ' + p0.housenumber : '')), sub: [p0.city, p0.state].filter(Boolean).join(', '), lon: g[0], lat: g[1] }; }
      if (!d && cj[0]) { d = cj[0]; if (d.lat == null) d = await ccFind(d); }
      if (!d || d.lat == null) return say('No encuentro ' + m[1]);
      say('Calculando la ruta a ' + d.name + '. Di vamos, o toca Iniciar');
      return goTo(d);
    } catch (e) { return say('No he podido buscar ' + m[1]); }
  }
  say('No te he entendido. Prueba con: llévame a casa, o avisa de un radar');
};
function voiceHelp() {
  openSheet('<div class="sTitle">🎤 Qué le puedo decir</div><div class="sSub">Toca el botón morado 🎤 y habla:</div>' +
    ['«Llévame a casa» / «Vamos al trabajo»', '«Llévame a Calle Mayor 5, Alcorcón» / «Ir a Mercadona»', '«Vamos» (para empezar la ruta que estás viendo)',
      '«Avisa de un radar» / «Hay un control» / «Avisa de un accidente» / «Hay atasco»', '«¿A qué hora llego?» / «¿Cuánto falta?»', '«Gasolinera más barata»',
      '«Busca parking»', '«Comparte mi llegada»', '«Siguiente canción» / «Canción anterior» / «Pausa» / «Pon la música» / «¿Qué suena?»', '«¿Dónde está mi coche?» / «He aparcado»', '«Cancela la ruta»', '«Silencio» / «Activa la voz»', '«Tráfico»']
      .map(x => '<div class="row"><div class="rt"><div class="r1" style="white-space:normal">' + x + '</div></div></div>').join('') +
    '<div class="muted">Usa el reconocimiento de voz de Google del móvil o de la pantalla del coche, y necesita internet.</div>');
}

/* ====================== Aviso de cansancio ====================== */
let fat = store.get('fatigue', null);
function fatigueTick(now) {
  if (!cfg.fatigue || (navigating && active && active.walk)) return;
  const moving = speedMs * 3.6 > 10;
  if (!fat || (moving && now - fat.lastMove > 15 * 60000)) { if (!moving) return; fat = { start: now, lastMove: now, warned: 0 }; }
  if (moving) fat.lastMove = now;
  if (!fatigueTick.saved || now - fatigueTick.saved > 60000) { fatigueTick.saved = now; store.set('fatigue', fat); }
  const drove = (fat.lastMove - fat.start) / 60000;
  if (drove >= 120 && moving && now - fat.warned > 30 * 60000) {
    fat.warned = now; store.set('fatigue', fat);
    const h = Math.floor(drove / 60), mm = Math.round(drove % 60);
    beep(1); say('Llevas ' + h + (h === 1 ? ' hora' : ' horas') + (mm >= 10 ? ' y ' + mm + ' minutos' : '') + ' conduciendo. Te recomiendo parar a descansar unos minutos');
    showNotice('😴', 'Llevas ' + h + ' h ' + mm + ' min conduciendo', 'La DGT recomienda parar cada 2 horas o 200 km', 'Ver áreas de descanso', restAreasSheet, 'Ahora no', 25000);
  }
}
async function restAreasSheet() {
  if (!me) return;
  openSheet('<div class="sTitle">😴 Dónde parar</div><div class="muted">Buscando áreas de descanso y de servicio cerca…</div>');
  const q = '[out:json][timeout:25];(nwr(around:25000,' + me[1].toFixed(4) + ',' + me[0].toFixed(4) + ')["highway"~"^(rest_area|services)$"];);out center 40;';
  let list = [];
  for (const base of OVERPASS) {
    try {
      const j = await getJSON(base + encodeURIComponent(q));
      list = (j.elements || []).map(e => { const lon = e.lon != null ? e.lon : e.center && e.center.lon, lat = e.lat != null ? e.lat : e.center && e.center.lat, t = e.tags || {};
        return { lon, lat, name: t.name || (t.highway === 'services' ? 'Área de servicio' : 'Área de descanso'), kind: t.highway === 'services' ? 'Área de servicio' : 'Área de descanso' }; })
        .filter(p => p.lon != null).map(p => Object.assign(p, { d: dist(me, [p.lon, p.lat]), ang: angDiff(bearing(me, [p.lon, p.lat]), heading) }));
      break;
    } catch (e) { }
  }
  // primero las que tienes por delante
  list.sort((a, b) => (a.ang > 70) - (b.ang > 70) || a.d - b.d);
  let h = '<div class="sTitle">😴 Dónde parar</div>';
  list.slice(0, 12).forEach((p, i) => { h += '<div class="row" data-ra="' + i + '"><div class="ri">' + (p.kind === 'Área de servicio' ? '⛽' : '🅿️') + '</div><div class="rt"><div class="r1">' + esc(p.name) +
    '</div><div class="r2">' + p.kind + (p.ang > 70 ? ' · queda detrás' : ' · por delante') + '</div></div><div class="rr">' + fmtDist(p.d) + '</div></div>'; });
  if (!list.length) h += '<div class="muted">No encuentro áreas de descanso a menos de 25 km. Prueba con una gasolinera:</div><button class="btn alt" id="raGas">⛽ Gasolineras</button>';
  openSheet(h);
  if ($('#raGas')) $('#raGas').onclick = () => gasSheet(null, 0);
  document.querySelectorAll('#sheetBody [data-ra]').forEach(el => el.onclick = () => { const p = list[+el.dataset.ra]; closeSheet(); addStop({ name: p.name, sub: p.kind, lon: p.lon, lat: p.lat }); });
}

/* ====================== Curvas peligrosas, pasos a nivel y zonas escolares ====================== */
/** Curvas cerradas de la ruta (cambio de dirección grande en poco espacio que no es un giro en un cruce) */
function findCurves(r) {
  const out = [], samp = [];
  for (let i = 0, last = -1e9; i < r.coords.length; i++) if (r.cum[i] - last >= 20) { samp.push({ p: r.coords[i], at: r.cum[i] }); last = r.cum[i]; }
  const W = 3; // 3 muestras = 60 m a cada lado
  let lastAt = -1e9;
  for (let k = W; k < samp.length - W; k++) {
    const b1 = bearing(samp[k - W].p, samp[k].p), b2 = bearing(samp[k].p, samp[k + W].p);
    let d = ((b2 - b1 + 540) % 360) - 180;
    if (Math.abs(d) < 60) continue;
    const at = samp[k].at;
    if (r.steps.some(s => Math.abs(s.at - at) < 90)) continue; // es un giro del cruce, no una curva
    if (at - lastAt < 200) continue;
    lastAt = at;
    const side = d > 0 ? 'derecha' : 'izquierda';
    out.push({ p: { id: 'cv' + Math.round(at), cat: 'curva', lon: samp[k].p[0], lat: samp[k].p[1], sub: (Math.abs(d) > 100 ? 'Curva muy cerrada' : 'Curva peligrosa') + ' a la ' + side }, at: Math.max(0, at - 40) });
  }
  return out;
}
let osmHaz = [], osmHazAt = {};
async function loadHazards(pos) {
  osmHazAt = { c: pos, t: Date.now() };
  const R = 5000, ll = pos[1].toFixed(4) + ',' + pos[0].toFixed(4);
  const q = '[out:json][timeout:25];(node(around:' + R + ',' + ll + ')["railway"="level_crossing"];node(around:' + R + ',' + ll + ')["hazard"];' +
    'nwr(around:' + R + ',' + ll + ')["amenity"="school"];);out center 400;';
  for (const base of OVERPASS) {
    try {
      const j = await getJSON(base + encodeURIComponent(q));
      osmHaz = (j.elements || []).map(e => {
        const t = e.tags || {}, lon = e.lon != null ? e.lon : e.center && e.center.lon, lat = e.lat != null ? e.lat : e.center && e.center.lat;
        let cat = null, sub = '';
        if (t.railway === 'level_crossing') { cat = 'paso'; sub = t.crossing_barrier === 'no' || t['crossing:barrier'] === 'no' ? 'Sin barreras' : ''; }
        else if (t.amenity === 'school') { cat = 'escuela'; sub = t.name || ''; }
        else if (t.hazard) {
          const hz = t.hazard;
          cat = /animal|deer|cattle|horse/.test(hz) ? 'fauna' : /rock|falling/.test(hz) ? 'rocas' : /curve/.test(hz) ? 'curva' : null;
          sub = cat === 'curva' ? 'Curva peligrosa' : '';
        }
        return cat && lon != null ? { id: 'h' + e.type[0] + e.id, cat, lon, lat, sub } : null;
      }).filter(Boolean);
      refreshPois();
      return;
    } catch (e) { console.log('Peligros: ' + e.message); }
  }
}

/* ====================== Rutas guardadas ====================== */
function saveRouteSheet(r) {
  if (!r || !dest) return;
  const def = (favs.casa && me && dist(me, [favs.casa.lon, favs.casa.lat]) < 300 ? 'Casa' : 'Aquí') + ' → ' + dest.name;
  openSheet('<div class="sTitle">💾 Guardar esta ruta</div><div class="sSub">Se guarda el camino exacto (por ejemplo, por la M-50) para elegirlo con un toque o diciendo su nombre por voz.</div>' +
    '<input class="inl" id="srName" maxlength="40" value="' + esc(def) + '"><button class="btn" id="srOk">Guardar</button><button class="btn alt" id="srNo">Cancelar</button>', () => setTimeout(routeSheet, 50));
  $('#srNo').onclick = closeSheet;
  $('#srOk').onclick = () => {
    const name = $('#srName').value.trim() || def;
    // puntos de paso repartidos por el camino (sin contar el principio ni el final)
    const via = [];
    for (const f of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) {
      const target = r.total * f; let i = r.cum.findIndex(c => c >= target); if (i < 0) continue;
      const p = r.coords[i];
      if (stops.some(s => dist([s.lon, s.lat], p) < 500) || dist([dest.lon, dest.lat], p) < 500) continue;
      via.push([+p[0].toFixed(6), +p[1].toFixed(6)]);
    }
    const l = store.get('savedRoutes', []);
    l.unshift({ id: 'sr' + Date.now(), name, dest: { name: dest.name, sub: dest.sub || '', lon: dest.lon, lat: dest.lat }, stops: stops.map(s => ({ name: s.name, sub: s.sub || '', lon: s.lon, lat: s.lat })), via });
    store.set('savedRoutes', l.slice(0, 30));
    toast('💾 Ruta «' + name + '» guardada en ⭐ Favoritos'); closeSheet();
  };
}
function useSavedRoute(sr) {
  if (!sr) return;
  routeMode = 'car'; stops = sr.stops.slice();
  // solo los puntos de paso que quedan por delante de donde estás
  let v = sr.via.slice();
  if (me) { const d0 = v.map(p => dist(me, p)); const nearest = d0.indexOf(Math.min(...d0)); if (d0[nearest] < 2000) v = v.slice(nearest + 1); }
  viaPts = v;
  goTo(sr.dest, true);
}

/* ====================== Mapa sin conexión (ruta y zona) ====================== */
function tileUrlTemplate() {
  if (!map) return null;
  const st = map.getStyle(); const k = Object.keys(st.sources || {}).find(x => st.sources[x].type === 'vector'); if (!k) return null;
  const src = map.getSource(k); const t = (src && src.tiles && src.tiles[0]) || (st.sources[k].tiles && st.sources[k].tiles[0]);
  return t && t.indexOf('tiles.openfreemap.org') >= 0 ? t : null;
}
const lon2x = (lon, z) => Math.floor((lon + 180) / 360 * (1 << z));
const lat2y = (lat, z) => { const r = lat * rad; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * (1 << z)); };
function tilesFor(points, zMin, zMax, pad) {
  const set = new Set();
  for (let z = zMin; z <= zMax; z++) {
    const p = z >= 13 ? pad : 1;
    for (const c of points) {
      const x = lon2x(c[0], z), y = lat2y(c[1], z);
      for (let dx = -p; dx <= p; dx++) for (let dy = -p; dy <= p; dy++) set.add(z + '/' + (x + dx) + '/' + (y + dy));
    }
  }
  return [...set];
}
let prefetchJob = null;
window.onPrefetch = (id, done, total) => { if (prefetchJob && prefetchJob.id === id && prefetchJob.show) toast('📥 Guardando el mapa… ' + Math.round(done / total * 100) + '%', 4000); };
function runPrefetch(list, show, label) {
  const tpl = tileUrlTemplate();
  if (!tpl || !N || !N.prefetch) { if (show) toast('Abre el mapa con conexión para poder descargarlo'); return; }
  const urls = list.map(k => { const [z, x, y] = k.split('/'); return tpl.replace('{z}', z).replace('{x}', x).replace('{y}', y); });
  const id = 'r' + (++reqN);
  prefetchJob = { id, show };
  pend[id] = { res: t => { if (show) toast('✅ ' + label + ' guardado para usar sin cobertura (' + t.split('/')[1] + ' trozos)', 5000); }, rej: () => { if (show) toast('No se pudo terminar la descarga'); } };
  N.prefetch(id, JSON.stringify(urls));
}
function prefetchRoute(r, show) {
  if (!r) return;
  const pts = []; for (let i = 0, last = -1e9; i < r.coords.length; i++) if (r.cum[i] - last >= 400) { pts.push(r.coords[i]); last = r.cum[i]; }
  pts.push(r.coords[r.coords.length - 1]);
  runPrefetch(tilesFor(pts, 6, 15, 1).slice(0, 6000), show, 'El mapa de la ruta');
}
function prefetchZone() {
  const c = me || map.getCenter().toArray();
  const pts = []; for (let dy = -30000; dy <= 30000; dy += 1500) for (let dx = -30000; dx <= 30000; dx += 1500) {
    if (dx * dx + dy * dy > 30000 * 30000) continue;
    pts.push([c[0] + dx / (111320 * Math.cos(c[1] * rad)), c[1] + dy / 110540]);
  }
  const list = tilesFor(pts, 5, 14, 0);
  toast('📥 Descargando el mapa de 30 km a tu alrededor (' + list.length + ' trozos, unos ' + Math.round(list.length * 45 / 1024) + ' MB). Mejor con wifi.', 6000);
  runPrefetch(list, true, 'El mapa de tu zona');
}
function cacheSheet() {
  const mb = N && N.cacheSize ? Math.round(+N.cacheSize() / 1048576) : 0;
  openSheet('<div class="sTitle">🗂️ Mapa guardado en el móvil</div><div class="sSub">Ocupa ' + mb + ' MB (máximo 1.500 MB; al llegar al máximo se borra lo más antiguo).</div>' +
    '<div class="muted" style="margin-bottom:10px">Sin cobertura se verá el mapa de las zonas guardadas y podrás seguir la ruta ya calculada. Buscar sitios o calcular rutas nuevas sí necesita internet.</div>' +
    '<button class="btn alt" id="ccZone">📥 Descargar mi zona (30 km)</button><button class="btn red" id="ccDel">🗑️ Borrar el mapa guardado</button>');
  $('#ccZone').onclick = () => { closeSheet(); prefetchZone(); };
  $('#ccDel').onclick = () => { if (N) N.clearCache(); toast('Mapa guardado borrado'); closeSheet(); };
}


/* ====================== Sonido desde el mapa: voz y avisos / solo avisos / silencio ====================== */
const SOUND = { all: { i: '🔊', n: 'Voz y avisos', d: 'Te guía por voz y te avisa de radares e incidencias' },
  alerts: { i: '🔔', n: 'Solo avisos', d: 'Sin indicaciones de giros; solo radares, incidencias y velocidad' },
  off: { i: '🔇', n: 'Sin sonido', d: 'Ni voz ni pitidos' } };
function setSound(m) {
  cfg.sound = m; if (m !== 'off') cfg.voice = true; saveCfg();
  soundIcon();
  if (m === 'off' && N) N.stopSpeak();
}
function soundIcon() { const b = $('#btnSound'); b.innerHTML = IC[{ all: 'vol', alerts: 'bell', off: 'mute' }[cfg.sound] || 'vol']; }
soundIcon();
$('#btnSound').onclick = () => {
  const next = { all: 'alerts', alerts: 'off', off: 'all' }[cfg.sound] || 'alerts';
  setSound(next);
  toast(SOUND[next].i + ' ' + SOUND[next].n + ' · ' + SOUND[next].d, 3500);
  if (next !== 'off') say(next === 'all' ? 'Voz y avisos' : 'Solo avisos', true);
};

/* ====================== Tipo de mapa desde el mapa ====================== */
const STYLE_OPTS = [['auto', '🌓', 'Automático'], ['light', '☀️', 'Claro'], ['dark', '🌙', 'Oscuro'], ['soft', '🌫️', 'Suave'], ['sat', '🛰️', 'Satélite España'], ['satw', '🌍', 'Satélite mundial']];
$('#btnStyle').onclick = function styleSheet() {
  openSheet('<div class="sTitle">🗺️ Tipo de mapa</div><div class="styleGrid">' + STYLE_OPTS.map(([k, i, n]) =>
    '<button class="stOpt' + (cfg.style === k ? ' sel' : '') + '" data-st="' + k + '"><b>' + i + '</b>' + n + '</button>').join('') + '</div>' +
    '<div class="set"><label>🏙️ Edificios en 3D</label><input type="checkbox" data-k="b3d"' + (cfg.b3d ? ' checked' : '') + '></div>' +
    '<div class="set"><label>🌗 Sombras según la hora<small>Sol, amanecer, atardecer o luz de luna</small></label><input type="checkbox" data-k="shadows"' + (cfg.shadows ? ' checked' : '') + '></div>');
  document.querySelectorAll('#sheetBody [data-st]').forEach(b => b.onclick = () => { cfg.style = b.dataset.st; saveCfg(); applyStyle(true); styleSheet(); });
  document.querySelectorAll('#sheetBody input[data-k]').forEach(i => i.onchange = () => { cfg[i.dataset.k] = i.checked; saveCfg(); lookChanged(i.dataset.k); });
};

/* ====================== Sombras y luz según la hora (sol, amanecer, atardecer, luna) ====================== */
function sunPosition(date, lat, lon) {
  const dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
  const d = date.valueOf() / dayMs - 0.5 + J1970 - J2000;
  const M = rad * (357.5291 + 0.98560028 * d);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L)), ra = Math.atan2(Math.sin(L) * Math.cos(e), Math.cos(L));
  const lw = rad * -lon, phi = rad * lat, H = rad * (280.16 + 360.9856235 * d) - lw - ra;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)); // desde el sur, hacia el oeste
  return { alt: alt / rad, bearing: (az / rad + 180 + 360) % 360 }; // bearing: desde el norte, en grados
}
/** Luz actual: de dónde viene, su altura, color y fuerza de la sombra */
function lightNow() {
  const p = me || store.get('lastPos', [-3.8249, 40.3459]);
  const s = sunPosition(new Date(), p[1], p[0]);
  // La luz es siempre blanca: los edificios mantienen su color; solo cambian la dirección y el largo de las sombras
  if (s.alt > 12) return { phase: 'sol', bearing: s.bearing, alt: s.alt, color: '#ffffff', intensity: 0.35, shadow: 0.18, tint: '#000000' };
  if (s.alt > -4) return { phase: s.bearing < 180 ? 'amanecer' : 'atardecer', bearing: s.bearing, alt: Math.max(s.alt, 5), color: '#ffffff', intensity: 0.35, shadow: 0.2, tint: '#000000' };
  // de noche: luz de luna aproximada y suave, desde el lado contrario al sol
  return { phase: 'luna', bearing: (s.bearing + 180) % 360, alt: 35, color: '#ffffff', intensity: 0.3, shadow: 0.1, tint: '#000000' };
}
const SHADOW_BINS = [[0, 12, 8], [12, 30, 20], [30, 9999, 45]]; // alturas (m) y altura típica de cada grupo
function addShadowLayers(src) {
  if (!src) return;
  SHADOW_BINS.forEach((b, i) => {
    map.addLayer({ id: 'bshadow' + i, type: 'fill', source: src, 'source-layer': 'building', minzoom: 15,
      filter: ['all', ['!', ['to-boolean', ['get', 'hide_3d']]], ['>=', ['coalesce', ['get', 'render_height'], 6], b[0]], ['<', ['coalesce', ['get', 'render_height'], 6], b[1]]],
      layout: { visibility: cfg.shadows && cfg.b3d ? 'visible' : 'none' },
      paint: { 'fill-color': '#000', 'fill-opacity': 0.2, 'fill-translate-anchor': 'map', 'fill-translate': [0, 0], 'fill-antialias': false } }, 'b3d');
  });
  updateLight();
}
function updateLight() {
  if (!map || !map.getStyle()) return;
  const L = lightNow();
  try { map.setLight({ anchor: 'map', color: L.color, intensity: L.intensity, position: [1.2, L.bearing, Math.max(10, Math.min(80, 90 - L.alt))] }); } catch (e) { }
  const away = (L.bearing + 180) * rad, mPerPx16 = 156543.03 * Math.cos(((me || [0, 40])[1]) * rad) / 65536;
  SHADOW_BINS.forEach((b, i) => {
    const id = 'bshadow' + i; if (!map.getLayer(id)) return;
    const len = Math.min(b[2] / Math.tan(Math.max(L.alt, 5) * rad), b[2] * 4) / mPerPx16; // en píxeles a zoom 16
    const dx = Math.sin(away) * len, dy = -Math.cos(away) * len;
    map.setPaintProperty(id, 'fill-translate', ['interpolate', ['exponential', 2], ['zoom'], 15, ['literal', [dx / 2, dy / 2]], 20, ['literal', [dx * 16, dy * 16]]]);
    map.setPaintProperty(id, 'fill-color', L.tint);
    map.setPaintProperty(id, 'fill-opacity', L.shadow);
    map.setLayoutProperty(id, 'visibility', cfg.shadows && cfg.b3d ? 'visible' : 'none');
  });
  carShadow(L);
}
/** Sombra del coche: hacia el lado contrario de la luz, girada según cómo esté orientado el mapa */
function carShadow(L) {
  const el = document.getElementById('meIcon'); if (!el) return;
  const svg = el.querySelector('svg'); if (!svg) return;
  if (!cfg.shadows) { svg.style.filter = ''; return; }
  L = L || lightNow();
  const ang = ((L.bearing + 180) - (map ? map.getBearing() : 0) - heading) * rad; // el icono ya va girado con tu rumbo
  const len = Math.min(14, 3 + 8 / Math.tan(Math.max(L.alt, 8) * rad));
  const dx = (Math.sin(ang) * len).toFixed(1), dy = (-Math.cos(ang) * len).toFixed(1);
  const a = L.phase === 'luna' ? 0.35 : L.phase === 'sol' ? 0.45 : 0.55;
  svg.style.filter = 'drop-shadow(' + dx + 'px ' + dy + 'px 3px rgba(0,0,0,' + a + '))';
}


/* ====================== Prueba de la dash cam ====================== */
let camStream = null;
async function camTest() {
  backTo = () => settingsPage('app');
  let info = {};
  try { info = N && N.cameraInfo ? JSON.parse(N.cameraInfo()) : {}; } catch (e) { }
  let h = '<div class="sTitle">📷 Probar la dash cam</div><div class="sSub">Mira si Pro Maps puede ver la imagen de la cámara. Pruébalo también con la app de la dash cam grabando.</div>';
  h += '<div class="sec">Lo que ve el sistema</div><div class="muted">' + esc(info.model || '') + '</div>';
  const cams = info.cameras || [];
  h += '<div class="row"><div class="ri">📸</div><div class="rt"><div class="r1">Cámaras de Android: ' + cams.length + '</div><div class="r2">' +
    esc(cams.map(c => 'nº ' + c.id + ' (' + c.facing + ')').join(' · ') || 'ninguna') + '</div></div></div>';
  const usb = info.usb || [];
  const vids = usb.filter(u => u.video);
  h += '<div class="row"><div class="ri">🔌</div><div class="rt"><div class="r1">Aparatos USB: ' + usb.length + (vids.length ? ' · de vídeo: ' + vids.length : '') + '</div><div class="r2" style="white-space:normal">' +
    esc(usb.map(u => (u.video ? '🎥 ' : '') + (u.maker ? u.maker + ' ' : '') + u.name + ' [' + u.ids + ']').join(' · ') || 'ninguno') + '</div></div></div>';
  h += '<div class="sec">Cámaras que puede abrir Pro Maps</div><div id="camList" class="muted">Pidiendo permiso para usar la cámara…</div>';
  openSheet(h);
  try {
    // la cámara se deja abierta mientras se piden los nombres (si no, algunos Android los dan vacíos)
    const s0 = await navigator.mediaDevices.getUserMedia({ video: true });
    let devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    s0.getTracks().forEach(t => t.stop());
    // si no hay identificadores, se ofrecen las opciones por tipo de cámara
    if (!devs.length || devs.every(d => !d.deviceId)) devs = [{ label: 'Cámara trasera / externa', facing: 'environment' }, { label: 'Cámara frontal', facing: 'user' }, { label: 'Cámara por defecto', any: true }];
    const el = document.getElementById('camList'); if (!el) return;
    if (!devs.length) { el.textContent = 'Ninguna. La dash cam solo la puede usar la app de Junsun.'; return; }
    el.innerHTML = devs.map((d, i) => '<div class="row" data-cam="' + i + '"><div class="ri">🎥</div><div class="rt"><div class="r1">' + esc(d.label || ('Cámara ' + (i + 1))) +
      '</div><div class="r2">Toca para ver la imagen</div></div><div class="rr chev">›</div></div>').join('');
    el.classList.remove('muted');
    el.querySelectorAll('[data-cam]').forEach(r => r.onclick = () => camOpen(devs[+r.dataset.cam]));
  } catch (e) {
    const el = document.getElementById('camList');
    if (el) el.textContent = 'No se pudo abrir ninguna cámara (' + (e.name || '') + ': ' + (e.message || e) + '). ' +
      (e.name === 'NotAllowedError' ? 'Falta el permiso de cámara: Ajustes de Android → Apps → Pro Maps → Permisos.' :
        e.name === 'NotReadableError' ? 'La cámara está ocupada: seguramente la está usando la app de la dash cam.' : '');
  }
}
async function camOpen(dev) {
  // se prueba de lo más concreto a lo más general, para que nunca falle por pedir demasiado
  const tries = [];
  if (dev.deviceId) { tries.push({ video: { deviceId: { exact: dev.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }); tries.push({ video: { deviceId: dev.deviceId } }); }
  if (dev.facing) tries.push({ video: { facingMode: dev.facing } });
  tries.push({ video: true });
  let lastErr = null;
  for (const c of tries) {
    try { camStream = await navigator.mediaDevices.getUserMedia(c); lastErr = null; break; } catch (e) { lastErr = e; if (e.name === 'NotAllowedError' || e.name === 'NotReadableError') break; }
  }
  try {
    if (lastErr) throw lastErr;
    const v = $('#camVideo'); v.srcObject = camStream;
    $('#camView').classList.remove('hidden');
    v.onloadedmetadata = () => { $('#camInfo').textContent = '🎥 ' + (dev.label || 'Cámara') + ' · ' + v.videoWidth + '×' + v.videoHeight + ' · ¡Funciona! Mándame una captura'; };
  } catch (e) {
    toast('No se pudo abrir esa cámara: ' + (e.name === 'NotReadableError' ? 'está ocupada por otra app (la de la dash cam)' : (e.message || e.name)), 6000);
  }
}
$('#camClose').onclick = () => { if (camStream) camStream.getTracks().forEach(t => t.stop()); camStream = null; $('#camView').classList.add('hidden'); };


/* ====================== Música: la app que está sonando (Spotify, Deezer, YouTube Music, radios…) ====================== */
let media = {}, mediaT = null;
window.onMedia = j => {
  try { media = JSON.parse(j); } catch (e) { return; }
  const b = $('#btnMedia');
  if (media.pkg && media.icon) b.innerHTML = '<img src="' + media.icon + '" alt="">'; else b.innerHTML = IC.music;
  b.classList.toggle('hidden', !cfg.musicBtn || !(media.pkg || !media.allowed));
  b.classList.toggle('playing', !!media.playing);
  if (!$('#mediaCard').classList.contains('hidden')) renderMediaCard();
};
function renderMediaCard() {
  $('#mcTitle').textContent = media.title || (media.playing ? 'Sonando' : 'En pausa');
  $('#mcArtist').textContent = media.artist || media.album || '';
  $('#mcApp').textContent = (media.app || '') + (media.playing ? ' · sonando' : ' · en pausa');
  const art = $('#mcArt');
  if (media.art) { art.src = media.art; art.style.visibility = 'visible'; } else if (media.icon) { art.src = media.icon; art.style.visibility = 'visible'; } else art.style.visibility = 'hidden';
  $('#mcPlay').textContent = media.playing ? '⏸' : '▶';
}
function hideMediaCard() { clearTimeout(mediaT); $('#mediaCard').classList.add('hidden'); }
function showMediaCard() {
  renderMediaCard(); $('#mediaCard').classList.remove('hidden');
  clearTimeout(mediaT); mediaT = setTimeout(hideMediaCard, 10000);
}
$('#btnMedia').onclick = () => {
  if (!N || !N.mediaState) { toast('Solo funciona en la app instalada'); return; }
  if (!$('#mediaCard').classList.contains('hidden')) return hideMediaCard();
  try { media = JSON.parse(N.mediaState()); } catch (e) { }
  if (!media.allowed) return mediaPermSheet();
  if (!media.pkg) { toast('🎵 No hay ninguna app de música abierta. Pon algo en Spotify, Deezer, YouTube Music o la radio.', 4500); return; }
  window.onMedia(JSON.stringify(media)); showMediaCard();
};
document.querySelectorAll('#mediaCard [data-mc]').forEach(b => b.onclick = ev => {
  ev.stopPropagation(); if (N) N.mediaCmd(b.dataset.mc);
  clearTimeout(mediaT); mediaT = setTimeout(hideMediaCard, 10000);
});
$('#mcArt').onclick = () => { if (N && media.pkg) N.openApp(media.pkg); };
function mediaPermSheet() {
  openSheet('<div class="sTitle">🎵 Controlar la música</div><div class="sSub">Para ver qué suena en Spotify, Deezer, YouTube Music o la radio y poder pasar de canción, ' +
    'Android pide activar una vez el «acceso a notificaciones» para Pro Maps. Pro Maps no lee ni guarda tus notificaciones: solo lo usa para la música.</div>' +
    '<div class="sec">Pasos</div>' +
    '<div class="row"><div class="ri">1</div><div class="rt"><div class="r1" style="white-space:normal">Toca «Abrir el permiso», busca <b>Pro Maps (control de música)</b> y actívalo.</div></div></div>' +
    '<div class="row"><div class="ri">2</div><div class="rt"><div class="r1" style="white-space:normal">Si sale en gris o dice «Ajuste restringido»: toca «Abrir la ficha de Pro Maps», luego ⋮ (arriba a la derecha) → <b>Permitir ajustes restringidos</b>, y vuelve al paso 1.</div></div></div>' +
    '<div class="row"><div class="ri">3</div><div class="rt"><div class="r1" style="white-space:normal">Vuelve a Pro Maps: el botón 🎵 mostrará el icono de la app que esté sonando.</div></div></div>' +
    '<button class="btn" id="mpOpen">🔓 Abrir el permiso</button><button class="btn alt" id="mpApp">⚙️ Abrir la ficha de Pro Maps</button>');
  $('#mpOpen').onclick = () => { closeSheet(); N.mediaPermission(); };
  $('#mpApp').onclick = () => { closeSheet(); N.appDetails(); };
}


/* ====================== Nuevo estilo: brújula, zoom, panel inferior ====================== */
let zoomAdj = 0;
$('#btnNorth').onclick = () => {
  cfg.northUp = !cfg.northUp; saveCfg();
  $('#btnNorth').classList.toggle('lock', cfg.northUp);
  toast(cfg.northUp ? '🧭 Norte siempre arriba' : '🧭 El mapa gira con tu dirección');
  if (follow && me) moveCamera(); else map.easeTo({ bearing: 0 });
};
$('#btnNorth').classList.toggle('lock', !!cfg.northUp);
function updateNorth() { const n = document.getElementById('north'); if (n && map) n.style.transform = 'rotate(' + (-map.getBearing()) + 'deg)'; }
$('#btnZoomIn').onclick = () => { if (follow && me) { zoomAdj = Math.min(3, zoomAdj + 1); camZ = null; moveCamera(); } else map.zoomIn(); };
$('#btnZoomOut').onclick = () => { if (follow && me) { zoomAdj = Math.max(-4, zoomAdj - 1); camZ = null; moveCamera(); } else map.zoomOut(); };
$('#btnMicNav').onclick = () => $('#btnMic').onclick();
$('#btnSetNav').onclick = () => settingsSheet();
$('#sheetX').onclick = () => closeSheet();
$('#qFood').onclick = () => { $('#q').value = 'Restaurante'; showSearch('Restaurante'); };
$('#qParkNear').onclick = async () => {
  const c = me || map.getCenter().toArray();
  toast('🅿️ Buscando aparcamientos cerca…', 2500);
  parkingsFor = null; await loadParkings({ name: 'Aquí', lon: c[0], lat: c[1] });
  parkListSheet(false);
};
/** Tarjetas de Casa, Trabajo y favoritos del panel inferior */
function updateHome() {
  const sub = f => !f ? 'Añadir' : !me ? (f.sub || '') : (dist(me, [f.lon, f.lat]) < 150 ? 'Está aquí' : 'A ' + fmtDist(dist(me, [f.lon, f.lat])));
  $('#hCasa').textContent = sub(favs.casa);
  $('#hTrabajo').textContent = sub(favs.trabajo);
  const box = $('#hFavs');
  box.innerHTML = favList.slice(0, 4).map((f, i) => '<button class="hCard" data-hf="' + i + '"><span class="hIco fav">' + IC.star + '</span><span class="hTxt"><b>' + esc(f.name) +
    '</b><small>' + esc(sub(f)) + '</small></span></button>').join('');
  box.querySelectorAll('[data-hf]').forEach(b => b.onclick = () => goTo(favList[+b.dataset.hf]));
}

/* ====================== Rutas alternativas durante el viaje ====================== */
/** Calcula dónde se separa «alt» de la ruta activa. Devuelve null si es casi igual. */
function markDivergence(alt, alongNow) {
  if (!active || !alt || !alt.coords.length) return alt;
  const samp = [];
  for (let i = 0, last = -1e9; i < active.coords.length; i++) if (active.cum[i] - last >= 25) { samp.push(active.coords[i]); last = active.cum[i]; }
  const near = pt => { for (const q of samp) if (Math.abs(q[1] - pt[1]) < 0.0006 && dist(q, pt) < 40) return true; return false; };
  let divCum = null, offLen = 0, lastCum = -1e9;
  for (let i = 0; i < alt.coords.length; i++) {
    if (alt.cum[i] - lastCum < 50) continue; lastCum = alt.cum[i];
    if (!near(alt.coords[i])) { if (divCum == null) divCum = alt.cum[i]; offLen += 50; }
  }
  if (divCum == null || offLen < Math.min(800, alt.total * 0.08)) return null; // prácticamente la misma ruta
  alt.divAt = alongNow + Math.max(0, divCum - 50);
  return alt;
}
function switchToAlt(a) {
  const i = navAlts.indexOf(a); if (i < 0 || !active) return;
  hideAltPrompt();
  const old = active;
  active = a; navAlts.splice(i, 1);
  Object.assign(nav, { idx: 0, step: 0, off: 0, along: 0, lastReroute: Date.now() });
  for (const k in nav.said) if (k.startsWith('s')) delete nav.said[k];
  navAlts = navAlts.concat([markDivergence(old, 0)]).filter(Boolean);
  sayNav('Ruta cambiada', true); drawRoutes(); navUpdate();
  setTimeout(refreshAlts, 20000);
}

/* --- Pregunta automática cuando hay una ruta bastante más rápida --- */
const ALT_GAIN = 180; // segundos (3 min)
let altPromptFor = null, altPromptT = null;
const declinedAlts = [];
const altSig = a => { const mid = a.coords[Math.floor(a.coords.length / 2)]; return { mid, len: a.total }; };
function wasDeclined(a) {
  const s = altSig(a);
  return declinedAlts.some(d => dist(d.mid, s.mid) < 1500 && Math.abs(d.len - s.len) < Math.max(1500, s.len * 0.1));
}
function maybeOfferAlt() {
  if (!navigating || !active || altPromptFor || !navAlts.length || routeKind() === 'shortest') return;
  const restA = active.time * Math.max(0, active.total - nav.along) / active.total;
  let best = null;
  for (const a of navAlts) {
    if (a.divAt - nav.along < 300) continue;      // ya no da tiempo a tomarla
    if (wasDeclined(a)) continue;
    const gain = restA - a.time;
    if (gain >= ALT_GAIN && (!best || gain > best.gain)) best = { a, gain };
  }
  if (best) showAltPrompt(best.a, best.gain);
}
function showAltPrompt(a, gain) {
  altPromptFor = a;
  const m = Math.round(gain / 60);
  const jam = (active.pois || []).find(o => o.at > nav.along && (o.p.cat === 'retencion' || o.p.cat === 'accidente' || o.p.cat === 'corte'));
  $('#apTitle').textContent = 'Ruta ' + m + ' min más rápida';
  $('#apSub').textContent = (jam ? CAT[jam.p.cat].n + ' en tu ruta a ' + fmtDist(jam.at - nav.along) + ' · ' : '') + 'Llegarías a las ' +
    new Date(Date.now() + a.time * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  $('#altPrompt').classList.remove('hidden');
  const fill = $('#apFill'); fill.style.transition = 'none'; fill.style.width = '100%';
  requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.transition = 'width 15s linear'; fill.style.width = '0%'; }));
  beep(1); vib(200);
  const ART = { accidente: 'un accidente', retencion: 'una retención', corte: 'la carretera cortada' };
  say((jam ? 'Hay ' + ART[jam.p.cat] + ' más adelante. ' : '') + 'Hay una ruta ' + m + (m === 1 ? ' minuto' : ' minutos') + ' más rápida. ¿Quieres cambiar?');
  clearTimeout(altPromptT);
  altPromptT = setTimeout(() => declineAlt(true), 15000);
}
function hideAltPrompt() { clearTimeout(altPromptT); altPromptFor = null; $('#altPrompt').classList.add('hidden'); }
function declineAlt(timeout) {
  if (!altPromptFor) return;
  declinedAlts.push(altSig(altPromptFor));
  hideAltPrompt();
  if (!timeout) say('Vale, seguimos por tu ruta');
}
$('#apYes').onclick = () => { if (altPromptFor) switchToAlt(altPromptFor); };
$('#apNo').onclick = () => declineAlt(false);

async function refreshAlts() {
  if (!navigating || !me || !dest) return;
  altBusy = true; altAt = Date.now();
  try {
    const rs = await calcRoutes(me);
    if (!navigating) return;
    navAlts = rs.map(r => markDivergence(prepRoute(r), nav.along)).filter(Boolean).slice(0, 2);
    drawRoutes();
    maybeOfferAlt();
  } catch (e) { console.log('alternativas ' + e.message); }
  altBusy = false;
}
function altSheet(i) {
  const a = navAlts[i]; if (!a || !active) return;
  const restA = active.time * Math.max(0, active.total - nav.along) / active.total;
  const d = Math.round((a.time - restA) / 60);
  const eta = new Date(Date.now() + a.time * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const nCam = (a.pois || []).filter(o => IS_CAMERA(o.p.cat)).length, nInc = (a.pois || []).length - nCam;
  openSheet('<div class="sTitle">↪️ Ruta alternativa</div>' +
    '<div class="row"><div class="ri">🕘</div><div class="rt"><div class="r1">Llegada ' + eta + ' · ' + (d > 0 ? d + ' min más lenta' : d < 0 ? (-d) + ' min más rápida' : 'mismo tiempo') +
    '</div><div class="r2">' + fmtDist(a.len) + ' · 📷 ' + nCam + ' radares · ⚠️ ' + nInc + ' avisos' + (a.delay > 60 ? ' · 🔴 +' + fmtTime(a.delay) + ' atasco' : '') + '</div></div></div>' +
    '<button class="btn" id="aSw">Cambiar a esta ruta</button><button class="btn alt" id="aNo">Seguir con la mía</button>');
  $('#aSw').onclick = () => { closeSheet(); switchToAlt(a); };
  $('#aNo').onclick = closeSheet;
}

/* --- Botón de rutas alternativas (como Google Maps) --- */
async function altsOverview() {
  if (!navigating || !active) return;
  if (!navAlts.length) {
    if (altBusy) { toast('Buscando otras rutas…'); return; }
    toast('🔀 Buscando otras rutas…', 3000);
    await refreshAlts();
    if (!navigating) return;
    if (!navAlts.length) { toast('Ahora mismo no hay otras rutas que merezcan la pena'); return; }
  }
  setFollow(false);
  // Encuadrar lo que queda de tu ruta y las alternativas
  let a = 180, b = 90, c = -180, d = -90;
  const add = (r, from) => { for (let i = 0; i < r.coords.length; i++) { if (from != null && r.cum[i] < from) continue; const q = r.coords[i]; a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); d = Math.max(d, q[1]); } };
  add(active, nav.along); navAlts.forEach(r => add(r));
  if (me) { a = Math.min(a, me[0]); b = Math.min(b, me[1]); c = Math.max(c, me[0]); d = Math.max(d, me[1]); }
  const restA = active.time * Math.max(0, active.total - nav.along) / active.total;
  const eta = s => new Date(Date.now() + s * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  let h = '<div class="rHead"><div class="sTitle">🔀 Rutas alternativas</div><div class="sSub">Toca una para cambiar de ruta</div></div><div class="rCards">' +
    '<button class="rCard sel" data-keep="1"><b>' + fmtTime(restA) + '</b><i>Tu ruta</i><span>' + fmtDist(Math.max(0, active.total - nav.along)) + ' · ' + eta(restA) + '</span></button>';
  navAlts.forEach((r, i) => {
    const dm = Math.round((r.time - restA) / 60);
    h += '<button class="rCard" data-alt="' + i + '"><b>' + fmtTime(r.time) + '</b><i style="color:' + (dm < 0 ? '#66bb6a' : dm > 0 ? '#ffb74d' : '#29b6f6') + '">' +
      (dm < 0 ? (-dm) + ' min más rápida' : dm > 0 ? dm + ' min más lenta' : 'Mismo tiempo') + '</i><span>' + fmtDist(r.len) + ' · ' + eta(r.time) + '</span>' +
      (r.delay > 60 ? '<span class="red">🔴 +' + fmtTime(r.delay) + ' atasco</span>' : '') + '</button>';
  });
  h += '</div><button class="btn alt" id="aKeep">Seguir con mi ruta</button>';
  openSheet(h, () => setFollow(true));
  $('#sheet').classList.add('routes'); $('#sheetBg').classList.add('hidden');
  const sh = $('#sheet'), side = innerWidth > innerHeight && innerWidth >= 700;
  map.fitBounds([[a, b], [c, d]], { padding: side ? { top: 40, bottom: 40, left: sh.offsetWidth + 24, right: 90 } : { top: 40, bottom: sh.offsetHeight + 20, left: 30, right: 80 },
    bearing: 0, pitch: 0, duration: 800 });
  document.querySelectorAll('#sheetBody [data-alt]').forEach(el => el.onclick = () => { const r = navAlts[+el.dataset.alt]; closeSheet(); if (r) switchToAlt(r); });
  document.querySelectorAll('#sheetBody [data-keep]').forEach(el => el.onclick = closeSheet);
  $('#aKeep').onclick = closeSheet;
}
$('#btnAlts').onclick = altsOverview;

/* ====================== Direcciones con número (CartoCiudad, IGN) ====================== */
const CC = 'https://www.cartociudad.es/geocoder/api/geocoder/';
const SMALL = { de: 1, del: 1, la: 1, las: 1, el: 1, los: 1, y: 1, a: 1, en: 1 };
function titleEs(t) {
  return String(t || '').toLowerCase().replace(/\S+/g, (w, i) => (i > 0 && SMALL[w]) ? w : w.charAt(0).toUpperCase() + w.slice(1));
}
const CC_ICON = { portal: '🏠', callejero: '🛣️', carretera: '🛣️', Municipio: '🏙️', municipio: '🏙️', poblacion: '🏘️', toponimo: '📍', codpost: '✉️', provincia: '🗺️', ngbe: '📍' };
async function searchCarto(q) {
  const j = await getJSON(CC + 'candidates?limit=8&q=' + encodeURIComponent(q));
  const num = (q.match(/(?:^|\D)(\d{1,4})(?!\d)/) || [])[1];
  return (Array.isArray(j) ? j : []).filter(c => c.type !== 'provincia').map(c => {
    const via = c.tip_via ? titleEs(c.tip_via) + ' ' : '';
    const portal = c.portalNumber ? ', ' + c.portalNumber + (c.extension ? ' ' + c.extension : '') : '';
    const name = (c.type === 'portal' || c.type === 'callejero') ? via + titleEs(c.address) + portal : titleEs(c.address);
    const sub = [c.postalCode, titleEs(c.muni || c.poblacion), titleEs(c.province)].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    const ok = c.lat && c.lng && +c.lat !== 0;
    return { name, sub, lat: ok ? +c.lat : null, lon: ok ? +c.lng : null, cc: { id: c.id, type: c.type, portal: c.portalNumber || (c.type === 'callejero' ? num : null) },
      icon: CC_ICON[c.type] || '📍', exact: c.type === 'portal' };
  });
}
/** Para calles sin coordenadas: pide la posición exacta (con el número si lo hay) */
async function ccFind(d) {
  let url = CC + 'find?id=' + encodeURIComponent(d.cc.id) + '&type=' + encodeURIComponent(d.cc.type);
  if (d.cc.portal) url += '&portal=' + encodeURIComponent(d.cc.portal);
  const j = await getJSON(url);
  if (j && j.lat && j.lng) {
    d.lat = +j.lat; d.lon = +j.lng;
    if (j.portalNumber && !/,\s*\d/.test(d.name)) d.name += ', ' + j.portalNumber;
  }
  return d;
}

/* ====================== Casa, Trabajo y Favoritos ====================== */
let pickFor = null; // 'casa' | 'trabajo' | 'fav' | 'stop'
const PICK_TITLE = { casa: '🏠 ¿Cuál es tu casa?', trabajo: '💼 ¿Dónde trabajas?', fav: '⭐ Nuevo favorito', stop: '📍 Añadir una parada' };
function startPick(k) {
  backTo = null;
  pickFor = k;
  $('#q').value = '';
  showSearch('');
  if (navigating) { $('#searchBar').classList.remove('hidden'); document.body.classList.add('picking'); }
  setTimeout(() => $('#q').focus(), 150);
}
function pickCancel() {
  pickFor = null;
  if (navigating) $('#searchBar').classList.add('hidden'); document.body.classList.remove('picking');
  if (preview && routes.length) setTimeout(routeSheet, 50);
}
function finishPick(k, d) {
  if (navigating) $('#searchBar').classList.add('hidden'); document.body.classList.remove('picking');
  const place = { name: d.name, sub: d.sub || '', lon: d.lon, lat: d.lat };
  if (k === 'casa') setFav('casa', Object.assign({}, place, { name: 'Casa', sub: d.name + (d.sub ? ', ' + d.sub : '') }));
  else if (k === 'trabajo') setFav('trabajo', Object.assign({}, place, { name: 'Trabajo', sub: d.name + (d.sub ? ', ' + d.sub : '') }));
  else if (k === 'fav') addFavorite(place);
  else if (k === 'stop') addStop(place);
  if ((k === 'casa' || k === 'trabajo' || k === 'fav') && !navigating && !preview) setTimeout(favSheet, 400);
  else if (preview && k !== 'stop') setTimeout(routeSheet, 300);
}
function addFavorite(p) {
  if (favList.some(f => Math.abs(f.lat - p.lat) < 1e-4 && Math.abs(f.lon - p.lon) < 1e-4)) { toast('Ya está en tus favoritos'); return; }
  favList.push({ id: 'f' + Date.now(), name: p.name, sub: p.sub || '', lon: p.lon, lat: p.lat });
  store.set('favList', favList); toast('⭐ Guardado en favoritos');
}
function addStop(p) {
  if (navigating) { stops.unshift(p); toast('📍 Parada añadida: ' + p.name); reroute(); }
  else if (dest) { stops.push(p); goTo(dest, true); }
  else goTo(p);
}
function favSheet() {
  let h = '<div class="sTitle">⭐ Tus sitios</div>';
  const one = (k, icon, label) => {
    const f = favs[k];
    return '<div class="row" data-go="' + k + '"><div class="ri">' + icon + '</div><div class="rt"><div class="r1">' + label + '</div><div class="r2">' +
      esc(f ? (f.sub || '') : 'Sin guardar') + '</div></div><button class="rowbtn" data-chg="' + k + '">' + (f ? '✏️' : '➕') + '</button>' +
      (f ? '<button class="rowbtn" data-delk="' + k + '">🗑️</button>' : '') + '</div>';
  };
  h += one('casa', '🏠', 'Casa') + one('trabajo', '💼', 'Trabajo');
  favList.forEach((f, i) => {
    h += '<div class="row" data-gf="' + i + '"><div class="ri">⭐</div><div class="rt"><div class="r1">' + esc(f.name) + '</div><div class="r2">' + esc(f.sub || '') +
      '</div></div><button class="rowbtn" data-ren="' + i + '">✏️</button><button class="rowbtn" data-del="' + i + '">🗑️</button></div>';
  });
  const sr = store.get('savedRoutes', []);
  if (sr.length) {
    h += '<div class="sec">🛣️ Rutas guardadas</div>';
    sr.forEach((r, i) => { h += '<div class="row" data-sr="' + i + '"><div class="ri">🛣️</div><div class="rt"><div class="r1">' + esc(r.name) + '</div><div class="r2">' +
      esc('Hasta ' + r.dest.name + (r.stops.length ? ' · ' + r.stops.length + ' parada' + (r.stops.length > 1 ? 's' : '') : '')) + '</div></div><button class="rowbtn" data-srd="' + i + '">🗑️</button></div>'; });
    h += '<div class="sec">⭐ Favoritos</div>';
  }
  if (!favList.length) h += '<div class="muted" style="margin:6px 2px 10px">Aún no tienes favoritos. Añade uno con el botón de abajo, con ⭐ al ver una ruta, o manteniendo pulsado el mapa.</div>';
  h += '<button class="btn" id="fAdd">➕ Añadir favorito</button>';
  openSheet(h);
  const stop = ev => ev.stopPropagation();
  document.querySelectorAll('#sheetBody [data-go]').forEach(el => el.onclick = () => {
    const f = favs[el.dataset.go]; if (!f) { startPick(el.dataset.go); return; } closeSheet(); goTo(f);
  });
  document.querySelectorAll('#sheetBody [data-chg]').forEach(b => b.onclick = ev => { stop(ev); startPick(b.dataset.chg); });
  document.querySelectorAll('#sheetBody [data-delk]').forEach(b => b.onclick = ev => { stop(ev); delete favs[b.dataset.delk]; store.set('favs', favs); favSheet(); });
  document.querySelectorAll('#sheetBody [data-gf]').forEach(el => el.onclick = () => { const f = favList[+el.dataset.gf]; closeSheet(); goTo(f); });
  document.querySelectorAll('#sheetBody [data-del]').forEach(b => b.onclick = ev => { stop(ev); favList.splice(+b.dataset.del, 1); store.set('favList', favList); favSheet(); });
  document.querySelectorAll('#sheetBody [data-ren]').forEach(b => b.onclick = ev => { stop(ev); renameFav(+b.dataset.ren); });
  $('#fAdd').onclick = () => startPick('fav');
  document.querySelectorAll('#sheetBody [data-sr]').forEach(el => el.onclick = () => { closeSheet(); useSavedRoute(store.get('savedRoutes', [])[+el.dataset.sr]); });
  document.querySelectorAll('#sheetBody [data-srd]').forEach(b => b.onclick = ev => { ev.stopPropagation(); const l = store.get('savedRoutes', []); l.splice(+b.dataset.srd, 1); store.set('savedRoutes', l); favSheet(); });
}
function renameFav(i) {
  const f = favList[i]; if (!f) return;
  openSheet('<div class="sTitle">✏️ Cambiar nombre</div><input class="inl" id="rnIn" maxlength="40" value="' + esc(f.name) + '">' +
    '<button class="btn" id="rnOk">Guardar</button><button class="btn alt" id="rnNo">Cancelar</button>');
  setTimeout(() => { const i2 = $('#rnIn'); i2.focus(); i2.select(); }, 150);
  $('#rnOk').onclick = () => { const v = $('#rnIn').value.trim(); if (v) { f.name = v; store.set('favList', favList); } favSheet(); };
  $('#rnNo').onclick = favSheet;
}
$('#qCasa').onclick = () => favs.casa ? goTo(favs.casa) : startPick('casa');
$('#qTrabajo').onclick = () => favs.trabajo ? goTo(favs.trabajo) : startPick('trabajo');
$('#qFav').onclick = favSheet;
$('#qGas').onclick = () => gasSheet(null, 0);
$('#qPark').onclick = () => parkSheet();
$('#qStats').onclick = () => statsSheet();
$('#parkPill').onclick = () => parkListSheet(false);
$('#btnGas').onclick = () => gasSheet(active, nav.along);

/* ====================== Gasolineras (precios oficiales) ====================== */
const FUELS = { g95: { i: 7, n: 'Gasolina 95' }, g98: { i: 8, n: 'Gasolina 98' }, ga: { i: 9, n: 'Diésel' },
  gap: { i: 10, n: 'Diésel Premium' }, glp: { i: 11, n: 'Autogás (GLP)' } };
let fuel = store.get('fuel', []), fuelQ = null, fuelBusy = false, gasWaiting = null;
async function loadFuel(force) {
  if (!N || !N.fuel || fuelBusy) return;
  if (!force && fuel.length && Date.now() - store.get('fuelAt', 0) < 6 * 3600e3) { refreshGas(); return; }
  fuelBusy = true;
  try {
    const arr = JSON.parse(await nativeCall('fuel'));
    if (arr.length) { fuel = arr; store.set('fuel', fuel); store.set('fuelAt', Date.now()); refreshGas(); }
  } catch (e) {
    console.log('Gasolineras: ' + e.message);
    if (gasWaiting && sheetOpen()) openSheet('<div class="sTitle">⛽ Gasolineras</div><div class="muted">No se pudieron descargar los precios. ¿Tienes internet? Prueba otra vez en un rato.</div>');
    gasWaiting = null;
  }
  fuelBusy = false;
  if (gasWaiting && fuel.length && sheetOpen() && $('#sheetBody').dataset.gas === 'wait') { const g = gasWaiting; gasWaiting = null; gasSheet(g.route, g.from); }
}
const fPrice = (s, k) => s[FUELS[k || cfg.fuel].i] || 0;
const fmtEur = v => v ? v.toFixed(3).replace('.', ',') + ' €' : '—';
function priceClass(v) { if (!fuelQ || !v) return 'mid'; return v <= fuelQ[0] ? 'cheap' : v >= fuelQ[1] ? 'dear' : 'mid'; }
const CLS_COLOR = { cheap: '#7CFC9A', mid: '#ffcc66', dear: '#ff8a80' };
function refreshGas() {
  const ps = fuel.map(s => fPrice(s)).filter(v => v > 0).sort((a, b) => a - b);
  fuelQ = ps.length ? [ps[Math.floor(ps.length * 0.25)], ps[Math.floor(ps.length * 0.75)]] : null;
  if (!map || !map.getSource('gas')) return;
  map.getSource('gas').setData({ type: 'FeatureCollection', features: fuel.filter(s => fPrice(s) > 0).map(s => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [s[3], s[2]] },
    properties: { id: s[0], p: fPrice(s).toFixed(3).replace('.', ','), c: CLS_COLOR[priceClass(fPrice(s))] } })) });
}
const gasById = id => fuel.find(s => String(s[0]) === String(id));
function showGas(id) {
  const s = gasById(id); if (!s) return;
  let h = '<div class="pop"><b>⛽ ' + esc(s[1] || 'Gasolinera') + '</b><div>' + esc(s[4]) + (s[5] ? ', ' + esc(s[5]) : '') + '</div>';
  if (s[6]) h += '<div class="muted">🕘 ' + esc(s[6]) + '</div>';
  for (const k in FUELS) if (fPrice(s, k)) h += '<div>' + FUELS[k].n + ': <span class="' + priceClass(k === cfg.fuel ? fPrice(s, k) : 0) + '"><b>' + fmtEur(fPrice(s, k)) + '</b></span></div>';
  h += '<div class="pb"><button data-go="1">🚗 Ir aquí</button>' + (navigating || preview ? '<button data-stop="1">📍 Parar aquí</button>' : '') + '</div></div>';
  const pop = new maplibregl.Popup({ offset: 16, maxWidth: '300px' }).setLngLat([s[3], s[2]]).setHTML(h).addTo(map);
  const el = pop.getElement(), place = { name: s[1] || 'Gasolinera', sub: s[4] + (s[5] ? ', ' + s[5] : ''), lon: s[3], lat: s[2] };
  el.querySelector('[data-go]').onclick = () => { pop.remove(); goTo(place); };
  const st = el.querySelector('[data-stop]'); if (st) st.onclick = () => { pop.remove(); addStop(place); };
}
/** Gasolineras más baratas cerca de ti o a lo largo de la ruta */
function gasSheet(route, from) {
  if (!fuel.length) {
    openSheet('<div class="sTitle">⛽ Gasolineras</div><div class="muted">Descargando los precios del Ministerio… un momento.</div>');
    $('#sheetBody').dataset.gas = 'wait'; gasWaiting = { route, from };
    loadFuel(true); return;
  }
  const r = route || (preview && routes[selIdx]) || (navigating && active) || null;
  const items = [];
  if (r) {
    // puntos de la ruta cada ~300 m
    const samp = []; let last = -1e9;
    for (let i = 0; i < r.coords.length; i++) if (r.cum[i] - last >= 300 || i === r.coords.length - 1) { samp.push([r.coords[i], r.cum[i]]); last = r.cum[i]; }
    const [a, b, c, d] = r.bbox, pad = 0.01;
    for (const s of fuel) {
      if (!fPrice(s) || s[3] < a - pad || s[3] > c + pad || s[2] < b - pad || s[2] > d + pad) continue;
      let best = null;
      for (const [pt, at] of samp) {
        if (Math.abs(pt[1] - s[2]) > 0.01) continue;
        const dd = dist(pt, [s[3], s[2]]);
        if (dd < 700 && (!best || dd < best.dd)) best = { dd, at };
      }
      if (best && best.at >= (from || 0) - 100) items.push({ s, at: best.at - (from || 0), off: best.dd });
    }
  } else {
    const c = me || map.getCenter().toArray();
    for (const s of fuel) {
      if (!fPrice(s) || Math.abs(s[2] - c[1]) > 0.1 || Math.abs(s[3] - c[0]) > 0.13) continue;
      const dd = dist(c, [s[3], s[2]]); if (dd <= 10000) items.push({ s, at: dd, off: 0 });
    }
  }
  items.sort((x, y) => fPrice(x.s) - fPrice(y.s) || x.at - y.at);
  const top = items.slice(0, 20);
  let h = '<div class="sTitle">⛽ ' + (r ? 'Más baratas en tu ruta' : 'Más baratas a 10 km') + '</div>' +
    '<div class="chips">' + Object.keys(FUELS).map(k => '<button class="chip" data-f="' + k + '"' + (k === cfg.fuel ? ' style="background:#1a73e8"' : '') + '>' + FUELS[k].n + '</button>').join('') + '</div>';
  top.forEach((it, i) => {
    const s = it.s;
    h += '<div class="row" data-g="' + i + '"><div class="ri">⛽</div><div class="rt"><div class="r1">' + esc(s[1] || 'Gasolinera') + '</div><div class="r2">' + esc(s[4]) +
      (s[5] ? ', ' + esc(s[5]) : '') + '</div><div class="r2">' + (r ? 'a ' + fmtDist(it.at) + ' por la ruta' + (it.off > 150 ? ' · desvío ' + fmtDist(it.off) : '') : 'a ' + fmtDist(it.at)) +
      '</div></div><div class="rr price ' + priceClass(fPrice(s)) + '">' + fmtEur(fPrice(s)) + '</div></div>';
  });
  if (!top.length) h += '<div class="muted">No hay gasolineras con ' + FUELS[cfg.fuel].n + ' ' + (r ? 'en esta ruta' : 'a menos de 10 km') + '.</div>';
  h += '<div class="muted" style="margin-top:8px">Precios oficiales del Ministerio. Verde = de las más baratas de España, rojo = de las más caras.</div>';
  openSheet(h, preview && !navigating ? () => setTimeout(routeSheet, 50) : null);
  document.querySelectorAll('#sheetBody [data-f]').forEach(b => b.onclick = () => { cfg.fuel = b.dataset.f; saveCfg(); refreshGas(); gasSheet(route, from); });
  document.querySelectorAll('#sheetBody [data-g]').forEach(el => el.onclick = () => {
    const s = top[+el.dataset.g].s, place = { name: s[1] || 'Gasolinera', sub: s[4] + (s[5] ? ', ' + s[5] : ''), lon: s[3], lat: s[2] };
    if (navigating || preview) {
      openSheet('<div class="sTitle">⛽ ' + esc(place.name) + '</div><div class="sSub">' + esc(place.sub) + ' · ' + fmtEur(fPrice(s)) + '</div>' +
        '<button class="btn" id="gStop">📍 Parar aquí de camino</button><button class="btn alt" id="gGo">🚗 Ir solo aquí</button><button class="btn alt" id="gBack">Volver</button>',
        preview && !navigating ? () => setTimeout(routeSheet, 50) : null);
      $('#gStop').onclick = () => { sheetOnClose = null; closeSheet(); addStop(place); };
      $('#gGo').onclick = () => { sheetOnClose = null; closeSheet(); goTo(place); };
      $('#gBack').onclick = () => gasSheet(route, from);
    } else { closeSheet(); goTo(place); }
  });
}

/* ====================== Límite de velocidad de la vía ====================== */
let curWay = null;
let roadLimit = 0, limitWays = null, limitBusy = false, limitAt = 0, limitCand = { v: 0, n: 0 }, limitOverAt = 0, limitSaidFor = 0;
const LIMIT_TXT = { 'es:urban': 50, 'es:rural': 90, 'es:motorway': 120, 'es:trunk': 100, 'es:zone30': 30, 'es:zone20': 20, 'es:living_street': 20,
  'es:zone10': 10, 'walk': 10, 'none': 0 };
function parseMax(v) {
  if (!v) return 0;
  v = String(v).toLowerCase().split(';')[0].trim();
  if (LIMIT_TXT[v] != null) return LIMIT_TXT[v];
  const n = parseInt(v); if (!n) return 0;
  return /mph/.test(v) ? Math.round(n * 1.609) : n;
}
async function fetchWays(c) {
  limitBusy = true; limitAt = Date.now();
  const R = Math.round(Math.max(1200, Math.min(speedMs * 70, 3000)));
  const q = '[out:json][timeout:25];way(around:' + R + ',' + c[1].toFixed(5) + ',' + c[0].toFixed(5) + ')["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"];out tags geom;';
  for (const base of OVERPASS) {
    try {
      const j = await getJSON(base + encodeURIComponent(q));
      const ways = [];
      for (const w of j.elements || []) {
        if (!w.geometry || w.geometry.length < 2) continue;
        const t = w.tags || {};
        ways.push({ g: w.geometry.map(p => [p.lon, p.lat]), max: parseMax(t.maxspeed), f: parseMax(t['maxspeed:forward']), b: parseMax(t['maxspeed:backward']),
          oneway: t.oneway === 'yes' || t.highway === 'motorway' || t.junction === 'roundabout',
          tl: t['turn:lanes'] || t['turn:lanes:forward'] || '', tlb: t['turn:lanes:backward'] || '' });
      }
      limitWays = { c, R, ways };
      break;
    } catch (e) { console.log('Límite ' + base + ': ' + e.message); }
  }
  limitBusy = false;
}
function updateLimit() {
  if ((!cfg.limit && !(cfg.lanes && navigating)) || !me || (navigating && active && active.walk)) { $('#limit').classList.add('hidden'); roadLimit = 0; return; }
  if (!limitBusy && (!limitWays || dist(limitWays.c, me) > limitWays.R * 0.55) && Date.now() - limitAt > 15000) fetchWays(me);
  if (!limitWays) return;
  let best = null;
  for (const w of limitWays.ways) {
    for (let i = 0; i < w.g.length - 1; i++) {
      const A = w.g[i], B = w.g[i + 1];
      if (Math.abs(A[1] - me[1]) > 0.004 && Math.abs(B[1] - me[1]) > 0.004) continue;
      const pr = projSeg(me, A, B); if (pr.d > 30) continue;
      let fwd = true, pen = 0;
      if (speedMs > 2) {
        const ang = angDiff(bearing(A, B), heading);
        fwd = ang <= 90;
        pen = Math.min(ang, 180 - ang) / 3; // penaliza calles que no van en tu dirección
        if (w.oneway && !fwd) pen += 30;
      }
      const score = pr.d + pen;
      if (!best || score < best.score) best = { score, w, fwd };
    }
  }
  let v = 0;
  curWay = best ? { w: best.w, fwd: best.fwd } : null;
  if (best) v = (best.fwd ? best.w.f : best.w.b) || best.w.max;
  // Cambia el número solo cuando se repite dos veces (evita saltos)
  if (v === limitCand.v) limitCand.n++; else limitCand = { v, n: 1 };
  if (limitCand.n >= 2 || !roadLimit) roadLimit = limitCand.v;
  const el = $('#limit'), kmh = speedMs * 3.6;
  if (!cfg.limit) { el.classList.add('hidden'); return; }
  if (!roadLimit) { el.classList.add('hidden'); $('#speed').classList.remove('over'); return; }
  el.textContent = roadLimit; el.classList.remove('hidden');
  const over = kmh > roadLimit * 1.08 + 3;
  $('#speed').classList.toggle('over', over); el.classList.toggle('over', over);
  if (over && cfg.limitWarn) {
    if (!limitOverAt) limitOverAt = Date.now();
    if (Date.now() - limitOverAt > 4000 && limitSaidFor !== roadLimit) {
      limitSaidFor = roadLimit; beep(1); say('Atención, el límite es de ' + roadLimit);
    }
  } else { limitOverAt = 0; if (kmh < roadLimit) limitSaidFor = 0; }
}

/* ====================== Ubicaciones compartidas ====================== */
function coordsFrom(t) {
  let m = t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (m) return [+m[2], +m[1]];
  m = t.match(/[?&](?:q|ll|daddr|destination|query|center|sll)=(?:loc:)?(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (m) return [+m[2], +m[1]];
  m = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return [+m[2], +m[1]];
  m = t.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/);
  if (m) return [+m[2], +m[1]];
  return null;
}
function nameFrom(t) {
  let m = t.match(/\/place\/([^\/@?]+)/); if (m) return decodeURIComponent(m[1].replace(/\+/g, ' '));
  m = t.match(/\(([^)]{2,60})\)/); if (m) return m[1];
  return '';
}
async function onShared(raw) {
  let t = String(raw || '').trim(); if (!t) return;
  if (/🅿️|aparcad/i.test(t)) {
    const c = coordsFrom(t);
    if (c) { savePark(c, false, 'WhatsApp'); setTimeout(parkSheet, 600); return; }
  }
  toast('📍 Abriendo la ubicación…');
  try { t = decodeURIComponent(t.replace(/\+/g, ' ')); } catch (e) { }
  if (/^geo:/i.test(t)) {
    const g = t.match(/^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
    const q = (t.split(/[?&]q=/)[1] || '').trim();
    const c = coordsFrom(q) || (g && (+g[1] || +g[2]) ? [+g[2], +g[1]] : null);
    if (c) { goTo({ name: nameFrom(q) || 'Ubicación compartida', sub: '', lon: c[0], lat: c[1] }); return; }
    if (q) { $('#q').value = q.replace(/\(.*\)/, '').trim(); showSearch($('#q').value); return; }
    return;
  }
  const url = (t.match(/https?:\/\/\S+/) || [])[0];
  let c = coordsFrom(t), name = nameFrom(t);
  if (!c && url && /goo\.gl|app\.goo/i.test(url) && N && N.resolve) {
    try {
      let r = await new Promise((res, rej) => { const id = 'r' + (++reqN); pend[id] = { res, rej }; N.resolve(id, url); setTimeout(() => rej(new Error('tiempo')), 20000); });
      try { r = decodeURIComponent(r.replace(/\+/g, ' ')); } catch (e) { }
      c = coordsFrom(r); name = name || nameFrom(r);
    } catch (e) { console.log('resolve ' + e.message); }
  }
  if (c) { goTo({ name: name || 'Ubicación compartida', sub: '', lon: c[0], lat: c[1] }); return; }
  // Sin coordenadas: buscar el texto (por ejemplo una dirección)
  let q = (url ? t.replace(url, '') : t).replace(/\s+/g, ' ').trim();
  const qm = url && url.match(/[?&](?:q|query|daddr|destination)=([^&]+)/); if (qm) q = qm[1];
  if (!q && name) q = name;
  if (q) { $('#q').value = q.slice(0, 120); showSearch($('#q').value); }
  else toast('No he podido leer esa ubicación');
}
window.onShared = onShared;

/* ====================== Botón atrás de Android ====================== */
window.onBack = () => {
  if (!$('#camView').classList.contains('hidden')) { $('#camClose').onclick(); return true; }
  if (!$('#mediaCard').classList.contains('hidden')) { hideMediaCard(); return true; }
  if (!$('#reportPop').classList.contains('hidden')) { $('#reportPop').classList.add('hidden'); return true; }
  if (altPromptFor) { declineAlt(false); return true; }
  if (!$('#notice').classList.contains('hidden')) { hideNotice(); return true; }
  if (sheetOpen() && document.getElementById('sheetBack')) { document.getElementById('sheetBack').click(); return true; }
  if (sheetOpen() && setPage && document.getElementById('setBack')) { settingsSheet(); return true; }
  if (sheetOpen()) { closeSheet(); return true; }
  if (pickFor) { pickCancel(); return true; }
  if (document.activeElement === $('#q')) { $('#q').blur(); return true; }
  if (preview) { cancelPreview(); return true; }
  if (navigating) { $('#btnStop').onclick(); return true; }
  return false;
};

boot();


/* ====================== Android Auto (lo llama la parte nativa del coche) ====================== */
if (CAR) {
  window.carSetArea = (l, t, r, b) => {
    carArea = { l, t, r, b };
    const st = document.documentElement.style;
    st.setProperty('--cl', l + 'px'); st.setProperty('--ct', t + 'px'); st.setProperty('--cr', r + 'px'); st.setProperty('--cb', b + 'px');
    if (map) { map.resize(); if (follow && me) moveCamera(); }
  };
  window.carPan = (dx, dy) => { if (!map) return; setFollow(false); map.panBy([dx, dy], { duration: 0 }); };
  window.carScale = (fx, fy, f) => { if (!map) return; setFollow(false); map.zoomTo(map.getZoom() + Math.log2(f), { around: map.unproject([fx, fy]), duration: 0 }); };
  window.carZoom = k => { if (follow && me) { zoomAdj = Math.max(-4, Math.min(3, zoomAdj + k)); camZ = null; moveCamera(); } else map[k > 0 ? 'zoomIn' : 'zoomOut'](); };
  window.carCenter = () => setFollow(true);
  window.carDests = () => {
    const out = [];
    if (favs.casa) out.push({ ic: 'casa', name: 'Casa', sub: favs.casa.sub || '', lat: favs.casa.lat, lon: favs.casa.lon });
    if (favs.trabajo) out.push({ ic: 'trabajo', name: 'Trabajo', sub: favs.trabajo.sub || '', lat: favs.trabajo.lat, lon: favs.trabajo.lon });
    favList.forEach(f => out.push({ ic: 'fav', name: f.name, sub: f.sub || '', lat: f.lat, lon: f.lon }));
    recents.slice(0, 8).forEach(r => out.push({ ic: 'rec', name: r.name, sub: r.sub || '', lat: r.lat, lon: r.lon }));
    return out.filter(d => d.lat != null && d.lon != null).map(d => Object.assign(d, { d: me ? Math.round(dist(me, [d.lon, d.lat])) : -1 }));
  };
  window.carSearch = async q => {
    let res = [];
    try {
      res = await searchCarto(q);
      for (const d of res.slice(0, 6)) if (d.lat == null && d.cc) { try { await ccFind(d); } catch (e) { } }
    } catch (e) { }
    res = res.filter(d => d.lat != null).slice(0, 6).map(d => ({ name: d.name, sub: d.sub || '', lat: d.lat, lon: d.lon, d: me ? Math.round(dist(me, [d.lon, d.lat])) : -1 }));
    N.carResults(JSON.stringify(res));
  };
  window.carGo = (lat, lon, name, sub) => goTo({ name, sub: sub || '', lat, lon });
  window.carStop = () => { if (navigating) stopNav(); };
  window.carReport = k => { if (me) addReport(k, me); };
  window.carSound = () => { setSound({ all: 'alerts', alerts: 'off', off: 'all' }[cfg.sound] || 'all'); return cfg.sound; };
  window.carSoundNow = () => cfg.sound;
  window.carReroute = () => { if (navigating) reroute(); };
}
