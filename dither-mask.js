/**
 * Dither video + large-mask.png compositing for the dancer canvas (global p5).
 * Load before dancer.js. Call setMedia, resize from setup / windowResized; call update each frame,
 * then draw the returned image with your own blend mode (e.g. DARKEST in dancer.js).
 *
 * Also provides a second p5 canvas (#ditherMaskCanvasWrapper) that shows the same masked frame,
 * fixed at left: 47px, full mask size (matches large-mask layout on screen).
 */
(function (global) {
  let ditherComp;
  let maskedDitherFrame;
  let maskScaled;
  /** Latest composited frame (shared by dancer draw + overlay canvas). */
  let lastMaskedFrame = null;

  let mediaVid = null;
  let mediaImg = null;
  let overlayP5Instance = null;

  const ditherDraw = { x: 0, y: 0, w: 0, h: 0 };

  function getDitherVideoAspectRatio(vidDither) {
    const el = vidDither && vidDither.elt;
    if (el && el.videoWidth > 0 && el.videoHeight > 0) {
      return el.videoWidth / el.videoHeight;
    }
    return 16 / 9;
  }

  /**
   * Mask in CSS space: left 47px, width calc(100vw - 47px), height 100vh.
   * @param {p5.MediaElement} vidDither
   * @param {p5.Image} largeMaskImg
   * @param {HTMLElement} dancerWrapper
   * @param {number} sketchWidth - p5 width
   * @param {number} sketchHeight - p5 height
   */
  function resizeDitherMaskLayer(
    vidDither,
    largeMaskImg,
    dancerWrapper,
    sketchWidth,
    sketchHeight
  ) {
    if (!vidDither || !largeMaskImg || !largeMaskImg.width) return;
    if (!dancerWrapper || !sketchWidth || !sketchHeight) return;

    const canvasEl = dancerWrapper.querySelector("canvas");
    if (!canvasEl) return;

    const rect = canvasEl.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const scaleX = sketchWidth / rect.width;
    const scaleY = sketchHeight / rect.height;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < 48) return;

    const maskWCss = vw - 47;
    const maskHCss = vh;

    ditherDraw.x = (47 - rect.left) * scaleX;
    ditherDraw.y = (0 - rect.top) * scaleY;
    ditherDraw.w = maskWCss * scaleX;
    ditherDraw.h = maskHCss * scaleY;

    const cw = Math.max(1, Math.floor(ditherDraw.w));
    const ch = Math.max(1, Math.floor(ditherDraw.h));

    ditherComp = createGraphics(cw, ch);
    ditherComp.pixelDensity(1);

    maskedDitherFrame = createImage(cw, ch);
    maskScaled = createImage(cw, ch);
    maskScaled.copy(
      largeMaskImg,
      0,
      0,
      largeMaskImg.width,
      largeMaskImg.height,
      0,
      0,
      cw,
      ch
    );

    const va = getDitherVideoAspectRatio(vidDither);
    const coverW = Math.ceil(ch * va);
    vidDither.size(Math.max(cw, coverW), ch);
  }

  /**
   * Renders current video frame into mask buffer; returns masked p5.Image or null.
   */
  function updateMaskedDither(vidDither, largeMaskImg) {
    if (
      !vidDither ||
      !ditherComp ||
      !maskedDitherFrame ||
      !maskScaled ||
      !largeMaskImg ||
      !largeMaskImg.width
    ) {
      return null;
    }

    const vEl = vidDither.elt;
    if (
      !vEl ||
      (typeof vEl.readyState === "number" && vEl.readyState < 2) ||
      !vEl.videoWidth ||
      !vEl.videoHeight ||
      vEl.seeking === true
    ) {
      return lastMaskedFrame;
    }

    const cw = ditherComp.width;
    const ch = ditherComp.height;
    const aspect = getDitherVideoAspectRatio(vidDither);
    const drawH = ch;
    const drawW = drawH * aspect;
    const offsetX = (cw - drawW) / 2;

    try {
      ditherComp.clear();
      ditherComp.image(vidDither, offsetX, 0, drawW, drawH);
      maskedDitherFrame.copy(
        ditherComp,
        0,
        0,
        ditherComp.width,
        ditherComp.height,
        0,
        0,
        maskedDitherFrame.width,
        maskedDitherFrame.height
      );
      maskedDitherFrame.mask(maskScaled);

      lastMaskedFrame = maskedDitherFrame;
      return maskedDitherFrame;
    } catch (_err) {
      /* Chrome WebGPU: importExternalTexture can throw if the video frame has no backing buffer yet */
      return lastMaskedFrame;
    }
  }

  function getLastMaskedFrame() {
    return lastMaskedFrame;
  }

  function setMedia(vidDither, largeMaskImg) {
    mediaVid = vidDither;
    mediaImg = largeMaskImg;
  }

  /**
   * Second sketch: same masked video, full-bleed in the mask region (CSS-aligned with dancer placement).
   * Call once from dancer setup after setMedia + resizeDitherMaskLayer. Draw order: global dancer runs first,
   * then this instance — lastMaskedFrame is current after dancer's updateMaskedDither in the same frame only if
   * dancer draw runs first; if not, overlay may lag one frame. Register this sketch after dancer exists.
   */
  function initOverlayCanvas() {
    const wrap = document.getElementById("ditherMaskCanvasWrapper");
    if (!wrap || overlayP5Instance) return;

    overlayP5Instance = new p5((p) => {
      p.setup = () => {
        const cw = Math.max(1, Math.floor(window.innerWidth - 47));
        const ch = Math.max(1, Math.floor(window.innerHeight));
        p.createCanvas(cw, ch);
      };

      p.draw = () => {
        if (mediaVid && mediaImg && ditherComp) {
          updateMaskedDither(mediaVid, mediaImg);
        }
        const img = lastMaskedFrame;
        if (!img || !img.width) {
          p.clear();
          return;
        }
        p.clear();

        p.image(img, 0, 0, p.width, p.height);

        /* Mouse trail: same logic as dancer.js beatDetection() (offset + beatColorSwitch strokes). */
        const audio = window.movementSiteAudio;
        const playing = audio && audio.bgm && audio.bgm.isPlaying();
        const beatUi = window.movementSiteBeat;
        const beatColorSwitch = !!(beatUi && beatUi.beatColorSwitch);

        const offsetX = 0;
        const offsetY = 0;

        if (playing) {
          const x0 = p.pmouseX + offsetX;
          const y0 = p.pmouseY + offsetY;
          const x1 = p.mouseX + offsetX;
          const y1 = p.mouseY + offsetY;
          const mouseOk = [x0, y0, x1, y1].every(
            (v) => typeof v === "number" && Number.isFinite(v)
          );
          if (mouseOk) {
            if (beatColorSwitch) {
              p.stroke("#77a03d");
              p.strokeWeight(5);
              p.line(x0, y0, x1, y1);
            } else {
              p.stroke("#7b34ff");
              p.strokeWeight(5);
              p.line(x0, y0, x1, y1);
            }
          }
        }

      };

      p.windowResized = () => {
        const cw = Math.max(1, Math.floor(window.innerWidth - 47));
        const ch = Math.max(1, Math.floor(window.innerHeight));
        p.resizeCanvas(cw, ch);
      };
    }, wrap);
  }

  function hasBuffers() {
    return !!ditherComp;
  }

  function getDrawRect() {
    return ditherDraw;
  }

  global.DitherMask = {
    setMedia,
    resizeDitherMaskLayer,
    updateMaskedDither,
    getLastMaskedFrame,
    getDitherVideoAspectRatio,
    getDrawRect,
    hasBuffers,
    initOverlayCanvas,
  };
})(typeof window !== "undefined" ? window : globalThis);
