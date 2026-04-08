document.addEventListener("DOMContentLoaded", () => {

let BREATH_SENSITIVITY = 8;

let stream = null;
let analyser = null;
let dataArray = [];

const breathRaw = [];
const breathSmooth = [];
const breathTime = [];

let breathing = false;
let startTime = 0;

const BREATH_DURATION = 25000;

// ✅ GLOBAL BASELINE (FIXED)
let baseline = 0;
let baselineCount = 0;
let calibrated = false;

const breathBtn = document.getElementById("breathBtn");
const breathResult = document.getElementById("breathResult");
const breathStatus = document.getElementById("breathStatus");

const breathGraph = document.getElementById("breathGraph");
const btx = breathGraph.getContext("2d");

const slider = document.getElementById("sensSlider");

slider.oninput = (e) => {
  BREATH_SENSITIVITY = parseFloat(e.target.value);
};

/* =========================
   MIC
========================= */
async function startMic() {
  stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  });

  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;

  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);

  dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function stopMic() {
  if (stream) stream.getTracks().forEach(t => t.stop());
}

/* =========================
   SIGNAL
========================= */
function getBreathSignal() {
  analyser.getByteTimeDomainData(dataArray);

  let sum = 0;

  for (let i = 0; i < dataArray.length; i++) {
    let v = (dataArray[i] - 128) / 128;
    sum += v * v;
  }

  return Math.sqrt(sum / dataArray.length) * BREATH_SENSITIVITY;
}

function isValidBreathSignal(v) {
  if (!calibrated) return true;
  return v > baseline * 1.15;
}

/* =========================
   SMOOTH
========================= */
function smoothBreath(v) {
  breathRaw.push(v);

  if (breathRaw.length < 8) return v;

  let avg = 0;
  for (let i = breathRaw.length - 5; i < breathRaw.length; i++) {
    avg += breathRaw[i];
  }

  avg /= 5;
  breathSmooth.push(avg);
  return avg;
}

/* =========================
   PEAK DETECTION
========================= */
function detectBreaths() {
  let peaks = [];

  for (let i = 2; i < breathSmooth.length - 2; i++) {
    const isPeak =
      breathSmooth[i] > breathSmooth[i - 1] &&
      breathSmooth[i] > breathSmooth[i + 1];

    if (isPeak && breathSmooth[i] > baseline * 1.2) {
      peaks.push(breathTime[i]);
    }
  }

  if (peaks.length < 2) return null;

  let intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  const avg = intervals.reduce((a,b)=>a+b,0) / intervals.length;
  const bpm = Math.round(60000 / avg);

  if (bpm < 8 || bpm > 60) return null;

  return bpm;
}

/* =========================
   GRAPH
========================= */
function drawGraph() {
  const w = breathGraph.width;
  const h = breathGraph.height;

  btx.fillStyle = "rgba(0,0,0,0.2)";
  btx.fillRect(0,0,w,h);

  const slice = breathSmooth.slice(-120);
  if (slice.length < 2) return;

  const max = Math.max(...slice);
  const min = Math.min(...slice);

  btx.beginPath();

  for (let i = 0; i < slice.length - 1; i++) {
    const x1 = (i / slice.length) * w;
    const y1 = h - ((slice[i] - min) / (max - min + 0.0001)) * h;

    const x2 = ((i + 1) / slice.length) * w;
    const y2 = h - ((slice[i+1] - min) / (max - min + 0.0001)) * h;

    const xc = (x1 + x2) / 2;
    const yc = (y1 + y2) / 2;

    if (i === 0) btx.moveTo(x1, y1);
    btx.quadraticCurveTo(x1, y1, xc, yc);
  }

  btx.strokeStyle = "#0a84ff";
  btx.lineWidth = 2;
  btx.shadowColor = "#0a84ff";
  btx.shadowBlur = 10;
  btx.stroke();
  btx.shadowBlur = 0;
}

/* =========================
   STOP
========================= */
function stop(final) {
  breathing = false;
  stopMic();

  breathStatus.innerText = "Done";

  if (final) {
    breathResult.innerHTML = `🌬️ ${final} breaths/min`;
  } else {
    breathResult.innerText = "⚠️ No stable reading";
  }

  breathBtn.innerText = "Start";
}

/* =========================
   LOOP
========================= */
function loop() {
  if (!breathing) return;

  const now = Date.now();
  const signal = getBreathSignal();

  // ✅ CALIBRATION PHASE
  if (!calibrated) {
    baseline += signal;
    baselineCount++;

    breathStatus.innerText = "Calibrating... stay still";

    if (baselineCount > 40) {
      baseline /= baselineCount;
      calibrated = true;
    }

    return requestAnimationFrame(loop);
  }

  if (now - startTime > BREATH_DURATION) {
    stop(detectBreaths());
    return;
  }

  if (!isValidBreathSignal(signal)) {
    breathStatus.innerText = "Move closer to mic";
    requestAnimationFrame(loop);
    return;
  }

  const smooth = smoothBreath(signal);
  breathTime.push(now);

  if (breathSmooth.length > 300) {
    breathSmooth.shift();
    breathRaw.shift();
    breathTime.shift();
  }

  breathStatus.innerText = "Breathing detected";

  const bpm = detectBreaths();
  if (bpm) breathResult.innerText = `🌬️ ${bpm} breaths/min`;

  drawGraph();

  requestAnimationFrame(loop);
}

/* =========================
   BUTTON
========================= */
breathBtn.onclick = async () => {

  breathRaw.length = 0;
  breathSmooth.length = 0;
  breathTime.length = 0;

  baseline = 0;
  baselineCount = 0;
  calibrated = false;

  breathResult.innerText = "";
  breathStatus.innerText = "";

  breathing = true;
  startTime = Date.now();

  breathBtn.innerText = "Measuring...";

  await startMic();

  setTimeout(loop, 300);
};

});
