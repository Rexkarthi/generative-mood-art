let mood = 'Calm';
let intensity = 50;
let music;
let fft;
let theme = 'light';
let musicStarted = false;
let transitionAlpha = 0;
let classifierLoaded = false;

let musicFiles = {
  Happy: 'music/happy.mp3',
  Sad: 'music/sad.mp3',
  Angry: 'music/angry.mp3',
  Calm: 'music/calm.mp3'
};

function setup() {
  let canvas = createCanvas(600, 300);
  canvas.parent("canvas-container");

  fft = new p5.FFT();

  select("#intensitySlider").input(() => {
    intensity = select("#intensitySlider").value();
  });
  select("#saveBtn").mousePressed(() => saveCanvas('mood_art_' + mood.toLowerCase(), 'png'));
  select("#audioToggle").mousePressed(toggleMusic);
  select("#themeToggle").mousePressed(toggleTheme);
  select("#textMoodBtn").mousePressed(analyzeTextMood);
  select("#faceMoodBtn").mousePressed(detectFaceMood);

  applyTheme();
  loadFaceApiModels();
}

function draw() {
  background(theme === 'dark' ? 20 : 255);

  switch (mood) {
    case 'Happy': drawHappy(intensity); break;
    case 'Sad': drawSad(intensity); break;
    case 'Angry': drawAngry(intensity); break;
    case 'Calm': drawCalm(intensity); break;
  }

  drawVisualizer();
  drawLabel();

  if (transitionAlpha > 0) {
    fill(theme === 'dark' ? 20 : 255, transitionAlpha);
    noStroke();
    rect(0, 0, width, height);
    transitionAlpha -= 10;
  }
}

function drawLabel() {
  noStroke();
  fill(theme === 'dark' ? 255 : 0);
  textSize(18);
  textAlign(LEFT, BOTTOM);
  text("Mood: " + mood, 20, height - 20);
}

function drawVisualizer() {
  if (!music || !music.isPlaying()) return;
  let spectrum = fft.analyze();
  noStroke();
  fill(theme === 'dark' ? '#00e676' : '#00695c');
  for (let i = 0; i < spectrum.length; i += 15) {
    let amp = spectrum[i];
    let y = map(amp, 0, 256, height, 0);
    rect(i * 1.5, y, 10, height - y);
  }
}

function drawHappy(n) {
  for (let i = 0; i < n; i++) {
    fill(random(255), random(200, 255), 0, 180);
    noStroke();
    ellipse(random(width), random(height), random(20, 50));
  }
}

function drawSad(n) {
  stroke(100, 149, 237, 100);
  for (let i = 0; i < n; i++) {
    line(random(width), 0, random(width), height);
  }
}

function drawAngry(n) {
  strokeWeight(2);
  stroke(255, 0, 0);
  for (let i = 0; i < n; i++) {
    line(random(width), random(height), random(width), random(height));
  }
}

function drawCalm(n) {
  noFill();
  stroke(0, 180, 136, 100);
  strokeWeight(1.5);
  for (let i = 1; i <= n / 10; i++) {
    ellipse(width / 2, height / 2, i * 30, i * 30);
  }
}

function setMood(newMood) {
  mood = newMood;
  transitionAlpha = 255;
  if (music && music.isPlaying()) music.stop();
  music = loadSound(musicFiles[mood], () => {
    music.loop();
    fft.setInput(music);
    musicStarted = true;
  });
}

function toggleMusic() {
  if (music && musicStarted) {
    music.isPlaying() ? music.pause() : music.loop();
  }
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
}

function applyTheme() {
  document.body.className = theme;
}

// ✅ LOAD FACE-API MODELS
async function loadFaceApiModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceExpressionNet.loadFromUri('/models');
  classifierLoaded = true;
}

// 📷 DETECT FACE MOOD
async function detectFaceMood() {
  if (!classifierLoaded) return alert("AI models still loading...");
  const video = document.createElement("video");
  video.setAttribute("playsinline", "");
  document.body.appendChild(video);
  video.style.position = "fixed";
  video.style.top = "0";
  video.style.left = "0";
  video.style.opacity = "0";
  video.style.zIndex = "-999";

  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;

  video.onloadedmetadata = () => {
    video.play();
    setTimeout(async () => {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions();

      video.pause();
      video.srcObject.getTracks().forEach(t => t.stop());
      document.body.removeChild(video);

      if (detection && detection.expressions) {
        const expr = detection.expressions;
        const top = Object.keys(expr).reduce((a, b) => expr[a] > expr[b] ? a : b);
        const mapped = mapExpressionToMood(top);
        if (mapped) setMood(mapped);
      }
    }, 2500);
  };
}

function mapExpressionToMood(expression) {
  if (expression === 'happy') return 'Happy';
  if (expression === 'sad') return 'Sad';
  if (expression === 'angry' || expression === 'disgusted') return 'Angry';
  if (expression === 'neutral' || expression === 'surprised') return 'Calm';
  return null;
}

// 💬 TEXT SENTIMENT TO MOOD
function analyzeTextMood() {
  const input = document.getElementById("moodInput").value.toLowerCase();
  let detectedMood = 'Calm';
  if (/happy|joy|excited|great/.test(input)) detectedMood = 'Happy';
  else if (/sad|depressed|cry/.test(input)) detectedMood = 'Sad';
  else if (/angry|mad|furious/.test(input)) detectedMood = 'Angry';
  else if (/relaxed|peaceful|chill/.test(input)) detectedMood = 'Calm';
  setMood(detectedMood);
}
