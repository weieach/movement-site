let img;
let scene;
let font;

function preload() {
  font = loadFont("IBMPlexMono-Regular.otf");
}

function setup() {
  createCanvas(600, 600);
  img = loadImage("2.jpeg");
  scene = createGraphics(width, height);
}

function draw() {
  scene.background("#000000");
  scene.push();
  scene.translate(width / 2, height / 2);
  scene.scale(map(sin(radians(frameCount * 2)), -1, 1, 0, 2));
  scene.imageMode(CENTER);
  scene.image(img, 0, 0);
  scene.pop();
  image(scene, 0, height / 2);
  rendererAscii(
    scene, // Input P5 Element
    font, // font to use
    height/40, // font size
    "█▛▜▟▙▄▀▐▌▞▚▝▖▗▘", // charset
    40,  // cols
    25,  // rows
    width * 0.4,  // spread
    "#f1f1f1",  // background color
    0
  );  // foreground color
}

function rendererAscii(
  input, // the input P5 Element
  fnt, // the font object
  fontSize, // the font size
  chars, // the charset to use
  tilesX, // the amount of cols
  tilesY, // the amount of rows
  spread, // the magnitude of the grid from the center
  bg, // the background-color
  fg // the foreground-color
) {
  let pg;

  pg = createGraphics(width, height);
  pg.background(bg);
  pg.fill(fg);
  pg.noStroke();

  let tileW = width / tilesX;
  let tileH = height / tilesY;

  pg.fill(0);
  pg.textFont(fnt);
  pg.textSize(fontSize);
  pg.textAlign(CENTER, CENTER);
  pg.translate(width / 2, height / 2);

  let buffer = input.get();

  for (let x = 0; x < tilesX; x++) {
    for (let y = 0; y < tilesY; y++) {
      let px = int(x * tileW);
      let py = int(y * tileH);
      let c = buffer.get(px, py);

      let ch = chars.charAt(
        int(map(brightness(c), 0, 100, 0, chars.length - 1))
      );

      let posX = map(x, 0, tilesX, -spread, spread);
      let posY = map(y, 0, tilesY, -spread, spread);

      pg.push();
      pg.translate(posX, posY);
      pg.text(ch, 0, 0);
      pg.pop();
    }
  }

  image(pg, 0, 0);
}