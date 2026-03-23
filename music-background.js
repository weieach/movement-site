import { notes, timecode } from './midi-pitches.js';
import { lyrics, lyricsTimecode } from './lyrics.js';

// Instance mode so it doesn't clash with dancer.js (global mode).
new p5((mb) => {
  /** Matches site gutter; full-height seek strip from canvas left edge. */
  const PLAYFROM_LEFT_GUTTER_PX = 47;

  let wrapperEl;
  let rectW;
  let rectH;
  let bgmMidi;
  let ballPillFont;
  let enlargePlayhead = false;
  let playheadSize = 8;
  let playheadMaxSize = 11;
  let playheadMinSize = 8;
  /** "play from here" label — same click pulse as playhead in band zones */
  let enlargePlayFromLabel = false;
  let playFromLabelSize = 16;
  const PLAYFROM_LABEL_MIN = 16;
  const PLAYFROM_LABEL_MAX = 16.5;
  let lyricsFont;
  let sonomaFont;

  function sizeToWrapper() {
    if (!wrapperEl) return;
    const { width, height } = wrapperEl.getBoundingClientRect();
    mb.resizeCanvas(Math.floor(width), Math.floor(height));
  }

  /** e.g. 65 → "1:05", 0 → "0:00" */
  function formatTimeMmSs(seconds) {
    const s = Math.max(0, Math.round(Number(seconds) || 0));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  mb.preload = () => {
    lyricsFont = mb.loadFont("data/ExposureTrial[-20].otf");
    sonomaFont = mb.loadFont("data/BRSonoma(regular).otf");
    ballPillFont = mb.loadFont(
      "data/ballpill-regular.otf",
      () => console.log("[music-background] font loaded"),
      (err) => console.error("[music-background] font failed to load", err)
    );
  };

  mb.setup = () => {
    wrapperEl = document.getElementById("musicBackgroundWrapper");

    const { width, height } = wrapperEl.getBoundingClientRect();
    mb.createCanvas(Math.floor(width), Math.floor(height), mb.WEBGL).parent(wrapperEl);
    // mb.createCanvas(Math.floor(width), Math.floor(height)).parent(wrapperEl);
    mb.pixelDensity(2);
    mb.rectMode(mb.CENTER);
    rectH = mb.height / (notes.length);
    mb.textFont(ballPillFont);


  };

  mb.draw = () => {
    mb.background(0);
    mb.fill(0);
    mb.noStroke();
    mb.push();
    // mb.blendMode(mb.ADD);
    mb.translate(0, -mb.height / 2);

    for (let i = 0; i < notes.length; i++) {
      mb.fill(40)
      rectW = mb.map(notes[i], 29, 86, 50, mb.width - 100) / 1.2;
      mb.push();
      mb.translate(0, i * rectH);
      mb.rect(0, 0, rectW, rectH);
      mb.pop();


      mb.fill(200)

      if (i % 20 == 0) {
        mb.push();
        mb.translate(-mb.width / 2 + 15, 0);
        mb.translate(0, i * rectH);
        mb.text(`${Math.round(timecode[i])}s`, 0, 0)
        mb.pop();
      }
    }

    const audioApi = window.movementSiteAudio;
    const durForUi =
      typeof bgm !== "undefined" &&
      bgm &&
      typeof bgm.duration === "function" &&
      bgm.duration() > 0
        ? bgm.duration()
        : 180;
    const tUi =
      audioApi && typeof audioApi.getUiPlaybackTime === "function"
        ? audioApi.getUiPlaybackTime()
        : typeof bgm !== "undefined" && bgm && typeof bgm.currentTime === "function"
          ? bgm.currentTime()
          : 0;
    let songCurrentProgress =
      durForUi > 0 ? mb.constrain(tUi / durForUi, 0, 1) : 0;

    for (let i = 0; i < songCurrentProgress * notes.length; i++) {
      // mb.stroke(150);
      mb.stroke(50);
      if (i % 4 == 0) {
        // mb.fill(mb.map(mb.sin(mb.radians(mb.frameCount + i * 2)), -1, 1, 150, 255));
        mb.fill(mb.map(mb.sin(mb.radians(mb.frameCount + i * 2)), -1, 1, 20, 80));
      } else {
        mb.fill(mb.map(mb.cos(mb.radians(mb.frameCount + i * 2)), -1, 1, 20, 80));
      }
      rectW = mb.map(notes[i], 29, 86, 50, mb.width - 100) / 1.1 + 180;
      mb.push();
      mb.translate(0, i * rectH);
      mb.rect(0, 0, rectW, rectH);
      mb.pop();
    }

    if (enlargePlayhead) {
      if (playheadSize < playheadMaxSize) {
        playheadSize += 1;
      } else {
        enlargePlayhead = false;
      }
    } else if (playheadSize > playheadMinSize) {
      playheadSize -= 1.5;
    }

    if (enlargePlayFromLabel) {
      if (playFromLabelSize < PLAYFROM_LABEL_MAX) {
        playFromLabelSize += 0.4;
      } else {
        enlargePlayFromLabel = false;
      }
    } else if (playFromLabelSize > PLAYFROM_LABEL_MIN) {
      playFromLabelSize -= 0.5;
    }


    // timecode indicator & playhead indicator
    mb.push();
    mb.translate(-mb.width / 2 + 47, 0);
    let timePosY = songCurrentProgress * mb.height;
    mb.rect(-25, timePosY, 30, 0.5);
    mb.fill(200);
    mb.stroke(50);
    // const triSide = 20;
    // const triHeight = (Math.sqrt(3) / 2) * triSide;
    // mb.triangle(
    //   0,
    //   mb.mouseY,
    //   triHeight,
    //   mb.mouseY - triSide / 2,
    //   triHeight,
    //   mb.mouseY + triSide / 2
    // );
    mb.circle(-25, mb.mouseY, playheadSize);
    mb.pop();


    // lyrics
    mb.textFont(lyricsFont);

    for (let i = 0; i < lyrics.length; i++) {
      mb.fill("#FFB000");
      if(i %2 == 0){
        mb.fill("#141414");
      } else {
        mb.fill("#AFB8B3");
      }
      mb.push();
      
      mb.translate(-(mb.width-47) / 30.5, lyricsTimecode[i] / 180 * mb.height);
      let lyricHeight = lyricsTimecode[i+1] / 180 * mb.height - lyricsTimecode[i] / 180 * mb.height;
      mb.rect(0, 0, mb.width * 0.2, lyricHeight);
      if(i %2 == 0){
        mb.fill("#AFB8B3");
      } else {
        mb.fill("#141414");
      }
      let timeDifference = lyricsTimecode[i+1] - lyricsTimecode[i];
      let lyricTextsize = timeDifference / lyrics[i].length * 250;
      mb.textSize(lyricTextsize);
      mb.text(lyrics[i], 10, lyricHeight / 3, mb.width * 0.18-20, lyricHeight);
      mb.pop();
    }

    

    const mxN = mb.width > 0 ? mb.mouseX / mb.width : 0;
    const inLeftGutter =
      mb.mouseX >= 0 && mb.mouseX <= PLAYFROM_LEFT_GUTTER_PX;
    const inOtherPlayFromBands =
      (mxN > 0.16 && mxN < 0.368) || (mxN > 0.567 && mxN < 0.869);
    const showPlayFromHere = inLeftGutter || inOtherPlayFromBands;
    if (showPlayFromHere) {
      mb.fill(255);
      mb.push();
      mb.translate(-mb.width / 2, 0);
      mb.stroke(80);
      mb.strokeWeight(2);
      const dashY = mb.mouseY;
      const dashLen = 14;
      const gapLen = 14;
      for (let x = 34; x < mb.width; x += dashLen + gapLen) {
        const xEnd = Math.min(x + dashLen, mb.width);
        mb.line(x, dashY, xEnd, dashY);
      }
      if (!inLeftGutter) {
        mb.textAlign(mb.CENTER);
        mb.textSize(playFromLabelSize);
        mb.fill(255);
        const apiHint = window.movementSiteAudio;
        const durHint =
          apiHint &&
          apiHint.bgm &&
          typeof apiHint.bgm.duration === "function" &&
          apiHint.bgm.duration() > 0
            ? apiHint.bgm.duration()
            : 180;
        const previewSec = (mb.mouseY / mb.height) * durHint;
        mb.text(
          `play from here (${formatTimeMmSs(previewSec)})`,
          mb.mouseX,
          mb.mouseY + 5
        );
      }
      mb.pop();
    }
  };

  mb.windowResized = () => {
    sizeToWrapper();

  };

  

  mb.mousePressed = () => {
    const w = mb.width;
    const mxN = w > 0 ? mb.mouseX / w : 0;
    const inLeftGutter =
      mb.mouseX >= 0 && mb.mouseX <= PLAYFROM_LEFT_GUTTER_PX;
    const inOtherPlayFromBands =
      (mxN > 0.16 && mxN < 0.368) || (mxN > 0.567 && mxN < 0.869);
    if (!inLeftGutter && !inOtherPlayFromBands) return;

    if (inOtherPlayFromBands) {
      enlargePlayhead = true;
      enlargePlayFromLabel = true;
    }

    const h = mb.height;
    if (h < 1) return;

    /**
     * Same mapping as the playhead: songCurrentProgress * mb.height (mouseY 0…h from top).
     * Uses movementSiteAudio.seekTo so paused scrubs update bgm time; videos jump on Play.
     */
    const progress = mb.constrain(mb.mouseY / h, 0, 1);
    const api = window.movementSiteAudio;
    const dur =
      api && api.bgm && api.bgm.duration() > 0 ? api.bgm.duration() : 180;
    const targetSec = progress * dur;

    if (api && typeof api.seekTo === "function") {
      api.seekTo(targetSec);
    } else if (typeof bgm !== "undefined" && bgm) {
      bgm.jump(targetSec);
    }
  };
});
