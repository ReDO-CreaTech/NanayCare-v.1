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

const breathBtn = document.getElementById("breathBtn");
const breathResult = document.getElementById("breathResult");
const breathStatus = document.getElementById("breathStatus");
const breathLabel = document.getElementById("breathLabel");

const breathGraph = document.getElementById("breathGraph");
const btx = breathGraph.getContext("2d");

const slider = document.getElementById("sensSlider");

slider.oninput = (e) => {
  BREATH_SENSITIVITY = parseFloat(e.target.value);
  breathStatus.innerText = `Sensitivity: ${BREATH_SENSITIVITY}`;
};

/* =========================
   MIC
========================= */
async function startMic() {
  stream = await navigator.mediaDevices.getUserMedia({ audio: true });

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

  let rms = Math.sqrt(sum / dataArray.length);
  return rms * BREATH_SENSITIVITY;
}

function isValidBreathSignal(v) {
  return v > baseline * 1.2;
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

  for (let i = 3; i < breathSmooth.length - 3; i++) {

    const isPeak =
      breathSmooth[i] > breathSmooth[i - 1] &&
      breathSmooth[i] > breathSmooth[i + 1];

    const threshold = 0.005;

    if (isPeak && breathSmooth[i] > threshold) {
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

  if (bpm < 10 || bpm > 80) return null;

  return bpm;
}

/* =========================
   QUALITY
========================= */
function detectBreathQuality(v) {
  if (v < 0.003) return "No signal";
  if (v < 0.01) return "Weak (move closer)";
  return "Stable";
}

function classifyBreathing(bpm) {
  if (!bpm) return "⚠️ Unable to classify";

  if (bpm < 10) return "⚠️ Abnormally Low";
  if (bpm <= 20) return "✅ Normal (WHO)";
  if (bpm <= 30) return "⚠️ Elevated";
  return "🚨 High (Possible Respiratory Distress)";
}

/* =========================
   GRAPH
========================= */
function drawGraph() {
  btx.clearRect(0,0,breathGraph.width, breathGraph.height);

  const slice = breathSmooth.slice(-100);
  if (slice.length < 2) return;

  const max = Math.max(...slice);
  const min = Math.min(...slice);

  btx.beginPath();

  slice.forEach((val,i)=>{
    const x = (i / slice.length) * breathGraph.width;
    const y = breathGraph.height - ((val - min) / (max - min + 0.0001)) * breathGraph.height;

    if(i===0) btx.moveTo(x,y);
    else btx.lineTo(x,y);
  });

  btx.strokeStyle = "#3b82f6";
  btx.lineWidth = 2;
  btx.stroke();
}

/* =========================
   STOP
========================= */
function stop(final) {
  breathing = false;
  stopMic();

  breathStatus.innerText = "Measurement complete";

  if (final) {
    const label = classifyBreathing(final);

    breathResult.innerHTML = `
      🌬️ <b>${final}</b> breaths/min <br>
      <span style="font-size:18px">${label}</span>
    `;
  } else {
    breathResult.innerText = "⚠️ Unable to get stable reading";
  }

  breathBtn.innerText = "Start";
}

/* =========================
   LOOP
========================= */
function loop() {
let baseline = 0;
let baselineCount = 0;

  if (baselineCount < 30) {
  baseline += signal;
  baselineCount++;
  return requestAnimationFrame(loop);
}

baseline = baseline / baselineCount;
  
  if (!breathing) return;

  const now = Date.now();

  if (now - startTime > BREATH_DURATION) {
    stop(detectBreaths());
    return;
  }

  const signal = getBreathSignal();

  if (!isValidBreathSignal(signal)) {
    breathStatus.innerText = "No signal";
    breathSmooth.push(0);
    breathTime.push(now);
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

  breathStatus.innerText = detectBreathQuality(smooth);
  breathStatus.innerText = "Hold phone close to mouth and breathe slowly";

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

  breathResult.innerText = "";
  breathStatus.innerText = "";

  breathing = true;
  startTime = Date.now();

  breathBtn.innerText = "Measuring...";

  await startMic();

  setTimeout(loop, 500);
};

});
