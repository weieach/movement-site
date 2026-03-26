let bgm;
let vid;
let vidDither;
let largeMaskImg;
let pacmanGif;
let statusFont;
let skyBG;

let rotatingBoxLayer;

let statusText = "click to play";
let amp;

let bodyPose;
let poses = [];

let connections;

let beatColor = "red";
let beatColorSwitch = false;
let beatPairCounter = 0;
let flashUntilMs = 0;

let bgmMidi;

// Beat thresholds/state live in beat-detection-shared.js (shared with face-squares.js)
const beat = MovementBeatDetection.beat;

let dancerWrapper;
const aspect = 1728 / 990;

/**
 * In WEBGL, mouseX/mouseY (and pmouse*) can be undefined/NaN until interaction — feeding line()
 * breaks p5 internals (p5.Vector.prototype.mult warnings every frame).
 */
function movementSiteMouseLineCoords(offsetX, offsetY) {
  if (
    ![offsetX, offsetY].every(
      (v) => typeof v === "number" && Number.isFinite(v)
    )
  ) {
    return null;
  }
  const x0 = pmouseX + offsetX;
  const y0 = pmouseY + offsetY;
  const x1 = mouseX + offsetX;
  const y1 = mouseY + offsetY;
  const ok = [x0, y0, x1, y1].every(
    (v) => typeof v === "number" && Number.isFinite(v)
  );
  return ok ? [x0, y0, x1, y1] : null;
}

