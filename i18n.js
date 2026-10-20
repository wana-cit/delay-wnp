/* ==========================================================================
   Command Delay Calculator — translations (Thai / English / Simplified Chinese)

   Static text:  <el data-i18n="key">          → textContent
                 data-i18n-title / data-i18n-aria / data-i18n-ph
   Dynamic text: I18N.t('key', { name: value }) → "{name}" placeholders

   To add a language: copy the `en` block, translate the values, add a
   button with data-lang="xx" in index.html.
   ========================================================================== */
(function (root) {
  'use strict';

  var DICT = {
    en: {
      'app.name': 'Command Delay Planner',
      'credit.by': 'Developed by the CDH Team, KNACKSAT Program', 'credit.org': 'INSTED · King Mongkut’s University of Technology North Bangkok',
      'map.stage': 'Orbit view', 'view.globe': 'Live globe', 'view.map': 'Plan map', 'globe.follow': 'Follow satellite',
      'legend.now': 'Satellite now', 'legend.track': 'Ground track (past · next)', 'legend.night': 'Night side', 'legend.nextArc': 'Next contact window',
      'live.title': 'Live', 'live.inContact': 'In contact', 'live.noContact': 'Out of range',
      'live.nextAos': 'Next contact in', 'live.losIn': 'Contact ends in', 'live.none': 'No contact in the next 48 h',
      'live.sgp': 'Enter a valid TLE to track the satellite', 'live.lat': 'Latitude', 'live.lon': 'Longitude',
      'live.alt': 'Altitude', 'live.el': 'Elevation', 'live.az': 'Azimuth', 'live.range': 'Range',
      'theme.toggle': 'Switch day / night display',
      'tab.setup': 'Setup', 'tab.map': 'Map', 'tab.read': 'Readout', 'tab.passes': 'Passes',

      'tle.title': 'Satellite elements (TLE)',
      'tle.fetch': 'Fetch latest TLE',
      'tle.name': 'Name', 'tle.norad': 'NORAD', 'tle.epoch': 'Epoch',
      'tle.ageD': 'Age {v} d', 'tle.ageH': 'Age {v} h',
      'tle.checksum': 'Checksum mismatch',
      'tle.err.lines': 'TLE lines 1 and 2 were not found',
      'tle.err.length': 'Each TLE line must be 69 characters',
      'tle.err.catnr': 'Catalogue numbers on lines 1 and 2 differ',

      'up.title': 'Uplink station',
      'up.kmutnb': 'KMUTNB Techno Park, Bangkok',
      'tg.title': 'Imaging target',
      'tg.paris': 'Eiffel Tower, Paris',
      'loc.custom': 'Custom coordinates',
      'loc.customName': 'Custom point',
      'loc.paste': 'Paste a Google Maps link or “lat, lon”',
      'loc.lat': 'Latitude', 'loc.lon': 'Longitude',
      'loc.mapHint': 'You can also click the map or drag the marker.',

      'cfg.title': 'Constraints',
      'cfg.days': 'Search window', 'cfg.sat': 'Min. elevation at target',
      'cfg.sunmin': 'Sun elevation min.', 'cfg.sunmax': 'Sun elevation max.',
      'cfg.gs': 'Min. elevation for uplink', 'cfg.lead': 'Min. lead time',
      'cfg.cam': 'Camera footprint radius', 'cfg.comm': 'Radio footprint radius',
      'cfg.range': '{f} must be between {a} and {b}',
      'cfg.sunOrder': 'Sun elevation min. cannot exceed max.',
      'unit.days': 'd',

      'calc.run': 'Compute plan', 'calc.running': 'Computing…',
      'calc.shortcut': 'Ctrl / ⌘ + Enter', 'calc.reset': 'Reset to defaults',

      'map.title': 'Ground track', 'map.pass': 'Pass {i} of {n}',
      'pin.label': 'Place marker', 'pin.uplink': 'Station', 'pin.target': 'Target',
      'pin.done.uplink': 'Station moved', 'pin.done.target': 'Target moved',
      'legend.title': 'Legend', 'legend.station': 'Uplink station', 'legend.target': 'Target',
      'legend.upArc': 'Uplink window (AOS–LOS)', 'legend.imgTrack': 'Imaging orbit',
      'legend.comm': 'Radio footprint', 'legend.cam': 'Camera footprint',
      'layer.imagery': 'Satellite imagery', 'layer.dark': 'Dark map', 'layer.light': 'Light map',
      'busy.title': 'Propagating orbit',

      'pop.station': 'Uplink station', 'pop.target': 'Target',
      'pop.sat': 'Satellite at imaging', 'pop.satUp': 'Satellite at uplink TCA',
      'pop.time': 'Time', 'pop.alt': 'Altitude', 'pop.off': 'Offset', 'pop.el': 'Elevation',
      'pop.maxEl': 'Max. elevation', 'pop.range': 'Range',

      'read.title': 'Mission readout',
      'read.emptyT': 'No plan computed yet',
      'read.emptyD': 'Check the settings, then select Compute plan.',
      'read.delay': 'Command delay', 'read.copy': 'Copy', 'read.copyPlan': 'Copy plan summary',
      'read.alt': 'If sent at AOS: {aos} s · at LOS: {los} s',
      'read.noUp': 'No usable uplink pass',

      'ev.title': 'Event timeline', 'ev.event': 'Event',
      'ev.now': 'Now', 'ev.aos': 'Uplink AOS', 'ev.tca': 'Uplink TCA', 'ev.los': 'Uplink LOS', 'ev.img': 'Imaging TCA',
      'ev.passed': 'passed',

      'geo.title': 'Pass geometry',
      'geo.offset': 'Offset from target', 'geo.elT': 'Elevation at target', 'geo.sun': 'Sun elevation',
      'geo.alt': 'Altitude', 'geo.elU': 'Max. elevation (uplink)', 'geo.dur': 'Contact duration',
      'geo.range': 'Slant range at TCA', 'geo.rf': 'One-way RF delay',

      'note.noUp': 'No uplink pass falls between now and this imaging time. Choose a later pass.',
      'note.far': 'Ground point is {d} km from the target, outside the {r} km camera footprint.',
      'note.tleOld': 'TLE is {d} days old. Times may be off by minutes; fetch a new TLE before commanding.',
      'note.tleAging': 'TLE is {d} days old. Refresh it before sending commands.',

      'st.ok': 'Nominal', 'st.far': 'Off target', 'st.noUp': 'No uplink',

      'empty.none': 'No pass meets the constraints',
      'empty.sun': '{n} passes reach the elevation limit, but the Sun at the target is too low (best {best}°, limit ≥ {min}°).',
      'empty.sunRange': '{n} passes reach the elevation limit, but the Sun elevation is outside the set range.',
      'empty.elev': 'The satellite does not reach {el}° above the target within {days} days. Lower the elevation limit or widen the search.',
      'empty.retry': 'Retry with Sun ≥ {v}°',

      'ps.title': 'Imaging opportunities', 'ps.onlyOk': 'Usable only',
      'ps.img': 'Imaging (ICT)', 'ps.el': 'El.', 'ps.sun': 'Sun', 'ps.off': 'Offset',
      'ps.up': 'Uplink TCA (ICT)', 'ps.delay': 'Delay', 'ps.status': 'Status',
      'ps.empty': 'No passes yet. Compute a plan to list them.',
      'ps.emptyFilter': 'No usable passes. Clear the filter to see all.',
      'ps.none': 'No pass meets the constraints.',

      'status.ready': 'Ready',
      'status.search': 'Searching {days} days for imaging and uplink passes…',
      'status.found': '{n} passes found · {ok} usable · showing pass {i}',
      'status.none': 'No pass meets the constraints within {days} days',
      'status.tleBad': 'TLE error: {msg}', 'status.cfgBad': 'Check the constraint values',
      'status.sgp': 'TLE cannot be propagated: {msg}', 'status.err': 'Error: {msg}',
      'status.mapFail': 'Map failed to load. Calculations still work.',
      'status.fetching': 'Fetching TLE from {src}…',
      'status.fetched': 'TLE updated from {src} · epoch {epoch}',
      'status.fetchSame': 'TLE is already current ({src} epoch {epoch})',
      'status.fetchFail': 'Could not fetch TLE ({msg}). Paste it manually.',
      'status.noData': 'no data for NORAD {cat}',
      'status.coordSet': 'Position set to {lat}, {lon}',
      'status.coordBad': 'Coordinates out of range',
      'status.linkShort': 'Short links cannot be read. Open the link first and copy the full URL that contains @lat,lon.',
      'status.linkNone': 'No coordinates found. Use “lat, lon” or a URL that contains @lat,lon.',
      'status.station': 'Station: {name}', 'status.target': 'Target: {name}',
      'status.reset': 'Defaults restored', 'status.stale': 'Settings changed · compute again',

      'toast.copied': 'Copied {v}', 'toast.copiedPlan': 'Plan summary copied',
      'toast.sgp': 'SGP4 failed for part of the window. The TLE may be too old.',

      'plan.title': '{sat} · command plan', 'plan.target': 'Target', 'plan.uplink': 'Uplink station',
      'plan.upTca': 'Uplink TCA', 'plan.window': 'Contact window', 'plan.img': 'Imaging TCA',
      'plan.delay': 'Command delay', 'plan.geom': 'Geometry', 'plan.epoch': 'TLE epoch', 'plan.noUp': 'No usable uplink pass'
    },

    th: {
      'app.name': 'ระบบวางแผนเวลาหน่วงคำสั่ง',
      'credit.by': 'พัฒนาโดยทีม CDH โครงการ KNACKSAT', 'credit.org': 'สถาบันเทคโนโลยีอวกาศนานาชาติเพื่อการพัฒนาเศรษฐกิจ (สทอศ.) มจพ.',
      'map.stage': 'มุมมองวงโคจร', 'view.globe': 'ลูกโลกสด', 'view.map': 'แผนที่ภารกิจ', 'globe.follow': 'ติดตามดาวเทียม',
      'legend.now': 'ตำแหน่งดาวเทียมขณะนี้', 'legend.track': 'แนวโคจร (ที่ผ่านมา · ถัดไป)', 'legend.night': 'ด้านกลางคืน', 'legend.nextArc': 'ช่วงติดต่อถัดไป',
      'live.title': 'สด', 'live.inContact': 'อยู่ในระยะติดต่อ', 'live.noContact': 'อยู่นอกระยะ',
      'live.nextAos': 'ติดต่อได้อีกใน', 'live.losIn': 'สิ้นสุดการติดต่อใน', 'live.none': 'ไม่มีช่วงติดต่อใน 48 ชม.',
      'live.sgp': 'ใส่ TLE ที่ถูกต้องเพื่อติดตามดาวเทียม', 'live.lat': 'ละติจูด', 'live.lon': 'ลองจิจูด',
      'live.alt': 'ความสูง', 'live.el': 'มุมเงย', 'live.az': 'ทิศ (Az)', 'live.range': 'ระยะห่าง',
      'theme.toggle': 'สลับการแสดงผลกลางวัน / กลางคืน',
      'tab.setup': 'ตั้งค่า', 'tab.map': 'แผนที่', 'tab.read': 'ผลลัพธ์', 'tab.passes': 'รอบผ่าน',

      'tle.title': 'ข้อมูลวงโคจร (TLE)',
      'tle.fetch': 'ดึง TLE ล่าสุด',
      'tle.name': 'ชื่อ', 'tle.norad': 'NORAD', 'tle.epoch': 'Epoch',
      'tle.ageD': 'อายุ {v} วัน', 'tle.ageH': 'อายุ {v} ชม.',
      'tle.checksum': 'Checksum ไม่ตรง',
      'tle.err.lines': 'ไม่พบ TLE บรรทัดที่ 1 และ 2',
      'tle.err.length': 'TLE แต่ละบรรทัดต้องยาว 69 ตัวอักษร',
      'tle.err.catnr': 'หมายเลขดาวเทียมในบรรทัด 1 และ 2 ไม่ตรงกัน',

      'up.title': 'สถานีส่งคำสั่ง',
      'up.kmutnb': 'KMUTNB Techno Park กรุงเทพฯ',
      'tg.title': 'เป้าหมายถ่ายภาพ',
      'tg.paris': 'หอไอเฟล ปารีส',
      'loc.custom': 'กำหนดพิกัดเอง',
      'loc.customName': 'จุดที่กำหนดเอง',
      'loc.paste': 'วางลิงก์ Google Maps หรือ “lat, lon”',
      'loc.lat': 'ละติจูด', 'loc.lon': 'ลองจิจูด',
      'loc.mapHint': 'คลิกบนแผนที่หรือลากหมุดเพื่อย้ายตำแหน่งได้',

      'cfg.title': 'เงื่อนไขภารกิจ',
      'cfg.days': 'ช่วงค้นหา', 'cfg.sat': 'มุมเงยต่ำสุดเหนือเป้าหมาย',
      'cfg.sunmin': 'มุมดวงอาทิตย์ต่ำสุด', 'cfg.sunmax': 'มุมดวงอาทิตย์สูงสุด',
      'cfg.gs': 'มุมเงยต่ำสุดสำหรับส่งคำสั่ง', 'cfg.lead': 'เวลาเผื่อขั้นต่ำ',
      'cfg.cam': 'รัศมีภาพถ่าย', 'cfg.comm': 'รัศมีการสื่อสาร',
      'cfg.range': '{f} ต้องอยู่ระหว่าง {a} ถึง {b}',
      'cfg.sunOrder': 'มุมดวงอาทิตย์ต่ำสุดต้องไม่เกินค่าสูงสุด',
      'unit.days': 'วัน',

      'calc.run': 'คำนวณแผน', 'calc.running': 'กำลังคำนวณ…',
      'calc.shortcut': 'Ctrl / ⌘ + Enter', 'calc.reset': 'คืนค่าเริ่มต้น',

      'map.title': 'แนวโคจรภาคพื้น', 'map.pass': 'รอบที่ {i} จาก {n}',
      'pin.label': 'ปักหมุด', 'pin.uplink': 'สถานี', 'pin.target': 'เป้าหมาย',
      'pin.done.uplink': 'ย้ายตำแหน่งสถานีแล้ว', 'pin.done.target': 'ย้ายตำแหน่งเป้าหมายแล้ว',
      'legend.title': 'คำอธิบายสัญลักษณ์', 'legend.station': 'สถานีส่งคำสั่ง', 'legend.target': 'เป้าหมาย',
      'legend.upArc': 'ช่วงส่งคำสั่ง (AOS–LOS)', 'legend.imgTrack': 'วงโคจรรอบถ่ายภาพ',
      'legend.comm': 'รัศมีการสื่อสาร', 'legend.cam': 'รัศมีภาพถ่าย',
      'layer.imagery': 'ภาพดาวเทียม', 'layer.dark': 'แผนที่โทนมืด', 'layer.light': 'แผนที่โทนสว่าง',
      'busy.title': 'กำลังคำนวณวงโคจร',

      'pop.station': 'สถานีส่งคำสั่ง', 'pop.target': 'เป้าหมาย',
      'pop.sat': 'ดาวเทียมขณะถ่ายภาพ', 'pop.satUp': 'ดาวเทียมขณะส่งคำสั่ง (TCA)',
      'pop.time': 'เวลา', 'pop.alt': 'ความสูง', 'pop.off': 'ระยะจากเป้าหมาย', 'pop.el': 'มุมเงย',
      'pop.maxEl': 'มุมเงยสูงสุด', 'pop.range': 'ระยะ',

      'read.title': 'ผลการคำนวณ',
      'read.emptyT': 'ยังไม่มีแผน',
      'read.emptyD': 'ตรวจสอบค่าที่ตั้งไว้ แล้วกด “คำนวณแผน”',
      'read.delay': 'เวลาหน่วงคำสั่ง', 'read.copy': 'คัดลอก', 'read.copyPlan': 'คัดลอกสรุปแผน',
      'read.alt': 'ถ้าส่งที่ AOS: {aos} วินาที · ที่ LOS: {los} วินาที',
      'read.noUp': 'ไม่มีรอบส่งคำสั่งที่ใช้ได้',

      'ev.title': 'ลำดับเหตุการณ์', 'ev.event': 'เหตุการณ์',
      'ev.now': 'ขณะนี้', 'ev.aos': 'เริ่มติดต่อ (AOS)', 'ev.tca': 'ส่งคำสั่ง (TCA)', 'ev.los': 'สิ้นสุดติดต่อ (LOS)', 'ev.img': 'ถ่ายภาพ (TCA)',
      'ev.passed': 'ผ่านไปแล้ว',

      'geo.title': 'เรขาคณิตของรอบผ่าน',
      'geo.offset': 'ระยะจากเป้าหมาย', 'geo.elT': 'มุมเงยเหนือเป้าหมาย', 'geo.sun': 'มุมดวงอาทิตย์',
      'geo.alt': 'ความสูงวงโคจร', 'geo.elU': 'มุมเงยสูงสุด (สถานี)', 'geo.dur': 'ระยะเวลาติดต่อ',
      'geo.range': 'ระยะสัญญาณที่ TCA', 'geo.rf': 'เวลาเดินทางสัญญาณ',

      'note.noUp': 'ไม่มีรอบผ่านสถานีระหว่างตอนนี้ถึงเวลาถ่ายภาพ ให้เลือกรอบถัดไป',
      'note.far': 'จุดใต้ดาวเทียมห่างเป้าหมาย {d} km เกินรัศมีภาพ {r} km',
      'note.tleOld': 'TLE มีอายุ {d} วัน เวลาอาจคลาดหลายนาที ควรดึง TLE ใหม่ก่อนส่งคำสั่ง',
      'note.tleAging': 'TLE มีอายุ {d} วัน ควรอัปเดตก่อนส่งคำสั่ง',

      'st.ok': 'ใช้ได้', 'st.far': 'นอกรัศมีภาพ', 'st.noUp': 'ส่งคำสั่งไม่ทัน',

      'empty.none': 'ไม่พบรอบที่ผ่านเงื่อนไข',
      'empty.sun': 'มี {n} รอบที่มุมเงยผ่านเกณฑ์ แต่ดวงอาทิตย์ที่เป้าหมายต่ำเกินไป (สูงสุด {best}° เกณฑ์ ≥ {min}°)',
      'empty.sunRange': 'มี {n} รอบที่มุมเงยผ่านเกณฑ์ แต่มุมดวงอาทิตย์อยู่นอกช่วงที่กำหนด',
      'empty.elev': 'ดาวเทียมไม่ขึ้นสูงถึง {el}° เหนือเป้าหมายภายใน {days} วัน ให้ลดมุมเงยหรือขยายช่วงค้นหา',
      'empty.retry': 'ลองใหม่ด้วยดวงอาทิตย์ ≥ {v}°',

      'ps.title': 'รอบถ่ายภาพ', 'ps.onlyOk': 'เฉพาะรอบที่ใช้ได้',
      'ps.img': 'ถ่ายภาพ (ICT)', 'ps.el': 'มุมเงย', 'ps.sun': 'แดด', 'ps.off': 'ระยะ',
      'ps.up': 'ส่งคำสั่ง (ICT)', 'ps.delay': 'หน่วง', 'ps.status': 'สถานะ',
      'ps.empty': 'ยังไม่มีข้อมูล กดคำนวณแผนเพื่อค้นหารอบ',
      'ps.emptyFilter': 'ไม่มีรอบที่ใช้ได้ ยกเลิกตัวกรองเพื่อดูทั้งหมด',
      'ps.none': 'ไม่พบรอบที่ผ่านเงื่อนไข',

      'status.ready': 'พร้อมใช้งาน',
      'status.search': 'กำลังค้นหารอบถ่ายภาพและรอบส่งคำสั่ง ({days} วัน)…',
      'status.found': 'พบ {n} รอบ · ใช้ได้ {ok} รอบ · แสดงรอบที่ {i}',
      'status.none': 'ไม่พบรอบที่ผ่านเงื่อนไขภายใน {days} วัน',
      'status.tleBad': 'TLE ไม่ถูกต้อง: {msg}', 'status.cfgBad': 'ตรวจสอบค่าเงื่อนไขอีกครั้ง',
      'status.sgp': 'TLE นี้คำนวณไม่ได้: {msg}', 'status.err': 'เกิดข้อผิดพลาด: {msg}',
      'status.mapFail': 'โหลดแผนที่ไม่สำเร็จ แต่ยังคำนวณได้ตามปกติ',
      'status.fetching': 'กำลังดึง TLE จาก {src}…',
      'status.fetched': 'อัปเดต TLE จาก {src} แล้ว · epoch {epoch}',
      'status.fetchSame': 'TLE เป็นชุดล่าสุดแล้ว ({src} epoch {epoch})',
      'status.fetchFail': 'ดึง TLE ไม่สำเร็จ ({msg}) วาง TLE เองได้',
      'status.noData': 'ไม่มีข้อมูล NORAD {cat}',
      'status.coordSet': 'ตั้งพิกัดเป็น {lat}, {lon}',
      'status.coordBad': 'พิกัดอยู่นอกช่วงที่ถูกต้อง',
      'status.linkShort': 'อ่านลิงก์แบบย่อไม่ได้ ให้เปิดลิงก์ก่อนแล้วคัดลอก URL เต็มที่มี @lat,lon',
      'status.linkNone': 'ไม่พบพิกัด ใช้รูปแบบ “lat, lon” หรือ URL ที่มี @lat,lon',
      'status.station': 'สถานี: {name}', 'status.target': 'เป้าหมาย: {name}',
      'status.reset': 'คืนค่าเริ่มต้นแล้ว', 'status.stale': 'ค่าที่ตั้งเปลี่ยน · คำนวณใหม่',

      'toast.copied': 'คัดลอก {v} แล้ว', 'toast.copiedPlan': 'คัดลอกสรุปแผนแล้ว',
      'toast.sgp': 'SGP4 คำนวณบางช่วงไม่ได้ TLE อาจเก่าเกินไป',

      'plan.title': '{sat} · แผนส่งคำสั่ง', 'plan.target': 'เป้าหมาย', 'plan.uplink': 'สถานีส่งคำสั่ง',
      'plan.upTca': 'ส่งคำสั่ง (TCA)', 'plan.window': 'ช่วงติดต่อ', 'plan.img': 'ถ่ายภาพ (TCA)',
      'plan.delay': 'เวลาหน่วงคำสั่ง', 'plan.geom': 'เรขาคณิต', 'plan.epoch': 'TLE epoch', 'plan.noUp': 'ไม่มีรอบส่งคำสั่งที่ใช้ได้'
    },

    zh: {
      'app.name': '指令延时规划',
      'credit.by': 'KNACKSAT 项目 CDH 团队开发', 'credit.org': '国际空间技术促进经济发展研究所（INSTED）· 泰国北曼谷先皇技术大学',
      'map.stage': '轨道视图', 'view.globe': '实时地球', 'view.map': '任务地图', 'globe.follow': '跟随卫星',
      'legend.now': '卫星当前位置', 'legend.track': '星下点轨迹（已过 · 将来）', 'legend.night': '夜半球', 'legend.nextArc': '下次通信窗口',
      'live.title': '实时', 'live.inContact': '可通信', 'live.noContact': '不在通信范围',
      'live.nextAos': '距下次通信', 'live.losIn': '距通信结束', 'live.none': '48 小时内无通信窗口',
      'live.sgp': '请输入有效的 TLE 以跟踪卫星', 'live.lat': '纬度', 'live.lon': '经度',
      'live.alt': '高度', 'live.el': '仰角', 'live.az': '方位角', 'live.range': '距离',
      'theme.toggle': '切换日间 / 夜间显示',
      'tab.setup': '设置', 'tab.map': '地图', 'tab.read': '结果', 'tab.passes': '过境',

      'tle.title': '卫星轨道根数（TLE）',
      'tle.fetch': '获取最新 TLE',
      'tle.name': '名称', 'tle.norad': 'NORAD', 'tle.epoch': '历元',
      'tle.ageD': '已 {v} 天', 'tle.ageH': '已 {v} 小时',
      'tle.checksum': '校验和不符',
      'tle.err.lines': '未找到 TLE 第 1、2 行',
      'tle.err.length': 'TLE 每行必须为 69 个字符',
      'tle.err.catnr': '第 1、2 行的卫星编号不一致',

      'up.title': '上行站',
      'up.kmutnb': 'KMUTNB 科技园（曼谷）',
      'tg.title': '成像目标',
      'tg.paris': '埃菲尔铁塔（巴黎）',
      'loc.custom': '自定义坐标',
      'loc.customName': '自定义点',
      'loc.paste': '粘贴 Google 地图链接或“纬度, 经度”',
      'loc.lat': '纬度', 'loc.lon': '经度',
      'loc.mapHint': '也可以点击地图或拖动标记来设置位置。',

      'cfg.title': '约束条件',
      'cfg.days': '搜索时长', 'cfg.sat': '目标处最低仰角',
      'cfg.sunmin': '太阳高度角下限', 'cfg.sunmax': '太阳高度角上限',
      'cfg.gs': '上行最低仰角', 'cfg.lead': '最短提前时间',
      'cfg.cam': '相机覆盖半径', 'cfg.comm': '通信覆盖半径',
      'cfg.range': '{f} 必须在 {a} 到 {b} 之间',
      'cfg.sunOrder': '太阳高度角下限不能大于上限',
      'unit.days': '天',

      'calc.run': '计算计划', 'calc.running': '正在计算…',
      'calc.shortcut': 'Ctrl / ⌘ + Enter', 'calc.reset': '恢复默认值',

      'map.title': '星下点轨迹', 'map.pass': '第 {i} / {n} 次过境',
      'pin.label': '放置标记', 'pin.uplink': '地面站', 'pin.target': '目标',
      'pin.done.uplink': '地面站位置已更新', 'pin.done.target': '目标位置已更新',
      'legend.title': '图例', 'legend.station': '上行站', 'legend.target': '目标',
      'legend.upArc': '上行窗口（AOS–LOS）', 'legend.imgTrack': '成像轨道',
      'legend.comm': '通信覆盖', 'legend.cam': '相机覆盖',
      'layer.imagery': '卫星影像', 'layer.dark': '深色地图', 'layer.light': '浅色地图',
      'busy.title': '正在推算轨道',

      'pop.station': '上行站', 'pop.target': '目标',
      'pop.sat': '成像时卫星位置', 'pop.satUp': '上行 TCA 时卫星位置',
      'pop.time': '时间', 'pop.alt': '高度', 'pop.off': '偏离目标', 'pop.el': '仰角',
      'pop.maxEl': '最大仰角', 'pop.range': '距离',

      'read.title': '任务结果',
      'read.emptyT': '尚未计算计划',
      'read.emptyD': '检查设置后，点击“计算计划”。',
      'read.delay': '指令延时', 'read.copy': '复制', 'read.copyPlan': '复制计划摘要',
      'read.alt': '若在 AOS 发送：{aos} 秒 · 在 LOS 发送：{los} 秒',
      'read.noUp': '没有可用的上行过境',

      'ev.title': '事件时间线', 'ev.event': '事件',
      'ev.now': '当前', 'ev.aos': '上行 AOS', 'ev.tca': '上行 TCA', 'ev.los': '上行 LOS', 'ev.img': '成像 TCA',
      'ev.passed': '已过',

      'geo.title': '过境几何',
      'geo.offset': '偏离目标距离', 'geo.elT': '目标处仰角', 'geo.sun': '太阳高度角',
      'geo.alt': '轨道高度', 'geo.elU': '最大仰角（上行）', 'geo.dur': '通信时长',
      'geo.range': 'TCA 斜距', 'geo.rf': '单程信号延时',

      'note.noUp': '从现在到该成像时刻之间没有上行过境，请选择更晚的过境。',
      'note.far': '星下点距目标 {d} km，超出 {r} km 相机覆盖范围。',
      'note.tleOld': 'TLE 已有 {d} 天，时间可能偏差数分钟，发送指令前请更新 TLE。',
      'note.tleAging': 'TLE 已有 {d} 天，发送指令前请更新。',

      'st.ok': '可用', 'st.far': '超出覆盖', 'st.noUp': '无法上行',

      'empty.none': '没有满足条件的过境',
      'empty.sun': '有 {n} 次过境满足仰角要求，但目标处太阳高度过低（最高 {best}°，要求 ≥ {min}°）。',
      'empty.sunRange': '有 {n} 次过境满足仰角要求，但太阳高度角不在设定范围内。',
      'empty.elev': '{days} 天内卫星在目标上空未达到 {el}° 仰角。请降低仰角要求或延长搜索时长。',
      'empty.retry': '以太阳高度 ≥ {v}° 重新计算',

      'ps.title': '成像机会', 'ps.onlyOk': '仅显示可用',
      'ps.img': '成像（ICT）', 'ps.el': '仰角', 'ps.sun': '太阳', 'ps.off': '偏离',
      'ps.up': '上行 TCA（ICT）', 'ps.delay': '延时', 'ps.status': '状态',
      'ps.empty': '暂无数据。计算计划后将列出过境。',
      'ps.emptyFilter': '没有可用过境。取消筛选可查看全部。',
      'ps.none': '没有满足条件的过境。',

      'status.ready': '就绪',
      'status.search': '正在搜索 {days} 天内的成像与上行过境…',
      'status.found': '找到 {n} 次过境 · 可用 {ok} 次 · 显示第 {i} 次',
      'status.none': '{days} 天内没有满足条件的过境',
      'status.tleBad': 'TLE 有误：{msg}', 'status.cfgBad': '请检查约束条件数值',
      'status.sgp': '该 TLE 无法推算：{msg}', 'status.err': '出错：{msg}',
      'status.mapFail': '地图加载失败，计算功能不受影响。',
      'status.fetching': '正在从 {src} 获取 TLE…',
      'status.fetched': '已从 {src} 更新 TLE · 历元 {epoch}',
      'status.fetchSame': '当前 TLE 已是最新（{src} 历元 {epoch}）',
      'status.fetchFail': '获取 TLE 失败（{msg}），可手动粘贴。',
      'status.noData': 'NORAD {cat} 无数据',
      'status.coordSet': '位置已设为 {lat}, {lon}',
      'status.coordBad': '坐标超出范围',
      'status.linkShort': '无法读取短链接。请先打开链接，再复制包含 @纬度,经度 的完整网址。',
      'status.linkNone': '未找到坐标。请使用“纬度, 经度”或包含 @纬度,经度 的网址。',
      'status.station': '地面站：{name}', 'status.target': '目标：{name}',
      'status.reset': '已恢复默认值', 'status.stale': '设置已更改 · 请重新计算',

      'toast.copied': '已复制 {v}', 'toast.copiedPlan': '已复制计划摘要',
      'toast.sgp': '部分时段 SGP4 推算失败，TLE 可能过旧。',

      'plan.title': '{sat} · 指令计划', 'plan.target': '目标', 'plan.uplink': '上行站',
      'plan.upTca': '上行 TCA', 'plan.window': '通信窗口', 'plan.img': '成像 TCA',
      'plan.delay': '指令延时', 'plan.geom': '几何参数', 'plan.epoch': 'TLE 历元', 'plan.noUp': '没有可用的上行过境'
    }
  };

  var LANGS = ['th', 'en', 'zh'];
  var KEY = 'cdc.lang';
  var lang = 'en';
  var listeners = [];

  function detect() {
    try { var s = localStorage.getItem(KEY); if (LANGS.indexOf(s) >= 0) return s; } catch (e) {}
    var list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']);
    for (var i = 0; i < list.length; i++) {
      var l = String(list[i]).toLowerCase().slice(0, 2);
      if (LANGS.indexOf(l) >= 0) return l;
    }
    return 'en';
  }

  function t(key, vars) {
    var s = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }

  function apply(scope) {
    var r = scope || document;
    r.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    r.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = t(el.getAttribute('data-i18n-title')); });
    r.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
    r.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
  }

  function set(l, persist) {
    if (LANGS.indexOf(l) < 0) l = 'en';
    lang = l;
    document.documentElement.lang = l === 'zh' ? 'zh' : l;
    if (persist) { try { localStorage.setItem(KEY, l); } catch (e) {} }
    apply();
    listeners.forEach(function (fn) { fn(l); });
  }

  root.I18N = {
    DICT: DICT, LANGS: LANGS,
    t: t, apply: apply, set: set,
    get lang() { return lang; },
    init: function () { set(detect(), false); },
    onChange: function (fn) { listeners.push(fn); }
  };
})(typeof self !== 'undefined' ? self : this);
