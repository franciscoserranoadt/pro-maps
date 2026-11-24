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
  tomtom: '', style: 'auto', tolls: false, highways: false, traffic: false,
  fuel: 'g95', gas: true, limit: true, limitWarn: true, ttinc: true };
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
  averia:    { e: '🛑', c: '#ff6f00', n: 'Vehículo averiado' },
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
  map.on('click', 'routeAltHit', e => {
    const f = e.features && e.features[0]; if (!f) return;
    if (preview) selectRoute(f.properties.i); else if (navigating) altSheet(+f.properties.i);
  });
  map.on('mouseenter', 'pois', () => map.getCanvas().style.cursor = 'pointer');
  map.on('click', 'gas', e => { const f = e.features && e.features[0]; if (f) showGas(f.properties.id); });
  setupLongPress();

  const el = document.createElement('div'); el.className = 'me';
  el.innerHTML = '<svg viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="#1a73e8" fill-opacity=".18"/>' +
    '<path d="M23 6 L35 36 L23 29 L11 36 Z" fill="#33ccff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  meMarker = new maplibregl.Marker({ element: el, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat(start).addTo(map);

  map.once('load', () => {
    $('#splash').classList.add('hidden');
    const sh = N && N.takeShared ? N.takeShared() : ''; if (sh) onShared(sh);
  });
  setTimeout(() => $('#splash').classList.add('hidden'), 9000);

  cleanReports();
  loadRadars(false);
  loadDgt(); setInterval(loadDgt, 3 * 60000);
  setTimeout(() => loadFuel(false), 2500);
  setInterval(() => { const every = navigating ? 180000 : 300000; if (Date.now() - ttAt > every) loadTT(); }, 30000); setInterval(() => loadFuel(false), 60 * 60000);
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
  map.addLayer({ id: 'poisMax', type: 'symbol', source: 'pois', minzoom: 13, filter: ['>', ['get', 'max'], 0],
    layout: { 'text-field': ['to-string', ['get', 'max']], 'text-size': 12, 'text-offset': [0, 1.7], 'text-allow-overlap': true,
      'text-font': ['Noto Sans Bold'] },
    paint: { 'text-color': '#111', 'text-halo-color': '#fff', 'text-halo-width': 2 } });
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
  if (map && map.getSource('pois')) {
    map.getSource('pois').setData({ type: 'FeatureCollection', features: allPois.map(p => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { id: p.id, cat: p.cat, icon: 'i_' + p.cat, color: CAT[p.cat].c, max: p.max || 0, prio: IS_CAMERA(p.cat) ? 1 : 2 } })) });
    map.getSource('segs').setData({ type: 'FeatureCollection', features: allPois.filter(p => p.lon2 != null || p.line).map(p => ({
      type: 'Feature', geometry: { type: 'LineString', coordinates: p.line || [[p.lon, p.lat], [p.lon2, p.lat2]] },
      properties: { color: p.cat === 'retencion' ? (p.mag >= 3 ? '#b71c1c' : p.mag === 2 ? '#e53935' : '#fb8c00') : CAT[p.cat].c, w: p.line ? 7 : 5 } })) });
  }
  if (active) indexRoutePois(active);
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
  $('#sheetBody').innerHTML = html; delete $('#sheetBody').dataset.gas;
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
let navAlts = [], altBusy = false, altAt = 0;
let dest = null, stops = [], routes = [], selIdx = 0, preview = false, active = null, navigating = false, pendingGo = null;

const VAL_ARROW = { 1: 'start', 2: 'start', 3: 'start', 4: 'dest', 5: 'dest', 6: 'dest', 7: 'straight', 8: 'straight', 9: 'slight_right',
  10: 'right', 11: 'sharp_right', 12: 'uturn', 13: 'uturn', 14: 'sharp_left', 15: 'left', 16: 'slight_left', 17: 'straight',
  18: 'slight_right', 19: 'slight_left', 20: 'slight_right', 21: 'slight_left', 22: 'straight', 23: 'slight_right', 24: 'slight_left',
  25: 'straight', 26: 'roundabout', 27: 'roundabout_exit', 28: 'straight', 29: 'straight', 37: 'slight_right', 38: 'slight_left' };
