
/* ═══════════════════════════════════════════════════════
   STARS BACKGROUND
══════════════════════════════════════════════════════ */
(function(){
  const cv = document.getElementById('stars-canvas');
  const ctx = cv.getContext('2d');
  const stars = [];
  function resize(){cv.width=window.innerWidth;cv.height=window.innerHeight;}
  function init(){
    resize();stars.length=0;
    for(let i=0;i<200;i++){
      stars.push({x:Math.random()*cv.width,y:Math.random()*cv.height,
        r:Math.random()*1.1+0.2,a:Math.random(),da:Math.random()*0.004+0.001});
    }
  }
  function draw(){
    ctx.clearRect(0,0,cv.width,cv.height);
    stars.forEach(s=>{
      s.a+=s.da;if(s.a>1||s.a<0)s.da*=-1;
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(200,220,255,${s.a*0.6})`;ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize',init);
  init();draw();
})();

/* ═══════════════════════════════════════════════════════
   PRESETS
══════════════════════════════════════════════════════ */
const GS = {
  kmutnb: {lat:13.824017540980227,lon:100.5126084380669,name:'KMUTNB TECHNO PARK, Bangkok'},
};
const TGT = {
  paris:   {lat:46.6034, lon:1.8883,    name:'France (Center)'},
};

/* ═══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
const S = {
  uplink:{lat:13.824017540980227,lon:100.5126084380669,name:'KMUTNB TECHNO PARK'},
  target:{lat:46.6034,  lon:1.8883,    name:'France (Center)'},
  uplinkMode:'kmutnb',
  targetMode:'paris',
  map:null,
  mUplink:null,mTarget:null,mSat:null,
  layers:[],
  busy:false,
  suggestedTime:null,
  lastResult:null,
  countdownTimer:null,
  allCandidates:[],
  currentSatrec:null,
  currentCfgGsElev:20,
  selectedIdx:0,
};

/* ═══════════════════════════════════════════════════════
   MAP
══════════════════════════════════════════════════════ */
function initMap(){
  S.map = L.map('map',{zoomControl:false,worldCopyJump:true}).setView([30,50],3);
  L.control.zoom({position:'topright'}).addTo(S.map);

  // Satellite base + labels overlay
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{
    attribution:'Tiles &copy; Esri',maxZoom:18
  }).addTo(S.map);

  // Labels on top
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{
    attribution:'',maxZoom:18,opacity:0.5
  }).addTo(S.map);

  S.mUplink = makeMarker(S.uplink,'#3b82f6','📡').addTo(S.map);
  S.mTarget = makeMarker(S.target,'#ef4444','🎯').addTo(S.map);

  // Drag
  S.mUplink.on('dragend',e=>{
    if(S.uplinkMode==='custom'){const p=e.target.getLatLng();setLoc('uplink',p.lat,p.lng,true);}
  });
  S.mTarget.on('dragend',e=>{
    if(S.targetMode==='custom'){const p=e.target.getLatLng();setLoc('target',p.lat,p.lng,true);}
  });

  // Map click
  S.map.on('click',e=>{
    if(S.uplinkMode==='custom') setLoc('uplink',e.latlng.lat,e.latlng.lng);
    else if(S.targetMode==='custom') setLoc('target',e.latlng.lat,e.latlng.lng);
  });

  fitBounds();
}

function makeMarker(loc,color,emoji){
  const ico = L.divIcon({
    className:'',
    html:`<div style="
      width:20px;height:20px;border-radius:50%;
      background:${color};border:2.5px solid rgba(255,255,255,0.9);
      box-shadow:0 0 14px ${color},0 2px 6px rgba(0,0,0,0.5);
      display:flex;align-items:center;justify-content:center;
      font-size:9px;color:#fff;font-weight:700;
    "></div>`,
    iconSize:[20,20],iconAnchor:[10,10]
  });
  return L.marker([loc.lat,loc.lon],{icon:ico,draggable:false,zIndexOffset:100})
    .bindPopup(popup(loc.name||'',loc.lat,loc.lon));
}

function makeSatMarker(lat,lon,alt,dist,elev,timeStr){
  const ico = L.divIcon({
    className:'',
    html:`<div style="font-size:24px;filter:drop-shadow(0 0 6px rgba(245,158,11,0.9));line-height:1;">🛰️</div>`,
    iconSize:[24,24],iconAnchor:[12,12]
  });
  return L.marker([lat,lon],{icon:ico,zIndexOffset:200})
    .bindPopup(`<b>🛰️ Satellite at ToT</b><br>
      Altitude: <b>${alt.toFixed(1)} km</b><br>
      Dist → Target: <b>${dist.toFixed(1)} km</b><br>
      Elevation: <b>${elev.toFixed(1)}°</b><br>
      Time (UTC): <b>${timeStr}</b>`);
}

function popup(name,lat,lon){
  return `<b>${name}</b><br>
    <span style="font-family:'JetBrains Mono',monospace;font-size:0.78em;color:#94a3b8">
    ${lat.toFixed(5)}, ${lon.toFixed(5)}</span>`;
}

function fitBounds(){
  if(!S.map||!S.mUplink||!S.mTarget)return;
  S.map.fitBounds(L.featureGroup([S.mUplink,S.mTarget]).getBounds(),{padding:[70,70]});
}

function clearLayers(){
  S.layers.forEach(l=>S.map.removeLayer(l));
  S.layers=[];
  if(S.mSat){S.map.removeLayer(S.mSat);S.mSat=null;}
}

/* ═══════════════════════════════════════════════════════
   LOCATION LOGIC
══════════════════════════════════════════════════════ */
function setLoc(type,lat,lon,fromDrag=false){
  S[type].lat=+lat; S[type].lon=+lon;
  const m = type==='uplink'?S.mUplink:S.mTarget;
  if(m&&!fromDrag) m.setLatLng([lat,lon]);
  if(m) m.setPopupContent(popup(S[type].name||'Custom',lat,lon));
  if(type==='uplink'){setVal('uplink-lat',lat.toFixed(4));setVal('uplink-lon',lon.toFixed(4));}
  else               {setVal('target-lat',lat.toFixed(4));setVal('target-lon',lon.toFixed(4));}
}

/* ═══════════════════════════════════════════════════════
   COORD PARSING
══════════════════════════════════════════════════════ */
function parseCoords(s){
  let m;
  m=s.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
  if(m)return{lat:+m[1],lon:+m[2]};
  m=s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if(m)return{lat:+m[1],lon:+m[2]};
  m=s.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if(m)return{lat:+m[1],lon:+m[2]};
  return null;
}



/* ═══════════════════════════════════════════════════════
   MATH
══════════════════════════════════════════════════════ */
const D2R=Math.PI/180, R2D=180/Math.PI;
function hav(la1,lo1,la2,lo2){
  const R=6371,dlat=(la2-la1)*D2R,dlon=(lo2-lo1)*D2R;
  const a=Math.sin(dlat/2)**2+Math.cos(la1*D2R)*Math.cos(la2*D2R)*Math.sin(dlon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmtSec(t){
  const neg=t<0,abs=Math.abs(Math.round(t));
  const h=Math.floor(abs/3600),m=Math.floor((abs%3600)/60),s=abs%60;
  return (neg?'-':'')+(h+'').padStart(2,'0')+':'+(m+'').padStart(2,'0')+':'+(s+'').padStart(2,'0');
}
function fmtUTC(d){return d.toISOString().replace('T',' ').slice(0,19)+' UTC';}
function fmtICT(d){
  const i=new Date(d.getTime()+7*3600000);
  return i.toISOString().replace('T',' ').slice(0,19)+' ICT';
}
function elevAngle(oLa,oLo,sLa,sLo,sAlt){
  const Re=6371;
  const cos=Math.cos(oLa*D2R)*Math.cos(sLa*D2R)*Math.cos((sLo-oLo)*D2R)+Math.sin(oLa*D2R)*Math.sin(sLa*D2R);
  const el=Math.acos(Math.max(-1,Math.min(1,cos)));
  const slant=Math.sqrt(Re*Re+(Re+sAlt)*(Re+sAlt)-2*Re*(Re+sAlt)*Math.cos(el));
  return Math.asin(Math.max(-1,Math.min(1,(Math.cos(el)*(Re+sAlt)-Re)/slant)))*R2D;
}

/* ═══════════════════════════════════════════════════════
   MISSION PLANNING SEARCH
══════════════════════════════════════════════════════ */
function getSunElevation(date, lat, lon) {
  const jd = (date.getTime() / 86400000.0) + 2440587.5;
  const n = jd - 2451545.0; // days since J2000
  const L = (280.460 + 0.9856474 * n) % 360; 
  let g = (357.528 + 0.9856003 * n) % 360; 
  if(g < 0) g += 360;
  const eclipticLon = L + 1.915 * Math.sin(g * Math.PI/180) + 0.020 * Math.sin(2 * g * Math.PI/180);
  const obliquity = 23.439 - 0.0000004 * n; 
  const declination = Math.asin(Math.sin(obliquity * Math.PI/180) * Math.sin(eclipticLon * Math.PI/180)) * 180/Math.PI;
  const ra = Math.atan2(Math.cos(obliquity * Math.PI/180) * Math.sin(eclipticLon * Math.PI/180), Math.cos(eclipticLon * Math.PI/180)) * 180/Math.PI;
  const T = n / 36525.0;
  let GMST = 280.46061837 + 360.98564736629 * n + 0.000387933 * T * T - T * T * T / 38710000.0;
  GMST = GMST % 360;
  if(GMST < 0) GMST += 360;
  const LST = (GMST + lon) % 360;
  let H = (LST - ra);
  if(H < -180) H += 360;
  if(H > 180) H -= 360;
  const latRad = lat * Math.PI/180;
  const decRad = declination * Math.PI/180;
  const hRad = H * Math.PI/180;
  const sinElev = Math.sin(latRad)*Math.sin(decRad) + Math.cos(latRad)*Math.cos(decRad)*Math.cos(hRad);
  return Math.asin(sinElev) * 180/Math.PI;
}

async function findAllTargetPassesAsync(satrec, startRef, lat, lon, maxDays, minSatElev, minSunElev, maxSunElev, onProgress) {
  const maxMins = maxDays * 24 * 60;
  const candidates = [];
  let prevElev = -100, prevPrevElev = -100;
  const CHUNK = 2000;

  for (let start = 0; start <= maxMins; start += CHUNK) {
    const end = Math.min(start + CHUNK, maxMins + 1);

    for (let dt = start; dt < end; dt++) {
      const time = new Date(startRef.getTime() + dt * 60000);
      const pv = satellite.propagate(satrec, time);
      if (!pv?.position) { prevPrevElev = prevElev; prevElev = -100; continue; }
      const gd = satellite.eciToGeodetic(pv.position, satellite.gstime(time));
      const elev = elevAngle(lat, lon, satellite.degreesLat(gd.latitude), satellite.degreesLong(gd.longitude), gd.height);

      if (prevElev > prevPrevElev && prevElev > elev) {
        if (prevElev > minSatElev - 10) {
          const coarseTime = new Date(startRef.getTime() + (dt - 1) * 60000);
          let maxRefinedElev = -100, refinedTime = null, refinedGd = null;
          for (let s = -60; s <= 60; s += 2) {
            const rt = new Date(coarseTime.getTime() + s * 1000);
            const rpv = satellite.propagate(satrec, rt);
            if (!rpv?.position) continue;
            const rgd = satellite.eciToGeodetic(rpv.position, satellite.gstime(rt));
            const relev = elevAngle(lat, lon, satellite.degreesLat(rgd.latitude), satellite.degreesLong(rgd.longitude), rgd.height);
            if (relev > maxRefinedElev) { maxRefinedElev = relev; refinedTime = rt; refinedGd = rgd; }
          }

          if (maxRefinedElev >= minSatElev) {
            const sunElev = getSunElevation(refinedTime, lat, lon);
            if (sunElev >= minSunElev && sunElev <= maxSunElev) {
              const rd = hav(satellite.degreesLat(refinedGd.latitude), satellite.degreesLong(refinedGd.longitude), lat, lon);
              candidates.push({ time: refinedTime, dist: rd, gd: refinedGd, satElev: maxRefinedElev, sunElev: sunElev });
            }
          }
        }
      }
      prevPrevElev = prevElev; prevElev = elev;
    }

    await new Promise(r => setTimeout(r, 0));
    if (onProgress) onProgress(Math.min(end / maxMins, 1));
  }

  return candidates;
}

function findUplinkPass(satrec, targetTime, lat, lon, minGsElev, searchDays) {
  searchDays = searchDays || 30;
  const maxMins = searchDays * 24 * 60;
  let inPass = false, maxElev = -Infinity, bestPassTime = null;

  for (let dt = 0; dt >= -maxMins; dt--) {
    const time = new Date(targetTime.getTime() + dt * 60000);
    const pv = satellite.propagate(satrec, time);
    if (!pv?.position) continue;
    const gd = satellite.eciToGeodetic(pv.position, satellite.gstime(time));
    const relev = elevAngle(lat, lon, satellite.degreesLat(gd.latitude), satellite.degreesLong(gd.longitude), gd.height);

    if (relev > minGsElev) {
      if (!inPass) { inPass = true; maxElev = relev; bestPassTime = time; }
      else { if (relev > maxElev) { maxElev = relev; bestPassTime = time; } }
    } else {
      if (inPass) {
        let refinedMaxElev = -Infinity, refinedTime = null;
        for (let s = -60; s <= 60; s++) {
          const rt = new Date(bestPassTime.getTime() + s * 1000);
          const rpv = satellite.propagate(satrec, rt);
          if (!rpv?.position) continue;
          const rgd = satellite.eciToGeodetic(rpv.position, satellite.gstime(rt));
          const el = elevAngle(lat, lon, satellite.degreesLat(rgd.latitude), satellite.degreesLong(rgd.longitude), rgd.height);
          if (el > refinedMaxElev) { refinedMaxElev = el; refinedTime = rt; }
        }
        if (refinedMaxElev >= minGsElev) return { time: refinedTime, elev: refinedMaxElev };
        inPass = false; maxElev = -Infinity; bestPassTime = null;
      }
    }
  }
  return null;
}

function calcRfDelay(satrec, time, stationLat, stationLon) {
  const pv = satellite.propagate(satrec, time);
  if (!pv?.position) return null;
  const gmst = satellite.gstime(time);
  const gd = satellite.eciToGeodetic(pv.position, gmst);
  const satLat = satellite.degreesLat(gd.latitude);
  const satLon = satellite.degreesLong(gd.longitude);
  const satAlt = gd.height;
  const Re = 6371;
  const toXYZ = (la, lo, r) => ({
    x: r * Math.cos(la * D2R) * Math.cos(lo * D2R),
    y: r * Math.cos(la * D2R) * Math.sin(lo * D2R),
    z: r * Math.sin(la * D2R)
  });
  const sta = toXYZ(stationLat, stationLon, Re);
  const sat = toXYZ(satLat, satLon, Re + satAlt);
  const dist = Math.sqrt((sat.x - sta.x) ** 2 + (sat.y - sta.y) ** 2 + (sat.z - sta.z) ** 2);
  const c = 299792.458;
  return { distKm: dist, delayMs: (dist / c) * 1000, delaySec: dist / c };
}

function groundTrack(satrec,ref,refUplink){
  const pts=[];
  for(let t=-140*60;t<=140*60;t+=30){
    const time=new Date(ref.getTime()+t*1000);
    const pv=satellite.propagate(satrec,time);
    if(!pv?.position)continue;
    const gd=satellite.eciToGeodetic(pv.position,satellite.gstime(time));
    pts.push({lat:satellite.degreesLat(gd.latitude),lon:satellite.degreesLong(gd.longitude),after:time>=refUplink});
  }
  return pts;
}

function toSegs(pts){
  const segs=[];let cur=[];
  pts.forEach((p,i)=>{
    if(i>0&&Math.abs(p.lon-pts[i-1].lon)>180){segs.push(cur);cur=[];}
    cur.push([p.lat,p.lon]);
  });
  if(cur.length)segs.push(cur);
  return segs;
}

/* ═══════════════════════════════════════════════════════
   CALCULATE
══════════════════════════════════════════════════════ */
async function calculate(){
  if(S.busy)return;
  hideWarn();
  stopCountdown();

  const tleRaw=$('tle-input').value.trim();
  if(!tleRaw){setStatus('กรุณาใส่ TLE','err');return;}

  const lines=tleRaw.split('\n').map(l=>l.trim()).filter(Boolean);
  let l1='',l2='';
  for(let i=0;i<lines.length;i++){
    if(lines[i].startsWith('1 ')&&lines[i+1]?.startsWith('2 ')){l1=lines[i];l2=lines[i+1];break;}
  }
  if(!l1||!l2){setStatus('TLE ไม่ถูกต้อง','err');return;}

  setBusy(true);
  showProgress(0);

  const cfgDays = parseFloat($('cfg-search-days').value) || 20;
  const cfgSatElev = parseFloat($('cfg-sat-elev').value) || 70;
  const cfgSunMin = parseFloat($('cfg-sun-min').value) || 20;
  const cfgSunMax = parseFloat($('cfg-sun-max').value) || 90;
  const cfgGsElev = parseFloat($('cfg-gs-elev').value) || 20;

  setStatus(`🔍 ค้นหารอบถ่ายภาพ (${cfgDays} วัน, เงย ≥${cfgSatElev}°, แดด ${cfgSunMin}°-${cfgSunMax}°)...`,'info');

  try{
    const satrec=satellite.twoline2satrec(l1,l2);
    const now = new Date();

    const candidates = await findAllTargetPassesAsync(
      satrec, now, S.target.lat, S.target.lon,
      cfgDays, cfgSatElev, cfgSunMin, cfgSunMax,
      (progress) => {
        showProgress(progress * 100);
        setStatus(`🔍 ค้นหารอบถ่ายภาพ... ${Math.round(progress * 100)}%`,'info');
      }
    );

    if(candidates.length === 0){
      hideProgress();
      setBusy(false);
      setStatus(`❌ ไม่พบรอบผ่านเป้าหมายที่ผ่านเงื่อนไขใน ${cfgDays} วัน`,'err');
      showWarn(`ไม่พบรอบที่ดาวเทียมมีมุมเงย ≥ ${cfgSatElev}° และแดด ${cfgSunMin}°-${cfgSunMax}° — ลองลดมุมเงยขั้นต่ำหรือขยายจำนวนวัน`);
      return;
    }

    S.allCandidates = candidates;
    S.currentSatrec = satrec;
    S.currentCfgGsElev = cfgGsElev;

    renderPhotoTable(candidates);
    showProgress(95);
    setStatus(`📡 พบ ${candidates.length} รอบ — กำลังหาเวลาอัปลิงก์...`,'info');

    await new Promise(r => setTimeout(r, 30));

    displayResult(satrec, candidates, 0, cfgGsElev);

    hideProgress();
    setBusy(false);

  }catch(e){
    console.error(e);
    hideProgress();
    setBusy(false);
    setStatus(`❌ ${e.message}`,'err');
  }
}

function displayResult(satrec, candidates, idx, cfgGsElev){
  const candidate = candidates[idx];
  S.selectedIdx = idx;

  document.querySelectorAll('.photo-table tbody tr').forEach((tr, i) => {
    tr.classList.toggle('selected', i === idx);
  });

  setStatus('📡 ค้นหารอบผ่านสถานีส่งคำสั่ง...','info');
  const uplinkRes = findUplinkPass(satrec, candidate.time, S.uplink.lat, S.uplink.lon, cfgGsElev);

  if(!uplinkRes){
    showWarn('ไม่พบรอบผ่านสถานีส่งคำสั่งก่อนเวลาเป้าหมายนี้');
    setStatus('⚠️ ไม่พบ uplink pass','warn');
    return;
  }

  const delay = (candidate.time.getTime() - uplinkRes.time.getTime()) / 1000;

  const sLat = satellite.degreesLat(candidate.gd.latitude);
  const sLon = satellite.degreesLong(candidate.gd.longitude);
  const sAlt = candidate.gd.height;

  const rf = calcRfDelay(satrec, uplinkRes.time, S.uplink.lat, S.uplink.lon);

  setText('r-uplink-utc', fmtUTC(uplinkRes.time));
  setText('r-uplink-ict', fmtICT(uplinkRes.time));
  setText('r-target-utc', fmtUTC(candidate.time));
  setText('r-target-ict', fmtICT(candidate.time));

  setText('r-sec', Math.round(delay));
  setText('r-hms', fmtSec(delay));

  setText('r-dist', candidate.dist.toFixed(1));
  setText('r-alt', sAlt.toFixed(1));
  setText('r-elev', uplinkRes.elev.toFixed(1));

  setText('r-sun-elev', candidate.sunElev.toFixed(1));
  setText('r-sat-elev-target', candidate.satElev.toFixed(1));

  if(rf){
    setText('r-rf-delay', rf.delayMs.toFixed(2));
    $('r-rf-dist').textContent = `ระยะ ${rf.distKm.toFixed(1)} km (ทางเดียว)`;
  }

  $('copy-btn').style.opacity='1';

  const rDiv=$('results');
  rDiv.classList.remove('result-ready');
  void rDiv.offsetWidth;
  rDiv.classList.add('result-ready');

  const camRadius = parseFloat($('cfg-cam-radius')?.value) || 100;
  if($('leg-cam-radius')) $('leg-cam-radius').textContent = camRadius;
  if($('leg-cam-radius2')) $('leg-cam-radius2').textContent = camRadius;

  hideWarn();
  if(candidate.dist > camRadius){
    showWarn(`⚠️ เป้าหมายไม่ได้อยู่กึ่งกลางภาพ (ห่าง ${candidate.dist.toFixed(1)} km) แต่เป็นรอบที่ดีที่สุดที่หาได้`);
  }

  clearLayers();
  const track=groundTrack(satrec,candidate.time,candidate.time);
  const pre=track.filter(p=>!p.after),post=track.filter(p=>p.after);

  if(pre.length>1){
    const l=L.polyline(toSegs(pre),{color:'rgba(148,163,184,0.4)',weight:1.5,dashArray:'4,4'});
    S.map.addLayer(l);S.layers.push(l);
  }
  if(post.length>1){
    const l=L.polyline(toSegs(post),{color:'#ef4444',weight:2,opacity:0.8,dashArray:'6,4'});
    S.map.addLayer(l);S.layers.push(l);
  }

  const Re=6371;
  const frComm = parseFloat($('cfg-comm-radius')?.value) || 420;
  if($('leg-comm-radius')) $('leg-comm-radius').textContent = frComm;

  const fcComm = L.circle([sLat,sLon],{
    radius: frComm*1000, color: '#6366f1', fillColor: 'transparent',
    weight: 1.5, dashArray: '5,5', opacity: 0.6
  });
  S.map.addLayer(fcComm); S.layers.push(fcComm);

  const frCam = camRadius;
  const fcCam = L.circle([sLat,sLon],{
    radius: frCam*1000, color: '#10b981', fillColor: '#10b981',
    fillOpacity: 0.15, weight: 2, dashArray: '3,3'
  });
  S.map.addLayer(fcCam); S.layers.push(fcCam);

  const l1l=L.polyline([[S.uplink.lat,S.uplink.lon],[sLat,sLon]],{color:'#3b82f6',weight:1.5,opacity:0.65,dashArray:'3,5'});
  const l2l=L.polyline([[sLat,sLon],[S.target.lat,S.target.lon]],{color:'#ef4444',weight:1.5,opacity:0.65,dashArray:'3,5'});
  S.map.addLayer(l1l);S.map.addLayer(l2l);
  S.layers.push(l1l,l2l);

  S.mSat=makeSatMarker(sLat,sLon,sAlt,candidate.dist,uplinkRes.elev,fmtUTC(candidate.time)).addTo(S.map);

  S.map.fitBounds(
    L.featureGroup([S.mUplink,S.mTarget,S.mSat]).getBounds(),
    {padding:[60,60]}
  );

  startCountdown(uplinkRes.time, candidate.time);

  setStatus(`✅ สำเร็จ! แสดงรอบที่ ${idx + 1}/${candidates.length}`,'ok');
}

/* ═══════════════════════════════════════════════════════
   UI HELPERS
══════════════════════════════════════════════════════ */
const $=id=>document.getElementById(id);
const setText=(id,v)=>$(id).textContent=v;
const setVal=(id,v)=>{if($(id))$(id).value=v;};

function setBusy(on){
  S.busy=on;
  $('calc-btn').disabled=on;
  $('btn-label').classList.toggle('hide',on);
  $('btn-spin').classList.toggle('hide',!on);
}

function setStatus(msg,type='info'){
  setText('status-text',msg);
  const d=$('status-dot');
  const colors={ok:'#10b981',err:'#ef4444',warn:'#f59e0b',info:'#3b82f6'};
  d.style.background=colors[type]||colors.info;
  d.style.boxShadow=`0 0 8px ${d.style.background}`;
}

function showWarn(msg, showSuggest=false){
  const b=$('warn-bar');
  b.querySelector('#warn-text').textContent=msg;
  b.classList.add('show');
  const sbtn=$('suggest-btn');
  if(showSuggest) sbtn.classList.remove('hide');
  else            sbtn.classList.add('hide');
}
function hideWarn(){
  $('warn-bar').classList.remove('show');
  $('suggest-btn').classList.add('hide');
}
// --- Update ICT Preview ---
function copyDelay(){
  const sec=$('r-sec').textContent,hms=$('r-hms').textContent;
  if(sec==='--')return;
  navigator.clipboard.writeText(`${sec} วินาที (${hms})`).then(()=>{
    const btn=$('copy-btn');
    const orig=btn.innerHTML;
    btn.innerHTML=`<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    setTimeout(()=>btn.innerHTML=orig,1500);
  });
}

/* ═══════════════════════════════════════════════════════
   NEW HELPER FUNCTIONS
══════════════════════════════════════════════════════ */
function showProgress(pct){
  const overlay=$('progress-overlay');
  if(overlay){
    overlay.classList.add('show');
    $('progress-fill').style.width = Math.round(pct)+'%';
    $('progress-text').textContent = `กำลังค้นหารอบถ่ายภาพ... ${Math.round(pct)}%`;
  }
}
function hideProgress(){
  const o=$('progress-overlay');
  if(o) o.classList.remove('show');
}

function renderPhotoTable(candidates){
  const wrap=$('photo-table-wrap');
  const tbody=$('photo-tbody');
  const count=$('photo-count');
  count.textContent=candidates.length;
  tbody.innerHTML='';

  candidates.forEach((c,i)=>{
    const tr=document.createElement('tr');
    if(i===0) tr.classList.add('selected');
    const ict=fmtICT(c.time);
    const utc=fmtUTC(c.time);
    const camRadius = parseFloat($('cfg-cam-radius')?.value) || 100;
    const badge = c.dist<=camRadius
      ? '<span class="badge badge-ok">✅ ดี</span>'
      : '<span class="badge badge-warn">⚠️ ไกล</span>';
    tr.innerHTML=`
      <td>${i+1}</td>
      <td>${utc}</td>
      <td>${ict}</td>
      <td>${c.satElev.toFixed(1)}°</td>
      <td>${c.sunElev.toFixed(1)}°</td>
      <td>${c.dist.toFixed(1)} km</td>
      <td>${badge}</td>
    `;
    tr.addEventListener('click',()=>selectCandidate(i));
    tbody.appendChild(tr);
  });

  wrap.classList.add('show');
}

function selectCandidate(idx){
  if(!S.currentSatrec||!S.allCandidates.length)return;
  displayResult(S.currentSatrec, S.allCandidates, idx, S.currentCfgGsElev);
}

function formatCountdown(ms){
  if(ms<=0) return 'ผ่านไปแล้ว';
  const totalSec=Math.floor(ms/1000);
  const d=Math.floor(totalSec/86400);
  const h=Math.floor((totalSec%86400)/3600);
  const m=Math.floor((totalSec%3600)/60);
  const s=totalSec%60;
  const pad=x=>String(x).padStart(2,'0');
  if(d>0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function startCountdown(uplinkTime, targetTime){
  stopCountdown();
  const bar=$('countdown-bar');
  if(bar) bar.classList.add('show');

  function update(){
    const now=Date.now();
    const uplinkMs=uplinkTime.getTime()-now;
    const targetMs=targetTime.getTime()-now;

    const cdU=$('cd-uplink');
    if(cdU){
      cdU.textContent=formatCountdown(uplinkMs);
      cdU.className='cd-value'+(uplinkMs<=0?' past':uplinkMs<3600000?' urgent':'');
    }
    const cdT=$('cd-target');
    if(cdT){
      cdT.textContent=formatCountdown(targetMs);
      cdT.className='cd-value'+(targetMs<=0?' past':targetMs<3600000?' urgent':'');
    }
  }

  update();
  S.countdownTimer=setInterval(update,1000);
}

function stopCountdown(){
  if(S.countdownTimer){
    clearInterval(S.countdownTimer);
    S.countdownTimer=null;
  }
  const bar=$('countdown-bar');
  if(bar) bar.classList.remove('show');
}

/* ═══════════════════════════════════════════════════════
   INIT & EVENTS
══════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  // Theme Toggle
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  function updateThemeIcon() {
    if(document.documentElement.getAttribute('data-theme') === 'dark') {
      themeIcon.textContent = '☀️';
    } else {
      themeIcon.textContent = '🌙';
    }
  }
  updateThemeIcon();
  if(themeToggle) {
    themeToggle.addEventListener('click', () => {
      let current = document.documentElement.getAttribute('data-theme');
      let target = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', target);
      localStorage.setItem('theme', target);
      updateThemeIcon();
    });
  }

  try {
    initMap();
  } catch(e) {
    console.error("Map init failed", e);
    setStatus('⚠️ แผนที่โหลดไม่สำเร็จ (เครือข่ายอาจบล็อก) แต่ยังคำนวณได้', 'warn');
  }

  // Uplink select
  $('sel-uplink').addEventListener('change',e=>{
    S.uplinkMode=e.target.value;
    const box=$('uplink-custom');
    if(GS[S.uplinkMode]){
      const g=GS[S.uplinkMode];
      S.uplink={...g};setLoc('uplink',g.lat,g.lon);
      S.mUplink.dragging.disable();
      box.classList.add('hide');
      setStatus(`สถานี: ${g.name}`,'info');
    }else{
      box.classList.remove('hide');
      S.mUplink.dragging.enable();
      setStatus('คลิกบนแผนที่ หรือพิมพ์พิกัด Uplink','info');
    }
    fitBounds();
  });

  // Target select
  $('sel-target').addEventListener('change',e=>{
    S.targetMode=e.target.value;
    const box=$('target-custom');
    if(TGT[S.targetMode]){
      const t=TGT[S.targetMode];
      S.target={...t};setLoc('target',t.lat,t.lon);
      S.mTarget.dragging.disable();
      box.classList.add('hide');
      setStatus(`เป้าหมาย: ${t.name}`,'info');
    }else{
      box.classList.remove('hide');
      S.mTarget.dragging.enable();
      setStatus('คลิกบนแผนที่ หรือพิมพ์พิกัด Target','info');
    }
    fitBounds();
  });

  // Manual lat/lon inputs
  [{id:'uplink-lat',t:'uplink',f:'lat'},{id:'uplink-lon',t:'uplink',f:'lon'},
   {id:'target-lat',t:'target',f:'lat'},{id:'target-lon',t:'target',f:'lon'}]
  .forEach(({id,t,f})=>{
    $(id)?.addEventListener('change',e=>{
      const v=parseFloat(e.target.value);
      if(isNaN(v))return;
      if(f==='lat') setLoc(t,v,S[t].lon);
      else          setLoc(t,S[t].lat,v);
    });
  });

  // Link inputs
  [{id:'uplink-link',t:'uplink'},{id:'target-link',t:'target'}].forEach(({id,t})=>{
    $(id)?.addEventListener('input',e=>{
      const raw=e.target.value.trim();
      if(!raw)return;
      const c=parseCoords(raw);
      if(c){
        setLoc(t,c.lat,c.lon);
        setStatus(`📍 ${t} ตั้งพิกัด: ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`,'ok');
        e.target.value='';
      }else if(raw.includes('goo.gl')||raw.includes('maps.app')){
        alert('ลิงก์สั้น — กรุณาเปิดในเบราว์เซอร์แล้วคัดลอก URL เต็มที่มี @lat,lon');
        e.target.value='';
      }else if(raw.startsWith('http')){
        alert('ไม่พบพิกัดใน URL นี้ ต้องมี @lat,lon หรือ ?q=lat,lon');
        e.target.value='';
      }
    });
  });

  $('calc-btn').addEventListener('click',()=>{
    calculate().catch(err=>{
      console.error(err);
      setStatus('❌ '+err.message,'err');
      setBusy(false);
      hideProgress();
    });
  });
  $('copy-btn').addEventListener('click',copyDelay);

  // Live clock
  setInterval(()=>{
    const d = new Date();
    const pad = x => String(x).padStart(2,'0');
    if($('live-clock')) {
      $('live-clock').textContent =
        `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  }, 1000);
});

function scrollToSection(cls){
  const el = document.querySelector('.' + cls) || document.getElementById(cls);
  if(el){
    el.scrollIntoView({behavior:'smooth'});
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(cls));
    });
  }
}
