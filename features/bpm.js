const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const graph = document.getElementById("graph");
const gtx = graph.getContext("2d");

const startBtn = document.getElementById("startBtn");
const bpmResult = document.getElementById("bpmResult");
const statusText = document.getElementById("status");
const qualityText = document.getElementById("quality");

let rawData = [];
let smoothData = [];
let timestamps = [];

let measuring = false;
let stream = null;
let startTime = 0;


const screen = document.getElementById("screen");
if (!screen) console.error("Screen element not found");



document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("disclaimerModal");
  const btn = document.getElementById("acceptDisclaimer");

  const checkbox = document.getElementById("confirmCheck");

checkbox.addEventListener("change", () => {
  btn.disabled = !checkbox.checked;
});

  // ALWAYS show (for legal protection)
  modal.style.display = "flex";

  btn.addEventListener("click", () => {
    modal.style.display = "none";
  });
});


const MEASURE_DURATION = 12000; // 12 seconds

/* CAMERA */
async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }
  });
  video.srcObject = stream;
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

/* SIGNAL */
function getRedIntensity() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let sum = 0;
  for (let i = 0; i < frame.data.length; i += 4) {
    sum += frame.data[i];
  }

  return sum / (frame.data.length / 4);
}

/* SMOOTHING */
function smoothSignal(value) {
  rawData.push(value);

  if (rawData.length < 5) return value;

  let avg = 0;
  for (let i = rawData.length - 5; i < rawData.length; i++) {
    avg += rawData[i];
  }

  avg /= 5;
  smoothData.push(avg);

  return avg;
}

/* FINGER DETECTION */
function detectFinger(signal) {
  const recent = smoothData.slice(-20);
  if (recent.length < 10) return "Initializing...";

  const variance =
    recent.reduce((a, b) => a + Math.abs(b - signal), 0) / recent.length;

  if (signal < 80) return "No finger detected";
  if (variance < 0.5) return "Adjust finger";
  return "Good signal";
}

/* BPM */
function detectBPM() {
  if (smoothData.length < 80) return null;

  let peaks = [];

  for (let i = 2; i < smoothData.length - 2; i++) {
    if (
      smoothData[i] > smoothData[i - 1] &&
      smoothData[i] > smoothData[i + 1] &&
      smoothData[i] > smoothData[i - 2] &&
      smoothData[i] > smoothData[i + 2]
    ) {
      peaks.push(timestamps[i]);
    }
  }

  if (peaks.length < 2) return null;

  let intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i - 1]);
  }

  const avgInterval =
    intervals.reduce((a, b) => a + b, 0) / intervals.length;

  return Math.round(60000 / avgInterval);
}

/* GRAPH */
function drawGraph() {
  gtx.clearRect(0, 0, graph.width, graph.height);

  const slice = smoothData.slice(-100);
  if (slice.length < 2) return;

  const max = Math.max(...slice);
  const min = Math.min(...slice);

  gtx.beginPath();

  slice.forEach((val, i) => {
    const x = (i / slice.length) * graph.width;
    const y =
      graph.height - ((val - min) / (max - min + 0.0001)) * graph.height;

    if (i === 0) gtx.moveTo(x, y);
    else gtx.lineTo(x, y);
  });

  gtx.strokeStyle = "#22c55e";
  gtx.lineWidth = 2;
  gtx.stroke();
}

/* STOP MEASUREMENT */
function stopMeasurement(finalBPM) {
  measuring = false;
  stopCamera();

  statusText.innerText = "Measurement complete";

  if (finalBPM) {
    bpmResult.innerText = `❤️ Final: ${finalBPM} BPM`;
  } else {
    bpmResult.innerText = "⚠️ Unable to get stable reading";
  }

  qualityText.innerText = "";
  startBtn.innerText = "Measure Again";
}

/* LOOP */
function processFrame() {
  if (!measuring) return;

  const now = Date.now();

  // AUTO STOP
  if (now - startTime > MEASURE_DURATION) {
    const finalBPM = detectBPM();
    stopMeasurement(finalBPM);
    return;
  }

  const signal = getRedIntensity();
  const smooth = smoothSignal(signal);

  timestamps.push(now);

  if (smoothData.length > 300) {
    smoothData.shift();
    rawData.shift();
    timestamps.shift();
  }

  const fingerStatus = detectFinger(smooth);
  statusText.innerText = fingerStatus;

  if (fingerStatus === "Good signal") {
    const bpm = detectBPM();
    if (bpm) bpmResult.innerText = `❤️ ${bpm} BPM`;
  } else {
    bpmResult.innerText = "";
  }

  drawGraph();
  requestAnimationFrame(processFrame);
}

/* BUTTON */
startBtn.onclick = async () => {
  rawData = [];
  smoothData = [];
  timestamps = [];

  bpmResult.innerText = "";
  qualityText.innerText = "";

  measuring = true;
  startTime = Date.now();

  startBtn.innerText = "Measuring...";
  statusText.innerText = "Starting...";

  await startCamera();

  setTimeout(() => {
    processFrame();
  }, 800);
};