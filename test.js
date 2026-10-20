/* Unit tests for core.js — run:  npm install && npm test
   Reference values were cross-checked with Skyfield (SGP4) + Astropy (Sun):
   pass times agree within 0.15 s, elevations within 0.01°, Sun within 0.01°. */
const assert = require('assert');
const C = require('./core.js');

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + e.message); }
}
const near = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b} (tol ${tol})`);
const sec = (d, iso) => Math.abs(d.getTime() - Date.parse(iso)) / 1000;

const TLE = `KNACKSAT-2
1 67683U 98067XZ  26243.45609269  .00053825  00000-0  49349-3 0  9993
2 67683  51.6250 273.9102 0007537 104.1040 256.0794 15.67179025 32053`;

(async () => {
  console.log('core.js');

  await t('Paris preset is the Eiffel Tower', () => {
    near(C.TARGETS.paris.lat, 48.85837, 1e-4, 'lat');
    near(C.TARGETS.paris.lon, 2.294481, 1e-4, 'lon');
  });

  await t('TLE parse, checksum and epoch', () => {
    const p = C.parseTLE(TLE);
    assert.ok(p.ok && p.checksumOk);
    assert.strictEqual(p.catnr, '67683');
    assert.strictEqual(p.epoch.toISOString().slice(0, 19), '2026-08-31T10:56:46');
    assert.strictEqual(C.parseTLE('garbage').ok, false);
    const bad = TLE.replace('9993', '9994');
    assert.strictEqual(C.parseTLE(bad).checksumOk, false);
  });

  await t('Coordinate parsing (text and Google Maps URLs)', () => {
    assert.deepStrictEqual(C.parseCoords('48.8584, 2.2945'), { lat: 48.8584, lon: 2.2945 });
    assert.deepStrictEqual(C.parseCoords('13.8 100.5'), { lat: 13.8, lon: 100.5 });
    assert.deepStrictEqual(C.parseCoords('https://www.google.com/maps/@48.85,2.29,15z'), { lat: 48.85, lon: 2.29 });
    assert.deepStrictEqual(C.parseCoords('https://www.google.com/maps/place/x/@48.8,2.2,17z/data=!3d48.858370!4d2.294481'), { lat: 48.85837, lon: 2.294481 });
    assert.strictEqual(C.parseCoords('95, 10'), null);
    assert.strictEqual(C.parseCoords('http'), null);
  });

  await t('Sun elevation matches Astropy', () => {
    // Astropy apparent altitude, Eiffel Tower, 2026-06-21 11:50 UTC = 64.58°
    near(C.sunElevation(new Date('2026-06-21T11:50:00Z'), 48.85837, 2.294481), 64.58, 0.05, 'summer noon');
    assert.ok(C.sunElevation(new Date('2026-06-21T23:50:00Z'), 48.85837, 2.294481) < -15, 'midnight');
  });

  await t('Visibility radius (400 km alt, 20° min elev) ≈ 873 km', () => {
    near(C.visibilityRadius(400, 20), 872.8, 1, 'radius');
  });

  const rec = C.makeSatrec(C.parseTLE(TLE));
  const res = await C.plan(rec, new Date('2026-09-01T00:00:00Z'), C.STATIONS.kmutnb, C.TARGETS.paris, { days: 30 });

  await t('Pass counts match Skyfield (47 uplink, 14 imaging)', () => {
    assert.strictEqual(res.uplinks.length, 47);
    assert.strictEqual(res.targets.length, 14);
  });

  await t('First uplink pass AOS/TCA/LOS within 1 s of Skyfield', () => {
    const u = res.uplinks[0];
    assert.ok(sec(u.aos, '2026-09-01T12:59:55Z') < 1);
    assert.ok(sec(u.tca, '2026-09-01T13:01:46Z') < 1);
    assert.ok(sec(u.los, '2026-09-01T13:03:37Z') < 1);
    near(u.maxElev, 54.80, 0.05, 'max elevation');
  });

  await t('Imaging pass 2026-09-21 and its command delay', () => {
    const c = res.targets.find(x => x.time.toISOString().startsWith('2026-09-21'));
    assert.ok(c, 'pass exists');
    assert.ok(sec(c.time, '2026-09-21T14:57:14Z') < 1);
    near(c.satElev, 76.00, 0.05, 'sat elevation');
    assert.ok(sec(c.uplink.tca, '2026-09-21T05:34:12Z') < 1);
    near(c.delaySec, 33782, 1, 'delay');
    assert.strictEqual(c.status, 'ok');
  });

  await t('Every uplink is in the future and before its imaging time', () => {
    const start = res.start.getTime();
    res.targets.forEach(c => {
      if (!c.uplink) return;
      assert.ok(c.uplink.tca.getTime() >= start, 'uplink not in the past');
      assert.ok(c.uplink.tca < c.time, 'uplink before imaging');
      assert.ok(c.uplink.aos <= c.uplink.tca && c.uplink.tca <= c.uplink.los, 'AOS ≤ TCA ≤ LOS');
      assert.ok(c.uplink.maxElev >= 20, 'meets min GS elevation');
      near(c.delaySec, (c.time - c.uplink.tca) / 1000, 1e-6, 'delay definition');
    });
  });

  await t('Constraints are respected', () => {
    res.targets.forEach(c => {
      assert.ok(c.satElev >= 50);
      assert.ok(c.sunElev >= 20 && c.sunElev <= 90);
    });
  });


  // ---- live tracking (reference: Skyfield, KNACKSAT-2 TLE epoch 2026-10-19) ----
  const TLE2 = `KNACKSAT-2
1 67683U 98067YA  26292.96894180  .00102897  00000-0  69579-3 0  9992
2 67683  51.6246  20.9907 0009702 327.2749  32.7648 15.74175365 39832`;
  const rec2 = C.makeSatrec(C.parseTLE(TLE2));

  await t('Live position and look angles match Skyfield (< 0.1 km, < 0.01°)', () => {
    const s = C.liveState(rec2, new Date('2026-10-21T00:00:00Z'), C.STATIONS.kmutnb);
    near(s.lat, 51.7137, 0.001, 'lat'); near(s.lon, 72.2381, 0.001, 'lon'); near(s.alt, 355.29, 0.1, 'alt');
    near(s.elev, -18.270, 0.01, 'elevation'); near(s.az, 334.966, 0.01, 'azimuth');
    near(s.speed, 7.70, 0.02, 'speed km/s');
  });

  await t('Next contact AOS/TCA/LOS within 1 s of Skyfield', () => {
    const n = C.nextContact(rec2, new Date('2026-10-21T00:00:00Z'), C.STATIONS.kmutnb, 20, 48);
    assert.ok(!n.inPass);
    assert.ok(sec(n.aos, '2026-10-21T03:19:33Z') < 1);
    assert.ok(sec(n.tca, '2026-10-21T03:21:18Z') < 1);
    assert.ok(sec(n.los, '2026-10-21T03:23:03Z') < 1);
    const mid = C.nextContact(rec2, n.tca, C.STATIONS.kmutnb, 20, 48);
    assert.ok(mid.inPass && sec(mid.aos, '2026-10-21T03:19:33Z') < 1, 'detects an ongoing pass');
  });

  await t('Sub-solar point matches Astropy (< 0.01°)', () => {
    const p = C.sunSubpoint(new Date('2026-10-21T00:00:00Z'));
    near(p.lat, -10.6224, 0.01, 'lat'); near(p.lon, 176.178, 0.01, 'lon');
  });

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
