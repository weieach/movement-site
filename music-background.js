import { notes, timecode } from './midi-pitches.js';

// Instance mode so it doesn't clash with dancer.js (global mode).
new p5((mb) => {
  let wrapperEl;
  let rectW;
  let rectH;
  let bgmMidi;
  let rungliFont;

  function sizeToWrapper() {
    if (!wrapperEl) return;
    const { width, height } = wrapperEl.getBoundingClientRect();
    mb.resizeCanvas(Math.floor(width), Math.floor(height));
  }

  mb.preload = () => {
    rungliFont = mb.loadFont(
      "data/Rungli-Italic.otf",
      () => console.log("[music-background] font loaded"),
      (err) => console.error("[music-background] font failed to load", err)
    );
  };

  mb.setup = () => {
    wrapperEl = document.getElementById("musicBackgroundWrapper");

    const { width, height } = wrapperEl.getBoundingClientRect();
    mb.createCanvas(Math.floor(width), Math.floor(height), mb.WEBGL).parent(wrapperEl);
    mb.pixelDensity(2);
    mb.rectMode(mb.CENTER);
    rectH = mb.height / (notes.length);
    mb.textFont(rungliFont);
    

  };

  mb.draw = () => {
    mb.background(250);
    mb.fill(0);
    mb.noStroke();
    mb.push();
    // mb.blendMode(mb.ADD);
mb.translate(0, -mb.height / 2);

    for (let i = 0; i < notes.length; i++) {
      if (i % 4 == 0) {
        mb.fill(mb.map(mb.sin(mb.radians(mb.frameCount + i * 2)), -1, 1, 150, 255));
      } else {
        mb.fill(mb.map(mb.cos(mb.radians(mb.frameCount + i * 2)), -1, 1, 200, 255));
      }
      rectW = mb.map(notes[i], 29, 86, 50, mb.width - 100);
      mb.rect(0, i * rectH, rectW, rectH);

      if (notes[i] > 65){
        // mb.fill(150)
        mb.stroke(150);
        mb.rect(0, i * rectH, 50, 50);
      }

      mb.fill("#7B34FF")
      
      if(i % 20 == 0){
        mb.text(`${Math.round(timecode[i])}s`, 0, i*rectH)
      }

      
      
    }

  };

  mb.windowResized = () => {
    sizeToWrapper();

  };

});

