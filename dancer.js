let bgm;
let vid;
let pacmanGif;
let statusFont;

let statusText = "bgm is paused";
let amp;

let bodyPose;
let poses = [];

let connections;

let beatColor = "red";
let beatColorSwitch = false;
let beatPairCounter = 0;

let bgmMidi;

let beat = {
  threshold: 0.2, // starting threshold (tune), default is 0.15
  decayRate: 0.98, // how fast threshold falls back down (0.90–0.995)
  holdTimeMs: 120, // minimum time between beats (80–200ms)
  lastBeatMs: 0,
  minThreshold: 0.2, // don’t let it decay to 0; default is 0.05
};

let flashUntilMs = 0;

let dancerWrapper;
const aspect = 1728 / 990;



function preload() {
  bgm = loadSound("data/attention (with Justin Bieber) 2.mp3");
  // bpm = 120
  vid = createVideo("data/dance(cropped).mp4");
  //  vid = createVideo("data/dance_duo(cropped).mp4");
  bodyPose = ml5.bodyPose();
  pacmanGif = loadImage("data/pacman.gif");
  statusFont = loadFont("data/Rungli-Italic.otf");
  bgmMidi = loadJSON("data/VisiPiano.json");
}

function setup() {
  dancerWrapper = document.getElementById("dancerWrapper");
  let w = window.innerHeight * aspect;
  let h = window.innerHeight ;
  let dancerCanvas = createCanvas(w, h, WEBGL).parent(dancerWrapper);
  resizeToWrapper();
  pixelDensity(2);


  amp = new p5.Amplitude();
  amp.setInput(bgm);
  rectMode(CENTER);
  let videoAspect = 1944 / 1690;
  vid.size(height * videoAspect, height)
  vid.hide();

  bodyPose.detectStart(vid, gotPoses);
  connections = bodyPose.getSkeleton();
  textFont(statusFont);
}

function draw() {
    // background(240);

  push();
  translate(-width / 3, -height * 0.35);
  ;
  //   image(vid, 0, 0)

  beatDetection();
  beatDebugUI();

  stroke(beatColor);

  // Draw the skeleton connections
  for (let i = 0; i < poses.length; i++) {
    // i detects person
    // if (i > 1) {
    let pose = poses[i];
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];
      //   if ((j = 0)) {
      //     // rect(pointA.x, pointA.y, pointB.x, pointB.y);
      //   }
      if (j > 3) {
        // Only draw a line if we have confidence in both points
        if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
          strokeWeight(4);
          line(pointA.x, pointA.y, pointB.x, pointB.y);
          if (j == 4){
            
            // fill(0);
            // circle(pointA.x, pointA.y, 20);
          }
        }
      } else if (j == 1) {
        if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
          noFill();
          strokeWeight(4);
          circle(pointA.x, pointA.y, 100);
          // image(
          //   pacmanGif,
          //   pointA.x - width / 10,
          //   pointA.y - height / 5,
          //   width / 5,
          //   width / 5,
          // );
          //   sphere(pointA.x - width / 10, pointA.y - height / 5, 200);
        }
      }
    }
    // }
  }
  pop();

  push();
  textSize(30);
  fill(0);
  noStroke();
  textAlign(CENTER, TOP);
  text(statusText, 0, -width / 3.7);
  pop();
}

function mousePressed() {
  if (bgm.isPlaying()) {
    bgm.pause();
    vid.pause();
    statusText = `bgm is paused`;
  } else {
    bgm.play();
    vid.play();
    statusText = `bgm is playing`;
  }
}

// Callback function for when the model returns pose data
function gotPoses(results) {
  // Store the model's results in a global variable
  poses = results;
}




// beat detect

function beatDetection() {
  const level = amp.getLevel();

  // Beat detection (global volume)
  const now = millis();
  const inHold = now - beat.lastBeatMs < beat.holdTimeMs;

  // Detect beat only if we're outside hold window
  if (!inHold && level > beat.threshold) {
    beat.lastBeatMs = now;
    beat.threshold = level; // set new threshold to current volume (your rule)
    flashUntilMs = now + 120; // flash duration (ms)
  }

  

  // Decay threshold over time (your rule)
  beat.threshold = max(beat.minThreshold, beat.threshold * beat.decayRate);
  // Visual: shape changes color on beat
  const isFlashing = now < flashUntilMs;

  if (isFlashing) {
    beatColorSwitch = !beatColorSwitch;
    beatPairCounter++;
    if(beatPairCounter %5 == 0){
        // fill(240,50)
        // opacity(0.2)
        // rect(100,100,2500, 2000)
        // background(240);
        clear();
    }
     
  }

  let offsetX = - width / 6;
    let offsetY = - height / 6;

  if (beatColorSwitch) {
    
    beatColor = "#7b34ff";
    if(bgm.isPlaying()){
          fill("#7b34ff")
    stroke("#77a03d")
    circle(mouseX + offsetX, mouseY + offsetY, 20);
    // strokeWeight(5);
    // line(pmouseX + offsetX, pmouseY + offsetY, mouseX + offsetX, mouseY + offsetY);
    }

  } else {
    beatColor = "#77a03d";
    if(bgm.isPlaying()){

    
    fill("#77a03d")
    stroke("#7b34ff")
    rect(mouseX + offsetX, mouseY + offsetY, 20, 20);
    // strokeWeight(5);
    // line(pmouseX + offsetX, pmouseY + offsetY, mouseX + offsetX, mouseY + offsetY);

    }
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

  let w = window.innerWidth;
  let h = w / aspect ;

  // let h = wrapper4.offsetHeight;
  // let w = h / aspect;


  resizeCanvas(w, h);
}