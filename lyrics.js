/**
 * Lyrics for "Attention" — one string per line (including section labels).
 * Import: import { lyrics } from ’./lyrics.js’;
 */
export const lyrics = [
  "Lately, I been losin’ my mind",
  "Certain things I can’t find",
  "In the middle of the night",
  "I’m still up, I’m still tryna decide",
  "Should I drink up? Smoke up?",
  "Need some freedom, freedom, ah, in my life",
  "Should I drink up? Smoke up?",
  "Need some freedom, freedom",
  // verse 2
  "Show me a little attention (Oh, oh, oh, oh)",
  "A little attention (Oh, oh)",
  "Show me atten’ (Oh, oh, mmm-mmm)",
  "Show me a little attention, yeah, yeah (Oh, oh)",
  "Show me a little attention",
  // bridge
  "Little love and some affection on the side",
  "Little trust and some passion would be nice",
  "It’s all I desire",
  "I need it, I cannot deny",
  "Oh, ayy, I don’t see something",
  "For my eyes only",
  "Ain’t no emoji, cry him only, ah",
  "Ain’t no emoji, my mind’s lonely",
  // pre-chorus
  "Show me a little attention (Oh, oh, oh, oh)",
  "A little attention (Oh, oh)",
  "Show me attention (Oh, oh, mmm-mmm)",
  "Show me a little attention, nah (Oh, oh)",
  "Show me a little attention",
  // verse 3
  "Lately, I been losin’ my mind",
  "Certain things I can’t find",
  "In the middle of the night",
  "I’m still up, I’m still tryna decide",
  // pre-chorus
  "Should I drink up? Smoke up?",
  "I need some freedom, freedom, ah, in my life",
  "Should I drink up? (Oh-oh) Smoke up? (Oh)",
  "Need some (Oh), freedom (Oh), freedom",
  // chorus
  "Show me a little attention (Oh, oh, oh, oh)",
  "A little attention (Oh, oh)",
  "Show me attention (Oh, oh, mmm-mmm)",
  "Show me a little attention, yeah (Oh, oh)",
  "Show me a little attention",
];

export const lyricsTimecode = [
  18, 
  22, 
  26, 
  29, 
  33, 
  36, 
  41, 
  44, 
  // verse 2
  48, 
  51, 
  54, 
  58, 
  62, 
  // verse 3
  65, 
  69, 
  74, 
  77, 
  82, 
  85, 
  87, 
  91, 
  // verse 4
  94, 
  99, 
  102, 
  106, 
  110,
  // verse 5
  114, 
  118, 
  122,
  126, 
  129,
  131, 
  137, 
  140, 
  // verse 6
  144, 
  147, 
  150, 
  154, 
  158,
];

// new p5((ly) => {
//   let lyricsFont;
//   let wrapperLyrics;

//   ly.preload = () => {
//     lyricsFont = ly.loadFont("data/Rungli-Italic.otf");
//   };

//   ly.setup = () => {
//     wrapperLyrics = document.getElementById("lyricsWrapper");
//     if (!wrapperLyrics) {
//       console.error("[lyrics] #lyricsWrapper not found");
//       return;
//     }

//     const { width, height } = wrapperLyrics.getBoundingClientRect();
//     const w = Math.max(1, Math.floor(width));
//     const h = Math.max(1, Math.floor(height));

//     ly.createCanvas(w, h).parent(wrapperLyrics);
//     if (lyricsFont) {
//       ly.textFont(lyricsFont);
//     }
//     ly.textSize(18);
//     ly.fill(255);
//     ly.textAlign(ly.LEFT, ly.TOP);

//     requestAnimationFrame(() => layoutCanvasToWrapper());
//   };

//   function layoutCanvasToWrapper() {
//     if (!wrapperLyrics) return;
//     const r = wrapperLyrics.getBoundingClientRect();
//     const w = Math.max(1, Math.floor(r.width));
//     const h = Math.max(1, Math.floor(r.height));
//     ly.resizeCanvas(w, h);
//   }

//   ly.windowResized = () => {
//     layoutCanvasToWrapper();
//   };

//   ly.draw = () => {
    
//       ly.push();
//       ly.background(30, 30, 35);
//       ly.fill(255);
//       for (let i = 0; i < lyrics.length; i++) {
//         ly.text(lyrics[i], 0, i * 20);
//       }
//       ly.pop();
//   };
// });

