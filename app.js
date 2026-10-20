/* ==========================================================================
   Command Delay Calculator — UI controller
   Depends on: Leaflet, satellite.js, core.js (CDCore), i18n.js (I18N)
   ========================================================================== */
(function () {
  'use strict';
  var C = window.CDCore, I = window.I18N, t = I.t;
  var $ = function (id) { return document.getElementById(id); };
  var STORE_KEY = 'cdc.v2';
  var PRESET_NAME = { kmutnb: 'up.kmutnb', paris: 'tg.paris' };

  var DEFAULTS = {
    tle: $('tle').value,
    uplinkMode: 'kmutnb', targetMode: 'paris',
    uplinkCustom: { lat: C.STATIONS.kmutnb.lat, lon: C.STATIONS.kmutnb.lon },
    targetCustom: { lat: C.TARGETS.paris.lat, lon: C.TARGETS.paris.lon },
    cfg: { days: 30, sat: 50, sunmin: 20, sunmax: 90, gs: 20, lead: 60, cam: 100, comm: 420 }
  };

  var S = {
    uplinkMode: 'kmutnb', targetMode: 'paris',
    uplink: Object.assign({}, C.STATIONS.kmutnb), target: Object.assign({}, C.TARGETS.paris),
    pinFor: null, map: null, mUplink: null, mTarget: null, layers: [], layerCtl: null, base: null,
    busy: false, result: null, satrec: null, tle: null, cfg: null, selected: -1, timer: null,
    status: { key: 'status.ready', vars: null, type: 'ok' }, stale: false,
    mode: 'globe', globe: null, mLive: null, live: { satrec: null, key: '', contact: null, trackAt: 0, past: [], future: [] }
  };

  /* ------------------------------------------------------------------ */
  /*  Helpers                                                            */
  /* ------------------------------------------------------------------ */
  function setText(id, v) { var el = $(id); if (el) el.textContent = v; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function fix(v, d) { return v == null || isNaN(v) ? '--' : Number(v).toFixed(d); }
  function ict(d) { return C.fmtICT(d); }
  function utc(d) { return C.fmtUTC(d); }
  function hms(d) { return C.fmtICT(d).slice(11); }
  function sd(d) { return C.fmtICT(d).slice(5); } // MM-DD hh:mm:ss (ICT)
  function locName(type) { var k = PRESET_NAME[S[type + 'Mode']]; return t(k || 'loc.customName'); }

  function status(key, vars, type) {
    S.status = { key: key, vars: vars || null, type: type || 'ok' };
    renderStatus();
  }
  function renderStatus() {
    setText('status-t', t(S.status.key, S.status.vars));
    $('status').setAttribute('data-type', S.status.type);
  }
  var toastT;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove('on'); }, 2200);
  }
  function copy(text, msg) {
    var done = function () { toast(msg); };
    var fallback = function () {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); done();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  /* ------------------------------------------------------------------ */
  /*  Persistence (this browser only)                                    */
  /* ------------------------------------------------------------------ */
  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } }
  function save() {
    try {
      var cfg = {};
      Object.keys(DEFAULTS.cfg).forEach(function (k) { cfg[k] = $('cfg-' + k).value; });
      localStorage.setItem(STORE_KEY, JSON.stringify({
        tle: $('tle').value, uplinkMode: S.uplinkMode, targetMode: S.targetMode,
        uplinkCustom: S.uplinkMode === 'custom' ? { lat: S.uplink.lat, lon: S.uplink.lon } : null,
        targetCustom: S.targetMode === 'custom' ? { lat: S.target.lat, lon: S.target.lon } : null,
        cfg: cfg
      }));
    } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /*  Views (tablet portrait / phone)                                    */
  /* ------------------------------------------------------------------ */
  var mqSingle = window.matchMedia('(max-width: 899px)');
  function setView(v) {
    document.body.setAttribute('data-view', v);
    document.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.view === v)); });
    if (v === 'map') setTimeout(function () { if (S.map && S.mode === 'map') { S.map.invalidateSize(); fitAll(); } if (S.globe) S.globe.resize(); }, 30);
  }
  document.querySelectorAll('.tab').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });

  /* ------------------------------------------------------------------ */
  /*  Clock                                                              */
  /* ------------------------------------------------------------------ */
  function tick() {
    var now = new Date();
    setText('clk-utc', utc(now).slice(11));
    setText('clk-ict', hms(now));
    var doy = Math.floor((now - Date.UTC(now.getUTCFullYear(), 0, 1)) / 86400000) + 1;
    setText('clk-doy', 'UTC · DOY ' + String(doy).padStart(3, '0'));
  }
  setInterval(tick, 1000); tick();

  /* ------------------------------------------------------------------ */
  /*  Theme & language                                                   */
  /* ------------------------------------------------------------------ */
  var SUN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>';
  function themeIcon() {
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    $('theme-btn').innerHTML = light ? MOON : SUN;
    document.querySelector('meta[name=theme-color]').setAttribute('content', light ? '#e9edf2' : '#070b12');
  }
  $('theme-btn').addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('cdc.theme', next); } catch (e) {}
    themeIcon();
    if (S.result && S.selected >= 0) drawOnMap(S.result.targets[S.selected]);
    if (S.globe) S.globe.draw();
    S.live.mapDirty = true;
  });

  document.querySelectorAll('#lang-seg button').forEach(function (b) {
    b.addEventListener('click', function () { I.set(b.dataset.lang, true); });
  });
  I.onChange(function (l) {
    document.querySelectorAll('#lang-seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === l)); });
    rerenderAll();
  });

  function rerenderAll() {
    renderStatus();
    updateTleMeta();
    if ($('cfg-err').textContent) readCfg();
    if (S.map) { buildLayerControl(); refreshMarkers(); }
    renderTable();
    if (S.result && S.selected >= 0) select(S.selected, true);
    else if (S.result) showEmpty(S.result, S.cfg);
    if (S.stale) markStale();
    liveTick(true);
  }

  /* ------------------------------------------------------------------ */
  /*  TLE                                                                */
  /* ------------------------------------------------------------------ */
  function updateTleMeta() {
    var p = C.parseTLE($('tle').value);
    $('tle').setAttribute('aria-invalid', String(!p.ok));
    if (!p.ok) { $('tle-kv').innerHTML = '<dt></dt><dd style="color:var(--alarm);font-family:var(--sans)">' + esc(t(p.error)) + '</dd>'; $('tle-age').innerHTML = ''; return p; }
    var age = (Date.now() - p.epoch.getTime()) / 86400000;
    var cls = age <= 3 ? 'ok' : age <= 7 ? 'warn' : 'bad';
    var ageTxt = age < 1 ? t('tle.ageH', { v: Math.max(0, Math.round(age * 24)) }) : t('tle.ageD', { v: age.toFixed(1) });
    $('tle-age').innerHTML = '<span class="tag ' + cls + '">' + esc(ageTxt) + '</span>';
    $('tle-kv').innerHTML =
      '<dt>' + esc(t('tle.name')) + '</dt><dd>' + esc(p.name) + '</dd>' +
      '<dt>' + esc(t('tle.norad')) + '</dt><dd>' + esc(p.catnr) + '</dd>' +
      '<dt>' + esc(t('tle.epoch')) + '</dt><dd>' + utc(p.epoch) + ' UTC</dd>' +
      (p.checksumOk ? '' : '<dt></dt><dd><span class="tag warn">' + esc(t('tle.checksum')) + '</span></dd>');
    return p;
  }
  $('tle').addEventListener('input', function () { updateTleMeta(); save(); markStale(); liveReset(); });

  // Sources tried in order. SatNOGS DB republishes Space-Track TLEs.
  var TLE_SOURCES = [
    { name: 'SatNOGS DB', url: function (cat) { return 'https://db.satnogs.org/api/tle/?format=json&norad_cat_id=' + cat; },
      parse: function (txt) { var j = JSON.parse(txt); var r = Array.isArray(j) ? j[0] : (j.results || [])[0];
        if (!r) throw new Error('empty'); return (r.tle0 ? r.tle0.replace(/^0 /, '') + '\n' : '') + r.tle1 + '\n' + r.tle2; } },
    { name: 'CelesTrak', url: function (cat) { return 'https://celestrak.org/NORAD/elements/gp.php?FORMAT=TLE&CATNR=' + cat; },
      parse: function (txt) { return txt; } }
  ];
  $('tle-fetch').addEventListener('click', function () {
    var cur = C.parseTLE($('tle').value), cat = cur.ok ? cur.catnr : '67683';
    var btn = this, tried = [];
    btn.disabled = true;
    var attempt = function (i) {
      if (i >= TLE_SOURCES.length) return Promise.reject(new Error(tried.join(' · ')));
      var src = TLE_SOURCES[i];
      status('status.fetching', { src: src.name }, 'info');
      return fetch(src.url(encodeURIComponent(cat)), { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (txt) {
          var n = C.parseTLE(src.parse(txt));
          if (!n.ok) throw new Error(t('status.noData', { cat: cat }));
          return { tle: n, src: src.name };
        })
        .catch(function (e) { tried.push(src.name + ': ' + e.message); return attempt(i + 1); });
    };
    attempt(0).then(function (r) {
      var n = r.tle, ep = utc(n.epoch).slice(0, 16) + 'Z';
      if (cur.ok && cur.catnr === n.catnr && cur.epoch >= n.epoch) { status('status.fetchSame', { src: r.src, epoch: ep }, 'ok'); return; }
      $('tle').value = (n.name ? n.name.trim() + '\n' : '') + n.l1 + '\n' + n.l2;
      updateTleMeta(); save(); markStale(); liveReset();
      status('status.fetched', { src: r.src, epoch: ep }, 'ok');
    }).catch(function (e) {
      status('status.fetchFail', { msg: e.message }, 'warn');
    }).then(function () { btn.disabled = false; });
  });

  /* ------------------------------------------------------------------ */
  /*  Map                                                                */
  /* ------------------------------------------------------------------ */
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function icon(kind) {
    if (kind === 'gs') return L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="mk-gs"></div>' });
    if (kind === 'tg') return L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="mk-tg"><i></i></div>' });
    return L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7], html: '<div class="mk-sat' + (kind === 'sat-up' ? ' up' : '') + '"></div>' });
  }
  function pop(title, lat, lon, rows) {
    return '<div class="pop-h">' + esc(title) + '</div><div class="mono">' + lat.toFixed(5) + ', ' + lon.toFixed(5) + '</div>' +
      (rows || []).map(function (r) { return '<div><span class="pop-k">' + esc(r[0]) + '</span> <span class="mono">' + esc(r[1]) + '</span></div>'; }).join('');
  }

  var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  function initMap() {
    S.map = L.map('map', { zoomControl: false, worldCopyJump: true, minZoom: 2 }).setView([30, 50], 3);
    L.control.zoom({ position: 'topright' }).addTo(S.map);
    S.base = {
      imagery: L.layerGroup([
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagery © Esri' }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, opacity: 0.6 })
      ]),
      // Free, key-less basemaps (CARTO now requires an API key, so it is no longer used)
      dark: L.layerGroup([
        L.tileLayer(ESRI + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 16, attribution: 'Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors' }),
        L.tileLayer(ESRI + 'Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 16 })
      ]),
      light: L.layerGroup([
        L.tileLayer(ESRI + 'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 16, attribution: 'Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors' }),
        L.tileLayer(ESRI + 'Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 16 })
      ]),
      osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' })
    };
    var savedBase = null;
    try { savedBase = localStorage.getItem('cdc.base'); } catch (e) {}
    (S.base[savedBase] || S.base.imagery).addTo(S.map);
    S.map.on('baselayerchange', function (e) {
      Object.keys(S.base).forEach(function (k) { if (S.base[k] === e.layer) { try { localStorage.setItem('cdc.base', k); } catch (er) {} } });
    });
    buildLayerControl();
    if (typeof window.CDC_BASEMAP === 'function') window.CDC_BASEMAP(S.map); // optional offline outline layer

    S.mUplink = L.marker([S.uplink.lat, S.uplink.lon], { icon: icon('gs'), zIndexOffset: 300 }).addTo(S.map);
    S.mTarget = L.marker([S.target.lat, S.target.lon], { icon: icon('tg'), zIndexOffset: 300 }).addTo(S.map);
    S.mUplink.on('dragend', function (e) { var p = e.target.getLatLng(); setLoc('uplink', p.lat, p.lng); });
    S.mTarget.on('dragend', function (e) { var p = e.target.getLatLng(); setLoc('target', p.lat, p.lng); });
    S.map.on('click', function (e) {
      if (!S.pinFor) return;
      setLoc(S.pinFor, e.latlng.lat, L.Util.wrapNum(e.latlng.lng, [-180, 180], true));
      toast(t('pin.done.' + S.pinFor));
    });
    refreshMarkers();
  }
  function buildLayerControl() {
    if (S.layerCtl) S.map.removeControl(S.layerCtl);
    var o = {}; o[t('layer.imagery')] = S.base.imagery; o[t('layer.dark')] = S.base.dark; o[t('layer.light')] = S.base.light; o[t('layer.osm')] = S.base.osm;
    S.layerCtl = L.control.layers(o, null, { position: 'topright' }).addTo(S.map);
  }
  function refreshMarkers() {
    if (!S.map) return;
    S.mUplink.setLatLng([S.uplink.lat, S.uplink.lon]).bindPopup(pop(t('pop.station') + ' · ' + locName('uplink'), S.uplink.lat, S.uplink.lon));
    S.mTarget.setLatLng([S.target.lat, S.target.lon]).bindPopup(pop(t('pop.target') + ' · ' + locName('target'), S.target.lat, S.target.lon));
    S.uplinkMode === 'custom' ? S.mUplink.dragging.enable() : S.mUplink.dragging.disable();
    S.targetMode === 'custom' ? S.mTarget.dragging.enable() : S.mTarget.dragging.disable();
  }
  function fitAll() {
    if (!S.map) return;
    var pts = [[S.uplink.lat, S.uplink.lon], [S.target.lat, S.target.lon]];
    S.layers.forEach(function (l) { if (l.getLatLng) pts.push(l.getLatLng()); });
    if (!S.layers.length && S.mLive) pts.push(S.mLive.getLatLng());
    S.map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 6 });
  }
  function clearLayers() { if (S.map) S.layers.forEach(function (l) { S.map.removeLayer(l); }); S.layers = []; }
  function add(l) { l.addTo(S.map); S.layers.push(l); return l; }

  /* ------------------------------------------------------------------ */
  /*  Locations                                                          */
  /* ------------------------------------------------------------------ */
  function setLoc(type, lat, lon) {
    if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) { status('status.coordBad', null, 'err'); return; }
    S[type] = { lat: +lat, lon: +lon, alt: 0 };
    $(type + '-lat').value = (+lat).toFixed(6);
    $(type + '-lon').value = (+lon).toFixed(6);
    refreshMarkers(); save(); markStale(); liveReset();
  }
  function applyMode(type, mode, silent) {
    var presets = type === 'uplink' ? C.STATIONS : C.TARGETS;
    S[type + 'Mode'] = mode;
    $('sel-' + type).value = mode;
    if (presets[mode]) {
      S[type] = Object.assign({}, presets[mode]);
      $(type + '-custom').classList.add('hide');
      setText(type + '-hint', S[type].lat.toFixed(6) + ', ' + S[type].lon.toFixed(6));
    } else {
      $(type + '-custom').classList.remove('hide');
      setText(type + '-hint', '');
      if (!silent) setMode('map');
      var lat = parseFloat($(type + '-lat').value), lon = parseFloat($(type + '-lon').value);
      if (isFinite(lat) && isFinite(lon)) S[type] = { lat: lat, lon: lon, alt: 0 };
    }
    updatePin(type);
    refreshMarkers();
    if (!silent) { fitAll(); save(); markStale(); liveReset(); status(type === 'uplink' ? 'status.station' : 'status.target', { name: locName(type) }, 'info'); }
  }
  function updatePin(prefer) {
    var u = S.uplinkMode === 'custom', g = S.targetMode === 'custom';
    $('pin-ctl').classList.toggle('hide', !(u || g));
    if (!u && !g) S.pinFor = null;
    else if (u && g) S.pinFor = (prefer === 'uplink' || prefer === 'target') ? prefer : (S.pinFor || 'target');
    else S.pinFor = u ? 'uplink' : 'target';
    document.querySelectorAll('#pin-ctl button').forEach(function (b) {
      b.disabled = (b.dataset.pin === 'uplink' && !u) || (b.dataset.pin === 'target' && !g);
      b.setAttribute('aria-pressed', String(S.pinFor === b.dataset.pin));
    });
  }
  document.querySelectorAll('#pin-ctl button').forEach(function (b) {
    b.addEventListener('click', function () { if (!b.disabled) { S.pinFor = b.dataset.pin; updatePin(S.pinFor); } });
  });

  ['uplink', 'target'].forEach(function (type) {
    $('sel-' + type).addEventListener('change', function (e) { applyMode(type, e.target.value); });
    ['lat', 'lon'].forEach(function (f) {
      $(type + '-' + f).addEventListener('change', function () {
        var lat = parseFloat($(type + '-lat').value), lon = parseFloat($(type + '-lon').value);
        if (isFinite(lat) && isFinite(lon)) { setLoc(type, lat, lon); fitAll(); }
      });
    });
    var link = $(type + '-link');
    var applyLink = function () {
      var raw = link.value.trim(); if (!raw) return;
      var c = C.parseCoords(raw);
      if (c) {
        setLoc(type, c.lat, c.lon); fitAll(); link.value = ''; link.removeAttribute('aria-invalid');
        status('status.coordSet', { lat: c.lat.toFixed(5), lon: c.lon.toFixed(5) }, 'ok');
      } else {
        link.setAttribute('aria-invalid', 'true');
        status(/goo\.gl|maps\.app/.test(raw) ? 'status.linkShort' : 'status.linkNone', null, 'warn');
      }
    };
    link.addEventListener('change', applyLink);
    link.addEventListener('paste', function () { setTimeout(applyLink, 0); });
    link.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } });
  });

  /* ------------------------------------------------------------------ */
  /*  Constraints                                                        */
  /* ------------------------------------------------------------------ */
  var SPEC = { days: [1, 60], sat: [0, 90], sunmin: [-90, 90], sunmax: [-90, 90], gs: [0, 89], lead: [0, 86400], cam: [1, 2000], comm: [1, 5000] };
  function readCfg() {
    var errs = [], cfg = {};
    Object.keys(SPEC).forEach(function (k) {
      var el = $('cfg-' + k), v = parseFloat(el.value);
      var bad = !isFinite(v) || v < SPEC[k][0] || v > SPEC[k][1];
      el.setAttribute('aria-invalid', String(bad));
      if (bad) errs.push(t('cfg.range', { f: t('cfg.' + k), a: SPEC[k][0], b: SPEC[k][1] }));
      cfg[k] = v;
    });
    if (!errs.length && cfg.sunmin > cfg.sunmax) { errs.push(t('cfg.sunOrder')); $('cfg-sunmin').setAttribute('aria-invalid', 'true'); }
    $('cfg-err').textContent = errs.join(' · ');
    $('cfg-err').classList.toggle('hide', !errs.length);
    return errs.length ? null : cfg;
  }
  Object.keys(SPEC).forEach(function (k) {
    $('cfg-' + k).addEventListener('change', function () { readCfg(); save(); markStale(); liveReset(); });
  });
  function markStale() {
    if (!S.result) return;
    S.stale = true;
    $('r-tag').innerHTML = '<span class="tag warn">' + esc(t('status.stale')) + '</span>';
  }

  /* ------------------------------------------------------------------ */
  /*  Compute                                                            */
  /* ------------------------------------------------------------------ */
  function setBusy(on) {
    S.busy = on;
    $('calc-btn').disabled = on;
    $('calc-lbl').setAttribute('data-i18n', on ? 'calc.running' : 'calc.run');
    setText('calc-lbl', t(on ? 'calc.running' : 'calc.run'));
    $('busy').classList.toggle('on', on);
  }
  function progress(p) {
    var pct = Math.round(p * 100);
    setText('busy-v', pct + '%');
    $('busy-bar').style.width = pct + '%';
  }

  async function calculate() {
    if (S.busy) return;
    var tle = updateTleMeta();
    if (!tle.ok) { status('status.tleBad', { msg: t(tle.error) }, 'err'); setView('setup'); $('tle').focus(); return; }
    var cfg = readCfg();
    if (!cfg) { status('status.cfgBad', null, 'err'); setView('setup'); return; }
    var satrec;
    try { satrec = C.makeSatrec(tle); } catch (e) { status('status.sgp', { msg: e.message }, 'err'); return; }

    if (mqSingle.matches) setView('map');
    setBusy(true); progress(0);
    status('status.search', { days: cfg.days }, 'info');
    try {
      var res = await C.plan(satrec, new Date(), S.uplink, S.target, {
        days: cfg.days, minSatElev: cfg.sat, sunMin: cfg.sunmin, sunMax: cfg.sunmax,
        minGsElev: cfg.gs, camRadius: cfg.cam, leadSec: cfg.lead
      }, progress);
      S.result = res; S.satrec = satrec; S.tle = tle; S.cfg = cfg; S.stale = false; S.selected = -1;
      setText('lg-cam', cfg.cam); setText('lg-comm', cfg.comm);
      renderTable();
      if (!res.targets.length) {
        clearLayers(); showEmpty(res, cfg);
        status('status.none', { days: cfg.days }, 'warn');
        if (mqSingle.matches) setView('read');
      } else {
        var idx = res.targets.findIndex(function (c) { return c.status === 'ok'; });
        if (idx < 0) idx = res.targets.findIndex(function (c) { return c.uplink; });
        if (idx < 0) idx = 0;
        setMode('map');
        select(idx, true);
        var nOk = res.targets.filter(function (c) { return c.status === 'ok'; }).length;
        status('status.found', { n: res.targets.length, ok: nOk, i: idx + 1 }, nOk ? 'ok' : 'warn');
      }
      if (res.propagationFailures > 0) toast(t('toast.sgp'));
    } catch (e) {
      console.error(e); status('status.err', { msg: e.message }, 'err');
    } finally { setBusy(false); }
  }
  $('plan-form').addEventListener('submit', function (e) { e.preventDefault(); calculate(); });
  document.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); calculate(); } });

  /* ------------------------------------------------------------------ */
  /*  Passes table                                                       */
  /* ------------------------------------------------------------------ */
  var ST = { ok: ['ok', 'st.ok'], far: ['warn', 'st.far'], 'no-uplink': ['bad', 'st.noUp'] };
  function renderTable() {
    var res = S.result, tb = $('p-tbody'), onlyOk = $('only-ok').checked;
    var list = res ? res.targets : [], shown = 0;
    tb.innerHTML = '';
    list.forEach(function (c, i) {
      if (onlyOk && c.status !== 'ok') return;
      shown++;
      var st = ST[c.status], tr = document.createElement('tr');
      tr.tabIndex = 0; tr.dataset.idx = i;
      tr.setAttribute('aria-selected', String(i === S.selected));
      tr.innerHTML =
        '<td class="n c-idx">' + (i + 1) + '</td>' +
        '<td class="c-ict">' + sd(c.time) + '</td>' +
        '<td class="c-utc">' + utc(c.time) + '</td>' +
        '<td class="n" data-l="' + esc(t('ps.el')) + '">' + c.satElev.toFixed(1) + '°</td>' +
        '<td class="n" data-l="' + esc(t('ps.sun')) + '">' + c.sunElev.toFixed(1) + '°</td>' +
        '<td class="n" data-l="' + esc(t('ps.off')) + '">' + c.dist.toFixed(1) + ' km</td>' +
        '<td data-l="' + esc(t('ps.up')) + '">' + (c.uplink ? sd(c.uplink.tca) : '—') + '</td>' +
        '<td class="n" data-l="' + esc(t('ps.delay')) + '">' + (c.delaySec != null ? Math.round(c.delaySec) + ' s' : '—') + '</td>' +
        '<td class="c-st"><span class="tag ' + st[0] + '">' + esc(t(st[1])) + '</span></td>';
      tb.appendChild(tr);
    });
    setText('p-count', res ? String(list.length) : '');
    setText('tab-cnt', res && list.length ? String(list.length) : '');
    var pe = $('p-empty');
    pe.classList.toggle('hide', shown > 0);
    pe.textContent = !res ? t('ps.empty') : (list.length ? t('ps.emptyFilter') : t('ps.none'));
    $('export-csv').disabled = !list.length;
  }
  $('p-tbody').addEventListener('click', function (e) {
    var tr = e.target.closest('tr'); if (!tr) return;
    select(+tr.dataset.idx);
    if (mqSingle.matches) setView('read');
  });
  $('p-tbody').addEventListener('keydown', function (e) {
    var tr = e.target.closest('tr'); if (!tr) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(+tr.dataset.idx); }
    if (e.key === 'ArrowDown' && tr.nextElementSibling) { e.preventDefault(); tr.nextElementSibling.focus(); }
    if (e.key === 'ArrowUp' && tr.previousElementSibling) { e.preventDefault(); tr.previousElementSibling.focus(); }
  });
  $('only-ok').addEventListener('change', renderTable);
  $('map-sum').addEventListener('click', function () { setView('read'); });

  /* ------------------------------------------------------------------ */
  /*  Readout                                                            */
  /* ------------------------------------------------------------------ */
  function showBlocks(on) {
    ['r-delay', 'r-ev', 'r-geo', 'r-act'].forEach(function (id) { $(id).classList.toggle('hide', !on); });
    $('r-empty').classList.toggle('hide', on);
    if (!on) { $('r-notes').innerHTML = ''; $('map-sum').classList.add('hide'); setText('map-meta', ''); stopTimer(); }
  }
  function showEmpty(res, cfg) {
    showBlocks(false);
    $('r-tag').innerHTML = '';
    var box = $('r-empty'), msg, sugg = null;
    if (res.rejectedSun && res.bestRejectedSun != null && res.bestRejectedSun < cfg.sunmin) {
      sugg = Math.max(-90, Math.floor(res.bestRejectedSun));
      msg = t('empty.sun', { n: res.rejectedSun, best: res.bestRejectedSun.toFixed(1), min: cfg.sunmin });
    } else if (res.rejectedSun) msg = t('empty.sunRange', { n: res.rejectedSun });
    else msg = t('empty.elev', { el: cfg.sat, days: cfg.days });
    box.innerHTML = '<div class="t">' + esc(t('empty.none')) + '</div><div>' + esc(msg) + '</div>' +
      (sugg != null ? '<div class="row-btns" style="justify-content:center;margin-top:14px"><button type="button" class="btn" id="relax-btn">' + esc(t('empty.retry', { v: sugg })) + '</button></div>' : '');
    if (sugg != null) $('relax-btn').addEventListener('click', function () { $('cfg-sunmin').value = sugg; readCfg(); save(); calculate(); });
  }

  function select(idx, initial) {
    var res = S.result; if (!res) return;
    var c = res.targets[idx]; if (!c) return;
    S.selected = idx;
    document.querySelectorAll('#p-tbody tr').forEach(function (tr) { tr.setAttribute('aria-selected', String(+tr.dataset.idx === idx)); });
    var row = document.querySelector('#p-tbody tr[aria-selected="true"]');
    if (row && !initial) row.scrollIntoView({ block: 'nearest' });

    showBlocks(true);
    var st = ST[c.status], u = c.uplink;
    if (!S.stale) $('r-tag').innerHTML = '<span class="tag ' + st[0] + '">' + esc(t(st[1])) + '</span>';
    setText('map-meta', t('map.pass', { i: idx + 1, n: res.targets.length }));

    $('r-sec').innerHTML = u ? Math.round(c.delaySec).toLocaleString('en-US') + '<small>s</small>' : '—';
    setText('r-hms', u ? C.fmtHMS(c.delaySec) + '  h:m:s' : '');
    setText('r-alt', u ? t('read.alt', { aos: Math.round(c.delayFromAos), los: Math.round(c.delayFromLos) }) : t('read.noUp'));

    // notes
    var notes = [], cam = S.cfg.cam;
    var age = (Date.now() - S.tle.epoch.getTime()) / 86400000;
    if (!u) notes.push(['bad', t('note.noUp')]);
    if (c.status === 'far') notes.push(['', t('note.far', { d: c.dist.toFixed(1), r: cam })]);
    if (age > 7) notes.push(['bad', t('note.tleOld', { d: age.toFixed(0) })]);
    else if (age > 3) notes.push(['', t('note.tleAging', { d: age.toFixed(1) })]);
    $('r-notes').innerHTML = notes.map(function (n) { return '<div class="note ' + n[0] + '">' + esc(n[1]) + '</div>'; }).join('');

    // event timeline
    var ev = [['ev.now', null]];
    if (u) ev.push(['ev.aos', u.aos], ['ev.tca', u.tca, 'up'], ['ev.los', u.los]);
    ev.push(['ev.img', c.time, 'img']);
    $('ev-body').innerHTML = ev.map(function (e) {
      return '<tr class="' + (e[1] ? (e[2] ? 'key ' + e[2] : '') : 'now') + '"><td>' + esc(t(e[0])) + '</td><td data-tm="' + (e[1] ? e[1].getTime() : 'now') + '">' +
        (e[1] ? sd(e[1]) : '') + '</td><td class="tm" data-cd="' + (e[1] ? e[1].getTime() : '') + '"></td></tr>';
    }).join('');
    startTimer();

    // geometry
    var g = function (id, v, unit, cls) { var el = $(id); el.className = 'v' + (cls ? ' ' + cls : ''); el.innerHTML = v + (unit ? '<small>' + unit + '</small>' : ''); };
    g('g-dist', fix(c.dist, 1), 'km', c.dist <= cam ? 'ok' : 'warn');
    g('g-elt', fix(c.satElev, 1), '°');
    g('g-sun', fix(c.sunElev, 1), '°');
    g('g-alt', fix(c.sub.alt, 1), 'km');
    g('g-elu', u ? fix(u.maxElev, 1) : '--', '°');
    g('g-dur', u ? Math.round(u.durationSec) : '--', 's');
    g('g-rng', u ? fix(u.rangeKm, 1) : '--', 'km');
    g('g-rf', u ? fix(u.rfDelayMs, 3) : '--', 'ms');

    // phone map summary
    $('map-sum').classList.remove('hide');
    setText('ms-v', u ? Math.round(c.delaySec).toLocaleString('en-US') + ' s' : '—');
    setText('ms-s', u ? 'TCA ' + hms(u.tca) + ' → ' + hms(c.time) + ' ICT' : t('read.noUp'));

    drawOnMap(c);
  }

  function drawOnMap(c) {
    if (!S.map) return;
    clearLayers();
    var rec = S.satrec, u = c.uplink, half = C.orbitalPeriodMin(rec) * 60000 / 2;
    var cImg = css('--sat'), cUp = css('--up');
    C.groundTrack(rec, new Date(c.time - half), c.time, 20).forEach(function (s) { add(L.polyline(s, { color: cImg, weight: 2, opacity: 0.95, interactive: false })); });
    C.groundTrack(rec, c.time, new Date(+c.time + half), 20).forEach(function (s) { add(L.polyline(s, { color: cImg, weight: 1.5, opacity: 0.6, dashArray: '6 6', interactive: false })); });
    add(L.circle([c.sub.lat, c.sub.lon], { radius: S.cfg.cam * 1000, color: cImg, weight: 1.5, fillColor: cImg, fillOpacity: 0.12, interactive: false }));
    add(L.marker([c.sub.lat, c.sub.lon], { icon: icon('sat'), zIndexOffset: 500 }).bindPopup(pop(t('pop.sat'), c.sub.lat, c.sub.lon, [
      [t('pop.time'), ict(c.time) + ' ICT'], [t('pop.alt'), c.sub.alt.toFixed(1) + ' km'],
      [t('pop.off'), c.dist.toFixed(1) + ' km'], [t('pop.el'), c.satElev.toFixed(1) + '°']])));
    if (u) {
      C.groundTrack(rec, u.aos, u.los, 5).forEach(function (s) { add(L.polyline(s, { color: cUp, weight: 4, opacity: 1, interactive: false })); });
      add(L.circle([u.sub.lat, u.sub.lon], { radius: S.cfg.comm * 1000, color: cUp, weight: 1.2, dashArray: '5 5', fill: false, interactive: false }));
      add(L.polyline([[S.uplink.lat, S.uplink.lon], [u.sub.lat, u.sub.lon]], { color: cUp, weight: 1, opacity: 0.9, dashArray: '2 4', interactive: false }));
      add(L.marker([u.sub.lat, u.sub.lon], { icon: icon('sat-up'), zIndexOffset: 450 }).bindPopup(pop(t('pop.satUp'), u.sub.lat, u.sub.lon, [
        [t('pop.time'), ict(u.tca) + ' ICT'], [t('pop.maxEl'), u.maxElev.toFixed(1) + '°'], [t('pop.range'), u.rangeKm.toFixed(1) + ' km']])));
    }
    fitAll();
  }

  /* ------------------------------------------------------------------ */
  /*  Live T− column                                                     */
  /* ------------------------------------------------------------------ */
  function startTimer() {
    stopTimer();
    var upd = function () {
      var now = Date.now();
      document.querySelectorAll('#ev-body [data-tm="now"]').forEach(function (td) { td.textContent = sd(new Date(now)); });
      document.querySelectorAll('#ev-body [data-cd]').forEach(function (td) {
        var v = td.getAttribute('data-cd');
        if (!v) { td.textContent = ''; return; }
        var ms = +v - now;
        if (ms <= 0) { td.textContent = t('ev.passed'); td.className = 'tm past'; return; }
        var s = Math.floor(ms / 1000), d = Math.floor(s / 86400);
        td.textContent = (d ? d + 'd ' : '') + C.fmtHMS(s % 86400);
        td.className = 'tm' + (ms < 3600000 ? ' soon' : '');
      });
    };
    upd(); S.timer = setInterval(upd, 1000);
  }
  function stopTimer() { if (S.timer) clearInterval(S.timer); S.timer = null; }

  /* ------------------------------------------------------------------ */
  /*  Copy / export                                                      */
  /* ------------------------------------------------------------------ */
  $('copy-delay').addEventListener('click', function () {
    var c = S.result && S.result.targets[S.selected]; if (!c || c.delaySec == null) return;
    var v = String(Math.round(c.delaySec)); copy(v, t('toast.copied', { v: v + ' s' }));
  });
  $('copy-plan').addEventListener('click', function () {
    var c = S.result && S.result.targets[S.selected]; if (!c) return;
    var u = c.uplink, pad = function (k) { return (t(k) + ' ').padEnd(16, ' ') + ': '; };
    var lines = [
      t('plan.title', { sat: S.tle.name }),
      pad('plan.target') + locName('target') + ' (' + S.target.lat.toFixed(5) + ', ' + S.target.lon.toFixed(5) + ')',
      pad('plan.uplink') + locName('uplink'),
      u ? pad('plan.upTca') + ict(u.tca) + ' ICT / ' + utc(u.tca) + ' UTC' : t('plan.noUp'),
      u ? pad('plan.window') + hms(u.aos) + ' – ' + hms(u.los) + ' ICT · max el ' + u.maxElev.toFixed(1) + '°' : '',
      pad('plan.img') + ict(c.time) + ' ICT / ' + utc(c.time) + ' UTC',
      u ? pad('plan.delay') + Math.round(c.delaySec) + ' s (' + C.fmtHMS(c.delaySec) + ')' : '',
      pad('plan.geom') + 'el ' + c.satElev.toFixed(1) + '° · sun ' + c.sunElev.toFixed(1) + '° · offset ' + c.dist.toFixed(1) + ' km',
      pad('plan.epoch') + utc(S.tle.epoch) + ' UTC'
    ].filter(Boolean);
    copy(lines.join('\n'), t('toast.copiedPlan'));
  });
  $('export-csv').addEventListener('click', function () {
    if (!S.result) return;
    var head = ['index', 'imaging_utc', 'imaging_ict', 'sat_elev_deg', 'sun_elev_deg', 'offset_km', 'uplink_aos_utc', 'uplink_tca_utc', 'uplink_los_utc', 'uplink_max_elev_deg', 'command_delay_s', 'status'];
    var rows = S.result.targets.map(function (c, i) {
      var u = c.uplink;
      return [i + 1, utc(c.time), ict(c.time), c.satElev.toFixed(2), c.sunElev.toFixed(2), c.dist.toFixed(2),
        u ? utc(u.aos) : '', u ? utc(u.tca) : '', u ? utc(u.los) : '', u ? u.maxElev.toFixed(2) : '',
        c.delaySec != null ? Math.round(c.delaySec) : '', c.status];
    });
    var csv = '﻿' + [head].concat(rows).map(function (r) { return r.join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'command-plan-' + S.tle.catnr + '-' + utc(new Date()).slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });


  /* ------------------------------------------------------------------ */
  /*  Stage mode: live globe / plan map                                  */
  /* ------------------------------------------------------------------ */
  function setMode(m) {
    S.mode = m;
    $('stage').setAttribute('data-mode', m);
    document.querySelectorAll('#mode-seg button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
    if (m === 'map' && S.map) setTimeout(function () { S.map.invalidateSize(); fitAll(); }, 20);
    if (m === 'globe' && S.globe) setTimeout(function () { S.globe.resize(); }, 20);
  }
  document.querySelectorAll('#mode-seg button').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });

  function initGlobe() {
    if (!window.d3 || !window.CDGlobe) { setMode('map'); $('mode-seg').classList.add('hide'); return; }
    try {
      S.globe = new window.CDGlobe($('globe'));
      S.globe.onUnfollow = function () { $('follow-btn').setAttribute('aria-pressed', 'false'); };
      var useLand = function (g) { if (g) S.globe.setLand(g); };
      if (window.CDC_LAND) useLand(window.CDC_LAND);
      else fetch('land.json').then(function (r) { return r.ok ? r.json() : null; }).then(useLand).catch(function () {});
    } catch (e) { console.error(e); S.globe = null; setMode('map'); }
  }
  $('follow-btn').addEventListener('click', function () {
    var on = this.getAttribute('aria-pressed') !== 'true';
    this.setAttribute('aria-pressed', String(on));
    if (S.globe) S.globe.setFollow(on);
  });

  /* ------------------------------------------------------------------ */
  /*  Live satellite position (SGP4 from the TLE in the form)            */
  /* ------------------------------------------------------------------ */
  function liveReset() { S.live.key = ''; S.live.contact = null; S.live.trackAt = 0; }

  function liveSat() {
    var raw = $('tle').value;
    if (S.live.key === raw && S.live.satrec) return S.live.satrec;
    S.live.key = raw; S.live.satrec = null; S.live.contact = null; S.live.trackAt = 0;
    var p = C.parseTLE(raw);
    if (!p.ok) return null;
    try { S.live.satrec = C.makeSatrec(p); S.live.name = p.name; } catch (e) { S.live.satrec = null; }
    return S.live.satrec;
  }

  function gsMin() { var v = parseFloat($('cfg-gs').value); return isFinite(v) ? v : 20; }
  function commKm() { var v = parseFloat($('cfg-comm').value); return isFinite(v) ? v : 420; }

  function liveTick(force) {
    var rec = liveSat(), now = new Date();
    if (!rec) { setText('lv-state', '--'); setText('lv-next', '--:--:--'); setText('lv-next-s', t('live.sgp')); return; }
    var st = C.liveState(rec, now, S.uplink);
    if (!st) { setText('lv-state', '--'); setText('lv-next-s', t('live.sgp')); return; }
    var minEl = gsMin(), inC = st.elev >= minEl;

    // contact window (current or next); recompute when stale
    var ct = S.live.contact;
    if (force === true || !ct || (ct.los && now > ct.los) || (!ct.none && !ct.inPass && inC)) {
      var n = C.nextContact(rec, now, S.uplink, minEl, 48);
      S.live.contact = ct = n ? n : { none: true, at: now };
    }
    if (ct.none && now - ct.at > 600000) S.live.contact = null;   // retry every 10 min

    // ground track every 60 s
    if (force === true || now - S.live.trackAt > 60000) {
      var per = C.orbitalPeriodMin(rec) * 60000;
      S.live.past = trackPts(rec, new Date(now - per * 0.5), now);
      S.live.future = trackPts(rec, now, new Date(+now + per));
      S.live.trackAt = +now;
      S.live.mapDirty = true;
    }
    if (S.live.contact !== S.live.drawnContact) { S.live.drawnContact = S.live.contact; S.live.mapDirty = true; }

    // panel
    var stEl = $('lv-state');
    stEl.textContent = inC ? t('live.inContact') : t('live.noContact');
    stEl.className = 'live-state' + (inC ? ' on' : '');
    if (ct.none) {
      setText('lv-next-k', t('live.nextAos')); setText('lv-next', '—'); setText('lv-next-s', t('live.none'));
    } else if (inC && ct.los) {
      setText('lv-next-k', t('live.losIn'));
      setText('lv-next', C.fmtHMS(Math.max(0, (ct.los - now) / 1000)));
      setText('lv-next-s', 'LOS ' + hms(ct.los) + ' ICT · max ' + ct.maxElev.toFixed(1) + '°');
    } else {
      setText('lv-next-k', t('live.nextAos'));
      var sec = Math.max(0, (ct.aos - now) / 1000), d = Math.floor(sec / 86400);
      setText('lv-next', (d ? d + 'd ' : '') + C.fmtHMS(sec % 86400));
      setText('lv-next-s', 'AOS ' + hms(ct.aos) + ' ICT · max ' + ct.maxElev.toFixed(1) + '°');
    }
    var deg = function (v, pos, neg) { return Math.abs(v).toFixed(2) + '°' + (v >= 0 ? pos : neg); };
    $('lv-lat').textContent = deg(st.lat, 'N', 'S');
    $('lv-lon').textContent = deg(st.lon, 'E', 'W');
    $('lv-alt').innerHTML = st.alt.toFixed(1) + '<small>km</small>';
    $('lv-el').innerHTML = st.elev.toFixed(1) + '<small>°</small>';
    $('lv-az').innerHTML = st.az.toFixed(0) + '<small>°</small>';
    $('lv-rng').innerHTML = Math.round(st.range).toLocaleString('en-US') + '<small>km</small>';
    $('lv-el').style.color = inC ? 'var(--ok)' : '';

    // globe
    if (S.globe) S.globe.set({
      sat: { lat: st.lat, lon: st.lon }, past: S.live.past, future: S.live.future,
      sun: C.sunSubpoint(now), station: S.uplink, target: S.target,
      commKm: commKm(), inContact: inC, label: S.live.name || 'SAT'
    });
    // plan map marker
    if (S.map) {
      if (!S.mLive) S.mLive = L.marker([st.lat, st.lon], { icon: L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: '<div class="mk-live"></div>' }), zIndexOffset: 600, interactive: false }).addTo(S.map);
      else S.mLive.setLatLng([st.lat, st.lon]);
      if (S.live.mapDirty) { S.live.mapDirty = false; drawLiveOnMap(rec, now); }
    }
  }

  // Live layers on the plan map: current orbit (past half / next full) and the next contact arc.
  // They stay visible before any plan is computed, and when a plan finds no imaging pass.
  function drawLiveOnMap(rec, now) {
    (S.liveLayers || []).forEach(function (l) { S.map.removeLayer(l); });
    S.liveLayers = [];
    var addL = function (l) { l.addTo(S.map); S.liveLayers.push(l); };
    var per = C.orbitalPeriodMin(rec) * 60000, col = css('--text-2'), up = css('--up');
    C.groundTrack(rec, new Date(now - per * 0.5), now, 30).forEach(function (sg) { addL(L.polyline(sg, { color: col, weight: 1.5, opacity: 0.55, interactive: false })); });
    C.groundTrack(rec, now, new Date(+now + per), 30).forEach(function (sg) { addL(L.polyline(sg, { color: col, weight: 1.5, opacity: 0.45, dashArray: '2 6', interactive: false })); });
    var ct = S.live.contact;
    if (ct && !ct.none && ct.aos && ct.los) {
      C.groundTrack(rec, ct.aos, ct.los, 5).forEach(function (sg) { addL(L.polyline(sg, { color: up, weight: 3, opacity: 0.7, dashArray: '6 4', interactive: false })); });
    }
    S.liveLayers.forEach(function (l) { if (l.bringToBack) l.bringToBack(); });
  }

  function trackPts(rec, a, b) {
    var out = [];
    for (var tt = +a; tt <= +b; tt += 30000) { var sp = C.subPoint(rec, new Date(tt)); if (sp) out.push([sp.lon, sp.lat]); }
    return out;
  }

  /* ------------------------------------------------------------------ */
  /*  Init                                                               */
  /* ------------------------------------------------------------------ */
  function applyState(st) {
    var saved = C.parseTLE(st.tle), def = C.parseTLE(DEFAULTS.tle);
    $('tle').value = saved.ok && (!def.ok || saved.catnr !== def.catnr || saved.epoch >= def.epoch) ? st.tle : DEFAULTS.tle;
    Object.keys(DEFAULTS.cfg).forEach(function (k) {
      $('cfg-' + k).value = st.cfg && st.cfg[k] != null && st.cfg[k] !== '' ? st.cfg[k] : DEFAULTS.cfg[k];
    });
    var uc = st.uplinkCustom || DEFAULTS.uplinkCustom, tc = st.targetCustom || DEFAULTS.targetCustom;
    $('uplink-lat').value = (+uc.lat).toFixed(6); $('uplink-lon').value = (+uc.lon).toFixed(6);
    $('target-lat').value = (+tc.lat).toFixed(6); $('target-lon').value = (+tc.lon).toFixed(6);
    applyMode('uplink', (C.STATIONS[st.uplinkMode] || st.uplinkMode === 'custom') ? st.uplinkMode : 'kmutnb', true);
    applyMode('target', (C.TARGETS[st.targetMode] || st.targetMode === 'custom') ? st.targetMode : 'paris', true);
    updateTleMeta(); readCfg();
  }
  $('reset-btn').addEventListener('click', function () {
    applyState(DEFAULTS); save(); fitAll(); markStale(); status('status.reset', null, 'info');
  });

  themeIcon();
  initGlobe();
  try { initMap(); } catch (e) { console.error(e); S.status = { key: 'status.mapFail', vars: null, type: 'warn' }; }
  applyState(load() || DEFAULTS);
  I.init();
  fitAll();
  liveTick(true);
  setInterval(liveTick, 1000);
})();