/** ml5 keypoints: flat x/y or PoseNet-style position; skip bad values to avoid p5.Vector.mult spam in WEBGL line(). */
function movementSiteKeypointXY(kp) {
  if (!kp) return null;
  let x = kp.x;
  let y = kp.y;
  if (typeof x !== "number" || typeof y !== "number") {
    const p = kp.position;
    if (p && typeof p.x === "number" && typeof p.y === "number") {
      x = p.x;
      y = p.y;
    }
  }
  x = Number(x);
  y = Number(y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

/**
 * After "play from here" while paused: bgm time jumps immediately; videos keep old frame until Play.
 * Cleared when playback starts (control bar or any resume path).
 */
let pendingVideoSyncTime = null;

/** Reliable clock for sync: p5 SoundFile often reports currentTime() as 0 while paused. */
function movementSiteReadPlaybackSeconds() {
  const el = (v) =>
    v && v.elt && typeof v.elt.currentTime === "number"
      ? v.elt.currentTime
      : NaN;
  const tv = el(vid);
  const td = el(vidDither);
  if (Number.isFinite(tv) && tv >= 0) return tv;
  if (Number.isFinite(td) && td >= 0) return td;
  if (bgm && typeof bgm.currentTime === "function") {
    const c = bgm.currentTime();
    if (Number.isFinite(c) && c >= 0) return c;
  }
  if (pendingVideoSyncTime != null && Number.isFinite(pendingVideoSyncTime)) {
    return pendingVideoSyncTime;
  }
  return 0;
}

function movementSiteStartPlaybackSynced() {
  if (!bgm) return;

  // Only seek when there's a pending scrub time (from seekTo while paused).
  // For plain pause→resume, just loop — the video element already holds its position.
  if (pendingVideoSyncTime != null) {
    const t = pendingVideoSyncTime;
    pendingVideoSyncTime = null;
    if (vid && typeof vid.time === "function") vid.time(t);
    if (vidDither && typeof vidDither.time === "function") vidDither.time(t);
  }

  if (vid) vid.loop();
  if (vidDither) vidDither.loop();
  bgm.play();

  window.dispatchEvent(
    new CustomEvent("movementPlaybackChange", {
      detail: { playing: true },
    })
  );
}

/** Seek audio + (when playing) videos; when paused, only audio moves — videos sync on next play. */
function movementSiteSeekTo(seconds) {
  if (!bgm) return;
  const dur =
    typeof bgm.duration === "function" && bgm.duration() > 0
      ? bgm.duration()
      : 180;
  const t = Math.max(0, Math.min(Number(seconds) || 0, dur));
  const wasPlaying = bgm.isPlaying();

  pendingVideoSyncTime = null;

  try {
    bgm.jump(t);
  } catch (e) {
    console.warn("[dancer] bgm.jump failed", e);
    return;
  }

  if (wasPlaying) {
    if (vid && typeof vid.time === "function") vid.time(t);
    if (vidDither && typeof vidDither.time === "function") vidDither.time(t);
  } else {
    pendingVideoSyncTime = t;
    if (bgm.isPlaying()) {
      bgm.pause();
    }
    if (vid) vid.pause();
    if (vidDither) vidDither.pause();
  }
}

function preload() {
  bgm = loadSound("data/attention (with Justin Bieber) 2.mp3");
  // bpm = 120
  vid = createVideo("data/dance(cropped).mp4");
  //  vid = createVideo("data/dance_duo(cropped).mp4");
  vidDither = createVideo("data/dancer-dithered.mp4");
  largeMaskImg = loadImage("data/large mask.png");
  bodyPose = ml5.bodyPose();
  pacmanGif = loadImage("data/pacman.gif");
  statusFont = loadFont("data/Rungli-Italic.otf");
  bgmMidi = loadJSON("data/VisiPiano.json");
  skyBG = loadImage("data/sky-bg.jpeg")
}

function setup() {
  dancerWrapper = document.getElementById("dancerWrapper");
  let w = window.innerHeight * aspect;
  let h = window.innerHeight;
  let dancerCanvas = createCanvas(w, h, WEBGL).parent(dancerWrapper);
  resizeToWrapper();
  pixelDensity(2);
  rotatingBoxLayer = createGraphics(width, height, WEBGL);



  amp = new p5.Amplitude();
  amp.setInput(bgm);
  window.movementSiteAudio = {
    amp,
    bgm,
    _bgmMuteSavedVol: 1,
    isBgmMuted: false,
    pausePlayback() {
      if (bgm) bgm.pause();
      if (vid) vid.pause();
      if (vidDither) vidDither.pause();
    },
    resumePlayback() {
      movementSiteStartPlaybackSynced();
    },
    seekTo(seconds) {
      movementSiteSeekTo(seconds);
    },
    /** Timeline UI while paused: p5 SoundFile often doesn’t update currentTime() after jump until play. */
    getUiPlaybackTime() {
      if (!bgm) return 0;
      if (!bgm.isPlaying()) {
        if (pendingVideoSyncTime != null) return pendingVideoSyncTime;
        return movementSiteReadPlaybackSeconds();
      }
      return typeof bgm.currentTime === "function" ? bgm.currentTime() : 0;
    },
    isPlaybackPlaying() {
      return !!(bgm && bgm.isPlaying());
    },
    /** @returns {boolean} true if playing after toggle */
    togglePlayback() {
      if (this.isPlaybackPlaying()) {
        this.pausePlayback();
      } else {
        this.resumePlayback();
      }
      return this.isPlaybackPlaying();
    },
    /** @returns {boolean} true if muted after toggle */
    toggleMute() {
      if (!bgm || typeof bgm.setVolume !== "function") {
        return this.isBgmMuted;
      }
      this.isBgmMuted = !this.isBgmMuted;
      if (this.isBgmMuted) {
        if (typeof bgm.getVolume === "function") {
          const v = bgm.getVolume();
          if (typeof v === "number" && Number.isFinite(v) && v > 0) {
            this._bgmMuteSavedVol = v;
          }
        }
        bgm.setVolume(0);
      } else {
        bgm.setVolume(this._bgmMuteSavedVol);
      }
      window.dispatchEvent(
        new CustomEvent("movementMuteChange", {
          detail: { muted: this.isBgmMuted },
        })
      );
      return this.isBgmMuted;
    },
  };
  rectMode(CENTER);
  let videoAspect = 1944 / 1690;
  vid.size(height * videoAspect, height);
  vid.hide();

  bodyPose.detectStart(vid, gotPoses);
  connections = bodyPose.getSkeleton();
  textFont(statusFont);

  vidDither.hide();
  vidDither.volume(0);
  DitherMask.setMedia(vidDither, largeMaskImg);
  DitherMask.resizeDitherMaskLayer(
    vidDither,
    largeMaskImg,
    dancerWrapper,
    width,
    height
  );
  DitherMask.initOverlayCanvas();
}

function drawMaskedDitherVideo() {
  const masked = DitherMask.updateMaskedDither(vidDither, largeMaskImg);
  if (!masked) return;

  const r = DitherMask.getDrawRect();
  if (
    !r ||
    ![r.x, r.y, r.w, r.h].every(
      (v) => typeof v === "number" && Number.isFinite(v)
    )
  ) {
    return;
  }
  push();
  translate(-width / 2, -height / 2);
  noLights();
  textureMode(IMAGE);
  blendMode(DARKEST);
  image(masked, r.x, r.y, r.w, r.h);
  blendMode(BLEND);
  pop();
}

function draw() {
  // background(240);
  // pointLight(255, 255, 255, 30, -40, 30);


  


  if (largeMaskImg && largeMaskImg.width && !DitherMask.hasBuffers()) {
    DitherMask.resizeDitherMaskLayer(
      vidDither,
      largeMaskImg,
      dancerWrapper,
      width,
      height
    );
  }

  drawMaskedDitherVideo();

  // imageLight(pacmanGif);
  push();
  translate(-width / 3, -height * 0.35);
  //   image(vid, 0, 0)

  beatDetection();
  beatDebugUI();

  stroke(beatColor);

  // Draw the skeleton connections (same structure as before polygon-overlay work)
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    if (!pose || !pose.keypoints) continue;

    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];
      if (!pointA || !pointB) continue;

      const confA =
        typeof pointA.confidence === "number"
          ? pointA.confidence
          : typeof pointA.score === "number"
            ? pointA.score
            : 0;
      const confB =
        typeof pointB.confidence === "number"
          ? pointB.confidence
          : typeof pointB.score === "number"
            ? pointB.score
            : 0;

      const pa = movementSiteKeypointXY(pointA);
      const pb = movementSiteKeypointXY(pointB);
      if (!pa || !pb) continue;

      if (j > 3) {
        if (confA > 0.1 && confB > 0.1) {
          strokeWeight(5);
          line(pa.x, pa.y, pb.x, pb.y);
        }
      } else if (j == 1) {
        if (confA > 0.1 && confB > 0.1) {
          noFill();

          push();
          strokeWeight(5);
          translate(pa.x, pa.y, 0);
          circle(0, 0, 100);
          pop();
        }
      }
    }
  }
  
  pop();

    rotatingBoxLayer.clear();
  // rotatingBoxLayer.blendMode(SCREEN);
  rotatingBoxLayer.push();
  // rotatingBoxLayer.image(skyBG, 0, 0)
  rotatingBoxLayer.translate(0, 0, -width/2);
  rotatingBoxLayer.rotateY(frameCount / 400);
  // rotatingBoxLayer.background("#000000");
  rotatingBoxLayer.noFill();
  rotatingBoxLayer.stroke("#434343");
  rotatingBoxLayer.box(width* 1.5, height*1.5, width/1.5);
  rotatingBoxLayer.pop();

  image(rotatingBoxLayer, -width/2 + 47, -height/2);
  

  push();
  textSize(30);
  fill(0);
  noStroke();
  textAlign(CENTER, TOP);
  // text(statusText, 0, -width / 3.7);
  pop();

  // Expose poses for external readers (pose-polygon-overlay.js) — after all drawing is done
  window.movementSitePoses = poses;
}

