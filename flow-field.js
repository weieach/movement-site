/**
 * Flow field with flocking (boids) behaviour.
 * Each line is a boid with velocity. Three classic flocking rules
 * (separation, alignment, cohesion) plus a fourth steering force toward
 * the dominant motion direction detected from ml5 pose keypoints.
 * Masked with large-mask.png.
 */
(function () {
  /* ── tunables ── */
  var LINE_LEN       = 40;
  var GRID_SPACING   = 50;
  var LINE_WIDTH     = 3;
  var LINE_COLOR     = "#C8C8C8";
  var MAX_SPEED      = 2.0;
  var MAX_FORCE      = 0.05;

  var SEPARATION_R   = 45;
  var ALIGNMENT_R    = 80;
  var COHESION_R     = 100;

  var SEP_WEIGHT     = 1.8;
  var ALI_WEIGHT     = 1.0;
  var COH_WEIGHT     = 1.0;
  var FLOW_WEIGHT    = 1.4;

  var SAMPLE_MS      = 120;
  var LEFT_GUTTER    = 47;

  /* ── DOM / canvas ── */
  var wrap = document.getElementById("flowFieldCanvasWrapper");
  if (!wrap) return;

  var canvas = document.createElement("canvas");
  wrap.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  var maskImg    = new Image();
  var maskReady  = false;
  var maskCanvas = document.createElement("canvas");
  var maskCtx    = maskCanvas.getContext("2d");

  var cw = 0, ch = 0;

  /* ── flow from pose ── */
  var flowDx = 0, flowDy = 0, flowMag = 0;
  var prevKeypoints = null;

  /* ── boids ── */
  var boids = [];

  /* ── helpers ── */
  function limit(vx, vy, max) {
    var m = Math.sqrt(vx * vx + vy * vy);
    if (m > max && m > 0) { var s = max / m; return [vx * s, vy * s]; }
    return [vx, vy];
  }

  function setMag(vx, vy, mag) {
    var m = Math.sqrt(vx * vx + vy * vy);
    if (m === 0) return [0, 0];
    var s = mag / m;
    return [vx * s, vy * s];
  }

  /* ── resize / init ── */
  function resize() {
    cw = Math.max(1, Math.floor(window.innerWidth - LEFT_GUTTER));
    ch = Math.max(1, window.innerHeight);
    var dpr = window.devicePixelRatio || 1;

    canvas.width  = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width  = cw + "px";
    canvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    maskCanvas.width  = cw;
    maskCanvas.height = ch;

    initBoids();
    drawMask();
  }

  function initBoids() {
    boids = [];
    var cols = Math.ceil(cw / GRID_SPACING);
    var rows = Math.ceil(ch / GRID_SPACING);
    var offX = (cw - (cols - 1) * GRID_SPACING) / 2;
    var offY = (ch - (rows - 1) * GRID_SPACING) / 2;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var a = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        var sp = 0.3 + Math.random() * 0.5;
        boids.push({
          x:  offX + c * GRID_SPACING,
          y:  offY + r * GRID_SPACING,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
        });
      }
    }
  }

  /* ── mask ── */
  function drawMask() {
    if (!maskReady) return;
    maskCtx.clearRect(0, 0, cw, ch);
    maskCtx.drawImage(maskImg, 0, 0, cw, ch);
  }
  maskImg.onload = function () { maskReady = true; drawMask(); };
  maskImg.src = "data/large mask.png";

  /* ── pose-based flow detection ── */
  function extractKeypoints(poses) {
    if (!poses || !Array.isArray(poses) || poses.length === 0) return null;
    var pose = poses[0];
    if (!pose || !Array.isArray(pose.keypoints) || pose.keypoints.length === 0) return null;
    var pts = [];
    for (var i = 0; i < pose.keypoints.length; i++) {
      var kp = pose.keypoints[i];
      if (!kp) continue;
      var x = kp.x != null ? kp.x : (kp.position ? kp.position.x : NaN);
      var y = kp.y != null ? kp.y : (kp.position ? kp.position.y : NaN);
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x: x, y: y });
    }
    return pts.length > 0 ? pts : null;
  }

  function sampleFlow() {
    var kps = extractKeypoints(window.movementSitePoses);
    if (!kps) { prevKeypoints = null; return; }

    if (prevKeypoints && prevKeypoints.length === kps.length) {
      var sx = 0, sy = 0, tm = 0;
      for (var i = 0; i < kps.length; i++) {
        var dx = kps[i].x - prevKeypoints[i].x;
        var dy = kps[i].y - prevKeypoints[i].y;
        var m  = Math.sqrt(dx * dx + dy * dy);
        sx += dx * m;
        sy += dy * m;
        tm += m;
      }
      flowMag = tm / kps.length;
      if (flowMag > 1.5) {
        var fmag = Math.sqrt(sx * sx + sy * sy);
        if (fmag > 0) { flowDx = sx / fmag; flowDy = sy / fmag; }
      }
    }
    prevKeypoints = kps;
  }

  /* ── flocking ── */
  function flock() {
    var n = boids.length;

    var sepX = new Float32Array(n);
    var sepY = new Float32Array(n);
    var sepN = new Uint16Array(n);

    var aliX = new Float32Array(n);
    var aliY = new Float32Array(n);
    var aliN = new Uint16Array(n);

    var cohX = new Float32Array(n);
    var cohY = new Float32Array(n);
    var cohN = new Uint16Array(n);

    for (var i = 0; i < n; i++) {
      var bi = boids[i];
      for (var j = i + 1; j < n; j++) {
        var bj = boids[j];
        var dx = bi.x - bj.x;
        var dy = bi.y - bj.y;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.001) continue;

        if (d < SEPARATION_R) {
          var w = 1 / d;
          sepX[i] += dx * w; sepY[i] += dy * w; sepN[i]++;
          sepX[j] -= dx * w; sepY[j] -= dy * w; sepN[j]++;
        }
        if (d < ALIGNMENT_R) {
          aliX[i] += bj.vx; aliY[i] += bj.vy; aliN[i]++;
          aliX[j] += bi.vx; aliY[j] += bi.vy; aliN[j]++;
        }
        if (d < COHESION_R) {
          cohX[i] += bj.x; cohY[i] += bj.y; cohN[i]++;
          cohX[j] += bi.x; cohY[j] += bi.y; cohN[j]++;
        }
      }
    }

    for (var i = 0; i < n; i++) {
      var b = boids[i];
      var ax = 0, ay = 0;

      /* separation */
      if (sepN[i] > 0) {
        var s = setMag(sepX[i] / sepN[i], sepY[i] / sepN[i], MAX_SPEED);
        var stx = s[0] - b.vx, sty = s[1] - b.vy;
        var st = limit(stx, sty, MAX_FORCE);
        ax += st[0] * SEP_WEIGHT;
        ay += st[1] * SEP_WEIGHT;
      }

      /* alignment */
      if (aliN[i] > 0) {
        var s = setMag(aliX[i] / aliN[i], aliY[i] / aliN[i], MAX_SPEED);
        var stx = s[0] - b.vx, sty = s[1] - b.vy;
        var st = limit(stx, sty, MAX_FORCE);
        ax += st[0] * ALI_WEIGHT;
        ay += st[1] * ALI_WEIGHT;
      }

      /* cohesion */
      if (cohN[i] > 0) {
        var tx = cohX[i] / cohN[i] - b.x;
        var ty = cohY[i] / cohN[i] - b.y;
        var s = setMag(tx, ty, MAX_SPEED);
        var stx = s[0] - b.vx, sty = s[1] - b.vy;
        var st = limit(stx, sty, MAX_FORCE);
        ax += st[0] * COH_WEIGHT;
        ay += st[1] * COH_WEIGHT;
      }

      /* flow steering — steer toward detected motion direction */
      if (flowMag > 1.0) {
        var desired = setMag(flowDx, flowDy, MAX_SPEED);
        var stx = desired[0] - b.vx, sty = desired[1] - b.vy;
        var st = limit(stx, sty, MAX_FORCE);
        ax += st[0] * FLOW_WEIGHT;
        ay += st[1] * FLOW_WEIGHT;
      }

      b.vx += ax;
      b.vy += ay;
      var v = limit(b.vx, b.vy, MAX_SPEED);
      b.vx = v[0]; b.vy = v[1];

      b.x += b.vx;
      b.y += b.vy;

      /* wrap around edges */
      if (b.x < -LINE_LEN) b.x += cw + LINE_LEN * 2;
      if (b.x > cw + LINE_LEN) b.x -= cw + LINE_LEN * 2;
      if (b.y < -LINE_LEN) b.y += ch + LINE_LEN * 2;
      if (b.y > ch + LINE_LEN) b.y -= ch + LINE_LEN * 2;
    }
  }

  /* ── draw ── */
  function draw() {
    ctx.clearRect(0, 0, cw, ch);

    ctx.save();
    ctx.fillStyle = "#0078C0";
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth   = LINE_WIDTH;
    ctx.lineCap     = "round";

    for (var i = 0; i < boids.length; i++) {
      var b  = boids[i];
      var a  = Math.atan2(b.vy, b.vx);
      var dx = Math.cos(a) * LINE_LEN / 2;
      var dy = Math.sin(a) * LINE_LEN / 2;
      ctx.beginPath();
      ctx.moveTo(b.x - dx, b.y - dy);
      ctx.lineTo(b.x + dx, b.y + dy);
      ctx.stroke();
    }

    ctx.restore();

    if (maskReady) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(maskCanvas, 0, 0, cw, ch);
      ctx.restore();
    }
  }

  /* ── loop ── */
  var lastSample = 0;

  function frame(now) {
    if (now - lastSample > SAMPLE_MS) {
      lastSample = now;
      try { sampleFlow(); } catch (_) {}
    }
    flock();
    draw();
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(frame);
})();
