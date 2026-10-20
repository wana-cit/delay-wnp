/* ==========================================================================
   Command Delay Calculator — core computation module
   CDH Team · KNACKSAT-2

   Pure functions (no DOM). Works in the browser (window.CDCore) and in
   Node (module.exports) so it can be unit-tested with test.js.
   Depends on satellite.js 5.x (SGP4).
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('satellite.js'));
  } else {
    root.CDCore = factory(root.satellite);
  }
})(typeof self !== 'undefined' ? self : this, function (satellite) {
  'use strict';

  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var RE = 6371.0;            // mean Earth radius, km (ground distance only)
  var C_KM_S = 299792.458;    // speed of light, km/s

  /* ---------------------------------------------------------------------- */
  /*  Presets                                                                */
  /* ---------------------------------------------------------------------- */
  var STATIONS = {
    kmutnb: { lat: 13.824017540980227, lon: 100.5126084380669, alt: 0.01, name: 'KMUTNB Techno Park, Bangkok' }
  };
  var TARGETS = {
    // Eiffel Tower, Champ de Mars, Paris (tower centre)
    paris: { lat: 48.858370, lon: 2.294481, alt: 0.035, name: 'Eiffel Tower, Paris' }
  };

  /* ---------------------------------------------------------------------- */
  /*  TLE parsing                                                            */
  /* ---------------------------------------------------------------------- */
  function tleChecksum(line) {
    var sum = 0;
    for (var i = 0; i < 68; i++) {
      var ch = line.charAt(i);
      if (ch >= '0' && ch <= '9') sum += +ch;
      else if (ch === '-') sum += 1;
    }
    return sum % 10;
  }

  function tleEpoch(l1) {
    var yy = parseInt(l1.substring(18, 20), 10);
    var doy = parseFloat(l1.substring(20, 32));
    var year = yy < 57 ? 2000 + yy : 1900 + yy;
    return new Date(Date.UTC(year, 0, 1) + (doy - 1) * 86400000);
  }

  /** Parse raw TLE text (2 or 3 lines). Returns {ok, name, l1, l2, catnr, epoch, checksumOk, error}.
      `error` is an i18n key (see i18n.js). */
  function parseTLE(raw) {
    var lines = String(raw || '').split(/\r?\n/).map(function (l) { return l.replace(/\s+$/, '').replace(/^\s+/, ''); })
      .filter(function (l) { return l.length; });
    var l1 = '', l2 = '', name = '';
    for (var i = 0; i < lines.length - 1; i++) {
      if (/^1 /.test(lines[i]) && /^2 /.test(lines[i + 1])) {
        l1 = lines[i]; l2 = lines[i + 1];
        name = i > 0 ? lines[i - 1].replace(/^0 /, '') : '';
        break;
      }
    }
    if (!l1 || !l2) return { ok: false, error: 'tle.err.lines' };
    if (l1.length < 69 || l2.length < 69) return { ok: false, error: 'tle.err.length' };
    var cat1 = l1.substring(2, 7).trim(), cat2 = l2.substring(2, 7).trim();
    if (cat1 !== cat2) return { ok: false, error: 'tle.err.catnr' };
    var checksumOk = tleChecksum(l1) === +l1.charAt(68) && tleChecksum(l2) === +l2.charAt(68);
    return { ok: true, name: name || ('NORAD ' + cat1), l1: l1, l2: l2, catnr: cat1, epoch: tleEpoch(l1), checksumOk: checksumOk };
  }

  function makeSatrec(tle) {
    var rec = satellite.twoline2satrec(tle.l1, tle.l2);
    if (rec.error) throw new Error('SGP4 init error code ' + rec.error);
    return rec;
  }

  /* ---------------------------------------------------------------------- */
  /*  Geometry                                                               */
  /* ---------------------------------------------------------------------- */
  function observer(o) {
    return { latitude: o.lat * D2R, longitude: o.lon * D2R, height: o.alt || 0 };
  }

  /** Satellite state seen from observer at date (WGS-84, topocentric). */
  function look(satrec, date, obsGd) {
    var pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position || typeof pv.position === 'boolean') return null;
    var gmst = satellite.gstime(date);
    var ecf = satellite.eciToEcf(pv.position, gmst);
    var la = satellite.ecfToLookAngles(obsGd, ecf);
    return { elev: la.elevation * R2D, az: la.azimuth * R2D, range: la.rangeSat, eci: pv.position, gmst: gmst };
  }

  function subPoint(satrec, date) {
    var pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position || typeof pv.position === 'boolean') return null;
    var gd = satellite.eciToGeodetic(pv.position, satellite.gstime(date));
    return { lat: satellite.degreesLat(gd.latitude), lon: satellite.degreesLong(gd.longitude), alt: gd.height };
  }

  function haversine(la1, lo1, la2, lo2) {
    var dlat = (la2 - la1) * D2R, dlon = (lo2 - lo1) * D2R;
    var a = Math.pow(Math.sin(dlat / 2), 2) + Math.cos(la1 * D2R) * Math.cos(la2 * D2R) * Math.pow(Math.sin(dlon / 2), 2);
    return RE * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Ground radius (km) inside which a satellite at altitude h is seen above elevation e. */
  function visibilityRadius(altKm, minElevDeg) {
    var e = minElevDeg * D2R;
    var lam = Math.acos(RE * Math.cos(e) / (RE + altKm)) - e;
    return Math.max(0, lam * RE);
  }

  /* ---------------------------------------------------------------------- */
  /*  Sun elevation (NOAA / Meeus low-precision, ~0.02° accuracy)            */
  /* ---------------------------------------------------------------------- */
  function sunEquatorial(date) {
    var jd = date.getTime() / 86400000 + 2440587.5;
    var T = (jd - 2451545.0) / 36525;
    var L0 = (280.46646 + T * (36000.76983 + 0.0003032 * T)) % 360;
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var Mr = M * D2R;
    var Cc = Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
      Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) + Math.sin(3 * Mr) * 0.000289;
    var trueLon = L0 + Cc;
    var omega = 125.04 - 1934.136 * T;
    var lambda = trueLon - 0.00569 - 0.00478 * Math.sin(omega * D2R);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = eps0 + 0.00256 * Math.cos(omega * D2R);
    var decl = Math.asin(Math.sin(eps * D2R) * Math.sin(lambda * D2R));
    var ra = Math.atan2(Math.cos(eps * D2R) * Math.sin(lambda * D2R), Math.cos(lambda * D2R));
    return { decl: decl, ra: ra };                     // radians
  }

  /** Point on Earth where the Sun is overhead (degrees). */
  function sunSubpoint(date) {
    var q = sunEquatorial(date);
    var lon = (q.ra - satellite.gstime(date)) * R2D;
    lon = ((lon + 540) % 360) - 180;
    return { lat: q.decl * R2D, lon: lon };
  }

  function sunElevation(date, lat, lon) {
    var q = sunEquatorial(date), decl = q.decl, ra = q.ra;
    var gmst = satellite.gstime(date);                 // radians
    var H = gmst + lon * D2R - ra;
    var sinEl = Math.sin(lat * D2R) * Math.sin(decl) + Math.cos(lat * D2R) * Math.cos(decl) * Math.cos(H);
    var el = Math.asin(Math.max(-1, Math.min(1, sinEl))) * R2D;
    // atmospheric refraction (Saemundsson) for apparent elevation
    if (el > -1) el += 1.02 / Math.tan((el + 10.3 / (el + 5.11)) * D2R) / 60;
    return el;
  }

  /* ---------------------------------------------------------------------- */
  /*  Root / extremum refinement                                             */
  /* ---------------------------------------------------------------------- */
  function refineMax(f, t0, t1, tolMs) {
    // golden-section search for maximum of f on [t0, t1] (ms timestamps)
    var g = (Math.sqrt(5) - 1) / 2;
    var a = t0, b = t1;
    var c = b - g * (b - a), d = a + g * (b - a);
    var fc = f(c), fd = f(d);
    while (b - a > tolMs) {
      if (fc > fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c); }
      else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d); }
    }
    var t = (a + b) / 2;
    return { t: t, v: f(t) };
  }

  function refineCross(f, level, a, b, tolMs) {
    // f(a) and f(b) lie on opposite sides of level (any time order); bisection
    var sa = f(a) - level >= 0;
    for (var i = 0; i < 60 && Math.abs(b - a) > tolMs; i++) {
      var m = (a + b) / 2;
      if ((f(m) - level >= 0) === sa) a = m; else b = m;
    }
    return (a + b) / 2;
  }

  /* ---------------------------------------------------------------------- */
  /*  Main planner                                                           */
  /* ---------------------------------------------------------------------- */
  /**
   * Scan [start, start+days] once and return:
   *   targets : imaging opportunities over the target (TCA, elevations, sun)
   *   uplinks : commandable passes over the uplink station (AOS / TCA / LOS)
   * Then pair each target opportunity with the LAST uplink pass that is in
   * the future (TCA >= start) and ends before the imaging time.
   *
   * opts: { days, minSatElev, sunMin, sunMax, minGsElev, camRadius, stepSec, leadSec }
   */
  async function plan(satrec, start, station, target, opts, onProgress) {
    var o = Object.assign({ days: 30, minSatElev: 50, sunMin: 20, sunMax: 90, minGsElev: 20, camRadius: 100, stepSec: 30, leadSec: 60 }, opts || {});
    var gsGd = observer(station), tgGd = observer(target);
    var t0 = start.getTime(), tEnd = t0 + o.days * 86400000, step = o.stepSec * 1000;

    var fT = function (t) { var r = look(satrec, new Date(t), tgGd); return r ? r.elev : -90; };
    var fG = function (t) { var r = look(satrec, new Date(t), gsGd); return r ? r.elev : -90; };

    var targets = [], uplinks = [];
    var p2 = -90, p1 = -90;            // target elevation history
    var gPrev = null, inPass = false, passStart = 0, passPeakT = 0, passPeakV = -90;
    var lastYield = Date.now(), propagationFailures = 0, rejectedSun = 0, bestRejectedSun = -90;

    for (var t = t0; t <= tEnd; t += step) {
      var e = fT(t), g = fG(t);
      if (e === -90 && g === -90) propagationFailures++;

      // ---- target: local maximum of elevation ----
      if (p1 > p2 && p1 >= e && p1 > o.minSatElev - 15) {
        var pk = refineMax(fT, t - 2 * step, t, 100);
        if (pk.v >= o.minSatElev) {
          var tt = new Date(Math.round(pk.t));
          var sun = sunElevation(tt, target.lat, target.lon);
          var sunOk = sun >= o.sunMin && sun <= o.sunMax;
          if (!sunOk) { rejectedSun++; if (sun > bestRejectedSun) bestRejectedSun = sun; }
          // Passes that fail the Sun limit are kept (flagged) so the operator still sees
          // every geometric opportunity and its command delay.
          var sp = subPoint(satrec, tt);
          var lk = look(satrec, tt, tgGd);
          targets.push({
            time: tt, satElev: pk.v, sunElev: sun, sunOk: sunOk, az: lk ? lk.az : null,
            dist: haversine(sp.lat, sp.lon, target.lat, target.lon), range: lk ? lk.range : null,
            sub: sp
          });
        }
      }
      p2 = p1; p1 = e;

      // ---- uplink: elevation above minGsElev segments ----
      var above = g >= o.minGsElev;
      if (above && !inPass) {
        inPass = true;
        passStart = t === t0 ? t0 : refineCross(fG, o.minGsElev, t - step, t, 200);
        passPeakT = t; passPeakV = g;
      } else if (above && inPass) {
        if (g > passPeakV) { passPeakV = g; passPeakT = t; }
      } else if (!above && inPass) {
        inPass = false;
        var los = refineCross(fG, o.minGsElev, t, t - step, 200);
        var pkG = refineMax(fG, Math.max(passStart, passPeakT - step), Math.min(los, passPeakT + step), 100);
        uplinks.push(makeUplink(satrec, gsGd, passStart, pkG.t, los, pkG.v));
      }
      gPrev = g;

      if (onProgress && Date.now() - lastYield > 40) {
        onProgress((t - t0) / (tEnd - t0));
        await new Promise(function (r) { setTimeout(r, 0); });
        lastYield = Date.now();
      }
    }
    if (inPass) {
      var pkE = refineMax(fG, Math.max(passStart, passPeakT - step), Math.min(tEnd, passPeakT + step), 100);
      uplinks.push(makeUplink(satrec, gsGd, passStart, pkE.t, tEnd, pkE.v));
    }
    if (onProgress) onProgress(1);

    // ---- pair every imaging opportunity with its commanding pass ----
    targets.forEach(function (c) {
      var best = null;
      for (var i = uplinks.length - 1; i >= 0; i--) {
        var u = uplinks[i];
        if (u.tca.getTime() <= c.time.getTime() - o.leadSec * 1000 && u.tca.getTime() >= t0) { best = u; break; }
      }
      c.uplink = best;
      c.delaySec = best ? (c.time - best.tca) / 1000 : null;
      c.delayFromAos = best ? (c.time - best.aos) / 1000 : null;
      c.delayFromLos = best ? (c.time - best.los) / 1000 : null;
      c.status = !best ? 'no-uplink' : !c.sunOk ? 'sun' : (c.dist > o.camRadius ? 'far' : 'ok');
    });

    return { targets: targets, uplinks: uplinks, start: start, opts: o, propagationFailures: propagationFailures,
      rejectedSun: rejectedSun, bestRejectedSun: rejectedSun ? bestRejectedSun : null };
  }

  function makeUplink(satrec, gsGd, aos, tca, los, maxElev) {
    var tcaD = new Date(Math.round(tca));
    var lk = look(satrec, tcaD, gsGd);
    var range = lk ? lk.range : null;
    return {
      aos: new Date(Math.round(aos)), tca: tcaD, los: new Date(Math.round(los)),
      maxElev: maxElev, az: lk ? lk.az : null,
      rangeKm: range, rfDelayMs: range ? range / C_KM_S * 1000 : null,
      durationSec: (los - aos) / 1000,
      sub: subPoint(satrec, tcaD)
    };
  }


  /* ---------------------------------------------------------------------- */
  /*  Live state & next contact                                              */
  /* ---------------------------------------------------------------------- */
  /** Current satellite state and its geometry seen from a station. */
  function liveState(satrec, date, station) {
    var pv = satellite.propagate(satrec, date);
    if (!pv || !pv.position || typeof pv.position === 'boolean') return null;
    var gmst = satellite.gstime(date);
    var gd = satellite.eciToGeodetic(pv.position, gmst);
    var v = pv.velocity;
    var obs = observer(station);
    var la = satellite.ecfToLookAngles(obs, satellite.eciToEcf(pv.position, gmst));
    return {
      time: date,
      lat: satellite.degreesLat(gd.latitude), lon: satellite.degreesLong(gd.longitude), alt: gd.height,
      speed: Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
      elev: la.elevation * R2D, az: la.azimuth * R2D, range: la.rangeSat
    };
  }

  /**
   * Current or next contact with the station above minElev.
   * Returns { inPass, aos, tca, los, maxElev } or null if none within `hours`.
   */
  function nextContact(satrec, from, station, minElev, hours) {
    var obs = observer(station), t0 = from.getTime(), step = 30000, tEnd = t0 + (hours || 48) * 3600000;
    var f = function (t) { var r = look(satrec, new Date(t), obs); return r ? r.elev : -90; };
    var t = t0, aos;
    var inPass = f(t0) >= minElev;
    if (inPass) {
      var b = t0; while (f(b - step) >= minElev && t0 - b < 3600000) b -= step;
      aos = refineCross(f, minElev, b - step, b, 200);
    } else {
      while (t <= tEnd && f(t) < minElev) t += step;
      if (t > tEnd) return null;
      aos = refineCross(f, minElev, t - step, t, 200);
    }
    var u0 = inPass ? t0 : t, u = u0;
    while (f(u) >= minElev && u - u0 < 3600000) u += step;
    var los = refineCross(f, minElev, u - step, u, 200);
    var pk = refineMax(f, aos, los, 100);
    return { inPass: inPass, aos: new Date(Math.round(aos)), tca: new Date(Math.round(pk.t)), los: new Date(Math.round(los)), maxElev: pk.v };
  }

  /** Ground track samples between t0 and t1 (Date), split at the antimeridian. */
  function groundTrack(satrec, t0, t1, stepSec) {
    var segs = [], cur = [], prevLon = null;
    for (var t = t0.getTime(); t <= t1.getTime(); t += (stepSec || 30) * 1000) {
      var sp = subPoint(satrec, new Date(t));
      if (!sp) continue;
      if (prevLon !== null && Math.abs(sp.lon - prevLon) > 180) { if (cur.length > 1) segs.push(cur); cur = []; }
      cur.push([sp.lat, sp.lon]); prevLon = sp.lon;
    }
    if (cur.length > 1) segs.push(cur);
    return segs;
  }

  function orbitalPeriodMin(satrec) { return 2 * Math.PI / satrec.no; } // satrec.no in rad/min

  /* ---------------------------------------------------------------------- */
  /*  Coordinate text parsing                                                */
  /* ---------------------------------------------------------------------- */
  function parseCoords(s) {
    s = String(s || '').trim();
    var num = '(-?\\d+(?:\\.\\d+)?)';
    var pats = [
      new RegExp('^' + num + '\\s*[,\\s]\\s*' + num + '$'),
      new RegExp('!3d' + num + '!4d' + num),                 // Google Maps place data (most precise)
      new RegExp('@' + num + ',' + num),
      new RegExp('[?&](?:q|ll|query|center|destination)=' + num + '(?:,|%2C)\\s*' + num)
    ];
    for (var i = 0; i < pats.length; i++) {
      var m = s.match(pats[i]);
      if (m) {
        var lat = +m[1], lon = +m[2];
        if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat: lat, lon: lon };
      }
    }
    return null;
  }

  /* ---------------------------------------------------------------------- */
  /*  Formatting                                                             */
  /* ---------------------------------------------------------------------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmtHMS(sec) {
    if (sec == null || isNaN(sec)) return '--:--:--';
    var neg = sec < 0, a = Math.abs(Math.round(sec));
    var h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), s = a % 60;
    return (neg ? '-' : '') + pad(h) + ':' + pad(m) + ':' + pad(s);
  }
  function fmtUTC(d) { return d.toISOString().replace('T', ' ').slice(0, 19); }
  function fmtICT(d) { return new Date(d.getTime() + 7 * 3600000).toISOString().replace('T', ' ').slice(0, 19); }

  return {
    STATIONS: STATIONS, TARGETS: TARGETS,
    parseTLE: parseTLE, tleChecksum: tleChecksum, tleEpoch: tleEpoch, makeSatrec: makeSatrec,
    observer: observer, look: look, subPoint: subPoint, haversine: haversine, visibilityRadius: visibilityRadius,
    sunElevation: sunElevation, sunSubpoint: sunSubpoint, liveState: liveState, nextContact: nextContact, plan: plan, groundTrack: groundTrack, orbitalPeriodMin: orbitalPeriodMin,
    parseCoords: parseCoords, fmtHMS: fmtHMS, fmtUTC: fmtUTC, fmtICT: fmtICT, C_KM_S: C_KM_S
  };
});