// function mousePressed() {
//   if (bgm.isPlaying()) {
//     bgm.pause();
//     vid.pause();
//     vidDither.pause();
//     statusText = `bgm is paused`;
//   } else {
//     bgm.play();
//     vid.loop();
//     vidDither.loop();
//     statusText = `click anywhere to jump position in song`;
//   }
//   window.dispatchEvent(
//     new CustomEvent("movementPlaybackChange", {
//       detail: { playing: !!(bgm && bgm.isPlaying()) },
//     })
//   );
// }

// Callback function for when the model returns pose data
function gotPoses(results) {
  if (Array.isArray(results)) {
    poses = results;
  } else if (results && results.keypoints) {
    poses = [results];
  } else {
    poses = [];
  }
}

// beat detect

function beatDetection() {
  const { beatTriggered } = MovementBeatDetection.step(amp, max);

  if (beatTriggered) {
    flashUntilMs = millis() + 120;
  }
  const isFlashing = millis() < flashUntilMs;

  if (isFlashing) {
    beatColorSwitch = !beatColorSwitch;
    beatPairCounter++;
    if (beatPairCounter % 5 == 0) {
      clear();
    }
  }

  let offsetX = -width / 6;
  let offsetY = -height / 6;
  const mouseSeg = movementSiteMouseLineCoords(offsetX, offsetY);

  if (beatColorSwitch) {
    // beatColor = "#7b34ff";
    let r = map(sin(frameCount), -1, 1, 50, 123);
    beatColor = color(r, 52, 255);
    if (bgm.isPlaying() && mouseSeg) {
      stroke("#77a03d");
      strokeWeight(5);
      line(mouseSeg[0], mouseSeg[1], mouseSeg[2], mouseSeg[3]);
    }
  } else {
    // beatColor = "#77a03d";
    let r = map(sin(frameCount), -1, 1, 30, 123);
    beatColor = color(r, 160, 62);
    if (bgm.isPlaying() && mouseSeg) {
      stroke("#7b34ff");
      strokeWeight(5);
      line(mouseSeg[0], mouseSeg[1], mouseSeg[2], mouseSeg[3]);
    }
  }

  if (typeof window !== "undefined") {
    window.movementSiteBeat = window.movementSiteBeat || {};
    window.movementSiteBeat.beatColorSwitch = beatColorSwitch;
  }

  // stroke(isFlashing ? "red" : "green");
  // fill(isFlashing ? 255 : 80, isFlashing ? 80 : 180, isFlashing ? 120 : 255);
  // circle(width * 0.5, height * 0.5, 180);
}

