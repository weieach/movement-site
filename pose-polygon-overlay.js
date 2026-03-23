/**
 * Small fixed canvas on the left: quadrilateral from ml5 bodyPose keypoints
 * (nose, left elbow, right elbow, left hip).
 * Samples new pose every SAMPLE_MS; animates smoothly between positions via
 * requestAnimationFrame + linear interpolation over LERP_MS.
 */
(function () {
  const SIZE = 140;
  const PAD = 14;
  const SAMPLE_MS = 1000;
  const LERP_MS = 600;

  const KEYPOINT_DEFS = [
    { names: ["nose"], indices: [0] },
    { names: ["left_elbow"], indices: [7] },
    { names: ["right_elbow"], indices: [8] },
    { names: ["left_hip", "left_knee"], indices: [11, 13] },
  ];

  function normalizePartName(n) {
    return String(n == null ? "" : n)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_");
  }

  function kpScore(kp) {
    if (!kp) return 0;
    const s = kp.confidence != null ? kp.confidence : kp.score;
    return typeof s === "number" ? s : 0;
  }

  function pickKeypoint(keypoints, def) {
    if (!keypoints || !keypoints.length) return null;
    const want = def.names.map(normalizePartName);
    for (const kp of keypoints) {
      if (!kp || kp.name == null) continue;
      if (want.includes(normalizePartName(kp.name)) && kpScore(kp) > 0.05) {
        return kp;
      }
    }
    const n = keypoints.length;
    if (n >= 16 && n <= 18) {
      for (const idx of def.indices) {
        const kp = keypoints[idx];
        if (kp && kpScore(kp) > 0.05) return kp;
      }
    }
    return null;
  }

  function projectToCanvas(pts) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const rw = maxX - minX || 1;
    const rh = maxY - minY || 1;
    const innerW = SIZE - PAD * 2;
    const innerH = SIZE - PAD * 2;
    const scale = Math.min(innerW / rw, innerH / rh);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return pts.map((p) => ({
      x: SIZE / 2 + (p.x - cx) * scale,
      y: SIZE / 2 + (p.y - cy) * scale,
    }));
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  const main = document.querySelector("main");
  if (!main) return;

  const wrap = document.createElement("div");
  wrap.id = "posePolygonOverlay";
  wrap.setAttribute("aria-hidden", "true");
  const DPR = window.devicePixelRatio || 1;

  const canvas = document.createElement("canvas");
  // Backing store is DPR× larger; CSS size stays SIZE×SIZE so it renders crisp on HiDPI
  canvas.width = SIZE * DPR;
  canvas.height = SIZE * DPR;
  canvas.style.width = SIZE + "px";
  canvas.style.height = SIZE + "px";
  wrap.appendChild(canvas);
  main.appendChild(wrap);

  const ctx = canvas.getContext("2d");
  ctx.scale(DPR, DPR);

  /** @type {{ x: number; y: number }[] | null} */
  let quadFrom = null;
  /** @type {{ x: number; y: number }[] | null} */
  let quadTo = null;
  let lerpStart = 0;
  let lastSampleTime = 0;
  let rafId = null;

  function sampleNewTarget() {
    const raw = window.movementSitePoses;
    if (!raw || !raw.length) return;
    const pose = raw[0];
    const keypoints = pose && pose.keypoints;
    if (!keypoints || !keypoints.length) return;

    const src = [];
    for (const def of KEYPOINT_DEFS) {
      const kp = pickKeypoint(keypoints, def);
      if (!kp) return;
      const x = Number(kp.x);
      const y = Number(kp.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      src.push({ x, y });
    }

    const projected = projectToCanvas(src);

    quadFrom = quadTo ? quadTo.map((p) => ({ ...p })) : projected;
    quadTo = projected;
    lerpStart = performance.now();
  }

  function lerpQuad(now) {
    if (!quadFrom || !quadTo) return quadTo || quadFrom;
    const elapsed = now - lerpStart;
    const raw = LERP_MS > 0 ? Math.min(elapsed / LERP_MS, 1) : 1;
    const t = easeInOutCubic(raw);
    return quadFrom.map((from, i) => ({
      x: from.x + (quadTo[i].x - from.x) * t,
      y: from.y + (quadTo[i].y - from.y) * t,
    }));
  }

  /** Pairs to connect: [pointIndex_A, pointIndex_B] referencing KEYPOINT_DEFS order
   *  0 = nose, 1 = left_elbow, 2 = right_elbow, 3 = left_hip */
  const EDGES = [
    [0, 1], // nose ↔ left elbow
    [0, 2], // left elbow ↔ right elbow
    [2, 3], // right elbow ↔ left hip
    [1, 3]
  ];

  function drawQuad(quad) {
    ctx.fillStyle = "#c8c8c8";
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (!quad || quad.length < 4) return;

    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 1.5;
    for (const [a, b] of EDGES) {
      ctx.beginPath();
      ctx.moveTo(quad[a].x, quad[a].y);
      ctx.lineTo(quad[b].x, quad[b].y);
      ctx.stroke();
    }

    ctx.fillStyle = "#5c3d2e";
    for (const p of quad) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(now) {
    try {
      if (now - lastSampleTime >= SAMPLE_MS) {
        lastSampleTime = now;
        sampleNewTarget();
      }
      const current = lerpQuad(now);
      drawQuad(current);
    } catch (err) {
      console.warn("[pose-polygon-overlay]", err);
    }
    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
})();
