

document.addEventListener("DOMContentLoaded", () => {

const audioContext = null;
let stream = null;
let analyser = null;
let dataArray = [];

const breathRaw = [];
const breathSmooth = [];
const breathTime = [];

let breathing = false;
let startTime = 0;

const BREATH_DURATION = 12000; // same as your BPM tool (12s)

const breathBtn = document.getElementById("breathBtn");
const breathResult = document.getElementById("breathResult");
const breathStatus = document.getElementById("breathStatus");
const breathQuality = document.getElementById("breathQuality");

const breathGraph = document.getElementById("breathGraph");
const btx = breathGraph?.getContext("2d");




const slider = document.getElementById("sensSlider");

if (slider) {
  slider.oninput = (e) => {
    BREATH_SENSITIVITY = parseFloat(e.target.value);
    breathStatus.innerText = `Sensitivity: ${BREATH_SENSITIVITY}`;
  };
}

/* =========================
   MICROPHONE CAMERA START
========================= */
async function startMic() {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: true
  });

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  analyser = ctx.createAnalyser();
  analyser.fftSize = 512;

  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);

  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

/* STOP MIC */
function stopMic() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
}


function isValidBreathSignal(value) {
  const NOISE_FLOOR = 18; // ignore background room noise
  return value > NOISE_FLOOR;
}


/* =========================
   SIGNAL (BREATH ENERGY)
========================= */
function getBreathSignal() {
  analyser.getByteFrequencyData(dataArray);

  let sum = 0;

  const LIMIT = Math.floor(dataArray.length * 0.15); // even narrower band

  for (let i = 0; i < LIMIT; i++) {
    sum += dataArray[i];
  }

  let avg = sum / LIMIT;

  // 🔥 SENSITIVITY CONTROL
  return avg / BREATH_SENSITIVITY;
}

/* =========================
   SMOOTHING (same style)
========================= */
function smoothBreath(v) {
  breathRaw.push(v);

  if (breathRaw.length < 5) return v;

  let avg = 0;
  for (let i = breathRaw.length - 5; i < breathRaw.length; i++) {
    avg += breathRaw[i];
  }

  avg /= 5;

  breathSmooth.push(avg);
  return avg;
}

/* =========================
   BREATH PEAK DETECTION
========================= */
function detectBreaths() {
  let peaks = [];

  for (let i = 3; i < breathSmooth.length - 3; i++) {

    const isPeak =
      breathSmooth[i] > breathSmooth[i - 1] &&
      breathSmooth[i] > breathSmooth[i - 2] &&
      breathSmooth[i] > breathSmooth[i + 1] &&
      breathSmooth[i] > breathSmooth[i + 2];

    const threshold = 20; // 👈 IMPORTANT noise filter

    if (isPeak && breathSmooth[i] > threshold) {
      peaks.push(breathTime[i]);
    }
  }

  if (peaks.length < 2) return null;

  let intervals = [];

  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  const bpm = Math.round(60000 / avg);

  // 🔥 SAFETY CLAMP (VERY IMPORTANT FOR CHILDREN)
  if (bpm < 10 || bpm > 80) return null;

  return bpm;
}

/* =========================
   SIMPLE QUALITY CHECK
========================= */
// function detectBreathQuality(v) {
//   if (v < 10) return "No signal";
//   if (v < 25) return "Weak signal";
//   return "Good signal";
// }



function detectBreathQuality(v) {
  if (v < 15) return "No signal";
  if (v < 30) return "Unstable (move closer)";
  return "Stable";
}

/* =========================
   GRAPH (same style as yours)
========================= */
function drawBreathGraph() {
  if (!btx) return;

  btx.clearRect(0, 0, breathGraph.width, breathGraph.height);

  const slice = breathSmooth.slice(-100);
  if (slice.length < 2) return;

  const max = Math.max(...slice);
  const min = Math.min(...slice);

  btx.beginPath();

  slice.forEach((val, i) => {
    const x = (i / slice.length) * breathGraph.width;
    const y =
      breathGraph.height - ((val - min) / (max - min + 0.0001)) * breathGraph.height;

    if (i === 0) btx.moveTo(x, y);
    else btx.lineTo(x, y);
  });

  btx.strokeStyle = "#3b82f6";
  btx.lineWidth = 2;
  btx.stroke();
}

/* =========================
   STOP
========================= */
function stopBreathing(final) {
  breathing = false;
  stopMic();

  breathStatus.innerText = "Measurement complete";

  if (final) {
    breathResult.innerText = `🌬️ Final: ${final} breaths/min`;
  } else {
    breathResult.innerText = "⚠️ Unable to get stable reading";
  }

  breathBtn.innerText = "Read Again";

  if (window.currentPatient) {
    window.currentPatient.respiratoryRate = final;
  }
}

/* =========================
   LOOP
========================= */
function processBreathing() {
  if (!breathing) return;

  const now = Date.now();

  if (now - startTime > BREATH_DURATION) {
    const final = detectBreaths();
    stopBreathing(final);
    return;
  }

const signal = getBreathSignal();

if (!isValidBreathSignal(signal)) {
  breathStatus.innerText = "No clear breathing signal";

  breathTime.push(Date.now());
  breathSmooth.push(0);

  requestAnimationFrame(processBreathing);
  return;
}
const smooth = smoothBreath(signal);

  breathTime.push(now);

  if (breathSmooth.length > 300) {
    breathSmooth.shift();
    breathRaw.shift();
    breathTime.shift();
  }

  breathStatus.innerText = detectBreathQuality(smooth);

  const bpm = detectBreaths();
  if (bpm) breathResult.innerText = `🌬️ ${bpm} breaths/min`;

  drawBreathGraph();

  requestAnimationFrame(processBreathing);
}

/* =========================
   BUTTON (same pattern as yours)
========================= */
breathBtn.onclick = async () => {
  breathRaw.length = 0;
  breathSmooth.length = 0;
  breathTime.length = 0;

  breathResult.innerText = "";
  breathStatus.innerText = "";

  breathing = true;
  startTime = Date.now();

  breathBtn.innerText = "Measuring...";

  await startMic();

  setTimeout(() => {
    processBreathing();
  }, 800);
};

});