function beatDebugUI() {
  //   fill(230);
  //   textSize(14);
  //   text(`level: ${nf(level, 1, 3)}`, 20, 28);
  //   text(`threshold: ${nf(beat.threshold, 1, 3)}`, 20, 48);
  //   text(`hold: ${beat.holdTimeMs}ms`, 20, 68);
  //   // Optional: show bars for level & threshold
  //   const barW = 260;
  //   const levelW = constrain(map(level, 0, 0.4, 0, barW), 0, barW);
  //   const thrW   = constrain(map(beat.threshold, 0, 0.4, 0, barW), 0, barW);
  //   noStroke();
  //   fill(70);
  //   rect(20, 85, barW, 10, 4);
  //   fill(0, 200, 255);
  //   rect(20, 85, levelW, 10, 4);
  //   fill(70);
  //   rect(20, 105, barW, 10, 4);
  //   fill(255, 160, 60);
  //   rect(20, 105, thrW, 10, 4);
}

function windowResized() {
  resizeToWrapper();
}

function resizeToWrapper() {
  if (!dancerWrapper) return;

  // Match #dancerWrapper CSS: height = 100vh, width = height * aspect-ratio
  const vh = window.innerHeight;
  const h = vh;
  const w = vh * aspect;

  resizeCanvas(w, h);
  if (
    !rotatingBoxLayer ||
    rotatingBoxLayer.width !== width ||
    rotatingBoxLayer.height !== height
  ) {
    rotatingBoxLayer = createGraphics(width, height, WEBGL);
    rotatingBoxLayer.pixelDensity(1);
  }

  const videoAspect = 1944 / 1690;
  vid.size(height * videoAspect, height);

  DitherMask.resizeDitherMaskLayer(
    vidDither,
    largeMaskImg,
    dancerWrapper,
    width,
    height
  );
}