const ARROW = { start: '⬆', dest: '🏁', straight: '⬆', slight_right: '⬈', right: '➡', sharp_right: '⬊', uturn: '↩', sharp_left: '⬋',
  left: '⬅', slight_left: '⬉', roundabout: '⟳', roundabout_exit: '⬈', stop: '📍' };

async function routeValhalla(from, pts) {
  const loc0 = { lat: from[1], lon: from[0] };
  if (speedMs > 3 && heading >= 0) { loc0.heading = Math.round(heading); loc0.heading_tolerance = 60; }
  const req = { locations: [loc0].concat(pts.map(p => ({ lat: p[1], lon: p[0], type: 'break' }))), costing: 'auto',
    costing_options: { auto: { use_tolls: cfg.tolls ? 0 : 0.5, use_highways: cfg.highways ? 0 : 1 } },
    directions_options: { language: 'es-ES', units: 'kilometers' } };
  if (pts.length === 1) req.alternates = 2;
  const j = await getJSON('https://valhalla1.openstreetmap.de/route?json=' + encodeURIComponent(JSON.stringify(req)));
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
  let url = 'https://api.tomtom.com/routing/1/calculateRoute/' + [from].concat(pts).map(p => p[1] + ',' + p[0]).join(':') +
    '/json?key=' + encodeURIComponent(cfg.tomtom) + '&traffic=true&travelMode=car&routeType=fastest&instructionsType=text&language=es-ES' +
    (pts.length === 1 ? '&maxAlternatives=2' : '');
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
/** Ruta desde «from» pasando por las paradas pendientes hasta el destino */
async function calcRoutes(from) {
  const pts = stops.map(p => [p.lon, p.lat]).concat([[dest.lon, dest.lat]]);
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
    if (p.line && p.line.length > 2) pts.push(p.line[Math.floor(p.line.length / 2)]);
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
async function goTo(d, keepStops) {
  if (navigating) stopNav(true);
  if (!keepStops) stops = [];
  dest = d; addRecent({ name: d.name, sub: d.sub || '', lon: d.lon, lat: d.lat });
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
    openSheet('<div class="sTitle">No hay ruta</div><div class="sSub">' + esc(e.message) + '</div><button class="btn alt" id="rx">Cerrar</button>', cancelPreview);
    $('#rx').onclick = closeSheet; return;
  }
  preview = true; selIdx = 0; setFollow(false);
  drawRoutes(); fitRoutes();
  routeSheet();
  if (cfg.tomtom && cfg.ttinc) loadTT().then(() => { if (preview && sheetOpen() && $('#rGo')) routeSheet(); });
}
function fitRoutes() {
  let a = 180, b = 90, c = -180, d = -90;
  for (const r of routes) { a = Math.min(a, r.bbox[0]); b = Math.min(b, r.bbox[1]); c = Math.max(c, r.bbox[2]); d = Math.max(d, r.bbox[3]); }
  map.fitBounds([[a, b], [c, d]], { padding: { top: 80, bottom: Math.round(window.innerHeight * 0.45), left: 40, right: 40 }, bearing: 0, pitch: 0, duration: 800 });
}
function routeSheet() {
  const best = Math.min(...routes.map(r => r.time));
  let h = '<div class="sTitle">🚗 ' + esc(dest.name) + '</div>' + (dest.sub ? '<div class="sSub">' + esc(dest.sub) + '</div>' : '');
  stops.forEach((p, i) => {
    h += '<div class="row"><div class="ri">📍</div><div class="rt"><div class="r1">Parada ' + (i + 1) + ': ' + esc(p.name) + '</div>' +
      (p.sub ? '<div class="r2">' + esc(p.sub) + '</div>' : '') + '</div><button class="rowbtn" data-xs="' + i + '">✕</button></div>';
  });
  routes.forEach((r, i) => {
    const eta = new Date(Date.now() + r.time * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const t2 = fmtDist(r.len) + ' · llegada ' + eta + (r.delay > 60 ? ' · 🔴 +' + fmtTime(r.delay) + ' atasco' : '');
    const t3 = '📷 ' + r.nCam + ' radar' + (r.nCam === 1 ? '' : 'es') + ' · ⚠️ ' + r.nInc + ' aviso' + (r.nInc === 1 ? '' : 's');
    h += '<div class="row' + (i === selIdx ? ' sel' : '') + '" data-r="' + i + '"><div class="ri">' + (i === 0 ? '⭐' : '↪️') + '</div><div class="rt"><div class="r1">' +
      fmtTime(r.time) + (r.time === best && routes.length > 1 ? ' · la más rápida' : '') + '</div><div class="r2">' + t2 + '</div><div class="r2">' + t3 + '</div></div></div>';
  });
  h += '<button class="btn" id="rGo">▶ Iniciar</button>' +
    '<div class="btnrow"><button class="btn alt" id="rStop">➕ Parada</button><button class="btn alt" id="rGas">⛽ Gasolineras</button><button class="btn alt" id="rList">📋 Detalles</button></div>' +
    '<div class="btnrow"><button class="btn alt" id="rFav">⭐ Favorito</button><button class="btn alt" id="rHome">🏠 Casa</button><button class="btn alt" id="rWork">💼 Trabajo</button></div>';
  h += '<div class="muted" style="margin-top:8px">Rutas: ' + (routes[0].src === 'TomTom' ? 'TomTom con tráfico en directo' : 'OpenStreetMap (Valhalla)') + '</div>';
  openSheet(h, cancelPreview);
  document.querySelectorAll('#sheetBody [data-r]').forEach(el => el.onclick = () => selectRoute(+el.dataset.r));
  $('#rGo').onclick = () => { sheetOnClose = null; closeSheet(); startNav(); };
  $('#rList').onclick = () => stepsSheet(routes[selIdx], false);
  $('#rStop').onclick = () => startPick('stop');
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
  if (fromNav) h += '<div class="btnrow"><button class="btn alt" id="sStop">➕ Añadir parada</button><button class="btn alt" id="sGas">⛽ Gasolineras</button></div>';
  h += '<button class="btn alt" id="sBack">Volver</button>';
  openSheet(h, fromNav ? null : cancelPreview);
  $('#sBack').onclick = () => fromNav ? closeSheet() : routeSheet();
  if (fromNav) { $('#sStop').onclick = () => startPick('stop'); $('#sGas').onclick = () => gasSheet(active, nav.along); }
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
  document.body.classList.add('nav'); $('#btnGas').classList.remove('hidden');
  $('#searchBar').classList.add('hidden'); $('#banner').classList.remove('hidden'); $('#navBar').classList.remove('hidden');
  drawRoutes(); setFollow(true);
  if (cfg.tomtom && cfg.ttinc && Date.now() - ttAt > 60000) loadTT();
  const first = active.steps[0];
  say((first ? first.pre + '. ' : '') + (active.nCam ? 'Hay ' + active.nCam + (active.nCam === 1 ? ' radar' : ' radares') + ' en la ruta.' : ''), true);
  if (me) navUpdate();
}
function stopNav(silent) {
  navigating = false; active = null; dest = null; stops = []; navAlts = []; setDestMarker(null);
  document.body.classList.remove('nav'); $('#btnGas').classList.add('hidden');
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
    const rs = await calcRoutes(me);
    if (!rs.length || !navigating) return;
    active = prepRoute(rs[0]);
    Object.assign(nav, { idx: 0, step: 0, off: 0, along: 0 });
    for (const k in nav.said) if (k.startsWith('s')) delete nav.said[k];
    navAlts = rs.slice(1).map(r => markDivergence(prepRoute(r), 0)).filter(Boolean); altAt = Date.now();
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
  // Alternativas: se quitan las que ya has dejado atrás; se buscan nuevas cada 2 min
  const nAlt = navAlts.length;
  navAlts = navAlts.filter(a => nav.along < a.divAt + 40);
  if (nAlt !== navAlts.length || !navUpdate.lastDraw || Date.now() - navUpdate.lastDraw > 30000) { navUpdate.lastDraw = Date.now(); drawRoutes(); }
  if (!altBusy && Date.now() - altAt > 120000 && Date.now() - nav.lastReroute > 30000 && r.total - nav.along > 3000) refreshAlts();
  // 2) Próxima maniobra (y paradas intermedias superadas)
  while (nav.step < r.steps.length - 1 && r.steps[nav.step].at < nav.along + 8) {
    if (r.steps[nav.step].kind === 'stop' && stops.length) {
      const p = stops.shift(); say('Has llegado a tu parada: ' + p.name + '. Cuando quieras, seguimos.', true); toast('📍 Parada: ' + p.name);
    }
    nav.step++;
  }
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
    nav.said['sf' + nav.step] = 1;
    say(st.kind === 'dest' ? 'En ' + sayDist(dm) + ' llegarás a tu destino' : st.kind === 'stop' ? 'En ' + sayDist(dm) + ' llegarás a tu parada'
      : 'En ' + sayDist(dm) + ', ' + lowFirst(st.alert));
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
    else t = 'Atención. ' + n + ' a ' + sayDist(c.d) + (c.p.road ? ' en la ' + c.p.road : '') +
      (c.p.delay >= 90 ? '. Pierdes unos ' + Math.round(c.p.delay / 60) + ' minutos' : '');
    beep(1); say(t);
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
  meMarker.setLngLat(pos); meMarker.setRotation(heading);
  $('#spdVal').textContent = Math.round(speedMs * 3.6);
  if (navigating) navUpdate();
  checkAlerts();
  if (firstFix && !preview) map.jumpTo({ center: pos, zoom: 15.5 });
  if (firstFix && pendingGo) goTo(pendingGo, true);
  updateLimit();
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
    (cfg.tomtom ? t('ttinc', '🚗 Atascos e incidencias de TomTom', ttInc.length + ' cerca de ti o de tu ruta · en directo') : '') +
    t('reports', '🚓 Mis avisos', reports.length + ' activos') +
    t('gas', '⛽ Gasolineras con precio', (fuel.length || 0) + ' gasolineras · se ve al acercar el mapa') +
    '<div class="set"><label>Estilo del mapa</label><select id="stSel"><option value="auto">Automático (oscuro de noche)</option><option value="light">Claro</option>' +
    '<option value="dark">Oscuro</option><option value="soft">Suave</option></select></div>');
  $('#stSel').value = cfg.style;
  $('#stSel').onchange = e => { cfg.style = e.target.value; saveCfg(); applyStyle(true); };
  document.querySelectorAll('#sheetBody input[type=checkbox]').forEach(i => i.onchange = () => {
    cfg[i.dataset.k] = i.checked; saveCfg(); refreshPois();
    if (i.dataset.k === 'ttinc' && cfg.ttinc) loadTT();
    if (map.getLayer('gas')) map.setLayoutProperty('gas', 'visibility', cfg.gas ? 'visible' : 'none');
  });
};

/* ====================== Ajustes ====================== */
function settingsSheet() {
  const t = (k, label, sub) => '<div class="set"><label>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</label><input type="checkbox" data-k="' + k + '"' + (cfg[k] ? ' checked' : '') + '></div>';
  const ver = N ? N.version() : 'web';
  openSheet('<div class="sTitle">⚙️ Ajustes</div>' +
    t('voice', '🔊 Indicaciones por voz') + t('beep', '🔔 Pitido en radares y exceso de velocidad') +
    t('tolls', '💶 Evitar peajes') + t('highways', '🛣️ Evitar autopistas y autovías') +
    t('limit', '🚫 Mostrar el límite de velocidad de la vía', 'Sale de OpenStreetMap; en algunas calles no hay dato') +
    t('limitWarn', '⚠️ Avisar si paso el límite de la vía') +
    '<div class="set"><label>⛽ Mi combustible</label><select id="fuelSel">' + Object.keys(FUELS).map(k => '<option value="' + k + '">' + FUELS[k].n + '</option>').join('') + '</select></div>' +
    '<button class="btn alt" id="bFavs">⭐ Casa, Trabajo y Favoritos</button>' +
    '<div class="set" style="display:block"><label>🚦 Clave de TomTom (opcional, gratis)<small>Activa el tráfico en directo y las rutas que esquivan atascos. Se saca gratis en developer.tomtom.com</small></label>' +
    '<input type="text" id="ttKey" placeholder="Pega aquí tu clave" value="' + esc(cfg.tomtom) + '" autocapitalize="off" autocorrect="off" spellcheck="false"></div>' +
    '<button class="btn alt" id="bRad">📷 Actualizar radares ahora</button>' +
    '<button class="btn alt" id="bUpd">🔄 Buscar actualización de la app (v' + esc(ver) + ')</button>' +
    '<button class="btn alt" id="bTest">🔊 Probar la voz</button>' +
    '<div class="muted" style="margin-top:12px">Mapa © OpenStreetMap y OpenFreeMap · Rutas Valhalla (FOSSGIS) · Incidencias DGT (datos abiertos) · Búsqueda Photon y CartoCiudad (IGN). ' +
    'Atascos e incidencias en directo: TomTom (con tu clave). Precios de carburantes: Ministerio (datos abiertos). Los radares móviles reales solo se pueden saber si alguien los avisa: usa el botón ⚠️.</div>');
  document.querySelectorAll('#sheetBody input[type=checkbox]').forEach(i => i.onchange = () => { cfg[i.dataset.k] = i.checked; saveCfg(); });
  $('#ttKey').onchange = e => {
    const had = !!cfg.tomtom; cfg.tomtom = e.target.value.trim(); saveCfg();
    toast(cfg.tomtom ? 'Clave de TomTom guardada' : 'Clave quitada'); if (had !== !!cfg.tomtom || cfg.tomtom) applyStyle(true);
    if (cfg.tomtom) loadTT(); else { ttInc = []; refreshPois(); }
  };
  $('#fuelSel').value = cfg.fuel;
  $('#fuelSel').onchange = e => { cfg.fuel = e.target.value; saveCfg(); refreshGas(); };
  $('#bFavs').onclick = favSheet;
  document.querySelectorAll('#sheetBody input[data-k=limit]').forEach(i => i.addEventListener('change', () => { if (!cfg.limit) $('#limit').classList.add('hidden'); }));
  $('#bRad').onclick = () => { toast('Descargando radares… (puede tardar un minuto)', 5000); loadRadars(true); };
  $('#bUpd').onclick = () => { if (N) N.checkUpdate(); };
  $('#bTest').onclick = () => say('Radar fijo a 500 metros. Límite 100.', true);
}
$('#btnSettings').onclick = settingsSheet;




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
    if (navigating) drawRoutes();
  } catch (e) { console.log('TomTom: ' + e.message); }
  ttBusy = false;
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
async function refreshAlts() {
  if (!navigating || !me || !dest) return;
  altBusy = true; altAt = Date.now();
  try {
    const rs = await calcRoutes(me);
    if (!navigating) return;
    navAlts = rs.map(r => markDivergence(prepRoute(r), nav.along)).filter(Boolean).slice(0, 2);
    drawRoutes();
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
  $('#aSw').onclick = () => {
    closeSheet();
    const old = active;
    active = a; navAlts.splice(i, 1);
    Object.assign(nav, { idx: 0, step: 0, off: 0, along: 0, lastReroute: Date.now() });
    for (const k in nav.said) if (k.startsWith('s')) delete nav.said[k];
    navAlts = navAlts.concat([markDivergence(old, 0)]).filter(Boolean);
    say('Ruta cambiada', true); drawRoutes(); navUpdate();
    setTimeout(refreshAlts, 20000);
  };
  $('#aNo').onclick = closeSheet;
}

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
  pickFor = k;
  $('#q').value = '';
  showSearch('');
  if (navigating) { $('#searchBar').classList.remove('hidden'); }
  setTimeout(() => $('#q').focus(), 150);
}
function pickCancel() {
  pickFor = null;
  if (navigating) $('#searchBar').classList.add('hidden');
  if (preview && routes.length) setTimeout(routeSheet, 50);
}
function finishPick(k, d) {
  if (navigating) $('#searchBar').classList.add('hidden');
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
          oneway: t.oneway === 'yes' || t.highway === 'motorway' || t.junction === 'roundabout' });
      }
      limitWays = { c, R, ways };
      break;
    } catch (e) { console.log('Límite ' + base + ': ' + e.message); }
  }
  limitBusy = false;
}
function updateLimit() {
  if (!cfg.limit || !me) { $('#limit').classList.add('hidden'); roadLimit = 0; return; }
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
  if (best) v = (best.fwd ? best.w.f : best.w.b) || best.w.max;
  // Cambia el número solo cuando se repite dos veces (evita saltos)
  if (v === limitCand.v) limitCand.n++; else limitCand = { v, n: 1 };
  if (limitCand.n >= 2 || !roadLimit) roadLimit = limitCand.v;
  const el = $('#limit'), kmh = speedMs * 3.6;
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
  if (sheetOpen()) { closeSheet(); return true; }
  if (pickFor) { pickCancel(); return true; }
  if (document.activeElement === $('#q')) { $('#q').blur(); return true; }
  if (preview) { cancelPreview(); return true; }
  if (navigating) { $('#btnStop').onclick(); return true; }
  return false;
};

boot();
