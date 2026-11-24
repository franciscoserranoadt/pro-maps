/* Pro Maps — navegador gratuito con radares, DGT y avisos tipo Waze */
'use strict';

const $ = s => document.querySelector(s);
const N = window.Nativo || null;

/* ====================== Ajustes y almacenamiento ====================== */
const store = {
  get(k, d) { try { const v = localStorage.getItem('pn_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('pn_' + k, JSON.stringify(v)); } catch (e) { } }
};
const DEF = { voice: true, radars: true, semaforos: true, incid: true, reports: true, beep: true,
  tomtom: '', style: 'auto', tolls: false, highways: false, traffic: false };
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
    if (fn === 'dgt') N.dgt(id); else N.get(id, url);
    setTimeout(() => { if (pend[id]) { delete pend[id]; rej(new Error('Tiempo agotado')); } }, 100000);
  });
}
function get(url) {
  if (N) return nativeCall('get', url);
  return fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
}
const getJSON = url => get(url).then(t => JSON.parse(t));

/* ====================== Voz, avisos y utilidades ====================== */
let lastSay = '';
function say(t, urgent) {
  if (!cfg.voice || !t) return;
  lastSay = t;
  if (N) { urgent ? N.speakNow(t) : N.speak(t); }
  else if (window.speechSynthesis) {
    if (urgent) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t); u.lang = 'es-ES'; speechSynthesis.speak(u);
  }
}
const beep = k => { if (cfg.beep && N) N.beep(k || 1); };
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
  meteo:     { e: '❄️', c: '#0288d1', n: 'Meteorología adversa' },
  animal:    { e: '🦌', c: '#6d4c41', n: 'Animales en la vía' },
  obstaculo: { e: '⚠️', c: '#f9a825', n: 'Obstáculo en la vía' },
  peligro:   { e: '⚠️', c: '#f9a825', n: 'Peligro' },
  evento:    { e: '🎪', c: '#7b1fa2', n: 'Evento' },
  incid:     { e: '❗', c: '#ef6c00', n: 'Incidencia' }
};
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
  if (!force && radars.length && Date.now() - radarsAt < 7 * 864e5) return;
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
            out['t' + m.ref + m.role] = { id: 't' + m.ref + m.role, lon: nd.lon, lat: nd.lat, cat: 'tramo', max,
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
      store.set('radars', radars); store.set('radarsAt', Date.now());
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

function wantedStyle() {
  let k = cfg.style;
  if (k === 'auto') { const h = new Date().getHours(); k = (h >= 20 || h < 8) ? 'dark' : 'light'; }
  if (k === 'dark' && styleOk.dark === false) k = 'light';
  return k;
}
let curStyle = '';
function applyStyle(force) {
  const k = wantedStyle();
  if (!force && k === curStyle) return;
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
    pitchWithRotate: true, dragRotate: true, maxPitch: 70, fadeDuration: 0 });
  map.on('style.load', onStyleLoad);
  map.on('error', e => console.log('map error ' + (e && e.error && e.error.message)));
  map.on('dragstart', () => setFollow(false));
  map.on('click', 'pois', e => { const f = e.features && e.features[0]; if (f) showPoi(f); });
  map.on('click', 'routeAlt', e => { const f = e.features && e.features[0]; if (f && preview) selectRoute(f.properties.i); });
  map.on('mouseenter', 'pois', () => map.getCanvas().style.cursor = 'pointer');
  setupLongPress();

  const el = document.createElement('div'); el.className = 'me';
  el.innerHTML = '<svg viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="#1a73e8" fill-opacity=".18"/>' +
    '<path d="M23 6 L35 36 L23 29 L11 36 Z" fill="#33ccff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  meMarker = new maplibregl.Marker({ element: el, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat(start).addTo(map);

  map.once('load', () => { $('#splash').classList.add('hidden'); });
  setTimeout(() => $('#splash').classList.add('hidden'), 9000);

  cleanReports();
  loadRadars(false);
  loadDgt(); setInterval(loadDgt, 3 * 60000);
  setInterval(() => { cleanReports(); refreshPois(); applyStyle(false); }, 5 * 60000);
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

