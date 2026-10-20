/* ==========================================================================
   Live globe — orthographic Earth with day/night terminator, satellite,
   ground track, radio footprint, station and target.
   Depends on d3 (d3-geo, d3-drag, d3-selection). No network access needed:
   land outlines come from land.json (Natural Earth 110m, public domain).
   ========================================================================== */
(function (root) {
  'use strict';
  var R2D = 180 / Math.PI, RE = 6371;

  function Globe(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.proj = d3.geoOrthographic().clipAngle(90).precision(1);
    this.path = d3.geoPath(this.proj, this.ctx);
    this.grat = d3.geoGraticule10();
    this.land = null;
    this.state = {};
    this.rot = [-100, -15, 0];
    this.goal = null;
    this.follow = true;
    this.zoom = 1;
    this.t0 = performance.now();
    this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onUnfollow = null;
    var self = this;

    d3.select(canvas).call(d3.drag()
      .on('start', function () { self.follow = false; self.goal = null; if (self.onUnfollow) self.onUnfollow(); })
      .on('drag', function (e) {
        var k = 0.25 / self.zoom;
        self.rot = [self.rot[0] + e.dx * k, Math.max(-85, Math.min(85, self.rot[1] - e.dy * k)), 0];
        self.request();
      }));
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.zoom = Math.max(0.8, Math.min(3, self.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      self.request();
    }, { passive: false });

    this.resize();
    if (root.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(canvas.parentNode);
    this.refreshColors();
  }

  Globe.prototype.resize = function () {
    var p = this.cv.parentNode, w = p.clientWidth, h = p.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.w = w; this.h = h; this.dpr = dpr;
    this.request();
  };

  Globe.prototype.setLand = function (geo) { this.land = geo; this.request(); };
  Globe.prototype.set = function (s) {
    Object.assign(this.state, s);
    if (this.follow && s.sat) this.goal = [-s.sat.lon, -Math.max(-50, Math.min(50, s.sat.lat)), 0];
    this.request();
  };
  Globe.prototype.setFollow = function (on) {
    this.follow = on;
    if (on && this.state.sat) this.goal = [-this.state.sat.lon, -Math.max(-50, Math.min(50, this.state.sat.lat)), 0];
    this.request();
  };

  // Draw only when something changed (new position each second, drag, zoom,
  // or while easing towards the follow target). No continuous animation loop.
  Globe.prototype.request = function () {
    if (this.pending) return;
    var self = this;
    this.pending = true;
    requestAnimationFrame(function () {
      self.pending = false;
      if (document.hidden || !self.cv.offsetParent) { self.stale = true; return; }
      var moving = false;
      if (self.goal) {
        var d0 = ((self.goal[0] - self.rot[0] + 540) % 360) - 180, d1 = self.goal[1] - self.rot[1];
        if (self.reduce || (Math.abs(d0) < 0.05 && Math.abs(d1) < 0.05)) { self.rot = self.goal.slice(); self.goal = null; }
        else { self.rot = [self.rot[0] + d0 * 0.15, self.rot[1] + d1 * 0.15, 0]; moving = true; }
      }
      self.draw();
      if (moving) self.request();
    });
  };
  Globe.prototype.refreshColors = function () {
    this.col = {
      ocean: css('--ocean'), land: css('--land'), landLine: css('--land-line'), grat: css('--grat'), night: css('--night'),
      rim: css('--rim'), sat: css('--sat'), up: css('--up'), tgt: css('--tgt'), text: css('--text'), bg: css('--well')
    };
    this.request();
  };

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function visible(proj, lonlat) {
    var r = proj.rotate();
    return d3.geoDistance(lonlat, [-r[0], -r[1]]) < Math.PI / 2 - 0.01;
  }

  Globe.prototype.draw = function (now) {
    if (!this.w) return;
    var c = this.ctx, w = this.w, h = this.h, s = this.state, P = this.proj, path = this.path;
    var R = Math.min(w, h) / 2 * 0.88 * this.zoom;
    P.translate([w / 2, h / 2]).scale(R).rotate(this.rot);
    var col = this.col || {};
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, w, h);

    // atmosphere rim
    var g = c.createRadialGradient(w / 2, h / 2, R * 0.96, w / 2, h / 2, R * 1.12);
    g.addColorStop(0, col.rim); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, R * 1.12, 0, 2 * Math.PI); c.fill();

    // ocean, graticule, land
    c.beginPath(); path({ type: 'Sphere' }); c.fillStyle = col.ocean; c.fill();
    c.beginPath(); path(this.grat); c.strokeStyle = col.grat; c.lineWidth = 0.6; c.stroke();
    if (this.land) {
      c.beginPath(); path(this.land); c.fillStyle = col.land; c.fill();
      c.strokeStyle = col.landLine; c.lineWidth = 0.6; c.stroke();
    }

    // night side: soft terminator from three stacked caps
    if (s.sun) {
      var anti = [s.sun.lon + 180, -s.sun.lat];
      c.fillStyle = col.night;
      [89.9, 87, 82].forEach(function (rad) {
        c.beginPath(); path(d3.geoCircle().center(anti).radius(rad)()); c.fill();
      });
    }

    // radio footprint around the satellite
    if (s.sat && s.commKm) {
      c.beginPath(); path(d3.geoCircle().center([s.sat.lon, s.sat.lat]).radius(s.commKm / RE * R2D).precision(2)());
      c.fillStyle = hexA(col.up, s.inContact ? 0.16 : 0.07); c.fill();
      c.setLineDash([4, 4]); c.strokeStyle = hexA(col.up, 0.85); c.lineWidth = 1; c.stroke(); c.setLineDash([]);
    }

    // ground track
    if (s.past && s.past.length > 1) {
      c.beginPath(); path({ type: 'LineString', coordinates: s.past }); c.strokeStyle = hexA(col.sat, 0.95); c.lineWidth = 1.8; c.stroke();
    }
    if (s.future && s.future.length > 1) {
      c.setLineDash([5, 5]);
      c.beginPath(); path({ type: 'LineString', coordinates: s.future }); c.strokeStyle = hexA(col.sat, 0.55); c.lineWidth = 1.4; c.stroke();
      c.setLineDash([]);
    }

    // station link while in contact
    if (s.sat && s.station && s.inContact) {
      c.beginPath(); path({ type: 'LineString', coordinates: [[s.station.lon, s.station.lat], [s.sat.lon, s.sat.lat]] });
      c.strokeStyle = col.up; c.lineWidth = 1.5; c.stroke();
    }

    // station (diamond) and target (ring)
    if (s.station && visible(P, [s.station.lon, s.station.lat])) {
      var p1 = P([s.station.lon, s.station.lat]);
      c.save(); c.translate(p1[0], p1[1]); c.rotate(Math.PI / 4);
      c.fillStyle = col.up; c.fillRect(-4.5, -4.5, 9, 9); c.strokeStyle = col.bg; c.lineWidth = 1.5; c.strokeRect(-4.5, -4.5, 9, 9);
      c.restore();
    }
    if (s.target && visible(P, [s.target.lon, s.target.lat])) {
      var p2 = P([s.target.lon, s.target.lat]);
      c.beginPath(); c.arc(p2[0], p2[1], 6, 0, 2 * Math.PI); c.strokeStyle = col.tgt; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.arc(p2[0], p2[1], 1.8, 0, 2 * Math.PI); c.fillStyle = col.tgt; c.fill();
    }

    // satellite with a slow pulse
    if (s.sat && visible(P, [s.sat.lon, s.sat.lat])) {
      var p = P([s.sat.lon, s.sat.lat]);
      c.beginPath(); c.arc(p[0], p[1], 11, 0, 2 * Math.PI); c.strokeStyle = hexA(col.sat, 0.45); c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.arc(p[0], p[1], 5, 0, 2 * Math.PI); c.fillStyle = col.sat; c.fill();
      c.lineWidth = 2; c.strokeStyle = col.bg; c.stroke();
      if (s.label) {
        c.font = '600 12px "Chakra Petch", "IBM Plex Sans", sans-serif';
        c.fillStyle = col.text; c.textBaseline = 'middle';
        c.fillText(s.label, p[0] + 11, p[1] - 11);
      }
    }

    // sphere edge
    c.beginPath(); path({ type: 'Sphere' }); c.strokeStyle = hexA(col.up, 0.25); c.lineWidth = 1; c.stroke();
  };

  // accept #rrggbb or rgb()/rgba() and return the colour at alpha a
  function hexA(color, a) {
    if (!color) return 'rgba(255,255,255,' + a + ')';
    if (color[0] === '#') {
      var n = color.length === 4 ? color.slice(1).split('').map(function (x) { return x + x; }).join('') : color.slice(1, 7);
      return 'rgba(' + parseInt(n.slice(0, 2), 16) + ',' + parseInt(n.slice(2, 4), 16) + ',' + parseInt(n.slice(4, 6), 16) + ',' + a + ')';
    }
    var m = color.match(/[\d.]+/g); if (!m) return color;
    return 'rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',' + a + ')';
  }

  root.CDGlobe = Globe;
})(typeof self !== 'undefined' ? self : this);
