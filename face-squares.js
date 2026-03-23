/**
 * Concentric square stack: outer ring is static in PGraphics; inner three rings
 * bounce on each beat with stagger — larger squares lag slightly and peak lower; smallest
 * leads and rises highest (telescoping apex). Palettes alternate every beat.
 *
 * Sized from a 130px reference: outer 150px, margin and bounce scale proportionally.
 */
const BASE_STACK = 130;
const STACK_SIZE = 150;
const MARGIN = (15 * STACK_SIZE) / BASE_STACK;
const SIZES = [
  STACK_SIZE,
  STACK_SIZE - MARGIN * 2,
  STACK_SIZE - MARGIN * 4,
  STACK_SIZE - MARGIN * 6,
];

/** Outer → inner: original set */
const PALETTE_A = [
  [107, 75, 214],
  [217, 70, 239],
  [245, 158, 11],
  [254, 249, 195],
];

/** Outer → inner: yellow, gold orange, lavender, blue-violet (alternate on each beat) */
const PALETTE_B = [
  "#FFE13F",
  "#FFB000",
  "#D25FC1",
  [114, 63, 255],
];

/** Peak upward offset for the innermost moving square (px); p5 Y grows downward */
const BOUNCE_AMPLITUDE = (14 * STACK_SIZE) / BASE_STACK;
/** One full up → down cycle per layer (each layer uses the same curve length) */
const BOUNCE_DURATION_MS = 380;

/**
 * Layer index 1 = largest moving square … 3 = smallest.
 * Larger → more start delay (ms) so motion lags slightly behind inner rings.
 */
const BOUNCE_LAYER_LAG_MS = [0, 24, 12, 0];

/**
 * Peak height scale per layer at global apex (largest rises least, smallest most — reference pose).
 */
const BOUNCE_LAYER_PEAK_AMP = [0, 0.72, 0.86, 1];

/** p5 fill from either "#RRGGBB" or [r, g, b] (code uses both palette formats). */
function applyPaletteFill(renderer, color) {
  if (typeof color === "string") {
    renderer.fill(color);
  } else if (Array.isArray(color) && color.length >= 3) {
    renderer.fill(color[0], color[1], color[2]);
  }
}

/** Ease-in-out quadratic (0→1), for “parabolic” feel on timing */
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * Displacement factor: 0 at start/end, smooth peak mid — parabolic arch with eased time.
 * Uses sin²(π·e) with e = easeInOutQuad(u) so velocity eases in and out.
 */
function bounceDisplacementFactor(u) {
  if (u <= 0) return 0;
  if (u >= 1) return 0;
  const e = easeInOutQuad(u);
  const s = Math.sin(Math.PI * e);
  return s * s;
}

new p5((p) => {
  let wrapperEl;
  let stackBase;

  /** Palette from shared beat count: even → A, odd → B */
  function paletteForBeatCount(n) {
    return n % 2 === 0 ? PALETTE_A : PALETTE_B;
  }

  let lastBeatCountForPalette = -1;
  let movingPalette = PALETTE_A;

  /** Last seen beat counter; when it changes, start a new bounce */
  let lastBeatCountForBounce = null;
  let bounceStartMs = 0;

  function syncPaletteFromBeat() {
    const n =
      typeof MovementBeatDetection !== "undefined" &&
      typeof MovementBeatDetection.getBeatCount === "function"
        ? MovementBeatDetection.getBeatCount()
        : 0;
    if (n !== lastBeatCountForPalette) {
      lastBeatCountForPalette = n;
      movingPalette = paletteForBeatCount(n);
      buildStackBase(movingPalette);
    }
  }

  function buildStackBase(palette) {
    stackBase = p.createGraphics(STACK_SIZE, STACK_SIZE);
    stackBase.pixelDensity(2);
    stackBase.rectMode(p.CENTER);
    const cx = STACK_SIZE / 2;
    const cy = STACK_SIZE / 2;
    stackBase.noStroke();
    applyPaletteFill(stackBase, palette[0]);
    stackBase.rect(cx, cy, SIZES[0], SIZES[0]);
  }

  function drawMovingSquares(palette) {
    p.push();
    p.translate(STACK_SIZE / 2, STACK_SIZE / 2);
    p.rectMode(p.CENTER);
    p.noStroke();
    for (let i = 1; i < 4; i++) {
      applyPaletteFill(p, palette[i]);
      p.rect(0, bounceOffsetYForLayer(i), SIZES[i], SIZES[i]);
    }
    p.pop();
  }

  /** Per-layer bounce: delayed start for larger squares, lower peak amplitude for larger. */
  function bounceOffsetYForLayer(layerIndex) {
    const lag = BOUNCE_LAYER_LAG_MS[layerIndex] ?? 0;
    const peakAmp = BOUNCE_LAYER_PEAK_AMP[layerIndex] ?? 1;
    const elapsed = p.millis() - bounceStartMs - lag;
    if (elapsed < 0) return 0;
    if (elapsed >= BOUNCE_DURATION_MS) return 0;
    const u = elapsed / BOUNCE_DURATION_MS;
    const f = bounceDisplacementFactor(u);
    return -BOUNCE_AMPLITUDE * peakAmp * f;
  }

  p.setup = () => {
    wrapperEl = document.getElementById("faceSquaresWrapper");
    if (!wrapperEl) {
      console.warn("[face-squares] #faceSquaresWrapper missing");
      return;
    }
    p.createCanvas(STACK_SIZE, STACK_SIZE).parent(wrapperEl);
    lastBeatCountForPalette = -1;
    syncPaletteFromBeat();

    const n =
      typeof MovementBeatDetection !== "undefined" &&
      typeof MovementBeatDetection.getBeatCount === "function"
        ? MovementBeatDetection.getBeatCount()
        : 0;
    lastBeatCountForBounce = n;
  };

  p.draw = () => {
    if (!wrapperEl) return;

    p.clear();

    syncPaletteFromBeat();

    const bc =
      typeof MovementBeatDetection !== "undefined" &&
      typeof MovementBeatDetection.getBeatCount === "function"
        ? MovementBeatDetection.getBeatCount()
        : 0;

    if (lastBeatCountForBounce !== null && bc !== lastBeatCountForBounce) {
      bounceStartMs = p.millis();
      lastBeatCountForBounce = bc;
    }

    if (stackBase) {
      p.image(stackBase, 0, 0);
    }

    drawMovingSquares(movingPalette);
  };
});