function onStyleLoad() {
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
  map.addLayer({ id: 'routeAlt', type: 'line', source: 'routeAlt', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#7f93b3', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 10], 'line-opacity': 0.9 } });
  map.addLayer({ id: 'routeCase', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#0b3d91', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 7, 16, 16] } });
  map.addLayer({ id: 'routeLine', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#2f8cff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 4, 16, 11] } });
  map.addLayer({ id: 'segs', type: 'line', source: 'segs', minzoom: 10,
    paint: { 'line-color': ['get', 'color'], 'line-width': 5, 'line-dasharray': [1.5, 1], 'line-opacity': 0.8 } });
  map.addLayer({ id: 'poisDot', type: 'circle', source: 'pois', maxzoom: 9.5,
    paint: { 'circle-color': ['get', 'color'], 'circle-radius': 3.5, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1 } });
  map.addLayer({ id: 'pois', type: 'symbol', source: 'pois', minzoom: 9.5,
    layout: { 'icon-image': ['get', 'icon'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 10, 0.7, 15, 1.1],
      'icon-allow-overlap': true, 'icon-ignore-placement': true, 'symbol-sort-key': ['get', 'prio'] } });
  map.addLayer({ id: 'poisMax', type: 'symbol', source: 'pois', minzoom: 13, filter: ['>', ['get', 'max'], 0],
    layout: { 'text-field': ['to-string', ['get', 'max']], 'text-size': 12, 'text-offset': [0, 1.7], 'text-allow-overlap': true,
      'text-font': ['Noto Sans Bold'] },
    paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 2 } });
  refreshPois();
  drawRoutes();
}

/* --- Capa con todos los avisos --- */
let allPois = [];
function refreshPois() {
  allPois = [];
  if (cfg.radars) for (const r of radars) if (r.cat !== 'semaforo' || cfg.semaforos) allPois.push(r);
  if (cfg.incid) for (const d of dgt) allPois.push(d);
  if (cfg.reports) for (const r of reports) allPois.push(r);
  if (map && map.getSource('pois')) {
    map.getSource('pois').setData({ type: 'FeatureCollection', features: allPois.map(p => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { id: p.id, cat: p.cat, icon: 'i_' + p.cat, color: CAT[p.cat].c, max: p.max || 0, prio: IS_CAMERA(p.cat) ? 1 : 2 } })) });
    map.getSource('segs').setData({ type: 'FeatureCollection', features: allPois.filter(p => p.lon2 != null).map(p => ({
      type: 'Feature', geometry: { type: 'LineString', coordinates: [[p.lon, p.lat], [p.lon2, p.lat2]] },
      properties: { color: CAT[p.cat].c } })) });
  }
  if (active) indexRoutePois(active);
}
function poiById(id) { return allPois.find(p => p.id === id); }

function showPoi(f) {
  const p = poiById(f.properties.id); if (!p) return;
  const c = CAT[p.cat];
  let h = '<div class="pop"><b>' + c.e + ' ' + esc(c.n) + (p.max ? ' · ' + p.max + ' km/h' : '') + '</b>';
  if (p.sub) h += '<div>' + esc(p.sub) + '</div>';
  if (p.since) { const d = new Date(p.since); if (!isNaN(d)) h += '<div class="muted">Desde ' + d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' · DGT</div>'; }
  if (p.src !== 'DGT' && !p.mine && IS_CAMERA(p.cat)) h += '<div class="muted">Fuente: OpenStreetMap</div>';
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
function placeMenu(pos) {
  const name = 'Punto del mapa';
  openSheet('<div class="sTitle">📍 Este punto</div><div class="sSub">' + pos[1].toFixed(5) + ', ' + pos[0].toFixed(5) + '</div>' +
    '<button class="btn" id="pmGo">🚗 Ir aquí</button>' +
    '<button class="btn alt" id="pmRep">⚠️ Avisar de algo aquí</button>' +
    '<button class="btn alt" id="pmHome">🏠 Guardar como Casa</button>' +
    '<button class="btn alt" id="pmWork">💼 Guardar como Trabajo</button>');
  $('#pmGo').onclick = () => { closeSheet(); goTo({ name, lon: pos[0], lat: pos[1] }); };
  $('#pmRep').onclick = () => reportSheet(pos);
  $('#pmHome').onclick = () => { setFav('casa', { name: 'Casa', lon: pos[0], lat: pos[1] }); closeSheet(); };
  $('#pmWork').onclick = () => { setFav('trabajo', { name: 'Trabajo', lon: pos[0], lat: pos[1] }); closeSheet(); };
}

/* ====================== Hoja inferior ====================== */
let sheetOnClose = null;
function openSheet(html, onClose) {
  $('#sheetBody').innerHTML = html;
  $('#sheet').classList.remove('hidden'); $('#sheetBg').classList.remove('hidden');
  $('#sheet').scrollTop = 0; sheetOnClose = onClose || null;
}
function closeSheet() {
  $('#sheet').classList.add('hidden'); $('#sheetBg').classList.add('hidden');
  const f = sheetOnClose; sheetOnClose = null; if (f) f();
}
const sheetOpen = () => !$('#sheet').classList.contains('hidden');
$('#sheetBg').onclick = closeSheet;

/* ====================== Búsqueda ====================== */
let favs = store.get('favs', {}), recents = store.get('recents', []);
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
  document.querySelectorAll('#sheetBody .row[data-i]').forEach(el => el.onclick = () => {
    const d = list[+el.dataset.i]; if (!d) return;
    if (d.fav && !d.lat) { toast('Mantén pulsado un punto del mapa y elige «Guardar como ' + (d.fav === 'casa' ? 'Casa' : 'Trabajo') + '»', 5000); return; }
    $('#q').blur(); closeSheet(); goTo(d);
  });
}
async function showSearch(q) {
  const seq = ++searchSeq;
  let html = '<div class="sTitle">¿A dónde vamos?</div>';
  const list = [];
  if (!q) {
    list.push(Object.assign({ fav: 'casa', name: 'Casa' }, favs.casa || {}));
    list.push(Object.assign({ fav: 'trabajo', name: 'Trabajo' }, favs.trabajo || {}));
    html += rowHtml(0, '🏠', 'Casa', favs.casa ? '' : 'Sin guardar: mantén pulsado el mapa') +
      rowHtml(1, '💼', 'Trabajo', favs.trabajo ? '' : 'Sin guardar: mantén pulsado el mapa');
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
    openSheet(html + rowHtml(0, '📍', 'Ir a estas coordenadas', q)); bindRows(list); return;
  }
  if (!sheetOpen() || !$('#sheetBody .sTitle')) openSheet(html + '<div class="muted">Buscando…</div>');
  const c = me || map.getCenter().toArray();
  try {
    const url = 'https://photon.komoot.io/api/?limit=10&q=' + encodeURIComponent(q) + '&lat=' + c[1].toFixed(4) + '&lon=' + c[0].toFixed(4);
    const j = await getJSON(url);
    if (seq !== searchSeq) return;
    const seen = {};
    for (const f of j.features || []) {
      const p = f.properties || {}, [lon, lat] = f.geometry.coordinates;
      const name = p.name || ((p.street || '') + (p.housenumber ? ' ' + p.housenumber : '')) || p.city || 'Sin nombre';
      const sub = [p.name && p.street ? p.street + (p.housenumber ? ' ' + p.housenumber : '') : '', p.city || p.district || '', p.state || '',
        p.country && p.country !== 'España' ? p.country : ''].filter(Boolean).join(', ');
      const key = name + sub; if (seen[key]) continue; seen[key] = 1;
      const d = { name, sub, lon, lat }; list.push(d);
    }
    list.forEach((d, i) => { html += rowHtml(i, '📍', d.name, d.sub, me ? fmtDist(dist(me, [d.lon, d.lat])) : ''); });
    if (!list.length) html += '<div class="muted">No he encontrado nada. Prueba con la calle y el pueblo, p. ej. «Calle Mayor 5 Alcorcón».</div>';
    openSheet(html); bindRows(list);
  } catch (e) {
    if (seq === searchSeq) openSheet(html + '<div class="muted">No se pudo buscar (' + esc(e.message) + '). ¿Tienes internet?</div>');
  }
}

/* ====================== Rutas ====================== */
let dest = null, routes = [], selIdx = 0, preview = false, active = null, navigating = false;

const VAL_ARROW = { 1: 'start', 2: 'start', 3: 'start', 4: 'dest', 5: 'dest', 6: 'dest', 7: 'straight', 8: 'straight', 9: 'slight_right',
  10: 'right', 11: 'sharp_right', 12: 'uturn', 13: 'uturn', 14: 'sharp_left', 15: 'left', 16: 'slight_left', 17: 'straight',
  18: 'slight_right', 19: 'slight_left', 20: 'slight_right', 21: 'slight_left', 22: 'straight', 23: 'slight_right', 24: 'slight_left',
  25: 'straight', 26: 'roundabout', 27: 'roundabout_exit', 28: 'straight', 29: 'straight', 37: 'slight_right', 38: 'slight_left' };
const ARROW = { start: '⬆', dest: '🏁', straight: '⬆', slight_right: '⬈', right: '➡', sharp_right: '⬊', uturn: '↩', sharp_left: '⬋',
  left: '⬅', slight_left: '⬉', roundabout: '⟳', roundabout_exit: '⬈' };

async function routeValhalla(from, to) {
  const loc0 = { lat: from[1], lon: from[0] };
  if (speedMs > 3 && heading >= 0) { loc0.heading = Math.round(heading); loc0.heading_tolerance = 60; }
  const req = { locations: [loc0, { lat: to[1], lon: to[0] }], costing: 'auto',
    costing_options: { auto: { use_tolls: cfg.tolls ? 0 : 0.5, use_highways: cfg.highways ? 0 : 1 } },
    directions_options: { language: 'es-ES', units: 'kilometers' }, alternates: 2 };
  const j = await getJSON('https://valhalla1.openstreetmap.de/route?json=' + encodeURIComponent(JSON.stringify(req)));
  const trips = [j.trip].concat((j.alternates || []).map(a => a.trip)).filter(Boolean);
  return trips.map(trip => {
    const coords = [], steps = [];
    for (const leg of trip.legs) {
      const off = coords.length ? coords.length - 1 : 0;
      const pts = decode6(leg.shape); if (coords.length) pts.shift();
      coords.push(...pts);
      for (const m of leg.maneuvers) steps.push({ i: m.begin_shape_index + off, kind: VAL_ARROW[m.type] || 'straight',
        text: m.instruction || '', pre: m.verbal_pre_transition_instruction || m.instruction || '',
        alert: m.verbal_transition_alert_instruction || m.verbal_pre_transition_instruction || m.instruction || '',
        street: (m.street_names || m.begin_street_names || [])[0] || '' });
    }
    return { coords, steps, time: trip.summary.time, len: trip.summary.length * 1000, delay: 0, src: 'OSM' };
  });
}
function ttKind(m) {
  m = m || '';
  if (/ARRIVE/.test(m)) return 'dest'; if (/DEPART/.test(m)) return 'start';
  if (/ROUNDABOUT/.test(m)) return 'roundabout'; if (/U_?TURN|MAKE_UTURN/.test(m)) return 'uturn';
  if (/SHARP_RIGHT/.test(m)) return 'sharp_right'; if (/SHARP_LEFT/.test(m)) return 'sharp_left';
  if (/BEAR_RIGHT|KEEP_RIGHT|EXIT_RIGHT|MOTORWAY_EXIT_RIGHT|SWITCH_PARALLEL_ROAD|TAKE_EXIT/.test(m)) return 'slight_right';
  if (/BEAR_LEFT|KEEP_LEFT|EXIT_LEFT|MOTORWAY_EXIT_LEFT/.test(m)) return 'slight_left';
  if (/RIGHT/.test(m)) return 'right'; if (/LEFT/.test(m)) return 'left';
  return 'straight';
}
async function routeTomTom(from, to) {
  let url = 'https://api.tomtom.com/routing/1/calculateRoute/' + from[1] + ',' + from[0] + ':' + to[1] + ',' + to[0] +
    '/json?key=' + encodeURIComponent(cfg.tomtom) + '&traffic=true&travelMode=car&routeType=fastest&instructionsType=text&language=es-ES&maxAlternatives=2';
  if (cfg.tolls) url += '&avoid=tollRoads';
  if (cfg.highways) url += '&avoid=motorways';
  if (speedMs > 3 && heading >= 0) url += '&vehicleHeading=' + Math.round(heading);
  const j = await getJSON(url);
  return (j.routes || []).map(r => {
    const coords = [];
    for (const leg of r.legs) for (const p of leg.points) coords.push([p.longitude, p.latitude]);
    const steps = ((r.guidance && r.guidance.instructions) || []).map(ins => ({ i: ins.pointIndex, kind: ttKind(ins.maneuver),
      text: ins.message || '', pre: ins.message || '', alert: ins.message || '', street: ins.street || ins.roadNumbers && ins.roadNumbers[0] || '' }));
    return { coords, steps, time: r.summary.travelTimeInSeconds, len: r.summary.lengthInMeters, delay: r.summary.trafficDelayInSeconds || 0, src: 'TomTom' };
  });
}
async function calcRoutes(from, to) {
  if (cfg.tomtom) {
    try { const r = await routeTomTom(from, to); if (r.length) return r; } catch (e) { console.log('TomTom: ' + e.message); }
  }
  return routeValhalla(from, to);
}
function prepRoute(r) {
  r.cum = [0];
  for (let i = 1; i < r.coords.length; i++) r.cum.push(r.cum[i - 1] + dist(r.coords[i - 1], r.coords[i]));
  r.total = r.cum[r.cum.length - 1] || 1;
  r.steps.forEach(s => { s.i = Math.min(s.i, r.coords.length - 1); s.at = r.cum[s.i]; });
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  for (const c of r.coords) { minX = Math.min(minX, c[0]); maxX = Math.max(maxX, c[0]); minY = Math.min(minY, c[1]); maxY = Math.max(maxY, c[1]); }
  r.bbox = [minX, minY, maxX, maxY];
  indexRoutePois(r);
  return r;
}
/** Busca los avisos que están encima de la ruta y su distancia desde el inicio */
function indexRoutePois(r) {
  const pad = 0.004, [a, b, c, d] = r.bbox, out = [];
  for (const p of allPois) {
    const pts = [[p.lon, p.lat]]; if (p.lon2 != null) pts.push([p.lon2, p.lat2]);
    let best = null;
    for (const pt of pts) {
      if (pt[0] < a - pad || pt[0] > c + pad || pt[1] < b - pad || pt[1] > d + pad) continue;
      const lim = IS_CAMERA(p.cat) ? 35 : 80;
      for (let i = 0; i < r.coords.length - 1; i++) {
        const A = r.coords[i], B = r.coords[i + 1];
        if (Math.abs(A[1] - pt[1]) > 0.02 && Math.abs(B[1] - pt[1]) > 0.02) continue;
        const pr = projSeg(pt, A, B);
        if (pr.d < lim) { const at = r.cum[i] + pr.t * (r.cum[i + 1] - r.cum[i]); if (!best || at < best) best = at; }
      }
    }
    if (best != null) out.push({ p, at: best });
  }
  out.sort((x, y) => x.at - y.at);
  r.pois = out;
  r.nCam = out.filter(o => IS_CAMERA(o.p.cat)).length;
  r.nInc = out.length - r.nCam;
}
function drawRoutes() {
  if (!map || !map.getSource('route')) return;
  const line = r => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: r.coords } });
  if (navigating && active) {
    map.getSource('route').setData({ type: 'FeatureCollection', features: [line(active)] });
    map.getSource('routeAlt').setData({ type: 'FeatureCollection', features: [] });
  } else if (preview && routes.length) {
    map.getSource('route').setData({ type: 'FeatureCollection', features: [line(routes[selIdx])] });
    map.getSource('routeAlt').setData({ type: 'FeatureCollection',
      features: routes.map((r, i) => Object.assign(line(r), { properties: { i } })).filter((f, i) => i !== selIdx) });
  } else {
    map.getSource('route').setData({ type: 'FeatureCollection', features: [] });
    map.getSource('routeAlt').setData({ type: 'FeatureCollection', features: [] });
  }
}
function setDestMarker(d) {
  if (destMarker) destMarker.remove(); destMarker = null;
  if (d) destMarker = new maplibregl.Marker({ color: '#e53935' }).setLngLat([d.lon, d.lat]).addTo(map);
}
async function goTo(d) {
  if (navigating) stopNav(true);
  if (!me) { toast('Esperando señal GPS… sal a un sitio despejado', 4000); }
  const from = me || map.getCenter().toArray();
  dest = d; addRecent({ name: d.name, sub: d.sub || '', lon: d.lon, lat: d.lat });
  setDestMarker(d);
  openSheet('<div class="sTitle">🚗 ' + esc(d.name) + '</div><div class="muted">Calculando la mejor ruta…</div>', cancelPreview);
  try {
    routes = (await calcRoutes(from, [d.lon, d.lat])).map(prepRoute);
    if (!routes.length) throw new Error('sin ruta');
  } catch (e) {
    openSheet('<div class="sTitle">No hay ruta</div><div class="sSub">' + esc(e.message) + '</div><button class="btn alt" id="rx">Cerrar</button>', cancelPreview);
    $('#rx').onclick = closeSheet; return;
  }
  preview = true; selIdx = 0; setFollow(false);
  drawRoutes(); fitRoutes();
  routeSheet();
}
function fitRoutes() {
  let a = 180, b = 90, c = -180, d = -90;
  for (const r of routes) { a = Math.min(a, r.bbox[0]); b = Math.min(b, r.bbox[1]); c = Math.max(c, r.bbox[2]); d = Math.max(d, r.bbox[3]); }
  map.fitBounds([[a, b], [c, d]], { padding: { top: 80, bottom: Math.round(window.innerHeight * 0.45), left: 40, right: 40 }, bearing: 0, pitch: 0, duration: 800 });
}
function routeSheet() {
  const best = Math.min(...routes.map(r => r.time));
  let h = '<div class="sTitle">🚗 ' + esc(dest.name) + '</div>' + (dest.sub ? '<div class="sSub">' + esc(dest.sub) + '</div>' : '');
  routes.forEach((r, i) => {
    const eta = new Date(Date.now() + r.time * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const t2 = fmtDist(r.len) + ' · llegada ' + eta + (r.delay > 60 ? ' · 🔴 +' + fmtTime(r.delay) + ' atasco' : '');
    const t3 = '📷 ' + r.nCam + ' radar' + (r.nCam === 1 ? '' : 'es') + ' · ⚠️ ' + r.nInc + ' aviso' + (r.nInc === 1 ? '' : 's');
    h += '<div class="row' + (i === selIdx ? ' sel' : '') + '" data-r="' + i + '"><div class="ri">' + (i === 0 ? '⭐' : '↪️') + '</div><div class="rt"><div class="r1">' +
      fmtTime(r.time) + (r.time === best && routes.length > 1 ? ' · la más rápida' : '') + '</div><div class="r2">' + t2 + '</div><div class="r2">' + t3 + '</div></div></div>';
  });
  h += '<button class="btn" id="rGo">▶ Iniciar</button><button class="btn alt" id="rList">📋 Ver indicaciones y avisos</button>';
  h += '<div class="muted" style="margin-top:8px">Rutas: ' + (routes[0].src === 'TomTom' ? 'TomTom con tráfico en directo' : 'OpenStreetMap (Valhalla)') + '</div>';
  openSheet(h, cancelPreview);
  document.querySelectorAll('#sheetBody [data-r]').forEach(el => el.onclick = () => selectRoute(+el.dataset.r));
  $('#rGo').onclick = () => { sheetOnClose = null; closeSheet(); startNav(); };
  $('#rList').onclick = () => stepsSheet(routes[selIdx], false);
}
function selectRoute(i) { selIdx = +i; drawRoutes(); routeSheet(); }
function stepsSheet(r, fromNav) {
  let h = '<div class="sTitle">Indicaciones</div>';
  const items = r.steps.map(s => ({ at: s.at, html: rowHtml(-1, ARROW[s.kind] || '⬆', s.text, s.street, fmtDist(s.at)) }))
    .concat((r.pois || []).map(o => ({ at: o.at, html: rowHtml(-1, CAT[o.p.cat].e, CAT[o.p.cat].n + (o.p.max ? ' · ' + o.p.max : ''), o.p.sub || '', fmtDist(o.at)) })));
  items.sort((a, b) => a.at - b.at).forEach(x => h += x.html);
  h += '<button class="btn alt" id="sBack">Volver</button>';
  openSheet(h, fromNav ? null : cancelPreview);
  $('#sBack').onclick = () => fromNav ? closeSheet() : routeSheet();
}
function cancelPreview() {
  if (navigating) return;
  preview = false; routes = []; dest = null; setDestMarker(null); drawRoutes(); setFollow(true);
}

/* ====================== Navegación ====================== */
const nav = { idx: 0, step: 0, off: 0, lastReroute: 0, said: {}, along: 0, arrived: false };
function startNav() {
  active = routes[selIdx]; routes = []; preview = false; navigating = true;
  Object.assign(nav, { idx: 0, step: 0, off: 0, lastReroute: Date.now(), said: {}, along: 0, arrived: false });
  document.body.classList.add('nav');
  $('#searchBar').classList.add('hidden'); $('#banner').classList.remove('hidden'); $('#navBar').classList.remove('hidden');
  drawRoutes(); setFollow(true);
  const first = active.steps[0];
  say((first ? first.pre + '. ' : '') + (active.nCam ? 'Hay ' + active.nCam + (active.nCam === 1 ? ' radar' : ' radares') + ' en la ruta.' : ''), true);
  if (me) navUpdate();
}
function stopNav(silent) {
  navigating = false; active = null; dest = null; setDestMarker(null);
  document.body.classList.remove('nav');
  $('#searchBar').classList.remove('hidden'); $('#banner').classList.add('hidden'); $('#navBar').classList.add('hidden');
  drawRoutes(); setFollow(true);
  if (!silent && N) N.stopSpeak();
}
$('#btnStop').onclick = () => {
  openSheet('<div class="sTitle">¿Terminar la ruta?</div><button class="btn red" id="sY">Sí, terminar</button><button class="btn alt" id="sN">Seguir</button>');
  $('#sY').onclick = () => { closeSheet(); stopNav(); }; $('#sN').onclick = closeSheet;
};
$('#btnRoutes').onclick = () => { if (active) stepsSheet(active, true); };

async function reroute() {
  nav.lastReroute = Date.now();
  if (!dest || !me) return;
  say('Recalculando', true);
  try {
    const rs = await calcRoutes(me, [dest.lon, dest.lat]);
    if (!rs.length || !navigating) return;
    active = prepRoute(rs[0]);
    Object.assign(nav, { idx: 0, step: 0, off: 0, along: 0 });
    for (const k in nav.said) if (k.startsWith('s')) delete nav.said[k];
    drawRoutes();
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
    meMarker.setLngLat([A[0] + (B[0] - A[0]) * best.t, A[1] + (B[1] - A[1]) * best.t]);
  }
  // 2) Próxima maniobra
  while (nav.step < r.steps.length - 1 && r.steps[nav.step].at < nav.along + 8) nav.step++;
  const st = r.steps[nav.step]; if (!st) return;
  const dm = Math.max(0, st.at - nav.along);
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
  // 3) Voz
  const v = Math.max(speedMs, 5);
  const far = v > 25 ? 2000 : v > 14 ? 800 : 350;
  const near = Math.max(60, Math.min(v * 7, 250));
  const legLen = nav.step > 0 ? st.at - r.steps[nav.step - 1].at : st.at;
  if (st.kind === 'dest' && rest < 40 && !nav.arrived) {
    nav.arrived = true; say('Has llegado a tu destino', true); toast('🏁 Has llegado');
    setTimeout(() => stopNav(true), 4000); return;
  }
  if (dm <= far && dm > near + 80 && legLen > far * 0.6 && !nav.said['sf' + nav.step]) {
    nav.said['sf' + nav.step] = 1; say('En ' + sayDist(dm) + ', ' + lowFirst(st.alert));
  }
  if (dm <= near && !nav.said['sn' + nav.step]) {
    nav.said['sn' + nav.step] = 1; nav.said['sf' + nav.step] = 1;
    say(st.pre + (nx && nx.at - st.at < 120 && nx.kind !== 'straight' ? ' Y después, ' + lowFirst(nx.alert) : ''));
  }
}

/* ====================== Avisos de radares e incidencias ====================== */
let shownAlert = null;
const alerted = {}; // id -> {t, stage}
function checkAlerts() {
  if (!me) return;
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
  cands = cands.filter(c => IS_CAMERA(c.p.cat) ? c.d <= camRange : c.d <= incRange);
  cands.sort((a, b) => (IS_CAMERA(b.p.cat) - IS_CAMERA(a.p.cat)) || a.d - b.d);
  const top = cands.find(c => IS_CAMERA(c.p.cat) && c.d <= camRange) || cands[0];
  // Voz: una vez por aviso
  for (const c of cands) {
    const a = alerted[c.p.id];
    if (a && Date.now() - a.t < 15 * 60000) continue;
    alerted[c.p.id] = { t: Date.now() };
    const n = CAT[c.p.cat].n;
    let t;
    if (c.p.cat === 'tramo') t = c.p.fin ? 'Fin de tramo de velocidad controlada' : 'Tramo de velocidad controlada a ' + sayDist(c.d) + (c.p.max ? '. Límite ' + c.p.max : '');
    else if (IS_CAMERA(c.p.cat)) t = n + ' a ' + sayDist(c.d) + (c.p.max ? '. Límite ' + c.p.max : '');
    else t = 'Atención. ' + n + ' a ' + sayDist(c.d) + (c.p.road ? ' en la ' + c.p.road : '');
    beep(1); say(t);
    break; // un aviso de voz por posición
  }
  // Tarjeta visual
  const card = $('#alert');
  if (!top) { card.classList.add('hidden'); shownAlert = null; $('#speed').classList.remove('over'); return; }
  const p = top.p, c = CAT[p.cat];
  shownAlert = p.id;
  card.classList.remove('hidden'); card.classList.toggle('free', !navigating);
  card.style.borderColor = c.c;
  $('#aIcon').textContent = c.e; $('#aTitle').textContent = c.n; $('#aSub').textContent = p.sub || '';
  $('#aDist').textContent = fmtDist(top.d);
  if (p.max) { $('#aLimit').textContent = p.max; $('#aLimit').classList.remove('hidden'); } else $('#aLimit').classList.add('hidden');
  const over = IS_CAMERA(p.cat) && p.max && kmh > p.max + 2;
  card.classList.toggle('speeding', !!over);
  $('#speed').classList.toggle('over', !!over);
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
  meMarker.setLngLat(pos); meMarker.setRotation(heading);
  $('#spdVal').textContent = Math.round(speedMs * 3.6);
  if (navigating) navUpdate();
  checkAlerts();
  if (firstFix && !preview) map.jumpTo({ center: pos, zoom: 15.5 });
  if (follow && !preview) moveCamera();
  if (!onGps.saved || now - onGps.saved > 60000) { onGps.saved = now; store.set('lastPos', pos); }
};
function moveCamera() {
  const kmh = speedMs * 3.6;
  const z = navigating ? (kmh > 100 ? 15 : kmh > 70 ? 15.6 : kmh > 40 ? 16.3 : 17) : (kmh > 70 ? 14.8 : 15.8);
  const h = map.getCanvas().clientHeight;
  map.easeTo({ center: meMarker.getLngLat(), zoom: z, bearing: navigating || kmh > 8 ? heading : map.getBearing(), pitch: navigating ? 55 : (kmh > 8 ? 40 : 0),
    padding: { top: navigating ? Math.round(h * 0.4) : 0, bottom: 0, left: 0, right: 0 }, duration: 950, easing: t => t });
}
function setFollow(on) {
  follow = on; $('#btnRecenter').classList.toggle('hidden', on || preview);
  if (on && me && map) moveCamera();
}
$('#btnRecenter').onclick = () => setFollow(true);

/* ====================== Avisar (estilo Waze) ====================== */
function reportSheet(pos) {
  const p = pos || me;
  if (!p) { toast('Esperando señal GPS…'); return; }
  const opts = ['movil', 'policia', 'accidente', 'atasco', 'obras', 'peligro', 'v16', 'radar'];
  const names = { movil: 'Radar móvil', policia: 'Control', accidente: 'Accidente', atasco: 'Atasco', obras: 'Obras', peligro: 'Peligro', v16: 'Coche parado', radar: 'Radar fijo nuevo' };
  openSheet('<div class="sTitle">¿Qué hay ' + (pos ? 'en ese punto' : 'aquí') + '?</div><div class="grid">' +
    opts.map(k => '<button class="gbtn" data-k="' + k + '"><b>' + CAT[k].e + '</b>' + names[k] + '</button>').join('') + '</div>' +
    '<div class="muted" style="margin-top:12px">Los avisos se borran solos: radar móvil y control a las 2 h, atasco a la hora, obras a las 2 semanas. El radar fijo nuevo se queda siempre.</div>');
  document.querySelectorAll('.gbtn').forEach(b => b.onclick = () => { closeSheet(); addReport(b.dataset.k, p); });
}
$('#btnReport').onclick = () => reportSheet(null);

/* ====================== Capas y tráfico ====================== */
$('#btnTraffic').onclick = () => {
  if (!cfg.tomtom) {
    openSheet('<div class="sTitle">🚦 Tráfico en directo</div><div class="sSub">Para ver los atascos en colores y que las rutas los esquiven, pega tu clave gratuita de TomTom en Ajustes. ' +
      'Las incidencias de la DGT (accidentes, obras, cortes, V16…) ya salen sin clave.</div><button class="btn" id="tGo">Ir a Ajustes</button>');
    $('#tGo').onclick = settingsSheet; return;
  }
  cfg.traffic = !cfg.traffic; saveCfg();
  if (map.getLayer('traffic')) map.setLayoutProperty('traffic', 'visibility', cfg.traffic ? 'visible' : 'none');
  $('#btnTraffic').classList.toggle('on', cfg.traffic);
  toast(cfg.traffic ? '🚦 Tráfico en directo activado' : 'Tráfico ocultado');
};
$('#btnTraffic').classList.toggle('on', cfg.traffic && !!cfg.tomtom);
$('#btnLayers').onclick = () => {
  const t = (k, label, sub) => '<div class="set"><label>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</label><input type="checkbox" data-k="' + k + '"' + (cfg[k] ? ' checked' : '') + '></div>';
  openSheet('<div class="sTitle">🗺️ Qué ver en el mapa</div>' +
    t('radars', '📷 Radares fijos y de tramo', radars.length + ' radares en España (OpenStreetMap)') +
    t('semaforos', '🚦 Cámaras de semáforo') +
    t('incid', '⚠️ Incidencias de la DGT', dgt.length + ' ahora mismo · se actualiza cada 3 min') +
    t('reports', '🚓 Mis avisos', reports.length + ' activos') +
    '<div class="set"><label>Estilo del mapa</label><select id="stSel"><option value="auto">Automático (oscuro de noche)</option><option value="light">Claro</option>' +
    '<option value="dark">Oscuro</option><option value="soft">Suave</option></select></div>');
  $('#stSel').value = cfg.style;
  $('#stSel').onchange = e => { cfg.style = e.target.value; saveCfg(); applyStyle(true); };
  document.querySelectorAll('#sheetBody input[type=checkbox]').forEach(i => i.onchange = () => { cfg[i.dataset.k] = i.checked; saveCfg(); refreshPois(); });
};

/* ====================== Ajustes ====================== */
function settingsSheet() {
  const t = (k, label, sub) => '<div class="set"><label>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</label><input type="checkbox" data-k="' + k + '"' + (cfg[k] ? ' checked' : '') + '></div>';
  const ver = N ? N.version() : 'web';
  openSheet('<div class="sTitle">⚙️ Ajustes</div>' +
    t('voice', '🔊 Indicaciones por voz') + t('beep', '🔔 Pitido en radares y exceso de velocidad') +
    t('tolls', '💶 Evitar peajes') + t('highways', '🛣️ Evitar autopistas y autovías') +
    '<div class="set" style="display:block"><label>🚦 Clave de TomTom (opcional, gratis)<small>Activa el tráfico en directo y las rutas que esquivan atascos. Se saca gratis en developer.tomtom.com</small></label>' +
    '<input type="text" id="ttKey" placeholder="Pega aquí tu clave" value="' + esc(cfg.tomtom) + '" autocapitalize="off" autocorrect="off" spellcheck="false"></div>' +
    '<button class="btn alt" id="bRad">📷 Actualizar radares ahora</button>' +
    '<button class="btn alt" id="bUpd">🔄 Buscar actualización de la app (v' + esc(ver) + ')</button>' +
    '<button class="btn alt" id="bTest">🔊 Probar la voz</button>' +
    '<div class="muted" style="margin-top:12px">Mapa © OpenStreetMap y OpenFreeMap · Rutas Valhalla (FOSSGIS) · Incidencias DGT (datos abiertos) · Búsqueda Photon. ' +
    'Los radares móviles reales solo se pueden saber si alguien los avisa: usa el botón ⚠️.</div>');
  document.querySelectorAll('#sheetBody input[type=checkbox]').forEach(i => i.onchange = () => { cfg[i.dataset.k] = i.checked; saveCfg(); });
  $('#ttKey').onchange = e => {
    const had = !!cfg.tomtom; cfg.tomtom = e.target.value.trim(); saveCfg();
    toast(cfg.tomtom ? 'Clave de TomTom guardada' : 'Clave quitada'); if (had !== !!cfg.tomtom || cfg.tomtom) applyStyle(true);
  };
  $('#bRad').onclick = () => { toast('Descargando radares… (puede tardar un minuto)', 5000); loadRadars(true); };
  $('#bUpd').onclick = () => { if (N) N.checkUpdate(); };
  $('#bTest').onclick = () => say('Radar fijo a 500 metros. Límite 100.', true);
}
$('#btnSettings').onclick = settingsSheet;

/* ====================== Botón atrás de Android ====================== */
window.onBack = () => {
  if (sheetOpen()) { closeSheet(); return true; }
  if (document.activeElement === $('#q')) { $('#q').blur(); return true; }
  if (preview) { cancelPreview(); return true; }
  if (navigating) { $('#btnStop').onclick(); return true; }
  return false;
};

boot();
